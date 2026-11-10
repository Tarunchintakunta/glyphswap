import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`)
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow()

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
)

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const jobStatus = pgEnum("job_status", [
  "queued",
  "ocr",
  "masking",
  "inpainting",
  "rendering",
  "blending",
  "diffusion",
  "upscale",
  "done",
  "failed",
])
export const resultKind = pgEnum("result_kind", ["A", "B", "C"])
export const creditReason = pgEnum("credit_reason", ["signup", "job", "refund", "admin"])

export const apiKey = pgTable(
  "api_key",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("api_key_user_idx").on(t.userId)],
)

export const image = pgTable(
  "image",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("image_user_idx").on(t.userId), index("image_expires_idx").on(t.expiresAt)],
)

export const ocrResult = pgTable(
  "ocr_result",
  {
    id: id(),
    imageId: text("image_id")
      .notNull()
      .references(() => image.id, { onDelete: "cascade" }),
    engine: text("engine").notNull(),
    lang: text("lang"),
    createdAt: createdAt(),
  },
  (t) => [index("ocr_result_image_idx").on(t.imageId)],
)

export const ocrLine = pgTable(
  "ocr_line",
  {
    id: id(),
    ocrResultId: text("ocr_result_id")
      .notNull()
      .references(() => ocrResult.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    polygon: jsonb("polygon").$type<[number, number][]>().notNull(),
    angle: real("angle").notNull().default(0),
    confidence: real("confidence").notNull(),
    order: integer("order").notNull(),
  },
  (t) => [index("ocr_line_result_idx").on(t.ocrResultId)],
)

export const job = pgTable(
  "job",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    imageId: text("image_id")
      .notNull()
      .references(() => image.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    status: jobStatus("status").notNull().default("queued"),
    stage: text("stage").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    flags: jsonb("flags").$type<{ results: ("A" | "B" | "C")[] }>().notNull(),
    error: jsonb("error").$type<{ code: string; message: string }>(),
    webhookUrl: text("webhook_url"),
    createdAt: createdAt(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("job_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("job_image_idx").on(t.imageId),
    index("job_api_key_idx").on(t.apiKeyId),
  ],
)

export const edit = pgTable(
  "edit",
  {
    id: id(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    lineId: text("line_id").references(() => ocrLine.id, { onDelete: "set null" }),
    box: jsonb("box").$type<[number, number, number, number]>(),
    oldText: text("old_text"),
    newText: text("new_text"),
    remove: boolean("remove").notNull().default(false),
    fontFamily: text("font_family"),
    fontSize: real("font_size"),
    color: text("color"),
    angle: real("angle"),
  },
  (t) => [index("edit_job_idx").on(t.jobId), index("edit_line_idx").on(t.lineId)],
)

export const result = pgTable(
  "result",
  {
    id: id(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    kind: resultKind("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
  },
  (t) => [index("result_job_idx").on(t.jobId)],
)

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: creditReason("reason").notNull(),
    jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("credit_ledger_user_idx").on(t.userId), index("credit_ledger_job_idx").on(t.jobId)],
)

export const rateEvent = pgTable(
  "rate_event",
  {
    id: id(),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKey.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_event_key_at_idx").on(t.apiKeyId, t.at)],
)
