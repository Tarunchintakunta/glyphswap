import { editRequest, limits, type EditItem } from "@glyphswap/shared"
import { resolveEdits } from "@/lib/edits"
import { fail } from "@/lib/http"
import { loadLines, present, startJob } from "@/lib/pipeline"
import { fromJob, fromThrown } from "@/lib/respond"
import { currentUser } from "@/lib/session"
import { parseLang } from "@/lib/sources"
import { requestHash } from "@/lib/v1"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  try {
    const json = await request.json()
    const parsed = editRequest.safeParse({ ...json, results: json.results ?? ["B"] })
    if (!parsed.success || !parsed.data.image_id) {
      return fail(400, "invalid_request", "Send image_id and edits")
    }
    const lang = parseLang(json.lang)
    const lines = await loadLines(parsed.data.image_id)
    const resolved = resolveEdits(lines, parsed.data.edits as EditItem[], limits.webEdits)
    if (!resolved.ok)
      return fail(resolved.status, resolved.code, resolved.message, resolved.details)
    const opened = await startJob({
      userId: user.id,
      imageId: parsed.data.image_id,
      apiKeyId: null,
      edits: resolved.edits,
      results: parsed.data.results,
      lang,
      webhookUrl: null,
      idempotencyKey: null,
      requestHash: requestHash(parsed.data),
      maxAgeMs: Number(process.env.RETENTION_HOURS ?? limits.retentionHours) * 60 * 60 * 1000,
    })
    if (!opened.ok) return fromJob(opened.error)
    const body = await present(opened.jobId, user.id, true)
    return Response.json(body, { status: 202 })
  } catch (error) {
    return fromThrown(error)
  }
}
