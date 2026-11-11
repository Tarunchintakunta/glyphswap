import { fail } from "./http"
import { RequestError } from "./pipeline"

export function fromThrown(error: unknown, extra?: Record<string, string>) {
  if (error instanceof RequestError) {
    const headers = { ...extra }
    if (error.status === 503 || error.status === 429)
      headers["Retry-After"] = headers["Retry-After"] ?? "30"
    return fail(error.status, error.code, error.message, error.details, headers)
  }
  return fail(500, "internal", "Something went wrong", undefined, extra)
}

export function fromJob(
  error: "not_found" | "insufficient_credits" | "queue_full" | "idempotency_conflict",
) {
  if (error === "not_found") return fail(404, "not_found", "Image not found")
  if (error === "insufficient_credits")
    return fail(400, "insufficient_credits", "Not enough credits")
  if (error === "queue_full") {
    return fail(503, "queue_full", "Queue is full", undefined, { "Retry-After": "30" })
  }
  return fail(409, "invalid_request", "Idempotency key was reused with a different request")
}

export function noCors() {
  return new Response(null, { status: 204 })
}
