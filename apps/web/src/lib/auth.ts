import { grantSignupCredits, schema } from "@glyphswap/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "./db"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
export const googleEnabled = Boolean(googleClientId && googleClientSecret)

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.info(`[auth] verify ${user.email}: ${url}`)
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
  user: {
    deleteUser: { enabled: true },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await grantSignupCredits(db, user.id, Number(process.env.FREE_CREDITS ?? 20))
        },
      },
    },
  },
  plugins: [nextCookies()],
})
