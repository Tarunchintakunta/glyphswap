import { eq, sql } from "drizzle-orm"
import type { Db } from "./index"
import { creditLedger } from "./schema"

export async function creditBalance(db: Db, userId: string) {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)::int` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
  return row?.balance ?? 0
}

export async function grantSignupCredits(db: Db, userId: string, amount: number) {
  await db.insert(creditLedger).values({ userId, delta: amount, reason: "signup" })
}
