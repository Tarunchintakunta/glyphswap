import { creditBalance } from "@glyphswap/db"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { Logo } from "@/components/logo"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function AppHome() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login?next=/app")
  const credits = await creditBalance(db, session.user.id)
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col gap-12 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Logo />
        <SignOutButton />
      </header>
      <section className="flex flex-col gap-4">
        <h1 className="font-display text-5xl leading-[1.05]">
          Your <em className="text-accent">workspace</em>
        </h1>
        <p className="text-muted">
          Signed in as <span className="font-medium text-text">{session.user.email}</span>
        </p>
        <p className="inline-flex w-fit items-center gap-2 rounded-md bg-accent-soft px-3 py-1.5 font-mono text-sm">
          <span data-testid="credits">{credits}</span> credits
        </p>
        <p className="text-sm text-muted">The editor lands here next.</p>
      </section>
    </main>
  )
}
