# Blockers (needs a human)

1. **Neon**: create a Neon project `glyphswap` (or provide a Neon API key) and put `DATABASE_URL` in `.env` and Vercel env. Migrations: `pnpm --filter @glyphswap/db db:generate && pnpm --filter @glyphswap/db db:migrate`.
2. **Vercel**: `vercel login` and link `apps/web`, or provide a Vercel token.
3. **Render**: provide a Render API key or connect the repo via the Render dashboard for the inference service.
4. **Google OAuth**: consent screen + client id/secret (optional; email/password works without it).
5. **Teardown baselines (optional)**: Phase 0 skipped the Playwright editor walk, network capture and free-edit quality baselines by operator instruction. A human may capture them into `teardown/` (gitignored) if wanted.
4. **Google OAuth**: consent screen + client id/secret (optional; email/password works without it). Without them the Google button is hidden. Redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`.
5. **Email provider**: verification links are only printed to the server console. Production needs a mail provider (e.g. Resend API key) before turning on `requireEmailVerification`.
