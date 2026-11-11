import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = { title: "API · Glyphswap" }

const host = "https://your-app.example"

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-content flex-col gap-6 px-4 py-10">
        <h1 className="font-display text-5xl">API</h1>
        <p>Send <code>Authorization: Bearer gs_live_…</code>. OCR is free. Each edit spends one credit.</p>
        <pre className="overflow-auto rounded-lg bg-surface p-4 text-sm">{`curl -X POST ${host}/v1/ocr \\
  -H "Authorization: Bearer $GLYPHSWAP_KEY" \\
  -F "image=@poster.png" \\
  -F "lang=en"`}</pre>
        <pre className="overflow-auto rounded-lg bg-surface p-4 text-sm">{`curl -X POST ${host}/v1/edit \\
  -H "Authorization: Bearer $GLYPHSWAP_KEY" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"image_id":"IMAGE","edits":[{"old_text":"SALE","new_text":"OPEN"}],"results":["B"]}'`}</pre>
        <pre className="overflow-auto rounded-lg bg-surface p-4 text-sm">{`curl ${host}/v1/jobs/JOB \\
  -H "Authorization: Bearer $GLYPHSWAP_KEY"

curl ${host}/v1/account \\
  -H "Authorization: Bearer $GLYPHSWAP_KEY"`}</pre>
        <p>
          The machine-readable description is at <a href="/v1/openapi.json">/v1/openapi.json</a>. Browser pages do not
          receive CORS headers for key-authenticated calls.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
