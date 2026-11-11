import { getTableConfig } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import * as schema from "./schema"

describe("schema", () => {
  it("indexes every foreign key column", () => {
    const tables = [
      schema.session,
      schema.account,
      schema.apiKey,
      schema.image,
      schema.ocrResult,
      schema.ocrLine,
      schema.job,
      schema.edit,
      schema.result,
      schema.creditLedger,
      schema.rateEvent,
      schema.idempotency,
      schema.webhookOutbox,
    ]
    for (const table of tables) {
      const config = getTableConfig(table)
      const indexed = new Set(
        config.indexes.map((i) => {
          const first = i.config.columns[0]
          return first && "name" in first ? first.name : ""
        }),
      )
      for (const fk of config.foreignKeys) {
        for (const column of fk.reference().columns) {
          expect(indexed.has(column.name), `${config.name}.${column.name}`).toBe(true)
        }
      }
    }
  })
})
