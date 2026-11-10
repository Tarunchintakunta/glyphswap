# Blockers (needs a human)

1. **Neon**: create a Neon project `glyphswap` (or provide a Neon API key) and put `DATABASE_URL` in `.env` and Vercel env. Migrations: `pnpm --filter @glyphswap/db db:generate && pnpm --filter @glyphswap/db db:migrate`.
2. **Vercel**: `vercel login` and link `apps/web`, or provide a Vercel token.
3. **Render**: provide a Render API key or connect the repo via the Render dashboard for the inference service.
4. **Google OAuth**: consent screen + client id/secret (optional; email/password works without it).
