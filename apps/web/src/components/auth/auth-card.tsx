"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { passwordStrength, strengthLabels } from "@/lib/password-strength"
import { cn } from "@/lib/utils"

type Mode = "login" | "signup"

const inputClass =
  "h-11 w-full rounded-md border border-border bg-bg px-3 text-[15px] outline-none transition-colors duration-150 ease-out placeholder:text-muted/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 aria-[invalid=true]:border-danger"

const meterColors = ["bg-border", "bg-danger", "bg-amber-500", "bg-accent", "bg-success"]

export function AuthCard({
  mode,
  next,
  googleEnabled,
}: {
  mode: Mode
  next: string
  googleEnabled: boolean
}) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<"email" | "google" | null>(null)
  const strength = passwordStrength(password)
  const query = next === "/app" ? "" : `?next=${encodeURIComponent(next)}`

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email"))
    setError(null)
    if (mode === "signup" && strength === 0) {
      setError("Use at least 8 characters for your password.")
      return
    }
    setPending("email")
    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get("name")) || email.split("@")[0]!,
          })
        : await authClient.signIn.email({ email, password })
    if (error) {
      setError(error.message ?? "Something went wrong. Try again.")
      setPending(null)
      return
    }
    router.replace(next)
    router.refresh()
  }

  async function onGoogle() {
    setError(null)
    setPending("google")
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next })
    if (error) {
      setError(error.message ?? "Google sign-in failed.")
      setPending(null)
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] sm:p-8">
      <h1 className="font-display text-4xl leading-[1.05]">
        {mode === "signup" ? (
          <>
            Start <em className="text-accent">swapping</em>
          </>
        ) : (
          <>
            Welcome <em className="text-accent">back</em>
          </>
        )}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "signup"
          ? "Create an account and get free credits to try it."
          : "Sign in to keep editing."}
      </p>

      <nav
        aria-label="Account"
        className="mt-6 grid grid-cols-2 rounded-md bg-bg p-1 text-sm font-medium"
      >
        {(["login", "signup"] as const).map((tab) => (
          <Link
            key={tab}
            href={`/${tab}${query}`}
            aria-current={tab === mode ? "page" : undefined}
            className={cn(
              "rounded-sm py-2 text-center text-muted transition-colors duration-150 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent",
              tab === mode && "bg-surface text-text shadow-sm",
            )}
          >
            {tab === "login" ? "Sign in" : "Create account"}
          </Link>
        ))}
      </nav>

      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="mt-6 h-11 w-full"
            disabled={pending !== null}
            onClick={onGoogle}
          >
            {pending === "google" ? <Spinner /> : <GoogleMark />}
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={cn("flex flex-col gap-4", !googleEnabled && "mt-6")}>
        {mode === "signup" && (
          <Field label="Name" htmlFor="name">
            <input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={mode === "signup" ? strengthLabels[strength] : undefined}
        >
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              aria-describedby={mode === "signup" ? "password-strength" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, "pr-16")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="absolute inset-y-1 right-1 rounded-sm px-3 font-mono text-xs text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "signup" && (
            <div
              id="password-strength"
              className="mt-2 grid grid-cols-4 gap-1"
              aria-label={`Password strength: ${strengthLabels[strength]}`}
            >
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1 rounded-full transition-colors duration-200 ease-out",
                    strength >= step ? meterColors[strength] : "bg-border",
                  )}
                />
              ))}
            </div>
          )}
        </Field>

        <p
          role="alert"
          aria-live="polite"
          className={cn("text-sm text-danger", !error && "sr-only")}
        >
          {error}
        </p>

        <Button type="submit" variant="accent" className="h-11 w-full" disabled={pending !== null}>
          {pending === "email" && <Spinner />}
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      {mode === "signup" && (
        <p className="mt-6 text-center text-xs text-muted">
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-text">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-text">
            privacy policy
          </Link>
          .
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {hint && <span className="font-mono text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  )
}
