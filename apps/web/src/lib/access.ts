import { createHash, randomBytes } from "node:crypto"
import { and, asc, eq, gte, isNull, schema, sql, type Db } from "@glyphswap/db"
import { limits } from "@glyphswap/shared"
import { db } from "./db"
import { decideLimit } from "./http"

const { apiKey, rateEvent } = schema

export function hashKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex")
}

export function generateKey() {
  const secret = `gs_live_${randomBytes(24).toString("hex")}`
  return { secret, hash: hashKey(secret), prefix: secret.slice(0, 12) }
}

export async function keyForToken(token: string) {
  if (!token.startsWith("gs_live_")) return null
  const [row] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.hash, hashKey(token)))
  if (!row || row.revokedAt) return null
  await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, row.id))
  return row
}

export async function bearerKey(request: Request) {
  const header = request.headers.get("authorization") ?? ""
  if (!header.startsWith("Bearer ")) return null
  return keyForToken(header.slice(7).trim())
}

export function submitLimit() {
  return Number(process.env.RATE_LIMIT_PER_MIN ?? limits.submitPerMin)
}

export function readLimit() {
  return Number(process.env.READ_LIMIT_PER_MIN ?? limits.readPerMin)
}

export async function takeLimit(userId: string, kind: "submit" | "read") {
  const limit = kind === "submit" ? submitLimit() : readLimit()
  const now = Math.floor(Date.now() / 1000)
  const since = new Date(Date.now() - 60_000)
  const rows = await db
    .select({ at: rateEvent.at })
    .from(rateEvent)
    .where(and(eq(rateEvent.userId, userId), eq(rateEvent.kind, kind), gte(rateEvent.at, since)))
    .orderBy(asc(rateEvent.at))
  const oldest = rows[0] ? Math.floor(rows[0].at.getTime() / 1000) : null
  const decision = decideLimit(rows.length, limit, now, oldest)
  if (!decision.ok) return { ...decision, limit }
  await db.insert(rateEvent).values({ userId, kind, at: new Date() })
  return { ...decision, limit }
}

export async function activeKeyCount(database: Db, userId: string) {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(apiKey)
    .where(and(eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))
  return row?.count ?? 0
}
