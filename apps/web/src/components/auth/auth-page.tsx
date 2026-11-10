import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { Logo } from "@/components/logo"
import { auth, googleEnabled } from "@/lib/auth"
import { safeNext } from "@/lib/redirect"

export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: "login" | "signup"
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const next = safeNext((await searchParams).next)
  if (await auth.api.getSession({ headers: await headers() })) redirect(next)
  return (
    <main className="relative flex min-h-dvh flex-col items-center px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="relative">
        <Logo />
      </div>
      <div className="relative flex w-full flex-1 items-center justify-center py-8">
        <AuthCard mode={mode} next={next} googleEnabled={googleEnabled} />
      </div>
    </main>
  )
}
