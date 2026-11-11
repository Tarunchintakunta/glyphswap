import Link from "next/link"
import type { ReactNode } from "react"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppShell({
  email,
  credits,
  children,
}: {
  email: string
  credits: number
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3">
        <Logo />
        <nav aria-label="Workspace" className="flex flex-wrap gap-3 text-sm">
          <Link href="/app" className="hover:text-accent">
            Editor
          </Link>
          <Link href="/app/history" className="hover:text-accent">
            History
          </Link>
          <Link href="/settings" className="hover:text-accent">
            Settings
          </Link>
          <Link href="/settings/api" className="hover:text-accent">
            API keys
          </Link>
          <Link href="/docs" className="hover:text-accent">
            Docs
          </Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">{email}</span>
          <span className="rounded-md bg-accent-soft px-2 py-1 font-mono text-sm">
            <span data-testid="credits">{credits}</span> credits
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}
