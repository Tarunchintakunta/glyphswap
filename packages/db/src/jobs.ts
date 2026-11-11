import { and, eq, lt, notInArray, sql } from "drizzle-orm"
import type { Db } from "./index"
import { creditLedger, idempotency, image, job, edit } from "./schema"

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

export type NewEdit = {
  lineId?: string | null
  box?: [number, number, number, number] | null
  oldText?: string | null
  newText?: string | null
  remove: boolean
  fontFamily?: string | null
  fontSize?: number | null
  color?: string | null
  angle?: number | null
}

export type OpenJobInput = {
  userId: string
  imageId: string
  apiKeyId: string | null
  edits: NewEdit[]
  results: ("A" | "B" | "C")[]
  lang: string
  webhookUrl: string | null
  idempotencyKey: string | null
  requestHash: string | null
  maxAgeMs: number
  queuedLimit: number
  runningLimit: number
}

export type OpenJobResult =
  | { ok: true; jobId: string; replay: boolean }
  | {
      ok: false
      error: "not_found" | "insufficient_credits" | "queue_full" | "idempotency_conflict"
    }

const terminal = ["done", "failed"] as const

async function balance(tx: Tx, userId: string) {
  const [row] = await tx
    .select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)::int` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
  return row?.balance ?? 0
}

export async function refundJob(db: Db, userId: string, jobId: string) {
  const [existing] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.jobId, jobId), eq(creditLedger.reason, "refund")))
  if (existing) return
  await db.insert(creditLedger).values({ userId, delta: 1, reason: "refund", jobId })
}

export async function openJob(db: Db, input: OpenJobInput): Promise<OpenJobResult> {
  return db.transaction(async (tx) => {
    if (input.idempotencyKey && input.requestHash) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await tx
        .delete(idempotency)
        .where(
          and(
            eq(idempotency.userId, input.userId),
            eq(idempotency.key, input.idempotencyKey),
            lt(idempotency.createdAt, cutoff),
          ),
        )
      const [prev] = await tx
        .select()
        .from(idempotency)
        .where(and(eq(idempotency.userId, input.userId), eq(idempotency.key, input.idempotencyKey)))
      if (prev) {
        if (prev.requestHash !== input.requestHash)
          return { ok: false, error: "idempotency_conflict" }
        return { ok: true, jobId: prev.jobId, replay: true }
      }
    }
    const [img] = await tx
      .select()
      .from(image)
      .where(and(eq(image.id, input.imageId), eq(image.userId, input.userId)))
    if (!img || img.expiresAt.getTime() < Date.now()) return { ok: false, error: "not_found" }
    if (Date.now() - img.createdAt.getTime() > input.maxAgeMs)
      return { ok: false, error: "not_found" }
    if ((await balance(tx, input.userId)) < 1) return { ok: false, error: "insufficient_credits" }
    const active = await tx
      .select({ status: job.status })
      .from(job)
      .where(and(eq(job.userId, input.userId), notInArray(job.status, [...terminal])))
    const queued = active.filter((row) => row.status === "queued").length
    if (queued >= input.queuedLimit || active.length - queued >= input.runningLimit) {
      return { ok: false, error: "queue_full" }
    }
    const [created] = await tx
      .insert(job)
      .values({
        userId: input.userId,
        imageId: input.imageId,
        apiKeyId: input.apiKeyId,
        status: "queued",
        stage: "queued",
        progress: 0,
        flags: { results: input.results, lang: input.lang },
        webhookUrl: input.webhookUrl,
      })
      .returning()
    if (!created) return { ok: false, error: "not_found" }
    await tx.insert(creditLedger).values({
      userId: input.userId,
      delta: -1,
      reason: "job",
      jobId: created.id,
    })
    if (input.edits.length) {
      await tx.insert(edit).values(
        input.edits.map((item) => ({
          jobId: created.id,
          lineId: item.lineId ?? null,
          box: item.box ?? null,
          oldText: item.oldText ?? null,
          newText: item.newText ?? null,
          remove: item.remove,
          fontFamily: item.fontFamily ?? null,
          fontSize: item.fontSize ?? null,
          color: item.color ?? null,
          angle: item.angle ?? null,
        })),
      )
    }
    if (input.idempotencyKey && input.requestHash) {
      await tx.insert(idempotency).values({
        userId: input.userId,
        key: input.idempotencyKey,
        requestHash: input.requestHash,
        jobId: created.id,
      })
    }
    return { ok: true, jobId: created.id, replay: false }
  })
}
