import { redirect } from "next/navigation"
import { fail } from "@/lib/http"
import { reuseResult } from "@/lib/pipeline"
import { currentUser } from "@/lib/session"

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const form = await request.formData()
  const result = String(form.get("result") ?? "")
  const saved = await reuseResult(user.id, result, "en")
  if (!saved) redirect("/app/history")
  redirect(`/app?image=${saved.imageId}`)
}
