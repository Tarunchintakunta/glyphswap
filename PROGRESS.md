# Progress

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Teardown | done (#2) | TEARDOWN.md from public pages; 30 parity, 10 beat-it items; screenshots, network capture and baselines skipped |
| 1 Bootstrap | done (#1) | monorepo, CI, stub inference, Drizzle schema |
| 2 Neon | done locally | migrations applied from local `.env`; Vercel env still open |
| 3 Auth + login | done (#3) | Better Auth + Drizzle, account deletion, signup credits |
| 4 Landing | done (#3) | hero, languages, API teaser, FAQ, legal pages |
| 5 Inference | done (#4) | Result B plus Lanczos Result C; Result A stays off unless `ENABLE_DIFFUSION` |
| 6 Editor | done (branch) | upload, boxes, style overrides, history, job compare, settings |
| 7 Public API | done (branch) | `/v1/ocr`, `/v1/edit`, jobs, account, OpenAPI, keys, webhooks, retention cron |
| 8 Deploy | blocked | no Vercel/Render credentials on the build machine |
| 9 Eval | done (branch) | `make eval` writes `eval/report.md`; scores need the OCR models on the machine that runs it |
| 10 OSS polish | done (branch) | contributing, conduct, security, issue and PR templates, README API examples |
