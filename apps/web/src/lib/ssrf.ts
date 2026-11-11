import { lookup } from "node:dns/promises"
import { BlockList, isIP } from "node:net"

const blocked = new BlockList()
blocked.addSubnet("0.0.0.0", 8, "ipv4")
blocked.addSubnet("10.0.0.0", 8, "ipv4")
blocked.addSubnet("100.64.0.0", 10, "ipv4")
blocked.addSubnet("127.0.0.0", 8, "ipv4")
blocked.addSubnet("169.254.0.0", 16, "ipv4")
blocked.addSubnet("172.16.0.0", 12, "ipv4")
blocked.addSubnet("192.168.0.0", 16, "ipv4")
blocked.addSubnet("255.0.0.0", 8, "ipv4")
blocked.addAddress("::1", "ipv6")
blocked.addSubnet("fc00::", 7, "ipv6")
blocked.addSubnet("fe80::", 10, "ipv6")

export function isPrivateAddress(ip: string) {
  const kind = isIP(ip)
  if (kind === 0) return true
  return blocked.check(ip, kind === 4 ? "ipv4" : "ipv6")
}

export function literalBlocked(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true
  if (isIP(host)) return isPrivateAddress(host)
  return false
}

export async function assertPublicHost(raw: string) {
  const url = new URL(raw)
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol")
  if (url.username || url.password) throw new Error("credentials are not allowed")
  if (literalBlocked(url.hostname)) throw new Error("private address")
  const records = await lookup(url.hostname, { all: true, verbatim: true })
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("private address")
  }
}

export async function assertPublicUrl(raw: string) {
  let current = raw
  for (let hop = 0; hop < 4; hop += 1) {
    const url = new URL(current)
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error("unsupported protocol")
    if (url.username || url.password) throw new Error("credentials are not allowed")
    if (literalBlocked(url.hostname)) throw new Error("private address")
    const records = await lookup(url.hostname, { all: true, verbatim: true })
    if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
      throw new Error("private address")
    }
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) })
    if (response.status >= 300 && response.status < 400) {
      if (hop === 3) throw new Error("too many redirects")
      const location = response.headers.get("location")
      if (!location) throw new Error("redirect missing location")
      current = new URL(location, url).toString()
      continue
    }
    if (!response.ok) throw new Error(`fetch failed (${response.status})`)
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes
  }
  throw new Error("too many redirects")
}
