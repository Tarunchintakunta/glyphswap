import { describe, expect, it } from "vitest"
import { passwordStrength } from "./password-strength"

describe("passwordStrength", () => {
  it("scores from too short to strong", () => {
    expect(passwordStrength("abc")).toBe(0)
    expect(passwordStrength("abcdefgh")).toBe(1)
    expect(passwordStrength("abcdefgh12")).toBe(1)
    expect(passwordStrength("Abcdefgh12")).toBe(2)
    expect(passwordStrength("Abcdefgh12!x")).toBe(4)
    expect(passwordStrength("correct horse battery")).toBe(3)
  })
})
