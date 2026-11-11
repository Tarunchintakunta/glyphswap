import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listJobs } from "@/lib/pipeline"

export default async function HistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login?next=/app/history")
  const jobs = await listJobs(session.user.id)
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-4xl">History</h1>
      {jobs.length === 0 ? <p>No edits yet.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/app/jobs/${job.id}`}
              className="block rounded-lg border border-border p-3 hover:bg-accent-soft"
            >
              {job.thumb ? (
                <img
                  src={job.thumb}
                  alt=""
                  className="mb-2 aspect-video w-full rounded-md object-cover"
                />
              ) : (
                <div className="mb-2 aspect-video rounded-md bg-surface" />
              )}
              <p className="font-mono text-xs text-muted">{job.status}</p>
              <p className="text-sm">{new Date(job.createdAt).toLocaleString()}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
