"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export default function SettingsPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [notice, setNotice] = useState("")
  const [pending, setPending] = useState(false)

  return (
    <main className="flex max-w-lg flex-col gap-6">
      <h1 className="font-display text-4xl">Settings</h1>
      <section className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
        <div>
          <h2 className="text-lg">Theme</h2>
          <p className="text-sm text-muted">System, light, or dark.</p>
        </div>
        <ThemeToggle />
      </section>
      <form
        className="flex flex-col gap-3 rounded-lg border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault()
          setPending(true)
          setNotice("")
          void authClient
            .deleteUser({ password })
            .then((result) => {
              if (result.error) {
                setNotice(result.error.message ?? "Could not delete the account")
                setPending(false)
                return
              }
              router.replace("/")
              router.refresh()
            })
            .catch(() => {
              setNotice("Could not delete the account")
              setPending(false)
            })
        }}
      >
        <h2 className="text-lg">Delete account</h2>
        <p className="text-sm text-muted">This removes your account, images and edit history.</p>
        <label className="text-sm">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {notice ? <p role="alert">{notice}</p> : null}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Deleting…" : "Delete account"}
        </Button>
      </form>
    </main>
  )
}
