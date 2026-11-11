import { runOcr } from "@/lib/v1"
import { noCors } from "@/lib/respond"

export const dynamic = "force-dynamic"

export function OPTIONS() {
  return noCors()
}

export function POST(request: Request) {
  return runOcr(request)
}
