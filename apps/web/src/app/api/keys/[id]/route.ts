import { and, eq, schema } from "@glyphswap/db"
import { db } from "@/lib/db"
import { fail } from "@/lib/http"
import { currentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const { id } = await context.params
  const [row] = await db
    .update(schema.apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiKey.id, id), eq(schema.apiKey.userId, user.id)))
    .returning({ id: schema.apiKey.id })
  if (!row) return fail(404, "not_found", "Key not found")
  return Response.json({ id: row.id, revoked: true })
}
