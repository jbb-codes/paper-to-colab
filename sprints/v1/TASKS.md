# Sprint v1 — Tasks

## Status: Not Started

---

- [x] Task 1: Initialize Next.js 14 project with Tailwind CSS and dependencies (P0)
  - Acceptance: `npm run dev` starts without errors; Tailwind is configured; `pdf-parse` and `groq-sdk` npm packages are installed
  - Files: `package.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`, `next.config.ts`
  - Completed: 2026-03-25 — Manually scaffolded Next.js 14 (App Router), Tailwind, postcss, autoprefixer, groq-sdk, pdf-parse, vitest. 10/10 tests pass. Security: esbuild/glob vulns are dev-only; Next.js CVEs require v16 upgrade — deferred to v2 (not deployed in v1).

- [x] Task 2: Build the global dark theme and base layout (P0)
  - Acceptance: App renders with near-black background (`#0a0a0a`), white text, JetBrains Mono for code accents, Inter for body; matches arcprize.org aesthetic; no light mode flicker
  - Files: `app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`
  - Completed: 2026-03-25 — Theme was fully configured in Task 1 scaffold: #0a0a0a background, color-scheme:dark, Inter/JetBrains Mono fonts, all Tailwind color tokens (background, surface, border, accent, muted, highlight). 14/14 unit tests pass.

- [x] Task 3: Build the main page UI — API key input + PDF upload form (P0)
  - Acceptance: Page renders a centered single-column layout with: (1) headline + subheading, (2) OpenAI API key text input (password type, never sent to any log), (3) PDF drag-and-drop upload zone, (4) "Generate Notebook" submit button; button is disabled until both fields are filled; client-side only (no API call yet)
  - Files: `app/page.tsx`, `components/ApiKeyInput.tsx`, `components/PdfDropzone.tsx`, `components/GenerateButton.tsx`
  - Completed: 2026-03-25 — Implemented ApiKeyInput (password type, show/hide toggle), PdfDropzone (drag-and-drop + click-to-browse), GenerateButton (disabled until both fields filled). Also fixed next.config.ts → next.config.js and converted serverExternalPackages to experimental.serverComponentsExternalPackages for Next.js 14. 7/7 Playwright E2E tests pass with screenshots.

- [x] Task 4: Build the processing state UI with animated status messages (P0)
  - Acceptance: When generation is in progress, the form is replaced by a full-screen processing view showing: animated spinner or pulsing indicator, sequential status messages that cycle through the 7 defined stages with a typewriter or fade-in animation; no layout shift when transitioning from form to processing view
  - Files: `components/ProcessingView.tsx`, `lib/statusMessages.ts`
  - Completed: 2026-03-25 — ProcessingView component with spinning border animation, fade-in/out message transitions, progress bar, step counter. statusMessages.ts exports all 7 sequential status messages. 9/9 unit tests + 3/3 E2E tests pass.

- [ ] Task 5: Implement PDF text extraction API route (P0)
  - Acceptance: `POST /api/extract` accepts a multipart form upload of a PDF file; uses `pdf-parse` to extract full text; returns `{ text: string, pageCount: number }`; handles errors (non-PDF, empty file, oversized file >20MB) with clear error messages
  - Files: `app/api/extract/route.ts`

- [ ] Task 6: Implement the OpenAI notebook generation API route (P0)
  - Acceptance: `POST /api/generate` accepts `{ paperText: string, apiKey: string }`; calls Groq `llama-3.3-70b-versatile` with a carefully engineered system prompt that instructs the model to return a structured JSON representing notebook cells (type: `markdown` or `code`, source: string[]); prompt enforces the 7-section notebook structure defined in the PRD; synthetic data must be realistic and domain-appropriate; returns raw notebook cell array
  - Files: `app/api/generate/route.ts`, `lib/notebookPrompt.ts`

- [ ] Task 7: Implement .ipynb file builder and download (P0)
  - Acceptance: A utility function takes the AI-returned cell array and constructs a valid `.ipynb` JSON (nbformat 4.4, with correct metadata for Python 3 kernel); the generate API route returns this as a downloadable file response with `Content-Disposition: attachment; filename="<paper-title>.ipynb"`; clicking "Download" in the UI triggers the file save
  - Files: `lib/buildNotebook.ts`, update `app/api/generate/route.ts`, `components/ResultView.tsx`

- [ ] Task 8: Implement anonymous GitHub Gist upload and "Open in Colab" link (P1)
  - Acceptance: After notebook generation, the server POSTs the `.ipynb` content to `https://api.github.com/gists` as an anonymous gist (no auth token); extracts the gist ID from the response; constructs the Colab URL as `https://colab.research.google.com/gist/anonymous/<gistId>`; returns `colabUrl` alongside the notebook download; UI shows an "Open in Colab" button that opens this URL in a new tab
  - Files: `lib/uploadGist.ts`, update `app/api/generate/route.ts`, update `components/ResultView.tsx`

- [ ] Task 9: Wire up full end-to-end flow with error handling (P0)
  - Acceptance: Clicking "Generate Notebook" triggers: (1) PDF extraction, (2) notebook generation with live status cycling, (3) result view with download + Colab buttons; all API errors surface as readable messages in the UI (invalid API key, model error, PDF parse failure, gist upload failure); no unhandled promise rejections; the user can reset and try again after any error
  - Files: `app/page.tsx` (state machine wiring), `components/ErrorView.tsx`

- [ ] Task 10: Final UI polish — typography, spacing, responsive layout, micro-interactions (P2)
  - Acceptance: Page looks polished on 1280px+ desktop (primary target) and readable on 768px tablet; upload zone has hover/drag-active states; buttons have hover transitions; API key input has a show/hide toggle; result section animates in smoothly; overall aesthetic matches arcprize.org's precise, technical, confident visual language
  - Files: Various component updates, `app/globals.css`
