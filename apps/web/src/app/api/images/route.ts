import { fail } from "@/lib/http"
import { currentUser } from "@/lib/session"
import { fromThrown } from "@/lib/respond"
import { parseLang, ingestImage, webMaxBytes, imageIdMaxAge } from "@/lib/sources"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  try {
    const form = await request.formData()
    const file = form.get("image")
    if (!(file instanceof File)) return fail(400, "invalid_image", "Choose an image")
    const lang = parseLang(form.get("lang"))
    const saved = await ingestImage({
      userId: user.id,
      bytes: Buffer.from(await file.arrayBuffer()),
      lang,
      maxBytes: webMaxBytes(),
      maxAgeMs: imageIdMaxAge(),
    })
    return Response.json(saved)
  } catch (error) {
    return fromThrown(error)
  }
}
