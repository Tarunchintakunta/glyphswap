import type { Metadata } from "next"
import { AuthPage } from "@/components/auth/auth-page"

export const metadata: Metadata = { title: "Create account · Glyphswap" }

export default function Signup({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  return <AuthPage mode="signup" searchParams={searchParams} />
}
