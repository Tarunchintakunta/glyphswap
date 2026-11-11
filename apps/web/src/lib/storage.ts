import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { signMedia } from "./signature"

export function storageRoot() {
  const configured = process.env.LOCAL_STORAGE_DIR ?? "data"
  if (path.isAbsolute(configured)) return configured
  const cwd = process.cwd()
  const root = cwd.endsWith(`${path.sep}apps${path.sep}web`) ? path.resolve(cwd, "../..") : cwd
  return path.join(root, configured)
}

export function storagePath(key: string) {
  if (!key || key.includes("..") || path.isAbsolute(key)) throw new Error("bad key")
  const root = path.resolve(storageRoot())
  const full = path.resolve(root, key)
  if (full !== path.join(root, key)) throw new Error("bad key")
  return full
}

export async function writeStorage(key: string, bytes: Buffer) {
  const full = storagePath(key)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, bytes)
}

export async function readStorage(key: string) {
  return readFile(storagePath(key))
}

export async function removeStorage(key: string) {
  await rm(storagePath(key), { force: true })
}

export function mediaUrl(key: string) {
  const exp = Math.floor(Date.now() / 1000) + 15 * 60
  const sig = signMedia(key, exp)
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  const encoded = key.split("/").map(encodeURIComponent).join("/")
  return `${base}/api/media/${encoded}?exp=${exp}&sig=${sig}`
}
