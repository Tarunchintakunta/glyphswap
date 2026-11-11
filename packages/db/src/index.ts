import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export { and, asc, desc, eq, gte, isNull, lt, lte, notInArray, sql } from "drizzle-orm"

export { schema }

export function createDb(url: string, max = 10) {
  return drizzle(postgres(url, { prepare: false, max }), { schema })
}

export type Db = ReturnType<typeof createDb>
export { creditBalance, grantSignupCredits } from "./credits"
export { openJob, refundJob, type NewEdit, type OpenJobInput, type OpenJobResult } from "./jobs"
