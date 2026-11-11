import { eq, schema } from "@glyphswap/db"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { JobView } from "@/components/job-view"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { refreshJob } from "@/lib/pipeline"
import { mediaUrl } from "@/lib/storage"

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  const { id } = await params
  const body = await refreshJob(id, session.user.id)
  if (!body) redirect("/app/history")
  const [row] = await db.select().from(schema.job).where(eq(schema.job.id, id))
  let original: string | null = null
  if (row?.imageId) {
    const [img] = await db.select().from(schema.image).where(eq(schema.image.id, row.imageId))
    if (img) original = mediaUrl(img.storageKey)
  }
  const saved = await db.select().from(schema.result).where(eq(schema.result.jobId, id))
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-4xl">Job</h1>
      <JobView
        initial={body}
        original={original}
        again={saved
          .filter((item) => item.storageKey)
          .map((item) => ({ id: item.id, kind: item.kind }))}
      />
    </main>
  )
}
