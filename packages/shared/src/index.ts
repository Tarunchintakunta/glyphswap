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

export const editItem = z.union([
  z.object({ old_text: z.string().min(1), new_text: z.string() }),
  z.object({ line_id: z.string(), new_text: z.string() }),
  z.object({ box, new_text: z.string() }),
  z.object({ box, remove: z.literal(true) }),
])

export const resultKind = z.enum(["A", "B", "C"])

export const editRequest = z
  .object({
    image_id: z.string().optional(),
    image_url: z.string().url().optional(),
    edits: z.array(editItem).min(1),
    results: z.array(resultKind).default(["B"]),
    webhook_url: z.string().url().optional(),
  })
  .refine((v) => Boolean(v.image_id) !== Boolean(v.image_url), {
    message: "Provide exactly one of image_id or image_url",
  })

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

export const resultAsset = z.object({
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
})

export const jobResponse = z.object({
  job_id: z.string(),
  status: jobStatus,
  stage: z.string(),
  progress: z.number().int().min(0).max(100),
  results: z.object({ A: resultAsset.optional(), B: resultAsset.optional(), C: resultAsset.optional() }),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
})

export const apiError = z.object({ error: z.object({ code: z.string(), message: z.string() }) })

export type OcrLine = z.infer<typeof ocrLine>
export type OcrResponse = z.infer<typeof ocrResponse>
export type EditRequest = z.infer<typeof editRequest>
export type JobStatus = z.infer<typeof jobStatus>
export type JobResponse = z.infer<typeof jobResponse>
