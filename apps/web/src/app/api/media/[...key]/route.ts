import { fail } from "@/lib/http"
import { mediaSignatureOk } from "@/lib/signature"
import { currentUser } from "@/lib/session"
import { readStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

const types: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params
  const joined = key.map(decodeURIComponent).join("/")
  const url = new URL(request.url)
  const exp = Number(url.searchParams.get("exp"))
  const sig = url.searchParams.get("sig") ?? ""
  const user = await currentUser()
  const owns = Boolean(user && joined.startsWith(`${user.id}/`))
  if (!owns && !mediaSignatureOk(joined, exp, sig)) return fail(404, "not_found", "Not found")
  try {
    const bytes = await readStorage(joined)
    const ext = joined.split(".").pop() ?? "png"
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": types[ext] ?? "application/octet-stream",
        "cache-control": "private, max-age=60",
      },
    })
  } catch {
    return fail(404, "not_found", "Not found")
  }
}
