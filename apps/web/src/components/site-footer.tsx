import Link from "next/link"
import { Logo } from "@/components/logo"

export const githubUrl = "https://github.com/Tarunchintakunta/glyphswap"

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Logo />
          <p>Open source under the MIT license.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={githubUrl} className="hover:text-text">
            GitHub
          </a>
          <Link href="/legal/terms" className="hover:text-text">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-text">
            Privacy
          </Link>
          <Link href="/login" className="hover:text-text">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  )
}
