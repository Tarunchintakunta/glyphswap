import { fail } from "@/lib/http"
import { sweep } from "@/lib/pipeline"

export const dynamic = "force-dynamic"

async function run(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail(401, "invalid_request", "Unauthorized")
  }
  await sweep()
  return Response.json({ ok: true })
}

export function GET(request: Request) {
  return run(request)
}

export function POST(request: Request) {
  return run(request)
}
