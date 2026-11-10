import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export { schema }

export function createDb(url: string, max = 10) {
  return drizzle(postgres(url, { prepare: false, max }), { schema })
}

export type Db = ReturnType<typeof createDb>
export { creditBalance, grantSignupCredits } from "./credits"
