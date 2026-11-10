# Standing rules for this repo

## Mode
- Model: Claude Opus. Plugin: ponytail. Simplest thing that works, YAGNI, stdlib first, no abstraction nobody asked for, no speculative config, delete dead code.
- Zero code comments. No docstrings, no `//` or `#` explanations, no commented-out code. Names carry meaning. Only exceptions: license headers where a license demands them, and `# type: ignore`/`eslint-disable` pragmas with a real reason.
- Never stop to ask basic questions. Decide, log, continue. Pick the boring proven option when unsure.
- Ask the user only for things physically impossible for you: payment details, OAuth consent screens, 2FA codes, legal sign-off. Batch those into one message at the end of a phase and keep working on everything else meanwhile.

## Decisions
- Every non-trivial choice (library, schema, model, threshold, infra plan) goes into `DECISIONS.md` as one entry: date, decision, options considered, why, how to revert. Benchmarks go with numbers.

## Git flow
- `main` is always deployable. Never commit directly to `main`.
- One branch per phase or feature: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`.
- Micro commits, Conventional Commits (`feat(editor): draw manual box`). One logical change per commit.
- Before every push: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and, for `inference/`, `uv run ruff check && uv run ruff format --check && uv run mypy . && uv run pytest -q`. A push with a red check is not allowed.
- Open a PR with `gh pr create --fill` plus a short body: what, why, screenshots for UI, test evidence.
- Merge only when CI is green: `gh pr checks --watch && gh pr merge --squash --delete-branch`. If CI fails, fix on the branch; never bypass.

## Self-review before every PR
- Re-read the full diff as a strict reviewer. Remove anything unused, duplicated or clever.
- No secrets, tokens, `.env`, weights, user uploads or eval outputs larger than 1 MB in git.
- Inputs validated at the edge (zod / pydantic). Errors are typed and returned, not swallowed.
- UI checked at 375, 768, 1280, 1440 in light and dark with Playwright screenshots. No layout shift, no console errors, keyboard reachable, visible focus, AA contrast.
- Performance: no blocking work on the request thread, images streamed, queries indexed.

## Secrets
- Real values only in `.env` (gitignored), Vercel env, Render env. `.env.example` lists every key with a safe placeholder.
- Never print secrets in logs, PR bodies or the final report.

## Code style
- TypeScript strict, no `any`. Server Components by default, client components only when interactive.
- Python 3.11, type hints everywhere, ruff + mypy strict on `inference/`.
- Small files, small functions, explicit names. Tests sit next to the code they cover.

## Reverse-engineering boundaries (Phase 0 and after)
- Study the reference product (rewords.ai) from public surfaces only: public pages, docs, the public editor flow, and network traffic your own browser session can see.
- Never copy their code, assets, copy, screenshots or branding into this repo. Screenshots live only in `teardown/` (gitignored) for our own reference. Never use their name in code or UI; the README may say "an open-source alternative to ReWords.AI" once.
- Never bypass auth, rate limits or paywalls. No credential stuffing, no automated bulk requests, no hammering endpoints. At most the free edits a normal visitor gets, on our own sample images.
- `TEARDOWN.md` holds the parity checklist. Every PR body lists which parity items it moves, and the final report shows parity status.
