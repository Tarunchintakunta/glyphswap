import { describe, expect, it } from "vitest"
import { editRequest } from "./index"

describe("editRequest", () => {
  it("accepts an image_id with old/new pairs", () => {
    const parsed = editRequest.parse({
      image_id: "img_1",
      edits: [{ old_text: "a", new_text: "b" }],
    })
    expect(parsed.results).toEqual(["B"])
  })

  it("rejects both image_id and image_url", () => {
    const result = editRequest.safeParse({
      image_id: "img_1",
      image_url: "https://example.com/a.png",
      edits: [{ old_text: "a", new_text: "b" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts a remove box", () => {
    expect(
      editRequest.safeParse({ image_id: "x", edits: [{ box: [0, 0, 10, 10], remove: true }] })
        .success,
    ).toBe(true)
  })
})
