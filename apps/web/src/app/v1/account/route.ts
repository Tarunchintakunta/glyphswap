import { creditBalance as balance } from "@glyphswap/db"
import { limits } from "@glyphswap/shared"
import { authorize } from "@/lib/v1"
import { fail } from "@/lib/http"
import { db } from "@/lib/db"
import { readLimit, submitLimit } from "@/lib/access"
import { noCors } from "@/lib/respond"

export const dynamic = "force-dynamic"

export function OPTIONS() {
  return noCors()
}

export async function GET(request: Request) {
  const auth = await authorize(request, "read")
  if ("error" in auth && auth.error) return auth.error
  if (!("key" in auth)) return fail(401, "invalid_api_key", "API key is missing or revoked")
  return Response.json(
    {
      credits: await balance(db, auth.key.userId),
      limits: {
        submit_per_min: submitLimit(),
        read_per_min: readLimit(),
        running: limits.running,
        queued: limits.queued,
        keys: limits.keys,
      },
    },
    { headers: auth.headers },
  )
}
