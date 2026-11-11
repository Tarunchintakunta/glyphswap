export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: Record<string, string>,
) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers },
  )
}

export function rateHeaders(limit: number, remaining: number, reset: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(reset),
  }
}

export function decideLimit(used: number, limit: number, now: number, oldest: number | null) {
  const reset = oldest == null ? now + 60 : oldest + 60
  if (used >= limit) {
    return { ok: false as const, remaining: 0, reset, retryAfter: Math.max(1, reset - now) }
  }
  return { ok: true as const, remaining: limit - used - 1, reset, retryAfter: 0 }
}
