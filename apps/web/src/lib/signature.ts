import { createHmac, timingSafeEqual } from "node:crypto"

export function signingSecret() {
  return process.env.WEBHOOK_SIGNING_SECRET || process.env.BETTER_AUTH_SECRET || "dev"
}

export function signWebhook(secret: string, body: string, unix: number) {
  const digest = createHmac("sha256", secret).update(`${unix}.${body}`).digest("hex")
  return `t=${unix},v1=${digest}`
}

export function signMedia(key: string, exp: number) {
  return createHmac("sha256", signingSecret()).update(`${key}.${exp}`).digest("hex")
}

export function mediaSignatureOk(key: string, exp: number, sig: string) {
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const expected = Buffer.from(signMedia(key, exp))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
