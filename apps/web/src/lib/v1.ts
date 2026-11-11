import { createHash } from "node:crypto"
import { editRequest, limits, type EditItem } from "@glyphswap/shared"
import { bearerKey, readLimit, submitLimit, takeLimit } from "./access"
import { resolveEdits } from "./edits"
import { fail, rateHeaders } from "./http"
import { present, RequestError, startJob } from "./pipeline"
import { fromJob, fromThrown } from "./respond"
import { assertPublicHost } from "./ssrf"
import { apiMaxBytes, decodeBase64, imageIdMaxAge, ingestImage, parseLang } from "./sources"

export function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function authorize(request: Request, kind: "submit" | "read") {
  const key = await bearerKey(request)
  if (!key) return { error: fail(401, "invalid_api_key", "API key is missing or revoked") }
  const decision = await takeLimit(key.userId, kind)
  const headers = rateHeaders(decision.limit, decision.remaining, decision.reset)
  if (!decision.ok) {
    return {
      error: fail(429, "rate_limited", "Too many requests", undefined, {
        ...headers,
        "Retry-After": String(decision.retryAfter),
      }),
    }
  }
  return { key, headers, limit: kind === "submit" ? submitLimit() : readLimit() }
}

async function bytesFrom(request: Request) {
  const type = request.headers.get("content-type") ?? ""
  if (type.includes("multipart/form-data")) {
    const form = await request.formData()
    const file = form.get("image")
    const imageUrl = form.get("image_url")
    const imageBase64 = form.get("image_base64")
    const imageId = form.get("image_id")
    const lang = form.get("lang")
    const payload = form.get("payload")
    let json: Record<string, unknown> = {}
    if (typeof payload === "string" && payload) {
      try {
        json = JSON.parse(payload) as Record<string, unknown>
      } catch {
        throw new RequestError(400, "invalid_request", "payload is not JSON")
      }
    }
    return {
      file: file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined,
      imageUrl:
        typeof imageUrl === "string"
          ? imageUrl
          : typeof json.image_url === "string"
            ? json.image_url
            : undefined,
      imageBase64:
        typeof imageBase64 === "string"
          ? imageBase64
          : typeof json.image_base64 === "string"
            ? json.image_base64
            : undefined,
      imageId:
        typeof imageId === "string"
          ? imageId
          : typeof json.image_id === "string"
            ? json.image_id
            : undefined,
      lang: lang ?? json.lang,
      json,
    }
  }
  const json = (await request.json()) as Record<string, unknown>
  return {
    file: undefined,
    imageUrl: typeof json.image_url === "string" ? json.image_url : undefined,
    imageBase64: typeof json.image_base64 === "string" ? json.image_base64 : undefined,
    imageId: typeof json.image_id === "string" ? json.image_id : undefined,
    lang: json.lang,
    json,
  }
}

export async function runOcr(request: Request) {
  const auth = await authorize(request, "submit")
  if ("error" in auth && auth.error) return auth.error
  if (!("key" in auth)) return fail(401, "invalid_api_key", "API key is missing or revoked")
  try {
    const source = await bytesFrom(request)
    const lang = parseLang(source.lang)
    const bytes = source.file ?? (source.imageBase64 ? decodeBase64(source.imageBase64) : undefined)
    const saved = await ingestImage({
      userId: auth.key.userId,
      bytes,
      imageUrl: source.imageUrl,
      imageId: source.imageId,
      lang,
      maxBytes: apiMaxBytes(),
      maxAgeMs: imageIdMaxAge(),
    })
    return Response.json(
      { image_id: saved.imageId, width: saved.width, height: saved.height, lines: saved.lines },
      { headers: auth.headers },
    )
  } catch (error) {
    return fromThrown(error, auth.headers)
  }
}

export async function runEdit(request: Request) {
  const auth = await authorize(request, "submit")
  if ("error" in auth && auth.error) return auth.error
  if (!("key" in auth)) return fail(401, "invalid_api_key", "API key is missing or revoked")
  try {
    const source = await bytesFrom(request)
    const body: Record<string, unknown> = { ...(source.json ?? {}) }
    delete body.image_id
    delete body.image_url
    delete body.image_base64
    if (source.file) body.image_id = "upload"
    else if (source.imageId) body.image_id = source.imageId
    else if (source.imageUrl) body.image_url = source.imageUrl
    else if (source.imageBase64) body.image_base64 = source.imageBase64
    const parsed = editRequest.safeParse(body)
    if (!parsed.success) {
      return fail(
        400,
        "invalid_request",
        "Request does not match the edit schema",
        parsed.error.flatten(),
        auth.headers,
      )
    }
    if (parsed.data.edits.length > limits.apiEdits) {
      return fail(
        400,
        "invalid_request",
        `At most ${limits.apiEdits} edits`,
        undefined,
        auth.headers,
      )
    }
    const lang = parseLang(source.lang ?? (source.json?.lang as unknown))
    if (parsed.data.webhook_url) {
      try {
        await assertPublicHost(parsed.data.webhook_url)
      } catch {
        return fail(
          400,
          "invalid_request",
          "webhook_url is not a public http(s) address",
          undefined,
          auth.headers,
        )
      }
    }
    const bytes = source.file ?? (source.imageBase64 ? decodeBase64(source.imageBase64) : undefined)
    const saved = await ingestImage({
      userId: auth.key.userId,
      bytes,
      imageUrl: bytes ? undefined : source.imageUrl,
      imageId: bytes || source.imageUrl ? undefined : source.imageId,
      lang,
      maxBytes: apiMaxBytes(),
      maxAgeMs: imageIdMaxAge(),
    })
    const resolved = resolveEdits(saved.lines, parsed.data.edits as EditItem[], limits.apiEdits)
    if (!resolved.ok) {
      return fail(resolved.status, resolved.code, resolved.message, resolved.details, auth.headers)
    }
    const idempotencyKey = request.headers.get("idempotency-key")
    const opened = await startJob({
      userId: auth.key.userId,
      imageId: saved.imageId,
      apiKeyId: auth.key.id,
      edits: resolved.edits,
      results: parsed.data.results,
      lang,
      webhookUrl: parsed.data.webhook_url ?? null,
      idempotencyKey,
      requestHash: requestHash(parsed.data),
      maxAgeMs: imageIdMaxAge(),
    })
    if (!opened.ok) return fromJob(opened.error)
    const payload = await present(opened.jobId, auth.key.userId, true)
    return Response.json(payload, { status: 202, headers: auth.headers })
  } catch (error) {
    if (error instanceof RequestError) return fromThrown(error, auth.headers)
    return fromThrown(error, auth.headers)
  }
}
