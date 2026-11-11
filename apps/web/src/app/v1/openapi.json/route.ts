import { openApi } from "@/lib/openapi"
import { noCors } from "@/lib/respond"

export function OPTIONS() {
  return noCors()
}

export function GET() {
  return Response.json(openApi)
}
