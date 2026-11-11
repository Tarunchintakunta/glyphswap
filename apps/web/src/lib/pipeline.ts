import { createHash, randomUUID } from "node:crypto"
import {
  and,
  asc,
  creditBalance,
  desc,
  eq,
  isNull,
  lt,
  lte,
  notInArray,
  openJob,
  refundJob,
  schema,
  type NewEdit,
} from "@glyphswap/db"
import { limits, type JobResponse, type ResultState } from "@glyphswap/shared"
import { db } from "./db"
import type { ResolvedEdit } from "./edits"
import {
  InferenceError,
  enqueueJob,
  fetchJob,
  fetchResult,
  ocrImage,
  type RemoteJob,
} from "./inference"
import { extensionFor, sniffImage, type ImageMime } from "./sniff"
import { mediaUrl, readStorage, removeStorage, writeStorage } from "./storage"
import { signingSecret, signWebhook } from "./signature"

const { image, job, ocrLine, ocrResult, result, webhookOutbox } = schema

const stages = new Set([
  "queued",
  "ocr",
  "masking",
  "inpainting",
  "rendering",
  "blending",
  "diffusion",
  "upscale",
  "done",
  "failed",
])

export class RequestError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function imageError(error: unknown): RequestError {
  if (error instanceof InferenceError) {
    if (error.status === 400 || error.status === 413 || error.status === 415) {
      return new RequestError(400, "invalid_image", "Image could not be read")
    }
    if (error.status === 503)
      return new RequestError(503, "internal", "Text detection is unavailable")
  }
  if (error instanceof RequestError) return error
  return new RequestError(500, "internal", "Image could not be stored")
}

export async function loadLines(imageId: string) {
  const [ocr] = await db
    .select()
    .from(ocrResult)
    .where(eq(ocrResult.imageId, imageId))
    .orderBy(desc(ocrResult.createdAt))
    .limit(1)
  if (!ocr) return []
  const rows = await db
    .select()
    .from(ocrLine)
    .where(eq(ocrLine.ocrResultId, ocr.id))
    .orderBy(asc(ocrLine.order))
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    polygon: row.polygon,
    angle: row.angle,
    confidence: row.confidence,
  }))
}

export async function saveUpload(userId: string, bytes: Buffer, maxBytes: number, lang: string) {
  if (bytes.length === 0 || bytes.length > maxBytes) {
    throw new RequestError(400, "invalid_image", "Image is empty or too large")
  }
  const mime = sniffImage(bytes)
  if (!mime) throw new RequestError(400, "invalid_image", "Use a PNG, JPEG or WebP image")
  let detected
  try {
    detected = await ocrImage(bytes, mime, lang)
  } catch (error) {
    throw imageError(error)
  }
  const id = randomUUID()
  const key = `${userId}/${id}.${extensionFor(mime)}`
  await writeStorage(key, bytes)
  const hours = Number(process.env.RETENTION_HOURS ?? limits.retentionHours)
  try {
    await db.insert(image).values({
      id,
      userId,
      storageKey: key,
      width: detected.width,
      height: detected.height,
      mime,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    })
    const [ocr] = await db
      .insert(ocrResult)
      .values({ imageId: id, engine: detected.engine, lang })
      .returning()
    if (!ocr) throw new Error("ocr insert failed")
    if (detected.lines.length) {
      await db.insert(ocrLine).values(
        detected.lines.map((line, order) => ({
          ocrResultId: ocr.id,
          text: line.text,
          polygon: quad(line.polygon),
          angle: line.angle,
          confidence: line.confidence,
          order,
        })),
      )
    }
  } catch (error) {
    await removeStorage(key)
    throw imageError(error)
  }
  return {
    imageId: id,
    width: detected.width,
    height: detected.height,
    mime: mime as ImageMime,
    storageKey: key,
    lines: await loadLines(id),
  }
}

function quad(polygon: number[][]): [number, number][] {
  const points = polygon
    .filter((point) => point.length >= 2)
    .map((point) => [Number(point[0]), Number(point[1])] as [number, number])
  if (points.length === 4) return points
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 0)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 0)
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ]
}

function uniqueViolation(error: unknown) {
  const code = (value: unknown) =>
    typeof value === "object" && value && "code" in value ? String(value.code) : ""
  return code(error) === "23505" || code((error as { cause?: unknown }).cause) === "23505"
}

function toNewEdit(edit: ResolvedEdit): NewEdit {
  return {
    lineId: edit.lineId,
    box: edit.box,
    oldText: edit.oldText,
    newText: edit.newText,
    remove: edit.remove,
    fontFamily: edit.fontFamily,
    fontSize: edit.fontSize,
    color: edit.color,
    angle: edit.angle,
  }
}

export async function startJob(input: {
  userId: string
  imageId: string
  apiKeyId: string | null
  edits: ResolvedEdit[]
  results: ("A" | "B" | "C")[]
  lang: string
  webhookUrl: string | null
  idempotencyKey: string | null
  requestHash: string | null
  maxAgeMs: number
}) {
  let opened
  try {
    opened = await openJob(db, {
      userId: input.userId,
      imageId: input.imageId,
      apiKeyId: input.apiKeyId,
      edits: input.edits.map(toNewEdit),
      results: input.results,
      lang: input.lang,
      webhookUrl: input.webhookUrl,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      maxAgeMs: input.maxAgeMs,
      queuedLimit: limits.queued,
      runningLimit: limits.running,
    })
  } catch (error) {
    if (uniqueViolation(error) && input.idempotencyKey) {
      const [prev] = await db
        .select()
        .from(schema.idempotency)
        .where(
          and(
            eq(schema.idempotency.userId, input.userId),
            eq(schema.idempotency.key, input.idempotencyKey),
          ),
        )
      if (prev && prev.requestHash === input.requestHash) {
        return { ok: true as const, jobId: prev.jobId, replay: true }
      }
      if (prev) return { ok: false as const, error: "idempotency_conflict" as const }
    }
    throw error
  }
  if (!opened.ok || opened.replay) return opened
  const [img] = await db.select().from(image).where(eq(image.id, input.imageId))
  if (!img) {
    await closeJob(opened.jobId, "failed", { code: "not_found", message: "Image not found" })
    return opened
  }
  try {
    const bytes = await readStorage(img.storageKey)
    const remote = await enqueueJob(bytes, {
      edits: input.edits.map((edit) => ({
        polygon: edit.polygon,
        new_text: edit.newText,
        old_text: edit.oldText,
        remove: edit.remove,
        font_family: edit.fontFamily,
        font_size: edit.fontSize,
        color: edit.color,
        angle: edit.angle,
      })),
      results: input.results,
      lang: input.lang,
    })
    await db
      .update(job)
      .set({ inferenceId: remote.job_id, startedAt: new Date() })
      .where(eq(job.id, opened.jobId))
  } catch (error) {
    const message = error instanceof Error ? error.message : "inference failed"
    await closeJob(opened.jobId, "failed", {
      code: "inference_failed",
      message: message.slice(0, 300),
    })
  }
  return opened
}

async function owned(jobId: string, userId: string) {
  const [row] = await db
    .select()
    .from(job)
    .where(and(eq(job.id, jobId), eq(job.userId, userId)))
  return row ?? null
}

function remoteStatus(remote: RemoteJob) {
  if (remote.status === "failed") return "failed" as const
  if (remote.status === "done") return "done" as const
  if (stages.has(remote.stage)) return remote.stage as "ocr"
  return "ocr" as const
}

async function closeJob(
  jobId: string,
  outcome: "done" | "failed",
  error?: { code: string; message: string },
) {
  const [row] = await db.select().from(job).where(eq(job.id, jobId))
  if (!row || row.finishedAt) return
  const saved = await db.select().from(result).where(eq(result.jobId, jobId))
  const succeeded = saved.some((item) => item.status === "succeeded")
  await db
    .update(job)
    .set({
      status: outcome,
      stage: outcome,
      progress: 100,
      error: error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(job.id, jobId))
  if (outcome === "failed" || !succeeded) await refundJob(db, row.userId, jobId)
  await queueWebhook(jobId)
}

async function queueWebhook(jobId: string) {
  const [row] = await db.select().from(job).where(eq(job.id, jobId))
  if (!row?.webhookUrl) return
  const payload = await present(jobId, row.userId)
  if (!payload) return
  const raw = JSON.stringify(payload)
  const signature = signWebhook(signingSecret(), raw, Math.floor(Date.now() / 1000))
  const inserted = await db
    .insert(webhookOutbox)
    .values({ jobId, url: row.webhookUrl, body: raw, signature, attempt: 0, nextAt: new Date() })
    .onConflictDoNothing({ target: webhookOutbox.jobId })
    .returning()
  const pending = inserted[0]
  if (pending) await deliverWebhook(pending.id)
}

export async function deliverWebhook(id: string) {
  const [row] = await db.select().from(webhookOutbox).where(eq(webhookOutbox.id, id))
  if (!row || row.deliveredAt || row.attempt >= 4) return
  let status = 0
  try {
    const response = await fetch(row.url, {
      method: "POST",
      body: row.body,
      headers: { "content-type": "application/json", "X-Glyphswap-Signature": row.signature },
      signal: AbortSignal.timeout(10_000),
    })
    status = response.status
    if (response.ok) {
      await db
        .update(webhookOutbox)
        .set({ deliveredAt: new Date(), lastStatus: status })
        .where(eq(webhookOutbox.id, row.id))
      return
    }
  } catch {
    status = 0
  }
  const delays = [60, 300, 1800]
  const delay = delays[row.attempt]
  await db
    .update(webhookOutbox)
    .set({
      attempt: row.attempt + 1,
      lastStatus: status,
      nextAt: delay ? new Date(Date.now() + delay * 1000) : new Date("2099-01-01T00:00:00Z"),
    })
    .where(eq(webhookOutbox.id, row.id))
}

export async function refreshJob(jobId: string, userId: string) {
  const row = await owned(jobId, userId)
  if (!row) return null
  if (row.status === "done" || row.status === "failed") return present(jobId, userId)
  const timeoutMs = limits.jobTimeoutMin * 60 * 1000
  if (row.startedAt && Date.now() - row.startedAt.getTime() > timeoutMs) {
    await closeJob(jobId, "failed", { code: "timeout", message: "Job timed out" })
    return present(jobId, userId)
  }
  if (!row.inferenceId) return present(jobId, userId)
  let remote: RemoteJob
  try {
    remote = await fetchJob(row.inferenceId)
  } catch {
    return present(jobId, userId)
  }
  const status = remoteStatus(remote)
  if (remote.status !== "done" && remote.status !== "failed") {
    await db
      .update(job)
      .set({ status, stage: remote.stage, progress: remote.progress })
      .where(and(eq(job.id, jobId), isNull(job.finishedAt)))
    return present(jobId, userId)
  }
  if (remote.status === "failed") {
    await closeJob(jobId, "failed", {
      code: "inference_failed",
      message: remote.error ?? "Inference failed",
    })
    return present(jobId, userId)
  }
  const existing = await db.select().from(result).where(eq(result.jobId, jobId))
  const saved = new Set(existing.map((item) => item.kind))
  for (const kind of row.flags.results) {
    if (saved.has(kind)) continue
    const info = remote.results[kind]
    try {
      if (info?.status === "ready" && row.inferenceId) {
        const png = await fetchResult(row.inferenceId, kind)
        const key = `${row.userId}/${jobId}-${kind}.png`
        await writeStorage(key, png)
        await db.insert(result).values({
          jobId,
          kind,
          storageKey: key,
          status: "succeeded",
          width: info.width ?? 0,
          height: info.height ?? 0,
        })
      } else {
        await db.insert(result).values({
          jobId,
          kind,
          status: info?.status === "unavailable" ? "skipped" : "failed",
          reason: info?.reason ?? "missing",
          width: 0,
          height: 0,
        })
      }
      saved.add(kind)
    } catch {
      await db
        .insert(result)
        .values({ jobId, kind, status: "failed", reason: "download_failed", width: 0, height: 0 })
        .onConflictDoNothing()
    }
  }
  await closeJob(jobId, "done")
  return present(jobId, userId)
}

export async function present(
  jobId: string,
  userId: string,
  withCredits = false,
): Promise<JobResponse | null> {
  const row = await owned(jobId, userId)
  if (!row) return null
  const rows = await db.select().from(result).where(eq(result.jobId, jobId))
  const results: JobResponse["results"] = {}
  for (const item of rows) {
    const state: ResultState = {
      status: item.status === "succeeded" || item.status === "failed" ? item.status : "skipped",
      ...(item.reason ? { reason: item.reason } : {}),
      ...(item.storageKey
        ? { url: mediaUrl(item.storageKey), width: item.width, height: item.height }
        : {}),
    }
    results[item.kind] = state
  }
  return {
    job_id: row.id,
    status: row.status,
    stage: row.stage,
    progress: row.progress,
    results,
    ...(row.error ? { error: row.error } : {}),
    ...(withCredits ? { credits: await creditBalance(db, userId) } : {}),
  }
}

export async function cancelJob(jobId: string, userId: string) {
  const row = await owned(jobId, userId)
  if (!row) return null
  if (row.status !== "queued") {
    throw new RequestError(409, "invalid_request", "Only a queued job can be canceled")
  }
  await closeJob(jobId, "failed", { code: "canceled", message: "Canceled" })
  return present(jobId, userId)
}

export async function sweep() {
  const expired = await db.select().from(image).where(lt(image.expiresAt, new Date()))
  for (const img of expired) {
    const jobs = await db.select().from(job).where(eq(job.imageId, img.id))
    for (const item of jobs) {
      const rows = await db.select().from(result).where(eq(result.jobId, item.id))
      for (const row of rows) {
        if (row.storageKey) await removeStorage(row.storageKey)
        await db.update(result).set({ storageKey: null }).where(eq(result.id, row.id))
      }
    }
    await removeStorage(img.storageKey)
    await db.delete(image).where(eq(image.id, img.id))
  }
  const due = await db
    .select()
    .from(webhookOutbox)
    .where(
      and(
        isNull(webhookOutbox.deliveredAt),
        lte(webhookOutbox.nextAt, new Date()),
        lt(webhookOutbox.attempt, 4),
      ),
    )
    .limit(20)
  for (const row of due) await deliverWebhook(row.id)
  const cutoff = new Date(Date.now() - limits.jobTimeoutMin * 60 * 1000)
  const stale = await db
    .select()
    .from(job)
    .where(and(notInArray(job.status, ["done", "failed"]), lt(job.startedAt, cutoff)))
  for (const row of stale) {
    await closeJob(row.id, "failed", { code: "timeout", message: "Job timed out" })
  }
}

export async function listJobs(userId: string) {
  const rows = await db
    .select()
    .from(job)
    .where(eq(job.userId, userId))
    .orderBy(desc(job.createdAt))
    .limit(40)
  const items = []
  for (const row of rows) {
    const saved = await db.select().from(result).where(eq(result.jobId, row.id))
    const preview =
      saved.find((item) => item.kind === "B" && item.storageKey) ??
      saved.find((item) => item.storageKey)
    let thumb = preview?.storageKey ? mediaUrl(preview.storageKey) : null
    if (!thumb && row.imageId) {
      const [img] = await db.select().from(image).where(eq(image.id, row.imageId))
      if (img) thumb = mediaUrl(img.storageKey)
    }
    items.push({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      thumb,
    })
  }
  return items
}

export async function ownedImage(userId: string, imageId: string) {
  const [img] = await db
    .select()
    .from(image)
    .where(and(eq(image.id, imageId), eq(image.userId, userId)))
  if (!img || img.expiresAt.getTime() < Date.now()) return null
  return {
    imageId: img.id,
    width: img.width,
    height: img.height,
    url: mediaUrl(img.storageKey),
    lines: await loadLines(img.id),
  }
}

export async function reuseResult(userId: string, resultId: string, lang: string) {
  const [row] = await db
    .select({ storageKey: result.storageKey, userId: job.userId })
    .from(result)
    .innerJoin(job, eq(result.jobId, job.id))
    .where(and(eq(result.id, resultId), eq(job.userId, userId)))
  if (!row?.storageKey) return null
  const bytes = await readStorage(row.storageKey)
  return saveUpload(userId, bytes, limits.apiUploadMb * 1024 * 1024, lang)
}
