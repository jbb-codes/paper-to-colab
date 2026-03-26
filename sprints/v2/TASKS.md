# Sprint v2 — Tasks: Security Hardening

## Status: Complete

---

- [x] Task 1: Fix L3 — Switch gists from public to secret (P0)
  - Acceptance: `public: false` in `uploadGist.ts`; generated notebooks no longer appear in
    GitHub public gist search; Colab URL still resolves correctly with a secret gist ID
  - Files: `lib/uploadGist.ts`
  - Completed: 2026-03-26 — Changed `public: true` → `public: false` (one-line fix)

- [x] Task 2: Fix M2 — Remove raw LLM content from 422 error response (P0)
  - Acceptance: When the generate route returns a 422, the JSON body contains only `{ error: string }` —
    no `raw` field; the raw content is logged to `console.error` server-side instead
  - Files: `app/api/generate/route.ts`
  - Completed: 2026-03-26 — Removed `raw:` field from 422 response; added `console.error` log

- [x] Task 3: Fix L2 — Sanitise internal error messages sent to the client (P0)
  - Acceptance: `/api/extract` returns `{ error: "PDF parsing failed." }` (generic) on internal
    errors; `/api/generate` returns `{ error: "Generation failed. Please try again." }` for
    unexpected errors; real `err.message` and stack are only in `console.error`
  - Files: `app/api/extract/route.ts`, `app/api/generate/route.ts`
  - Completed: 2026-03-26 — Both routes now return generic messages; real errors logged server-side

- [x] Task 4: Fix L1 — Validate gistId before constructing colabUrl (P0)
  - Acceptance: In `uploadGist.ts`, after receiving GitHub's response, assert
    `data.id` matches `/^[a-f0-9]+$/i`; throw a descriptive error if it does not;
    colabUrl is never built from an unvalidated string
  - Files: `lib/uploadGist.ts`
  - Completed: 2026-03-26 — Added hex regex guard; updated stale test mocks with valid hex IDs

- [x] Task 5: Fix M1 — Add HTTP security headers to all responses (P0)
  - Acceptance: `next.config.js` exports a `headers()` function that sets these headers on
    `source: "/(.*)"`:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.groq.com https://api.github.com`
  - Files: `next.config.js`
  - Completed: 2026-03-26 — All 6 headers added via `headers()` in next.config.js

- [x] Task 6: Fix M3 — Add CORS origin restriction on API routes (P0)
  - Acceptance: `next.config.js` `headers()` also sets `Access-Control-Allow-Origin` to
    `process.env.NEXT_PUBLIC_BASE_URL` (falling back to `http://localhost:3000`) on
    `source: "/api/(.*)"` routes; a `.env.example` file documents the variable
  - Files: `next.config.js`, `.env.example` (new)
  - Completed: 2026-03-26 — CORS headers scoped to /api routes; .env.example created

- [x] Task 7: Fix H1 — Add IP-based rate limiting middleware (P0)
  - Acceptance: `middleware.ts` (new) intercepts `/api/extract` and `/api/generate`;
    allows max 10 requests per IP per 60-second window; returns `{ error: "Too many requests" }`
    with status 429 and `Retry-After: 60` header when exceeded; requests within the limit pass
    through unaffected; a code comment notes Upstash Redis as the production upgrade path for
    serverless deployments
  - Files: `middleware.ts` (new)
  - Completed: 2026-03-26 — In-memory sliding-window rate limiter; Upstash note included

- [x] Task 8: Fix H2 — Add two-layer prompt injection defence (P0)
  - Acceptance (Layer 1 — input): `lib/notebookPrompt.ts` exports `sanitizePaperText(text)`
    which strips any line containing case-insensitive variants of known injection phrases;
    `buildUserPrompt()` wraps the truncated text in `<paper>…</paper>` XML delimiters
  - Acceptance (Layer 2 — output): new file `lib/validateCells.ts` exports
    `scanForDangerousPatterns(cells)` which returns the first match if any `code` cell source
    contains dangerous Python patterns; generate route returns 422 if triggered
  - Files: `lib/notebookPrompt.ts`, `lib/validateCells.ts` (new), `app/api/generate/route.ts`
  - Completed: 2026-03-26 — Both layers implemented; updated stale PAPER TEXT: test to <paper>

- [x] Task 9: Write security unit and integration tests (P1)
  - Acceptance: `tests/unit/security.test.ts` and `tests/integration/security.test.ts` cover
    all 8 findings; `npm test` passes 177/177 tests across 17 test files
  - Files: `tests/unit/security.test.ts` (new), `tests/integration/security.test.ts` (new),
    plus per-task test files for tasks 1–8
  - Completed: 2026-03-26 — 53 security-specific tests; 177 total passing

- [x] Task 10: Final security verification pass (P1)
  - Acceptance:
    - `npm audit` returns `0 vulnerabilities` ✅
    - `semgrep --config auto app/ components/ lib/ middleware.ts` returns `0 findings` ✅
    - `npm run build` completes with no errors or warnings ✅
    - `npm test` passes 177/177 tests ✅
    - All 8 findings from the v1 security report resolved ✅
  - Files: `sprints/v2/TASKS.md` (this file)
  - Completed: 2026-03-26 — All checks clean
