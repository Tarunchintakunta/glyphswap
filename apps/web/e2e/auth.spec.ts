import { expect, test } from "@playwright/test"

test("signup, sign out, login and protected redirect", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  const password = "Glyph-swap-2026"

  await page.goto("/app/history")
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fhistory/)

  await page.getByRole("link", { name: "Create account" }).click()
  await page.getByLabel("Name").fill("E2E")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/app\/history$/)

  await page.goto("/app")
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByTestId("credits")).toHaveText("20")

  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/app")
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/)

  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill("wrong-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(/invalid/i)

  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByText(email)).toBeVisible()
})
