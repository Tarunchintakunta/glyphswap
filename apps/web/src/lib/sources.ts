import { and, eq, schema } from "@glyphswap/db"
import { limits } from "@glyphswap/shared"
import { db } from "./db"
import { loadLines, RequestError, saveUpload } from "./pipeline"
import { assertPublicUrl } from "./ssrf"
import { mediaUrl } from "./storage"

const langs = new Set(["en", "latin", "hi", "te"])

export function parseLang(value: unknown) {
  const lang = typeof value === "string" && value ? value : "en"
  if (!langs.has(lang))
    throw new RequestError(400, "invalid_request", "lang must be en, latin, hi or te")
  return lang
}

export function decodeBase64(value: string) {
  const payload = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value
  const bytes = Buffer.from(payload, "base64")
  if (!bytes.length) throw new RequestError(400, "invalid_image", "image_base64 is empty")
  return bytes
}

export async function ingestImage(input: {
  userId: string
  bytes?: Buffer
  imageUrl?: string
  imageId?: string
  lang: string
  maxBytes: number
  maxAgeMs: number
}) {
  const present = [input.bytes, input.imageUrl, input.imageId].filter(
    (item) => item !== undefined,
  ).length
  if (present !== 1) {
    throw new RequestError(400, "invalid_request", "Provide exactly one image source")
  }
  if (input.imageId) {
    const [img] = await db
      .select()
      .from(schema.image)
      .where(and(eq(schema.image.id, input.imageId), eq(schema.image.userId, input.userId)))
    if (!img || img.expiresAt.getTime() < Date.now()) {
      throw new RequestError(404, "not_found", "Image not found")
    }
    if (Date.now() - img.createdAt.getTime() > input.maxAgeMs) {
      throw new RequestError(404, "not_found", "Image not found")
    }
    return {
      imageId: img.id,
      width: img.width,
      height: img.height,
      url: mediaUrl(img.storageKey),
      lines: await loadLines(img.id),
    }
  }
  let bytes = input.bytes
  if (input.imageUrl) {
    try {
      bytes = await assertPublicUrl(input.imageUrl)
    } catch {
      throw new RequestError(400, "invalid_image", "Image URL could not be fetched")
    }
  }
  if (!bytes) throw new RequestError(400, "invalid_image", "Image is empty")
  const saved = await saveUpload(input.userId, bytes, input.maxBytes, input.lang)
  return {
    imageId: saved.imageId,
    width: saved.width,
    height: saved.height,
    url: mediaUrl(saved.storageKey),
    lines: saved.lines,
  }
}

export function apiMaxBytes() {
  return limits.apiUploadMb * 1024 * 1024
}

export function webMaxBytes() {
  return Number(process.env.MAX_UPLOAD_MB ?? limits.webUploadMb) * 1024 * 1024
}

export function imageIdMaxAge() {
  return limits.imageIdHours * 60 * 60 * 1000
}
