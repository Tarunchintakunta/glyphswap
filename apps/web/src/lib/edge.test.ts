import { describe, expect, it } from "vitest"
import { resolveEdits, lengthWarning } from "./edits"
import { decideLimit } from "./http"
import { openApi } from "./openapi"
import { mediaSignatureOk, signMedia, signWebhook } from "./signature"
import { sniffImage } from "./sniff"
import { isPrivateAddress, literalBlocked } from "./ssrf"

const lines = [
  {
    id: "1",
    text: "sale",
    polygon: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ] as [number, number][],
    angle: 0,
    confidence: 1,
  },
  {
    id: "2",
    text: "SALE",
    polygon: [
      [0, 2],
      [1, 2],
      [1, 3],
      [0, 3],
    ] as [number, number][],
    angle: 0,
    confidence: 1,
  },
]

describe("edge helpers", () => {
  it("sniffs png jpeg and webp", () => {
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png")
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg")
    expect(sniffImage(Buffer.from("RIFF0000WEBP", "ascii"))).toBe("image/webp")
    expect(sniffImage(Buffer.from("nope"))).toBeNull()
  })

  it("blocks private literals without a lookup", () => {
    expect(literalBlocked("localhost")).toBe(true)
    expect(literalBlocked("127.0.0.1")).toBe(true)
    expect(isPrivateAddress("8.8.8.8")).toBe(false)
    expect(isPrivateAddress("10.1.1.1")).toBe(true)
  })

  it("signs webhooks and media links", () => {
    const signed = signWebhook("secret", '{"ok":true}', 10)
    expect(signed).toBe(`t=10,v1=${signed.split("v1=")[1]}`)
    const exp = Math.floor(Date.now() / 1000) + 60
    const sig = signMedia("user/a.png", exp)
    expect(mediaSignatureOk("user/a.png", exp, sig)).toBe(true)
    expect(mediaSignatureOk("user/a.png", exp - 120, sig)).toBe(false)
  })

  it("resolves text, first match, misses and boxes", () => {
    const all = resolveEdits(lines, [{ old_text: "SALE", new_text: "OPEN" }], 20)
    expect(all.ok && all.edits).toHaveLength(2)
    const first = resolveEdits(lines, [{ old_text: "SALE", new_text: "OPEN", match: "first" }], 20)
    expect(first.ok && first.edits).toHaveLength(1)
    const miss = resolveEdits(lines, [{ old_text: "nope", new_text: "x" }], 20)
    expect(miss.ok).toBe(false)
    if (!miss.ok) expect(miss.code).toBe("text_not_found")
    const box = resolveEdits(lines, [{ box: [1, 2, 3, 4], remove: true }], 20)
    expect(box.ok && box.edits[0]?.remove).toBe(true)
    expect(
      resolveEdits(
        lines,
        [
          { old_text: "SALE", new_text: "x" },
          { old_text: "SALE", new_text: "y" },
        ],
        1,
      ).ok,
    ).toBe(false)
    expect(lengthWarning("hello", "hello world!!")).toBe(true)
    expect(lengthWarning("hello", "hi")).toBe(false)
  })

  it("counts a sliding rate window", () => {
    expect(decideLimit(30, 30, 100, 50).ok).toBe(false)
    expect(decideLimit(0, 30, 100, null).remaining).toBe(29)
  })

  it("publishes the public paths", () => {
    expect(openApi.paths["/v1/ocr"]).toBeTruthy()
    expect(openApi.paths["/v1/edit"]).toBeTruthy()
    expect(openApi.paths["/v1/jobs/{id}"]).toBeTruthy()
    expect(openApi.paths["/v1/account"]).toBeTruthy()
  })
})
