# Sprint v2 — PRD: Security Hardening

## Overview
Sprint v2 addresses all findings from the v1 manual security review. It fixes 2 HIGH, 3 MEDIUM,
and 3 LOW severity vulnerabilities — covering rate limiting, prompt injection, HTTP security
headers, CORS policy, information leakage, and gist exposure — without changing any user-visible
behaviour or adding new features.

## Goals
- All 8 security findings from the v1 review are resolved
- Both API routes are rate-limited and cannot be abused by unauthenticated callers
- Malicious PDF content cannot redirect the LLM or inject dangerous code cells into the notebook
- HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) are returned on every response
- Internal error details and raw LLM output are never sent to the browser
- Generated notebooks are uploaded as secret (unlisted) gists, not public ones
- `npm audit` returns 0 vulnerabilities, `semgrep --config auto` returns 0 findings

## User Stories
- As a researcher, I want my generated notebooks to be private (secret gist), so strangers cannot
  discover my work via GitHub search
- As a researcher, I want confidence that a malicious PDF cannot make the AI produce harmful
  notebook code, so I can safely open generated notebooks in Colab
- As a site operator, I want API endpoints rate-limited, so a bad actor cannot hammer the server
  or proxy unlimited requests to Groq
- As a site operator, I want standard security headers set, so browser-based attacks (XSS,
  clickjacking, MIME sniffing) are mitigated by default

## Security Findings Addressed

| ID | Severity | Finding                                       |
|----|----------|-----------------------------------------------|
| H1 | HIGH     | No rate limiting on `/api/extract` or `/api/generate` |
| H2 | HIGH     | Prompt injection via unsanitised PDF content  |
| M1 | MEDIUM   | Missing HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) |
| M2 | MEDIUM   | Raw LLM response fragment exposed in 422 error body |
| M3 | MEDIUM   | No CORS policy — relies on browser same-origin default |
| L1 | LOW      | `colabUrl` rendered as href without URL validation |
| L2 | LOW      | Internal `err.message` strings forwarded to client |
| L3 | LOW      | Notebooks uploaded as **public** GitHub Gists |

## Technical Architecture

No new external services or dependencies are introduced. All fixes are implemented inside the
existing Next.js 14 codebase.

```
next.config.js
└── headers() — M1: security headers on all routes (CSP, HSTS, X-Frame, etc.)
              — M3: CORS origin restriction on /api/* routes

app/middleware.ts  (NEW)
└── IP-based sliding-window rate limiter — H1
    10 req / 60 s per IP on /api/extract and /api/generate

lib/notebookPrompt.ts  (MODIFIED)
└── wrapPaperInDelimiters()  — H2a: explicit <paper> tag isolation
    sanitizePaperText()      — H2a: strip known injection phrases

lib/validateCells.ts  (NEW)
└── scanForDangerousPatterns() — H2b: blocklist of dangerous Python builtins
    (os.system, subprocess, eval, exec, __import__, urllib.request, socket)

app/api/generate/route.ts  (MODIFIED)
├── Remove `raw` field from 422 response — M2
├── Validate gistId is alphanumeric before building colabUrl — L1
└── Call scanForDangerousPatterns() on generated cells — H2b

app/api/extract/route.ts  (MODIFIED)
└── Return generic error message; log real err server-side — L2

lib/uploadGist.ts  (MODIFIED)
└── public: false  →  secret gists — L3

tests/unit/security.test.ts  (NEW)
└── Unit tests for sanitizePaperText(), scanForDangerousPatterns(),
    gistId validation, and error message sanitization

tests/integration/security.test.ts  (NEW)
└── Integration tests verifying 422 body has no `raw` field,
    rate limiter returns 429 on excess requests, headers present
```

### Rate Limiter Design
In-memory sliding window keyed by IP, implemented in `app/middleware.ts` using Next.js
`NextResponse` and a module-level `Map`. Limits: **10 requests per 60 seconds per IP** on
`/api/extract` and `/api/generate`. Suitable for single-instance and development; for serverless
(Vercel) a note is added in the code pointing to Upstash Redis as the production upgrade path.

### Prompt Injection Defence (H2) — Two Layers
**Layer 1 — Input sanitisation** (`lib/notebookPrompt.ts`):
- Strip lines from the paper text that contain known injection signals:
  `ignore previous`, `ignore all`, `system prompt`, `jailbreak`, `disregard`, `new instructions`
- Wrap the paper text in explicit `<paper>` XML delimiters with model instructions to treat
  content inside as raw document data only

**Layer 2 — Output validation** (`lib/validateCells.ts`):
- After the LLM returns cells, scan every `code` cell source for a blocklist of dangerous Python
  patterns: `os.system`, `subprocess`, `eval(`, `exec(`, `__import__`, `urllib.request.urlopen`,
  `socket.`, `open(` with write modes
- If any are found, reject the entire generation with a 422 and a user-facing message explaining
  the paper may contain adversarial content

## Out of Scope (v3+)
- User authentication / accounts
- Server-side Groq key (hosted model access)
- Notebook history / saved generations
- Batch processing (multiple PDFs)
- In-browser notebook editor
- Deployment infrastructure / CI/CD pipeline
- Persistent rate limiting across serverless instances (Upstash Redis)
- Image/figure understanding in PDFs

## Dependencies
- All v1 deliverables (existing codebase must be in working state)
- No new npm packages required
- `npm audit` must already show 0 vulnerabilities (achieved in v1 → upgrade session)
