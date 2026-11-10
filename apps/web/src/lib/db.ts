import { createDb, type Db } from "@glyphswap/db"

const cache = globalThis as unknown as { glyphswapDb?: Db }

export const db = (cache.glyphswapDb ??= createDb(
  process.env.DATABASE_URL ?? "",
  Number(process.env.DATABASE_POOL_MAX ?? 10),
))
