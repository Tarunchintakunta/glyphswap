import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { afterAll, describe, expect, it } from "vitest"
import { creditBalance, createDb, grantSignupCredits } from "./index"
import { creditLedger, user } from "./schema"

const url = process.env.DATABASE_URL

describe.skipIf(!url)("credits", () => {
  const db = createDb(url ?? "")
  const userId = randomUUID()

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId))
    await db.$client.end()
  })

  it("starts at zero and sums ledger deltas", async () => {
    await db.insert(user).values({ id: userId, name: "Test", email: `${userId}@test.local` })
    expect(await creditBalance(db, userId)).toBe(0)
    await grantSignupCredits(db, userId, 20)
    await db.insert(creditLedger).values({ userId, delta: -1, reason: "job" })
    expect(await creditBalance(db, userId)).toBe(19)
  }, 20000)
})
