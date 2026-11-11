import { authorize } from "@/lib/v1"
import { fail } from "@/lib/http"
import { cancelJob, refreshJob, RequestError } from "@/lib/pipeline"
import { fromThrown, noCors } from "@/lib/respond"

export const dynamic = "force-dynamic"

export function OPTIONS() {
  return noCors()
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request, "read")
  if ("error" in auth && auth.error) return auth.error
  if (!("key" in auth)) return fail(401, "invalid_api_key", "API key is missing or revoked")
  const { id } = await context.params
  const body = await refreshJob(id, auth.key.userId)
  if (!body) return fail(404, "not_found", "Job not found", undefined, auth.headers)
  return Response.json(body, { headers: auth.headers })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request, "submit")
  if ("error" in auth && auth.error) return auth.error
  if (!("key" in auth)) return fail(401, "invalid_api_key", "API key is missing or revoked")
  const { id } = await context.params
  try {
    const body = await cancelJob(id, auth.key.userId)
    if (!body) return fail(404, "not_found", "Job not found", undefined, auth.headers)
    return Response.json(body, { headers: auth.headers })
  } catch (error) {
    if (error instanceof RequestError) return fromThrown(error, auth.headers)
    return fromThrown(error, auth.headers)
  }
}
