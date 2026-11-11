import { noCors } from "@/lib/respond"
import { runEdit } from "@/lib/v1"

export const dynamic = "force-dynamic"

export function OPTIONS() {
  return noCors()
}

export function POST(request: Request) {
  return runEdit(request)
}
