export class InferenceError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type OcrPayload = {
  engine: string
  width: number
  height: number
  lines: { text: string; polygon: [number, number][]; angle: number; confidence: number }[]
}

export type RemoteResult = {
  status: "pending" | "ready" | "unavailable"
  reason?: string | null
  width?: number | null
  height?: number | null
}

export type RemoteJob = {
  job_id: string
  status: "queued" | "running" | "done" | "failed"
  stage: string
  progress: number
  results: Partial<Record<"A" | "B" | "C", RemoteResult>>
  error?: string | null
}

function root() {
  return (process.env.INFERENCE_URL ?? "http://localhost:8000").replace(/\/$/, "")
}

function headers() {
  return { Authorization: `Bearer ${process.env.INFERENCE_TOKEN ?? "dev-token"}` }
}

async function request(path: string, init: RequestInit) {
  const response = await fetch(`${root()}${path}`, {
    ...init,
    headers: { ...headers(), ...init.headers },
  })
  if (!response.ok) throw new InferenceError(response.status, (await response.text()).slice(0, 500))
  return response
}

export async function ocrImage(bytes: Buffer, mime: string, lang: string) {
  const form = new FormData()
  form.set("lang", lang)
  form.set("image", new Blob([new Uint8Array(bytes)], { type: mime }), "upload")
  const response = await request("/ocr", { method: "POST", body: form })
  return (await response.json()) as OcrPayload
}

export async function enqueueJob(bytes: Buffer, payload: unknown) {
  const form = new FormData()
  form.set("payload", JSON.stringify(payload))
  form.set("image", new Blob([new Uint8Array(bytes)]), "upload")
  const response = await request("/jobs", { method: "POST", body: form })
  return (await response.json()) as { job_id: string }
}

export async function fetchJob(id: string) {
  const response = await request(`/jobs/${id}`, {})
  return (await response.json()) as RemoteJob
}

export async function fetchResult(id: string, kind: "A" | "B" | "C") {
  const response = await request(`/jobs/${id}/result/${kind}`, {})
  return Buffer.from(await response.arrayBuffer())
}

export function eventsUrl(id: string) {
  return `${root()}/jobs/${id}/events`
}

export function inferenceHeaders() {
  return headers()
}
