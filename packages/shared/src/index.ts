import { z } from "zod"

export const point = z.tuple([z.number(), z.number()])
export const polygon = z.array(point).length(4)

export const ocrLine = z.object({
  id: z.string(),
  text: z.string(),
  polygon,
  angle: z.number(),
  confidence: z.number().min(0).max(1),
})

export const ocrResponse = z.object({
  image_id: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  lines: z.array(ocrLine),
})

export const box = z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()])

const styleFields = {
  font_family: z.string().max(80).optional(),
  font_size: z.number().positive().max(400).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  angle: z.number().min(-180).max(180).optional(),
}

export const editItem = z.union([
  z.object({
    old_text: z.string().trim().min(1).max(200),
    new_text: z.string().max(200),
    match: z.enum(["all", "first"]).optional(),
    ...styleFields,
  }),
  z.object({
    line_id: z.string().min(1),
    new_text: z.string().max(200).optional(),
    remove: z.boolean().optional(),
    ...styleFields,
  }),
  z.object({
    box,
    new_text: z.string().max(200).optional(),
    remove: z.boolean().optional(),
    ...styleFields,
  }),
])

export const resultKind = z.enum(["A", "B", "C"])

export const editRequest = z
  .object({
    image_id: z.string().optional(),
    image_url: z.string().url().optional(),
    image_base64: z.string().min(1).optional(),
    edits: z.array(editItem).min(1).max(100),
    results: z.array(resultKind).min(1).default(["B"]),
    webhook_url: z.string().url().optional(),
  })
  .refine(
    (v) =>
      [v.image_id, v.image_url, v.image_base64].filter((item) => item !== undefined).length === 1,
    { message: "Provide exactly one of image_id, image_url or image_base64" },
  )

export const jobStatus = z.enum([
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

export const resultState = z.object({
  status: z.enum(["succeeded", "failed", "skipped"]),
  url: z.string().optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  reason: z.string().optional(),
})

export const jobResponse = z.object({
  job_id: z.string(),
  status: jobStatus,
  stage: z.string(),
  progress: z.number().int().min(0).max(100),
  results: z.object({
    A: resultState.optional(),
    B: resultState.optional(),
    C: resultState.optional(),
  }),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  credits: z.number().int().optional(),
})

export const apiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export const accountResponse = z.object({
  credits: z.number().int(),
  limits: z.object({
    submit_per_min: z.number().int(),
    read_per_min: z.number().int(),
    running: z.number().int(),
    queued: z.number().int(),
    keys: z.number().int(),
  }),
})

export const limits = {
  apiEdits: 20,
  webEdits: 100,
  text: 200,
  submitPerMin: 30,
  readPerMin: 240,
  running: 10,
  queued: 30,
  keys: 5,
  retentionHours: 72,
  imageIdHours: 24,
  jobTimeoutMin: 10,
  webUploadMb: 8,
  apiUploadMb: 20,
  minSide: 32,
  maxSide: 8000,
} as const

export type OcrLine = z.infer<typeof ocrLine>
export type OcrResponse = z.infer<typeof ocrResponse>
export type EditItem = z.infer<typeof editItem>
export type EditRequest = z.infer<typeof editRequest>
export type JobStatus = z.infer<typeof jobStatus>
export type JobResponse = z.infer<typeof jobResponse>
export type ResultState = z.infer<typeof resultState>
