import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link
            href="/#how"
            className="hidden rounded-md px-3 py-2 text-muted hover:text-text md:block"
          >
            How it works
          </Link>
          <Link
            href="/#api"
            className="hidden rounded-md px-3 py-2 text-muted hover:text-text md:block"
          >
            API
          </Link>
          <Link
            href="/#faq"
            className="hidden rounded-md px-3 py-2 text-muted hover:text-text md:block"
          >
            FAQ
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-muted hover:text-text sm:block"
          >
            Sign in
          </Link>
          <Button asChild size="sm" variant="accent">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
