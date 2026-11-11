import { creditBalance } from "@glyphswap/db"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { AppShell } from "@/components/app-shell"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  const credits = await creditBalance(db, session.user.id)
  return (
    <AppShell email={session.user.email} credits={credits}>
      {children}
    </AppShell>
  )
}
