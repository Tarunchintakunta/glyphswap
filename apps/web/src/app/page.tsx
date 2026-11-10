import Link from "next/link"
import { BeforeAfter } from "@/components/landing/before-after"
import { DemoPoster } from "@/components/landing/demo-poster"
import { SiteFooter, githubUrl } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

const steps = [
  {
    name: "Detect",
    body: "Every line of text is found and outlined, with its angle and reading order.",
  },
  {
    name: "Edit",
    body: "Type the new words, draw a box around anything missed, or remove a line entirely.",
  },
  {
    name: "Match",
    body: "The background is rebuilt, then your text is set in the same font, size, color and grain.",
  },
]

const languages = [
  "English",
  "Español",
  "Français",
  "Deutsch",
  "Português",
  "हिन्दी",
  "తెలుగు",
  "Русский",
  "Türkçe",
  "Tiếng Việt",
  "Bahasa",
  "Polski",
]

const apiExample = `curl $GLYPHSWAP_URL/v1/edit \\
  -H "Authorization: Bearer gs_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_id": "img_8f2c",
    "edits": [{ "old_text": "Fresh bread", "new_text": "Cold brew" }],
    "results": ["B"]
  }'

202 { "job_id": "job_41d0", "status": "queued" }`

const faqs = [
  {
    q: "What does it cost?",
    a: "New accounts get 20 free credits. One credit processes one image, no matter how many lines you change.",
  },
  {
    q: "Can I run it myself?",
    a: "Yes. The web app and the inference service are MIT licensed and run on a laptop, including Apple Silicon.",
  },
  {
    q: "Which languages work?",
    a: "Detection covers 40+ languages. Latin, Devanagari and Telugu scripts are tested end to end.",
  },
  {
    q: "What happens to my images?",
    a: "Uploads and results are deleted after 72 hours. Only the edit history (the words you changed) is kept.",
  },
  {
    q: "Is anything off limits?",
    a: "Yes. Forging IDs, certificates, invoices or any official document is forbidden by the terms and gets accounts closed.",
  },
]

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-content items-center gap-12 px-4 pt-12 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pt-24">
          <div className="flex flex-col gap-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Open source · Runs locally
            </p>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
              Change the words. <em className="text-accent">Keep the look.</em>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Glyphswap finds every line of text in an image and lets you rewrite it. The new words
              come back in the same font, size, color, angle and texture.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/signup">Try it free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={githubUrl}>Star on GitHub</a>
              </Button>
            </div>
            <p className="text-sm text-muted">20 free credits. No card required.</p>
          </div>
          <div className="flex flex-col gap-3">
            <BeforeAfter
              before={
                <DemoPoster
                  id="before"
                  kicker="TODAY ONLY"
                  headline="Fresh bread"
                  line="baked every morning since 1987"
                  price="TWO LOAVES · $6"
                />
              }
              after={
                <DemoPoster
                  id="after"
                  kicker="NEW ON TAP"
                  headline="Cold brew"
                  line="steeped for eighteen slow hours"
                  price="LARGE CUP · $4"
                />
              }
            />
            <p className="text-center font-mono text-xs text-muted">Drag the handle to compare</p>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">
              Three steps, <em className="text-accent">one credit</em>
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.name} className="flex flex-col gap-3 border-t border-border pt-6">
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <h3 className="font-display text-3xl">{step.name}</h3>
                  <p className="text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="languages" className="border-y border-border">
          <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-10 sm:px-6 md:flex-row md:items-center md:gap-10">
            <h2
              id="languages"
              className="shrink-0 font-mono text-xs uppercase tracking-widest text-muted"
            >
              40+ languages
            </h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 font-display text-2xl">
              {languages.map((language) => (
                <li key={language}>{language}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="api" className="scroll-mt-20">
          <div className="mx-auto grid max-w-content items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">
                Built for <em className="text-accent">pipelines</em> too
              </h2>
              <p className="text-muted">
                Every edit you can make in the browser is one request away. Send an image and the
                replacements, poll the job or get a signed webhook when it is done.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-5 font-mono text-[13px] leading-relaxed">
              <code>{apiExample}</code>
            </pre>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-border bg-surface">
          <div className="mx-auto grid max-w-content gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">Questions</h2>
            <div className="divide-y divide-border border-y border-border">
              {faqs.map((faq) => (
                <details key={faq.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span
                      aria-hidden
                      className="font-mono text-muted transition-transform duration-200 ease-out group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-muted">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-content flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">
            Your next edit is <em className="text-accent">free</em>
          </h2>
          <Button asChild size="lg" variant="accent">
            <Link href="/signup">Create an account</Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
