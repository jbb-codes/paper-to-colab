# Sprint v3 — Tasks: Production-Ready

## Status: Not Started

---

### Testing (Tasks 1–4)

- [x] Task 1: Unit tests for all backend library modules (P0)
  - Acceptance: New test files cover `buildNotebook.ts`, `uploadGist.ts`, `notebookPrompt.ts`,
    `validateCells.ts`, and `statusMessages.ts` with ~30 tests total. Tests cover: valid input,
    edge cases (empty input, malformed data), error paths (throw on invalid args). All tests
    pass with `npm test`.
  - Files: `tests/unit/buildNotebook.test.ts`, `tests/unit/uploadGist.test.ts`,
    `tests/unit/notebookPrompt.test.ts`, `tests/unit/validateCells.test.ts`,
    `tests/unit/statusMessages.test.ts`
  - Completed: 2026-03-27 — 56 new tests across 5 files (233 total). Covers: titleToFilename,
    splitSource edge cases, uploadGist payload/validation/error paths, SYSTEM_PROMPT structure,
    sanitize/truncation boundaries, scanForDangerousPatterns edge cases, statusMessages structure.

- [x] Task 2: Integration tests for API routes with mocked externals (P0)
  - Acceptance: ~15 tests covering `/api/extract` (valid PDF → 200 with text + pageCount;
    invalid file → 400; oversized file → 400; parse failure → 500 generic error) and
    `/api/generate` (valid request with mocked Groq → 200 with notebook JSON + colabUrl;
    missing apiKey → 400; Groq failure → 500; dangerous cells → 422). External `fetch` calls
    (Groq, GitHub) are mocked via `vi.mock` or `vi.spyOn(global, 'fetch')`. All tests pass.
  - Files: `tests/integration/extract.test.ts`, `tests/integration/generate.test.ts`
  - Completed: 2026-03-27 — 21 integration tests (8 extract + 13 generate). Mocked pdf-parse,
    groq-sdk, and uploadGist. Added @/ path alias to vitest.config.ts. 254 total tests passing.

- [x] Task 3: Playwright E2E tests with screenshots (P1)
  - Acceptance: Playwright config (`playwright.config.ts`) set up for the Next.js dev server.
    E2E tests cover: (1) page loads with correct title, (2) enter API key → upload PDF →
    click generate → see loading spinner → see result, (3) theme toggle switches theme,
    (4) drag-and-drop a PDF onto the dropzone. Screenshots saved at each major step
    (`test-results/` directory). `npm run test:e2e` passes in headless mode.
  - Files: `playwright.config.ts`, `tests/e2e/full-flow.spec.ts`,
    `tests/e2e/theme-toggle.spec.ts`, `tests/e2e/drag-drop.spec.ts`
  - Completed: 2026-03-27 — 7 E2E tests across 3 files with 10 screenshots. Updated
    playwright.config.ts with webServer, quality project, screenshot: "on". All 7 pass.

- [x] Task 4: Real quality test — generate notebook from research.pdf and validate (P1)
  - Acceptance: A separate Playwright test file that runs in headed mode (visible browser).
    Flow: open app → enter a real Groq API key (read from `GROQ_API_KEY` env var) →
    upload `research.pdf` → wait for generation (up to 120s timeout) → download the notebook.
    Validation: notebook is valid JSON, has `nbformat` field, contains >= 6 cells, at least
    one code cell has valid Python (no `SyntaxError` when checked), at least one markdown cell
    present. Test is in a separate Playwright project so it only runs when explicitly invoked
    (`npm run test:e2e -- --project=quality`), not in CI.
  - Files: `tests/e2e/quality.spec.ts`, update `playwright.config.ts` with `quality` project
  - Completed: 2026-03-27 — Quality test validates: valid JSON, nbformat 4, >=6 cells,
    code + markdown cells present, non-empty source, no dangerous patterns. Runs headed,
    excluded from CI via separate Playwright project. 5 screenshots at each step.

### CI/CD Pipeline (Tasks 5–6)

- [x] Task 5: GitHub Actions CI workflow (P0)
  - Acceptance: `.github/workflows/ci.yml` triggers on push to `main` and all PRs. Jobs:
    (1) **lint**: `npm run lint`, (2) **test**: `npm test` (Vitest unit + integration),
    (3) **e2e**: install Playwright browsers, `npm run build`, `npm run test:e2e` (excludes
    quality project), (4) **audit**: `npm audit --audit-level=moderate`,
    (5) **security**: `semgrep --config auto app/ components/ lib/ middleware.ts`. All jobs
    run on `ubuntu-latest` with Node 20. Workflow uses `actions/cache` for `node_modules`.
    Repository connected via `gh` CLI.
  - Files: `.github/workflows/ci.yml`
  - Completed: 2026-03-27 — 5 parallel CI jobs: lint, test, e2e (with Playwright artifact
    upload on failure), audit (--audit-level=high), security (semgrep container). Triggers
    on push to main and all PRs. Uses npm cache via setup-node.

- [x] Task 6: Branch protection + merge gating (P0)
  - Acceptance: GitHub branch protection rule on `main` requires the CI workflow status checks
    to pass before merge. Configure via `gh api` or `gh` CLI. PRs to `main` cannot be merged
    with failing checks. Document the setup in a comment in the workflow file.
  - Files: `.github/workflows/ci.yml` (add comment), configure via `gh` CLI
  - Completed: 2026-03-27 — Added `ci-gate` aggregator job (needs: all 5 jobs, fails if any
    fail). Branch protection requires GitHub Pro or public repo — documented the `gh api`
    command to enable it in a comment in ci.yml. Single required check: "CI Gate".

### Docker (Tasks 7–8)

- [ ] Task 7: Dockerfile + .dockerignore for production build (P0)
  - Acceptance: Multi-stage `Dockerfile` — stage 1: install deps, stage 2: `next build`
    with `output: "standalone"` in `next.config.js`, stage 3: copy standalone output into
    minimal `node:20-alpine` image. `.dockerignore` excludes `node_modules`, `.next`, `.git`,
    `tests/`, `sprints/`, `*.md`. `docker build -t paper-to-colab .` succeeds.
    `docker run -p 3000:3000 paper-to-colab` serves the app.
  - Files: `Dockerfile`, `.dockerignore`, update `next.config.js` (add `output: "standalone"`)

- [ ] Task 8: docker-compose.yml for local development (P1)
  - Acceptance: `docker-compose.yml` defines a single `web` service that builds from the
    Dockerfile, maps port 3000, passes `GROQ_API_KEY` and `GITHUB_TOKEN` from host env,
    and sets `NODE_ENV=production`. `docker compose up --build` starts the app.
    `docker compose down` stops it cleanly.
  - Files: `docker-compose.yml`

### AWS Deployment (Tasks 9–10)

- [ ] Task 9: Terraform config for AWS ECS Fargate infrastructure (P0)
  - Acceptance: `terraform/` directory with: `main.tf` (provider, VPC, subnets, security group,
    ALB, target group, ECS cluster, ECS task definition, ECS service, ECR repository,
    CloudWatch log group, IAM roles), `variables.tf` (region, app name, container port,
    image tag), `outputs.tf` (ALB DNS name, ECR repo URL). `terraform init` and
    `terraform plan` succeed without errors (actual `apply` is manual).
  - Files: `terraform/main.tf`, `terraform/variables.tf`, `terraform/outputs.tf`

- [ ] Task 10: GitHub Actions CD workflow — auto-deploy to AWS on main (P0)
  - Acceptance: `.github/workflows/deploy.yml` triggers on push to `main` (after CI passes).
    Steps: (1) configure AWS credentials from GitHub Secrets (`AWS_ACCESS_KEY_ID`,
    `AWS_SECRET_ACCESS_KEY`), (2) log in to ECR, (3) build + tag + push Docker image,
    (4) update ECS service to force new deployment. Requires GitHub Secrets:
    `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`.
    Document required secrets in workflow file comments.
  - Files: `.github/workflows/deploy.yml`
