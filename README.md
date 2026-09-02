# Paper to Colab

A Next.js web application that converts academic PDF papers into runnable Jupyter notebooks and opens them directly in Google Colab — powered by Anthropic's Claude API.

> Built as part of the **Modern Software Developer Bootcamp**.

---

## What It Does

1. **Upload a PDF** — paste in any academic paper as a PDF
2. **Extract text** — the server extracts the paper's content via `pdf-parse`
3. **Generate a notebook** — Claude converts the paper into a structured `.ipynb` Jupyter notebook
4. **Open in Colab** — the notebook is uploaded as a secret GitHub Gist and a one-click "Open in Colab" link is returned

---

## Tech Stack

| Layer            | Technology                            |
| ---------------- | ------------------------------------- |
| Framework        | Next.js 16 (App Router)               |
| Language         | TypeScript                            |
| Styling          | Tailwind CSS                          |
| LLM              | Anthropic Claude (`claude-haiku-4-5`) |
| PDF parsing      | `pdf-parse`                           |
| Notebook hosting | GitHub Gists API                      |
| Unit tests       | Vitest                                |
| E2E tests        | Playwright                            |

---

## Sprints

### Sprint v1 — Core Features

Built the end-to-end user flow: PDF upload form, PDF text extraction API route, Claude notebook generation API route, `.ipynb` file builder, anonymous Gist upload, and light/dark theme toggle with system preference detection.

### Sprint v2 — Security Hardening

Resolved all 8 findings from the v1 manual security review (2 HIGH, 3 MEDIUM, 3 LOW):

- **Rate limiting** — sliding-window IP-based limiter in Next.js middleware (10 req/60s)
- **Prompt injection defence** — sanitizes paper text before it enters the LLM prompt; wraps content in `<paper>` delimiters
- **Dangerous cell scanning** — generated notebook cells are scanned for dangerous patterns before upload
- **HTTP security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **CORS policy** — API routes restricted to the configured `NEXT_PUBLIC_BASE_URL` origin
- **Information leakage** — all error responses return generic messages; internal details stay server-side only
- **Notebook privacy** — Gists are created as secret (not public)

Full details in [`sprints/v2/WALKTHROUGH.md`](sprints/v2/WALKTHROUGH.md).

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com) (entered in the app UI, not stored server-side)
- A GitHub Personal Access Token with `gist` scope (for uploading generated notebooks)

### Setup

```bash
npm install
cp .env.example .env.local
# Fill in GITHUB_TOKEN in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable               | Required   | Description                                                                                                    |
| ---------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`         | Yes        | GitHub PAT with `gist` write scope — required for Colab links (anonymous gist creation is no longer supported) |
| `NEXT_PUBLIC_BASE_URL` | Production | Your deployment URL, used for CORS (defaults to `http://localhost:3000`)                                       |

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run test       # Run Vitest unit tests
npm run test:e2e   # Run Playwright end-to-end tests
npm run lint       # ESLint
```

---

## Project Structure

```
app/
  api/
    extract/       # PDF text extraction route
    generate/      # Claude notebook generation route
  page.tsx         # Main UI
components/        # React components
lib/               # Shared utilities (prompt builder, cell validator, Gist uploader)
middleware.ts      # Rate limiting middleware
sprints/           # Sprint walkthroughs and notes
tests/             # Vitest unit tests
```
