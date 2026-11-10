import { describe, expect, it } from "vitest"
import { safeNext } from "./redirect"

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/app/history?x=1")).toBe("/app/history?x=1")
  })
  it("rejects external and missing targets", () => {
    for (const bad of [
      undefined,
      ["/a"],
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "app",
    ]) {
      expect(safeNext(bad)).toBe("/app")
    }
  })
})
