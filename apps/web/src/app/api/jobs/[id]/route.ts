import { fail } from "@/lib/http"
import { cancelJob, refreshJob, RequestError } from "@/lib/pipeline"
import { fromThrown } from "@/lib/respond"
import { currentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const { id } = await context.params
  const body = await refreshJob(id, user.id)
  if (!body) return fail(404, "not_found", "Job not found")
  return Response.json(body)
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const { id } = await context.params
  try {
    const body = await cancelJob(id, user.id)
    if (!body) return fail(404, "not_found", "Job not found")
    return Response.json(body)
  } catch (error) {
    if (error instanceof RequestError) return fromThrown(error)
    return fromThrown(error)
  }
}
