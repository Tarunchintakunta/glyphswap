import type { ReactNode } from "react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 [&_h1]:font-display [&_h1]:text-5xl [&_h1]:leading-[1.05] [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:text-muted [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
