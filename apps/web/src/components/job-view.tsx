"use client"

import { useEffect, useState } from "react"
import type { JobResponse } from "@glyphswap/shared"
import { Button } from "@/components/ui/button"

type View = "original" | "A" | "B" | "C"

export function JobView({
  initial,
  original,
  again,
}: {
  initial: JobResponse
  original: string | null
  again: { id: string; kind: string }[]
}) {
  const [job, setJob] = useState(initial)
  const [view, setView] = useState<View>("B")

  useEffect(() => {
    if (job.status === "done" || job.status === "failed") return
    const timer = setInterval(() => {
      void fetch(`/api/jobs/${job.job_id}`)
        .then((response) => response.json())
        .then((body: JobResponse) => {
          if (body?.job_id) setJob(body)
        })
        .catch(() => undefined)
    }, 1000)
    return () => clearInterval(timer)
  }, [job.job_id, job.status])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return
      if (event.key === "1") setView("original")
      if (event.key === "2") setView("A")
      if (event.key === "3") setView("B")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const current = view === "original" ? null : job.results[view]
  const src = view === "original" ? original : current?.url

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-sm">
          {job.status} · {job.stage} · {job.progress}%
        </p>
        {(["original", "A", "B"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            variant={view === item ? "accent" : "outline"}
            onClick={() => setView(item)}
          >
            {item === "original" ? "Original" : `Result ${item}`}
          </Button>
        ))}
        <Button
          type="button"
          variant={view === "C" ? "accent" : "outline"}
          onClick={() => setView("C")}
        >
          Result C
        </Button>
        {src ? (
          <a className="text-sm underline" href={src} download>
            Download
          </a>
        ) : null}
      </div>
      {job.error ? <p role="alert">{job.error.message}</p> : null}
      {current && current.status !== "succeeded" ? (
        <p>
          {current.status}
          {current.reason ? `: ${current.reason}` : ""}
        </p>
      ) : null}
      {src ? (
        <img
          src={src}
          alt={`${view} result`}
          className="max-h-[70dvh] w-full rounded-lg border border-border object-contain"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {again.map((item) => (
          <form key={item.id} action="/api/jobs/again" method="post">
            <input type="hidden" name="result" value={item.id} />
            <Button type="submit" variant="outline">
              Edit again ({item.kind})
            </Button>
          </form>
        ))}
      </div>
    </div>
  )
}
