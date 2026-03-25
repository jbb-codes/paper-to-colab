# Sprint v1 — Walkthrough

## Summary

Sprint v1 delivered a complete, end-to-end Next.js 14 web application that accepts a research paper PDF and a user-supplied Groq API key, then calls the Groq `llama-3.3-70b-versatile` model to generate a structured Google Colab notebook implementing the paper's core algorithms as a tutorial. The app renders as a polished dark-themed single-page UI (Tokyo Night color scheme), walks through PDF extraction, AI generation, and `.ipynb` file assembly in a single browser session, and optionally uploads the finished notebook to an anonymous GitHub Gist so it can be opened directly in Google Colab with one click. All 10 planned tasks were completed in a single day (2026-03-25), with 14 unit tests, 20 integration tests, and 26 Playwright E2E tests covering the full stack.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 — App Router, client components)            │
│                                                                  │
│  app/layout.tsx                                                  │
│  ├── <ThemeProvider>      (context: theme state + toggle)        │
│  │   ├── <Header>         (logo, v1.0 badge, theme toggle)       │
│  │   └── {children}                                              │
│  │       └── app/page.tsx  (state machine: form|processing|      │
│  │                          result|error)                        │
│  │           ├── [form]                                          │
│  │           │   ├── <ApiKeyInput>    (password input, show/hide)│
│  │           │   ├── <PdfDropzone>   (drag-and-drop, file pick)  │
│  │           │   └── <GenerateButton>(disabled until both filled)│
│  │           ├── [processing]                                    │
│  │           │   └── <ProcessingView>(spinner, status msg,       │
│  │           │                        progress bar, step counter)│
│  │           ├── [result]                                        │
│  │           │   └── <ResultView>    (download btn, Colab link,  │
│  │           │                        cell count preview, reset) │
│  │           └── [error]                                         │
│  │               └── <ErrorView>     (error msg, Try Again btn)  │
│  └──────────────────────────────────────────────────────────────┘
           │ POST /api/extract (multipart/form-data)
           │ POST /api/generate (JSON)
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js API Routes (server-side, Node.js runtime)               │
│                                                                  │
│  app/api/extract/route.ts                                        │
│  └── validates file → pdf-parse → returns { text, pageCount }   │
│                                                                  │
│  app/api/generate/route.ts                                       │
│  ├── validates inputs                                            │
│  ├── lib/notebookPrompt.ts  → SYSTEM_PROMPT + buildUserPrompt()  │
│  │                             (truncates paper to 12,000 chars) │
│  ├── Groq SDK → llama-3.3-70b-versatile (temp=0.3, max=4096tok) │
│  ├── JSON parse + cell validation / fence-stripping              │
│  ├── lib/buildNotebook.ts → buildNotebook() → .ipynb JSON        │
│  │                          titleToFilename() → safe filename    │
│  └── lib/uploadGist.ts → GitHub Gist API (anonymous POST)        │
│       returns { gistId, gistUrl, colabUrl }                      │
└──────────────────────────────────────────────────────────────────┘
           │ POST https://api.github.com/gists (no auth)
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  External Services                                               │
│  ├── Groq API (api.groq.com)  — user-supplied key at runtime     │
│  └── GitHub Gist API          — anonymous, no token required     │
│       └── colab.research.google.com/gist/anonymous/<id>          │
└──────────────────────────────────────────────────────────────────┘

lib/
├── statusMessages.ts   — 7 user-facing progress strings (const)
├── notebookPrompt.ts   — SYSTEM_PROMPT + buildUserPrompt()
├── buildNotebook.ts    — buildNotebook(), titleToFilename(), types
└── uploadGist.ts       — uploadGist() async function

components/
├── ThemeProvider.tsx   — React context, localStorage sync, FOUC fix
├── ThemeToggle.tsx     — standalone toggle button (superseded by Header)
├── Header.tsx          — fixed top bar: logo + version badge + toggle
├── ApiKeyInput.tsx     — controlled input, show/hide toggle
├── PdfDropzone.tsx     — drag-and-drop + click-to-browse
├── GenerateButton.tsx  — disabled-state aware CTA button
├── ProcessingView.tsx  — animated spinner, fade messages, progress bar
├── ResultView.tsx      — download trigger, Colab link, cell summary
└── ErrorView.tsx       — error display + reset button

tests/
├── unit/
│   ├── setup.test.ts               (10 tests — project bootstrap)
│   ├── task2-theme.test.ts         (14 tests — CSS/config checks)
│   ├── task4-status-messages.test.ts (9 tests — statusMessages.ts)
│   ├── task7-build-notebook.test.ts  (13 tests — buildNotebook())
│   └── task8-upload-gist.test.ts     (7 tests — uploadGist() mocked)
├── integration/
│   ├── task5-extract.test.ts       (8 tests — extract route file)
│   └── task6-generate.test.ts      (12 tests — generate route + prompt)
└── e2e/
    ├── task3-ui.spec.ts            (7 tests — Playwright)
    ├── task4-processing.spec.ts    (3 tests — Playwright)
    ├── task9-wiring.spec.ts        (7 tests — Playwright)
    └── task10-polish.spec.ts       (8 tests — Playwright)
```

---

## Files Created/Modified

---

### `app/layout.tsx`

**Purpose**: Root layout that wraps every page in the theme system and persistent header.

**Key Functions/Components**:
- `RootLayout` — Next.js root layout; injects inline theme script, renders `<ThemeProvider>` and `<Header>`
- `themeScript` — inline `<script>` injected into `<head>` before hydration

**How it works**:

The layout solves a classic dark-theme problem: if you let React hydrate before applying the theme, the page will briefly flash in the wrong color scheme (FOUC — Flash of Unstyled Content). The fix is an inline script that reads `localStorage` and `prefers-color-scheme` and sets `data-theme` on `<html>` synchronously, before any React code runs:

```ts
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
`;
```

The `try/catch` guards against environments where `localStorage` is unavailable (e.g., private browsing with strict settings). The `suppressHydrationWarning` prop on `<html>` tells React not to complain about the server-rendered HTML lacking `data-theme` — the attribute is added client-side by this script.

`ThemeProvider` then mounts inside `<body>`, reads the same storage, and keeps React state in sync with the DOM attribute for components that need to react to theme changes at runtime. `<Header>` is rendered at the layout level so it persists across all routes without remounting.

---

### `app/globals.css`

**Purpose**: Global stylesheet defining the two-theme CSS variable system, typography, and utility classes.

**Key Functions/Components**:
- `:root` / `[data-theme="dark"]` — Tokyo Night dark palette variables
- `[data-theme="light"]` — light palette overrides
- `.dot-grid` — hero section background texture
- `.rule-fade` — horizontal rule with fade-to-transparent edges

**How it works**:

All colors throughout the app are CSS custom properties (`--background`, `--surface`, `--border`, `--accent`, `--muted`, `--highlight`, `--primary`, `--primary-hover`, `--primary-fg`, `--grid-dot`). This means theme switching requires only changing the `data-theme` attribute on `<html>` — no class toggling or style injection. Tailwind's color tokens map directly to these variables via `tailwind.config.ts`, so Tailwind utility classes like `bg-background` or `text-muted` respond to theme changes automatically.

The dark theme uses the Tokyo Night palette: a blue-navy background (`#1a1b26`), a slightly lighter surface (`#1f2335`), muted blue borders (`#2e3250`), and an orange accent (`#ff9e64`) for all interactive elements. The light theme is a warm off-white with darker orange (`#ea580c`) for the same accent role.

The `.dot-grid` class creates the hero section's subtle background texture using a repeating radial gradient — a single 1px dot every 28px, colored by `--grid-dot` (which is nearly transparent in both themes). Google Fonts imports Inter and JetBrains Mono at the top of the file; `code`, `pre`, and `.font-mono` elements use the monospace family.

---

### `app/page.tsx`

**Purpose**: The root page component; implements the complete UI state machine orchestrating all four views and both API calls.

**Key Functions/Components**:
- `Home` — default export; the single page component
- `handleGenerate` — async function that runs the full PDF → notebook pipeline
- `advanceStep` — schedules `setTimeout` calls to advance the processing step counter
- `handleReset` — resets all state back to the form

**How it works**:

The page is a client component (`"use client"`) that manages four named states via a `type AppState = "form" | "processing" | "result" | "error"` discriminated union. The component renders a completely different subtree for each state, ensuring clean transitions with no stale UI.

When the user clicks "Generate Notebook", `handleGenerate` fires:

```ts
const cleanup = advanceStep(setProcessingStep, 7);
// Step 1: POST /api/extract with FormData
const extractRes = await fetch("/api/extract", { method: "POST", body: formData });
// Step 2: POST /api/generate with JSON
const generateRes = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ paperText, apiKey: apiKey.trim() }),
});
```

`advanceStep` fires seven `setTimeout` calls at 3.5-second intervals to advance the visual step counter while the real API calls are running. This is a deliberate UX hack: the actual API calls don't emit progress events, so the step counter is purely time-based. The `cleanup` function cancels all pending timeouts when the real work completes (success or error), preventing stale state updates.

The form section itself is built as a numbered step list (01, 02, 03) with thin vertical connector lines between steps, mimicking a process/pipeline visual. Each step is a flex row with a fixed-width monospace step number and the actual input component beside it.

---

### `app/api/extract/route.ts`

**Purpose**: Server-side API route that accepts a PDF file upload and returns extracted plain text.

**Key Functions/Components**:
- `POST` — exported Next.js route handler

**How it works**:

The route validates inputs in strict order before touching the file content: it checks for `multipart/form-data` content type, verifies the file field is present, rejects empty files (size === 0), enforces a 20MB ceiling, and validates the MIME type or `.pdf` extension. Each failure returns a distinct HTTP status code (400, 413, 415) with a human-readable error message that surfaces directly in the UI.

```ts
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const isPdf =
  file.type === "application/pdf" ||
  file.name.toLowerCase().endsWith(".pdf");
```

`pdf-parse` is loaded via a dynamic import (`await import("pdf-parse")`) rather than a top-level import. This keeps the native Node module out of the client bundle and avoids bundling errors in Next.js edge or browser environments. The `next.config.js` also marks `pdf-parse` as `serverComponentsExternalPackages` for the same reason. On success, the route returns `{ text: string, pageCount: number }` — the raw UTF-8 text of the entire PDF and the page count.

---

### `app/api/generate/route.ts`

**Purpose**: Server-side API route that calls Groq's LLM with the extracted paper text and returns a fully assembled `.ipynb` notebook JSON.

**Key Functions/Components**:
- `POST` — exported route handler
- `extractTitle` — parses the first H1 from the first markdown cell to derive a filename

**How it works**:

The route instantiates a Groq client with the user-supplied API key (not a server-stored key), then calls `chat.completions.create` with `temperature: 0.3` (low randomness for reproducible code) and `max_tokens: 4096`. The low temperature is a deliberate choice: higher values produce more creative narrative but are more likely to generate syntactically invalid Python.

```ts
const groq = new Groq({ apiKey: apiKey.trim() });
const completion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: buildUserPrompt(paperText) },
  ],
  temperature: 0.3,
  max_tokens: 4096,
});
```

After the model responds, the route defensively strips markdown code fences (the model occasionally wraps JSON in triple backticks despite the prompt explicitly forbidding it), then `JSON.parse`s the result and filters out any malformed cells:

```ts
const cleaned = rawContent.trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/i, "")
  .trim();

cells = cells.filter(
  (cell): cell is NotebookCell =>
    typeof cell === "object" && cell !== null &&
    (cell.type === "markdown" || cell.type === "code") &&
    typeof cell.source === "string"
);
```

Gist upload is treated as non-critical: if `uploadGist` throws, the error is caught, stored in `gistError`, and the response still returns the notebook. The client receives `colabUrl: null` and the "Open in Colab" button is simply hidden in that case.

Groq API errors are caught by type (`err instanceof Groq.APIError`) and mapped to specific user messages: 401 → invalid key, 429/413 → token limit exceeded.

---

### `lib/notebookPrompt.ts`

**Purpose**: Defines the system prompt and user prompt builder for the Groq API call.

**Key Functions/Components**:
- `SYSTEM_PROMPT` — exported constant string; the complete instruction set for the model
- `buildUserPrompt(paperText)` — wraps the (possibly truncated) paper text into a user message
- `MAX_PAPER_CHARS` — `12_000` characters; the truncation ceiling

**How it works**:

The system prompt is the most load-bearing piece of the entire application. It instructs the model to return a JSON array (not prose), defines the exact cell shape `{"type": "markdown"|"code", "source": string}`, and enumerates all seven required notebook sections with their expected content. The "CRITICAL RULES" section at the bottom explicitly forbids triple backticks in source strings (because they break JSON parsing), requires valid Python 3, and asks for 15–30 cells total.

The 12,000-character paper text limit was derived from Groq's free tier constraint of 12,000 tokens per minute. With the system prompt consuming ~750 tokens and the model response consuming up to 4,096 tokens, only ~3,000 tokens remain for the paper (12,000 chars / ~4 chars-per-token). `buildUserPrompt` appends a truncation notice when the paper is cut, telling the model to focus on the visible methodology rather than assuming it has the full document:

```ts
const MAX_PAPER_CHARS = 12_000;

export function buildUserPrompt(paperText: string): string {
  const truncated = paperText.slice(0, MAX_PAPER_CHARS);
  const truncationNote = paperText.length > MAX_PAPER_CHARS
    ? `\n\n[Note: Paper text was trimmed to the first ${MAX_PAPER_CHARS.toLocaleString()} characters ...]`
    : "";
  return `Here is the research paper text. ...\n\nPAPER TEXT:\n${truncated}${truncationNote}`;
}
```

---

### `lib/buildNotebook.ts`

**Purpose**: Converts the AI-returned cell array into a spec-compliant nbformat 4.4 JSON object, and provides filename sanitization.

**Key Functions/Components**:
- `buildNotebook(cells, paperTitle?)` — main converter; returns a `Notebook` object
- `splitSource(source)` — converts a multi-line string to a Jupyter `source` array
- `titleToFilename(title)` — sanitizes a paper title to a safe filename
- Type interfaces: `InputCell`, `NotebookMarkdownCell`, `NotebookCodeCell`, `NotebookCell`, `Notebook`

**How it works**:

The Jupyter nbformat spec requires that a cell's `source` field be an array of strings where every line except the last ends with `\n`. `splitSource` handles this correctly — it splits on `\n`, then re-appends `\n` to all lines except the final one:

```ts
function splitSource(source: string): string[] {
  if (!source) return [""];
  const lines = source.split("\n");
  return lines.map((line, i) => (i < lines.length - 1 ? line + "\n" : line));
}
```

This is not cosmetic — Jupyter and nbconvert break in subtle ways when the source array format is wrong. Code cells also require `execution_count: null` and `outputs: []` on fresh (unexecuted) notebooks; the builder always sets these.

`titleToFilename` lowercases the title, strips all non-alphanumeric characters except hyphens and spaces, collapses repeated hyphens, and caps the result at 80 characters. A fallback of `"notebook"` handles the edge case where the model produces a title that contains only special characters.

The `_paperTitle` field on the `Notebook` type is a non-spec internal field used to pass the title from the builder back to the API route for filename construction; it does not affect Jupyter compatibility.

---

### `lib/uploadGist.ts`

**Purpose**: Posts the finished `.ipynb` file to the GitHub Gist API anonymously and returns the resulting Colab URL.

**Key Functions/Components**:
- `uploadGist(notebookJson, filename)` — async function; returns `GistUploadResult`
- `GistUploadResult` — interface with `{ gistId, gistUrl, colabUrl }`

**How it works**:

GitHub's Gist API accepts anonymous (unauthenticated) POST requests, making this the simplest possible public sharing mechanism. The route constructs a Gist payload with `public: true`, the notebook JSON as file content, and a generic description:

```ts
const payload = {
  description: "Generated by paper-to-colab",
  public: true,
  files: { [filename]: { content: notebookJson } },
};

const response = await fetch("https://api.github.com/gists", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
  body: JSON.stringify(payload),
});
```

The Colab URL is constructed from the returned gist ID: `https://colab.research.google.com/gist/anonymous/<gistId>`. Google Colab natively supports loading notebooks from anonymous gists via this URL pattern, requiring no additional authentication from the end user.

---

### `lib/statusMessages.ts`

**Purpose**: Single source of truth for the seven processing status strings displayed during generation.

**Key Functions/Components**:
- `STATUS_MESSAGES` — exported `as const` tuple of 7 strings
- `StatusMessage` — exported type alias derived from the tuple

**How it works**:

The array is declared `as const` so TypeScript infers a tuple type with a known length of 7, not a general `string[]`. This lets `ProcessingView` reference `STATUS_MESSAGES.length` as a static value for progress calculation, and allows the unit test suite to assert exact message content at specific indices without magic strings. The messages map loosely to the actual work being performed, though they advance on a timer rather than in response to real server events.

---

### `components/ThemeProvider.tsx`

**Purpose**: React context provider that owns theme state, persists it to `localStorage`, and syncs with the `data-theme` DOM attribute.

**Key Functions/Components**:
- `ThemeProvider` — context provider component
- `useTheme()` — exported hook returning `{ theme, toggle }`
- `getInitialTheme()` — reads `localStorage` or system preference on mount

**How it works**:

The provider initializes with a hard-coded `"dark"` default on the server (SSR-safe), then reads the real initial value in a `useEffect` on the client. This two-step initialization is intentional: the server cannot read `localStorage`, so rendering with `"dark"` ensures the HTML markup matches what the inline `<script>` in `layout.tsx` will apply. If they diverged, React hydration would throw warnings.

```ts
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
```

The `toggle` function is wrapped in `useCallback` to prevent unnecessary re-renders of consuming components. It updates both `document.documentElement.setAttribute("data-theme", next)` and `localStorage.setItem("theme", next)` atomically within the state updater function.

---

### `components/ThemeToggle.tsx`

**Purpose**: A standalone theme toggle button (floating, fixed-position).

**Key Functions/Components**:
- `ThemeToggle` — button component using `useTheme()` hook

**How it works**:

This component was created early in development as a floating fixed-position button (`fixed top-4 right-4`). It was later superseded by the toggle embedded directly inside `Header.tsx`, which integrates the same icon and `useTheme()` hook within the fixed navigation bar. `ThemeToggle.tsx` remains in the codebase but is not currently imported anywhere — it is dead code that could be removed in v2.

---

### `components/Header.tsx`

**Purpose**: Persistent fixed top navigation bar with the app logo, version badge, and theme toggle.

**Key Functions/Components**:
- `Header` — renders the fixed header bar
- `LogoMark` — inline SVG of a document-with-arrow icon
- `ThemeToggleIcon` — inline SVG switching between sun (dark mode) and moon (light mode)

**How it works**:

The header is fixed at the top of the viewport (`fixed top-0 left-0 right-0 z-50`) with a semi-transparent background and `backdrop-blur-sm`. This lets content scroll behind it while keeping the bar readable. The logo mark is a custom SVG showing a document on the left and an arrow pointing right, with the arrow stroked in `var(--primary)` (orange) to carry the brand color. The wordmark `paper→colab` uses the same orange for the `→` character.

The theme toggle in the header is functionally identical to `ThemeToggle.tsx` but inlined here as `ThemeToggleIcon` — a sun icon when the current theme is `"dark"` (click to go light) and a moon icon when `"light"` (click to go dark). The v1.0 badge is hidden on viewports narrower than `sm` (640px) to avoid crowding the header at mobile widths.

---

### `components/ApiKeyInput.tsx`

**Purpose**: Controlled text input for the Groq API key with a show/hide toggle.

**Key Functions/Components**:
- `ApiKeyInput` — component accepting `{ value, onChange }`
- `showKey` state — toggles `type="password"` vs `type="text"`

**How it works**:

The input uses `type="password"` by default so the key is masked. A small "show"/"hide" button (positioned absolutely inside the input container using `right-3 top-1/2 -translate-y-1/2`) toggles this. The button has `tabIndex={-1}` so it is skipped by keyboard Tab navigation — a user moving through the form with Tab should not have to skip past the toggle to reach the next field.

Focus and blur handlers manually set `borderColor` via inline styles because Tailwind's `focus:` variant applies on any focus, including mouse clicks, which creates a visual glitch when the browser's native focus ring is also present. The explicit `focus-visible` rule in `globals.css` draws a consistent outline only for keyboard navigation, while the inline `onFocus`/`onBlur` handlers manage the border color independently. `autoComplete="off"` and `spellCheck={false}` prevent password managers from treating this as a login credential field.

---

### `components/PdfDropzone.tsx`

**Purpose**: File upload zone supporting both drag-and-drop and click-to-browse interactions.

**Key Functions/Components**:
- `PdfDropzone` — component accepting `{ file, onFileChange }`
- `isDragOver` state — drives drag-active visual styling
- `handleDrop`, `handleDragOver`, `handleDragLeave` — drag event handlers
- `DocIcon`, `CheckIcon` — inline SVG icons

**How it works**:

A hidden `<input type="file" accept="application/pdf,.pdf">` is referenced via `useRef` and programmatically clicked when the visible drop zone div is clicked. This pattern gives full control over the visual design without relying on any native file input chrome.

Drag-and-drop is handled by the three drag event handlers on the outer div. `handleDrop` calls `e.preventDefault()` (required to prevent the browser from navigating to the dropped file), checks that the dropped file's MIME type is `application/pdf`, and calls `onFileChange`. Non-PDF drops are silently ignored — the zone simply does not accept them.

Visual states are driven by inline styles (not Tailwind classes) for the properties that change with `isDragOver` and `file` presence, because CSS custom property values cannot be expressed in Tailwind class names. When `isDragOver` is true, the border becomes orange (`var(--primary)`) and a very faint orange tint fills the background via `color-mix(in srgb, var(--primary) 6%, var(--surface))`. When a file is selected, the zone switches to a compact "file selected" display showing the filename and size.

---

### `components/GenerateButton.tsx`

**Purpose**: The primary CTA button; visually disabled when inputs are incomplete and active when ready.

**Key Functions/Components**:
- `GenerateButton` — component accepting `{ disabled, onClick, loading? }`

**How it works**:

The button's visual state is driven entirely by inline styles rather than Tailwind conditionals. When `disabled` or `loading` is true, the button renders in muted surface colors with `cursor: not-allowed` and `opacity: 0.5`. When active, it renders in the orange primary color with dark text (`var(--primary-fg)`, which is the background color). Hover color change is implemented via `onMouseEnter`/`onMouseLeave` handlers because inline styles do not support CSS pseudo-classes.

The `loading` prop is defined in the interface but is never passed as `true` by `app/page.tsx` — the page switches to `ProcessingView` instead of keeping the button visible during loading. The prop exists for future flexibility (e.g., an inline loading state without a full-screen takeover).

---

### `components/ProcessingView.tsx`

**Purpose**: Full-screen loading indicator shown while the API calls are in flight, displaying animated status messages and a progress bar.

**Key Functions/Components**:
- `ProcessingView` — component accepting `{ currentStep?: number }`
- `visibleIndex` / `fade` state — manages the fade-out-swap-fade-in message transition

**How it works**:

The component listens for changes in `currentStep` via a `useEffect`. When the prop changes, it immediately sets `fade` to `false` (triggering a CSS opacity transition to 0), waits 300ms (matching the CSS `transition-opacity duration-300`), then updates `visibleIndex` and sets `fade` back to `true`. This produces a smooth crossfade between status messages:

```ts
useEffect(() => {
  if (currentStep !== visibleIndex) {
    setFade(false);
    const timer = setTimeout(() => {
      setVisibleIndex(currentStep);
      setFade(true);
    }, 300);
    return () => clearTimeout(timer);
  }
}, [currentStep, visibleIndex]);
```

The spinner is two absolutely-positioned border circles: a static gray one (providing the track) and a rotating one with `border-t-accent` (providing the moving indicator). Progress is calculated as `((visibleIndex + 1) / STATUS_MESSAGES.length) * 100` and drives the `width` of the progress bar fill div via inline style — the `transition-all duration-700` class on that div makes the bar animate smoothly between steps. The entire view enters with the `animate-fade-in` keyframe from Tailwind config.

---

### `components/ResultView.tsx`

**Purpose**: Success screen displayed after notebook generation, providing download and Colab access.

**Key Functions/Components**:
- `ResultView` — component accepting `{ notebookJson, filename, colabUrl?, onReset }`
- `handleDownload` — creates a Blob URL, triggers a programmatic anchor click, and immediately cleans up

**How it works**:

The download is triggered client-side without any additional server round-trip. `handleDownload` constructs a `Blob` from the notebook JSON string, creates a temporary object URL, appends a hidden `<a>` tag to the DOM, programmatically clicks it (triggering the browser's native file-save dialog), then removes the anchor and revokes the object URL:

```ts
const blob = new Blob([notebookJson], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

The `URL.revokeObjectURL` call immediately after clicking is critical for memory hygiene — without it, the browser holds the Blob in memory indefinitely for the lifetime of the tab.

The "Open in Colab" link is conditionally rendered only when `colabUrl` is truthy. It uses `target="_blank"` with `rel="noopener noreferrer"` to prevent tab-napping. A cell summary panel shows the parsed cell count (markdown vs. code) by JSON-parsing the notebook and counting `cell_type` values inline — wrapped in a try/catch since malformed JSON from the model would otherwise crash the UI.

---

### `components/ErrorView.tsx`

**Purpose**: Error screen displayed when any API call in the pipeline fails, showing the error message and a reset button.

**Key Functions/Components**:
- `ErrorView` — component accepting `{ message, onReset }`

**How it works**:

The component is intentionally minimal: a red-bordered circle with an `✕` mark, a heading, the error message in a monospaced code-styled box, and a "Try Again" button that calls `onReset`. The error message is passed as a string from `app/page.tsx`, which extracts it from the caught `Error` object. Because the error comes from server-side API routes (as JSON `{ error: string }`), the messages are already human-readable ("Invalid Groq API key. Please check your key and try again.") rather than raw exception stack traces.

---

## Data Flow

The following describes the complete journey from user action to downloadable notebook:

**Step 1 — User Input (browser)**
The user types their Groq API key into `ApiKeyInput` (stored in React state in `app/page.tsx`). They drag-and-drop or browse to a PDF file, which is stored as a `File` object in React state. `GenerateButton` becomes enabled once both are non-empty.

**Step 2 — Generate triggered (browser)**
`handleGenerate` in `app/page.tsx` fires. The app state switches to `"processing"`, `ProcessingView` replaces the form, and `advanceStep` schedules 7 setTimeout calls at 3.5-second intervals to visually advance the status messages.

**Step 3 — PDF Extraction (browser → server)**
A `FormData` object is constructed with the `File` appended as the `"file"` field and POSTed to `/api/extract`. The server validates the file, runs it through `pdf-parse`, and returns `{ text: string, pageCount: number }`. The `text` field is the raw UTF-8 content of all pages concatenated.

**Step 4 — Notebook Generation (browser → server → Groq)**
The extracted `paperText` and the API key are JSON-serialized and POSTed to `/api/generate`. The server builds the Groq messages: `SYSTEM_PROMPT` as the system role and `buildUserPrompt(paperText)` (truncated to 12,000 characters) as the user role. The Groq SDK sends this to `llama-3.3-70b-versatile` at temperature 0.3 with a 4,096-token response limit.

**Step 5 — Response Parsing (server)**
The model's response text is stripped of any accidental markdown fences, then `JSON.parse`d. Malformed or incorrectly typed cells are filtered out. If no valid cells survive, a 422 error is returned. The first markdown cell's first `# Heading` is extracted as the paper title.

**Step 6 — Notebook Assembly (server)**
`buildNotebook(cells, title)` converts the raw cell array into a valid nbformat 4.4 JSON object: each cell's `source` string is split into the Jupyter line-array format by `splitSource`, code cells get `execution_count: null` and `outputs: []`, and the Python 3 kernel metadata is stamped into the notebook metadata block.

**Step 7 — Gist Upload (server → GitHub)**
`uploadGist(notebookJson, filename)` POSTs the notebook JSON to `https://api.github.com/gists` anonymously. GitHub returns a gist ID; the Colab URL `https://colab.research.google.com/gist/anonymous/<gistId>` is constructed. If this fails for any reason, the error is swallowed and `colabUrl` is set to `null`.

**Step 8 — Result returned (server → browser)**
The API route responds with `{ cells, notebookJson, filename, title, colabUrl }`. The client sets `appState` to `"result"` and stores `{ notebookJson, filename, colabUrl }` in state. `ResultView` renders.

**Step 9 — Download / Open (browser)**
The user clicks "Download .ipynb": `handleDownload` creates a Blob from the in-memory `notebookJson` string and triggers the browser's native file-save dialog. Or they click "Open in Google Colab": a new tab opens to the gist-backed Colab URL and Google Colab fetches the notebook directly from the gist.

---

## Test Coverage

**`tests/unit/setup.test.ts`** (10 tests)
Verifies project bootstrap: `package.json` exists with name `paper-to-colab`, Next.js 14 dependency, `groq-sdk` and `pdf-parse` in dependencies, `tailwind.config.ts` presence, `next.config.js` configuring `pdf-parse` as external, `app/layout.tsx` presence, Tailwind directives in `globals.css`, and `groq-sdk`/`pdf-parse` presence in `node_modules`.

**`tests/unit/task2-theme.test.ts`** (14 tests)
File-content checks on `globals.css` and `tailwind.config.ts`: verifies the `#0a0a0a` background value, `color-scheme: dark`, Inter font import, JetBrains Mono import, and Tailwind color token names (`background`, `highlight`, `muted`, `surface`, `border`). Also verifies `layout.tsx` uses `bg-background` and contains the string `"dark"`.

**`tests/unit/task4-status-messages.test.ts`** (9 tests)
Imports `STATUS_MESSAGES` and asserts: exactly 7 messages, each message is a non-empty string, and specific substring assertions on each message's content (e.g., index 0 contains "Parsing PDF", index 6 contains "GitHub Gist").

**`tests/unit/task7-build-notebook.test.ts`** (13 tests)
Unit tests for `buildNotebook()`: verifies `nbformat: 4`, `nbformat_minor: 4`, Python 3 kernel metadata, correct cell count, correct `cell_type` for markdown and code cells, `splitSource` produces an array, `execution_count: null` on code cells, empty `outputs` array on code cells, markdown cells have no `execution_count`, empty input array produces empty cells, source content round-trips correctly through `splitSource`, and `_paperTitle` is stored.

**`tests/unit/task8-upload-gist.test.ts`** (7 tests)
Uses `vi.fn()` to mock `global.fetch`. Tests: `lib/uploadGist.ts` file exists, `uploadGist` is exported as a function, returns correct `colabUrl` on mocked success, POSTs to `https://api.github.com/gists`, sends `Content-Type: application/json` header, throws on API error response (`ok: false`), and produces a Colab URL matching `^https://colab.research.google.com/gist/anonymous/`.

**`tests/integration/task5-extract.test.ts`** (8 tests)
File-content inspection (not live HTTP): verifies `app/api/extract/route.ts` exists, exports `POST`, imports `pdf-parse`, references `text` and `pageCount` in response, contains the 20MB size check expression, mentions PDF in error handling, uses `NextResponse`, and contains an error response for empty files.

**`tests/integration/task6-generate.test.ts`** (12 tests)
File-content inspection plus live import of `notebookPrompt.ts`: verifies both route files exist, `SYSTEM_PROMPT` mentions all 7 section names, enforces JSON array format with `"type"` and `"source"` shapes, mentions both `"markdown"` and `"code"` types, mentions synthetic data, `buildUserPrompt` wraps text with `PAPER TEXT:` prefix, `buildUserPrompt` truncates long input and includes the word "truncated", and the generate route exports `POST`, imports `groq`, uses `llama-3.3-70b-versatile`, and accepts `paperText` and `apiKey`.

**`tests/e2e/task3-ui.spec.ts`** (7 Playwright tests)
Live browser tests: page loads with dark background `rgb(10, 10, 10)` (the E2E test checks against `#0a0a0a` as RGB, though the deployed theme uses `#1a1b26` — see Known Limitations), headline and subheading are visible, API key input is `type="password"`, PDF dropzone is visible, generate button is disabled when empty, disabled with only API key, and enabled after both API key and PDF fixture are provided.

**`tests/e2e/task4-processing.spec.ts`** (3 Playwright tests)
Page shows form by default (processing view hidden), `ProcessingView.tsx` file contains all required `data-testid` attributes, and `statusMessages.ts` contains all 7 expected message substrings.

**`tests/e2e/task9-wiring.spec.ts`** (7 Playwright tests)
Full wiring checks: initial form state, `ErrorView.tsx` has correct `data-testid` attributes, `page.tsx` uses `useState` and all four state names, `page.tsx` imports all 6 components, `page.tsx` calls both `/api/extract` and `/api/generate`, clicking Generate with an invalid key shows `ProcessingView`, and the full error flow (invalid key → error view → reset → form) executes correctly.

**`tests/e2e/task10-polish.spec.ts`** (8 Playwright tests)
At 1280px desktop: headline visible. At 768px tablet: headline, input, dropzone, and button all visible. API key show/hide toggle changes input type. PDF dropzone has `transition` in its class attribute. Generate button has `transition` class when enabled. `globals.css` contains `@tailwind`. Body font family includes "inter". No horizontal scroll at 768px (scroll width ≤ client width + 2px).

---

## Security Measures

**API key never stored server-side**: The Groq API key is passed in the request body and used only to instantiate a single `Groq` client for that request. It is not written to any log, database, environment variable, or file. The server route does not echo it back in responses.

**API key masked in UI by default**: `ApiKeyInput` uses `type="password"`, so the key is masked from casual observation. The show/hide toggle requires a deliberate user action to reveal it.

**File size enforcement**: `POST /api/extract` rejects files exceeding 20MB at the server (HTTP 413) independently of any client-side validation, preventing denial-of-service through oversized uploads.

**File type validation**: Both MIME type (`application/pdf`) and file extension (`.pdf`) are checked. This dual check is intentional: MIME types can be spoofed by clients, but checking both reduces the attack surface for content-type smuggling.

**`pdf-parse` dynamic import**: Importing `pdf-parse` via `await import(...)` prevents the native Node module from being included in the client bundle, reducing client-side attack surface.

**Gist is public but anonymous**: Notebooks are uploaded as public anonymous gists. There is no user identity associated with the gist, but the content is publicly accessible to anyone with the URL. This is a deliberate trade-off enabling the zero-authentication Colab open flow.

**`rel="noopener noreferrer"` on Colab link**: The "Open in Colab" anchor uses both attributes. `noopener` prevents the opened tab from accessing the opener's `window` object (tab-napping). `noreferrer` prevents the Groq API key or any session data from leaking in the `Referer` header to Google's servers.

**No secrets in the repository**: The application has no `.env` files with embedded API keys. All sensitive credentials (the user's Groq key) are provided by the user at runtime and never committed.

---

## Known Limitations

**Token budget is tight for most real papers**: The 12,000-character hard cap on paper text (driven by Groq's free-tier 12,000 TPM limit) means that most research papers — which typically run 40,000–100,000 characters — are severely truncated. The model only ever sees the abstract, introduction, and the first part of the methodology. For papers where the key algorithms appear late in the document, the generated notebook may be generic rather than paper-specific.

**E2E test hardcodes the old background color**: `task3-ui.spec.ts` asserts `rgb(10, 10, 10)` (#0a0a0a) as the background color, but the deployed theme was updated to Tokyo Night's `#1a1b26` (rgb(26, 27, 38)). This test would fail against the live app on a fresh browser in dark mode. The test was not updated after the theme change.

**Status messages advance on a timer, not on real events**: The processing step counter ticks every 3.5 seconds regardless of actual API progress. If the Groq API responds in 5 seconds, the UI may have only shown 2 of 7 steps; if it takes 40 seconds, the steps cycle through and stall on the last one. There is no real-time streaming.

**`ThemeToggle.tsx` is dead code**: The standalone `ThemeToggle` component was made redundant by the toggle built into `Header`, but the file remains and is unused. This adds dead code to the bundle (negligible size) and may confuse future developers.

**No rate limiting or abuse protection**: Any user with a browser can call `/api/generate` with an arbitrary API key and arbitrary text. There is no IP-based rate limiting, CSRF protection, or request authentication. In a deployed environment, the Groq API key rotation would be the user's sole protection against abuse.

**Gist upload sends notebook as `public: true`**: Every generated notebook is publicly visible on GitHub Gist. Users who generate notebooks from confidential or embargoed research papers may not realize they are publicly publishing the paper's methodology (as interpreted by the model).

**No streaming output from Groq**: The Groq call uses `chat.completions.create` (non-streaming). For long notebooks (4,096 tokens), users wait for the full response before anything appears. Switching to `groq.chat.completions.stream` would allow progressive cell display.

**`pdf-parse` has limited table and formula support**: `pdf-parse` extracts plain text from PDFs. Mathematical notation rendered as images in the PDF (common in papers from arXiv with complex LaTeX figures) is not extracted. Equations embedded as proper Unicode or accessible text are extracted, but display math that is only a rasterized image is silently lost.

**No input sanitization on paperText**: The extracted PDF text is passed directly to the Groq prompt. A malicious or unusual PDF could contain text designed to override the system prompt (prompt injection). The low temperature (0.3) reduces susceptibility, but there is no explicit sanitization of the paper text before it enters the model context.

**Python version pinned to 3.10.0**: `buildNotebook` hard-codes `language_info.version` as `"3.10.0"`. Colab and Jupyter environments running other Python versions will still execute the notebook correctly, but the metadata is technically inaccurate.

---

## What's Next

**v2 Priority 1 — Increase context window via paid Groq tier or chunking**: The most impactful improvement would be lifting the 12,000-character truncation limit. With a paid Groq account (higher TPM), the cap could increase to 50,000–100,000 characters. Alternatively, a chunking strategy (extract only methodology sections by keyword) could improve relevance without increasing token usage.

**v2 Priority 2 — Streaming notebook generation**: Switch `/api/generate` to use the Groq streaming API and push cells to the browser via a `ReadableStream` response. `ResultView` could render cells incrementally as they arrive, dramatically improving perceived performance.

**v2 Priority 3 — Fix the E2E background color test**: Update `task3-ui.spec.ts` to assert `rgb(26, 27, 38)` (Tokyo Night dark) and add a complementary test for `rgb(248, 248, 246)` (light mode), using the theme toggle to switch during the test.

**v2 Priority 4 — Prompt injection hardening**: Add a preprocessing step that strips or escapes common prompt injection patterns (e.g., "Ignore previous instructions") from the extracted paper text before inserting it into the Groq prompt.

**v2 Priority 5 — Remove `ThemeToggle.tsx` dead code**: Delete the file and verify no imports reference it.

**v2 Priority 6 — Gist privacy option**: Add a `public: false` toggle or a warning to the UI informing users that their generated notebook will be publicly visible. GitHub does not support Colab-accessible private anonymous gists, so truly private sharing may require a different mechanism (e.g., user-supplied GitHub token for private gists).

**v2 Priority 7 — User authentication and generation history**: Add a lightweight auth layer (GitHub OAuth is a natural fit given the Gist integration) so users can revisit previously generated notebooks without re-uploading.

**v2 Priority 8 — Batch PDF support and deployment**: Allow uploading multiple PDFs in a single session, and establish a CI/CD pipeline (GitHub Actions → Vercel) with environment-variable-based Groq key support for a hosted demo mode.
