import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Editor } from "@/components/editor"
import { auth } from "@/lib/auth"
import { ownedImage } from "@/lib/pipeline"

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ image?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login?next=/app")
  const { image } = await searchParams
  const initial = image ? await ownedImage(session.user.id, image) : null
  return (
    <main>
      <h1 className="mb-4 font-display text-4xl">
        Edit the <em className="text-accent">text</em>
      </h1>
      <Editor initial={initial} />
    </main>
  )
}
