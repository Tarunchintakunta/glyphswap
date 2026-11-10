import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col justify-center gap-8 px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Open-source · Runs locally</p>
      <h1 className="font-display text-5xl leading-[1.05] sm:text-7xl">
        Edit the text inside <em className="text-accent">any image</em>.
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Detect every line, type a replacement, and get it back in the same font, color, angle and
        background.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/login">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="https://github.com/Tarunchintakunta/glyphswap">GitHub</a>
        </Button>
      </div>
    </main>
  )
}
