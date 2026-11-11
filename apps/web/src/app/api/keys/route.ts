import { desc, eq, schema } from "@glyphswap/db"
import { limits } from "@glyphswap/shared"
import { activeKeyCount, generateKey } from "@/lib/access"
import { db } from "@/lib/db"
import { fail } from "@/lib/http"
import { currentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const rows = await db
    .select({
      id: schema.apiKey.id,
      name: schema.apiKey.name,
      prefix: schema.apiKey.prefix,
      createdAt: schema.apiKey.createdAt,
      lastUsedAt: schema.apiKey.lastUsedAt,
      revokedAt: schema.apiKey.revokedAt,
    })
    .from(schema.apiKey)
    .where(eq(schema.apiKey.userId, user.id))
    .orderBy(desc(schema.apiKey.createdAt))
  return Response.json({ keys: rows })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return fail(401, "invalid_request", "Sign in required")
  const body = (await request.json().catch(() => ({}))) as { name?: string }
  const name = (body.name ?? "default").trim().slice(0, 80) || "default"
  if ((await activeKeyCount(db, user.id)) >= limits.keys) {
    return fail(400, "invalid_request", `At most ${limits.keys} active keys`)
  }
  const created = generateKey()
  const [row] = await db
    .insert(schema.apiKey)
    .values({ userId: user.id, name, prefix: created.prefix, hash: created.hash })
    .returning({ id: schema.apiKey.id, prefix: schema.apiKey.prefix })
  return Response.json({ id: row?.id, prefix: row?.prefix, secret: created.secret })
}
