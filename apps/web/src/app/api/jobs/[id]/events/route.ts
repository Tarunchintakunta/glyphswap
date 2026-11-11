import { fail } from "@/lib/http"
import { refreshJob } from "@/lib/pipeline"
import { currentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const { id } = await context.params
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      while (!request.signal.aborted) {
        const body = await refreshJob(id, user.id)
        if (!body) {
          controller.close()
          return
        }
        send(body)
        if (body.status === "done" || body.status === "failed") {
          controller.close()
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    },
  })
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  })
}
