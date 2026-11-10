export const strengthLabels = ["Too short", "Weak", "Fair", "Good", "Strong"] as const

export function passwordStrength(password: string) {
  if (password.length < 8) return 0
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length
  const score =
    (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0) + Math.max(classes - 1, 0)
  return Math.min(Math.max(score, 1), 4)
}
