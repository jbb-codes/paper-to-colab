# Sprint v3 — Walkthrough

## Summary

Sprint v3 transforms Paper-to-Colab from a localhost-only prototype into a production-ready
application. It adds 261 automated tests following the testing pyramid (unit → integration → E2E),
a GitHub Actions CI/CD pipeline that gates every merge, Docker containerization with a multi-stage
build, and Terraform-managed AWS ECS Fargate infrastructure with automated deployment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                              │
│                                                                     │
│  push/PR ──▶ CI Workflow ──────────────────────────────────────┐    │
│               ├─ Lint (ESLint)                                 │    │
│               ├─ Test (254 Vitest unit + integration)          │    │
│               ├─ E2E  (7 Playwright browser tests)             │    │
│               ├─ Audit (npm audit --audit-level=high)          │    │
│               └─ Security (semgrep static analysis)            │    │
│                         │                                      │    │
│                    CI Gate (all must pass)                      │    │
│                         │                                      │    │
│              push to main + CI pass                            │    │
│                         │                                      │    │
│                         ▼                                      │    │
│               CD Workflow (deploy.yml)                          │    │
│               ├─ Build Docker image                            │    │
│               ├─ Push to ECR (SHA + latest tags)               │    │
│               └─ Force new ECS deployment                      │    │
└────────────────────────┬────────────────────────────────────────┘    │
                         │                                            │
                         ▼                                            │
┌─────────────────────────────────────────────────────────────────────┘
│                          AWS (Terraform-managed)
│
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  │   ECR Repo   │────▶│  ECS Fargate  │────▶│  Next.js Standalone │
│  │ (Docker imgs)│     │  (1 task,     │     │  (node server.js)   │
│  └─────────────┘     │   0.25 vCPU)  │     │  port 3000          │
│                       └──────┬───────┘     └─────────────────────┘
│                              │
│                       ┌──────▼───────┐     ┌─────────────────────┐
│                       │     ALB       │     │    CloudWatch Logs  │
│                       │  (port 80)    │     │  (14-day retention) │
│                       └──────┬───────┘     └─────────────────────┘
│                              │
│                 ┌────────────┴────────────┐
│                 │          VPC            │
│                 │  ┌────────┐ ┌────────┐ │
│                 │  │Subnet 1│ │Subnet 2│ │
│                 │  │ (AZ-a) │ │ (AZ-b) │ │
│                 │  └────────┘ └────────┘ │
│                 └────────────────────────┘
└──────────────────────────────────────────────────────────────────────
```

## Files Created/Modified

---

### tests/unit/buildNotebook.test.ts
**Purpose**: Unit tests for the notebook builder — validates JSON structure, cell splitting, and filename generation.

**Tests (15)**:
- `splitSource` — verifies multi-line cell sources get `\n` appended correctly, single-line and empty inputs handled, join+split roundtrip is idempotent
- `buildNotebook` — valid JSON output, correct nbformat, cell order preserved
- `titleToFilename` — kebab-case conversion, special character stripping, 80-char truncation, empty string fallback

**How it works**:
The tests import `buildNotebook` and `titleToFilename` from `@/lib/buildNotebook` and exercise
edge cases around how notebook cell sources are split into line arrays (each line except the last
must end with `\n`) and how paper titles become safe filenames. The filename tests are thorough —
unicode, multiple spaces, leading/trailing hyphens, and the 80-character boundary are all covered.

---

### tests/unit/uploadGist.test.ts
**Purpose**: Unit tests for the GitHub Gist upload function — validates payload structure, response handling, and gistId security.

**Tests (15)**:
- Payload: `public: false` (secret gist), correct filename/description, proper Accept header
- Response: extracts gistId/gistUrl/colabUrl on success, throws with status on error, handles missing error messages
- Security: rejects path traversal (`../`), rejects spaces, accepts valid hex IDs

**How it works**:
Tests mock `global.fetch` with `vi.fn()` to intercept GitHub API calls. The security tests are
notable — they verify that a malicious gistId containing `../` or spaces is rejected before it
could be used to construct a Colab URL, preventing potential path traversal attacks.

```typescript
test("rejects gistId with path traversal characters", async () => {
  mockFetch.mockResolvedValueOnce(okResponse({ id: "../../etc/passwd" }));
  await expect(uploadGist("token", "{}", "file.ipynb")).rejects.toThrow();
});
```

---

### tests/unit/notebookPrompt.test.ts
**Purpose**: Unit tests for the LLM prompt builder — validates system prompt structure, input sanitization, and truncation.

**Tests (11)**:
- `SYSTEM_PROMPT`: non-empty, mentions JSON, specifies all 7 notebook sections, requires Python 3
- `sanitizePaperText`: removes prompt injection lines ("Ignore previous instructions", "Jailbreak attempt"), preserves blank lines, handles empty input
- `buildUserPrompt`: wraps text in `<paper>` tags, truncates at 12,000 chars with note, sanitizes before truncation

**How it works**:
The sanitization tests verify that malicious lines injected into a PDF's extracted text are
filtered out before reaching the LLM. The truncation tests confirm that papers longer than
12,000 characters get cut with a `[truncated]` note, and that sanitization happens first so
injection lines don't count toward the character limit.

---

### tests/unit/validateCells.test.ts
**Purpose**: Unit tests for the dangerous code pattern scanner — validates detection of unsafe Python constructs.

**Tests (8)**:
- Returns `null` for empty arrays and markdown-only cells
- Detects `os.system`, `subprocess`, `eval(`, `exec(`, `__import__` in code cells
- Returns first match (earliest cell index)
- No false positives: "evaluate" does not trigger `eval(` detection
- Works across multi-line source arrays

**How it works**:
`scanForDangerousPatterns` iterates through notebook cells, checking only code cells against
a pattern list. The false-positive test is important — it ensures the scanner requires exact
delimiters (e.g., `eval(` not just the substring `eval`), preventing false alarms on legitimate
Python code that contains words like "evaluate".

---

### tests/unit/statusMessages.test.ts
**Purpose**: Unit tests for the UI progress messages shown during notebook generation.

**Tests (4)**:
- Array structure verification
- All messages end with `...` (ellipsis format)
- Pipeline order: PDF processing first, Gist upload last
- No duplicate messages

---

### tests/integration/extract.test.ts
**Purpose**: Integration tests for the `/api/extract` POST handler with mocked `pdf-parse`.

**Tests (8)**:
- 400 on missing file, empty file, non-PDF file
- 413 on file > 20 MB
- 200 with extracted text and pageCount on valid PDF
- 500 on pdf-parse failure (without leaking internal error details)
- Accepts `.pdf` extension even with non-standard MIME type

**How it works**:
Tests call the actual Next.js route handler by constructing `NextRequest` objects with `FormData`
bodies. A critical discovery during development: you must NOT manually set the `Content-Type`
header when using FormData — the runtime adds the multipart boundary automatically:

```typescript
function buildRequest(file: File | null): NextRequest {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new NextRequest("http://localhost:3000/api/extract", {
    method: "POST",
    body: formData,  // Let runtime set Content-Type with boundary
  });
}
```

---

### tests/integration/generate.test.ts
**Purpose**: Integration tests for the `/api/generate` POST handler with mocked Groq SDK and Gist upload.

**Tests (13)**:
- 400 on missing/empty apiKey or paperText
- 200 with notebook JSON, filename, colabUrl, cells, and title from H1
- 422 on unparseable LLM response, dangerous patterns, or empty cells
- 500 on unexpected errors
- Graceful degradation when Gist upload fails (still returns notebook)
- Strips markdown code fences from LLM response

**How it works**:
The Groq SDK is mocked by replacing the entire module with a fake class. The `uploadGist`
module is also mocked. This lets tests control LLM responses and verify that the handler
correctly parses JSON from model output, validates cells, and constructs Colab URLs:

```typescript
const mockCreate = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class Groq {
    chat = { completions: { create: mockCreate } };
  },
}));
vi.mock("@/lib/uploadGist", () => ({
  uploadGist: vi.fn(),
}));
```

---

### tests/e2e/full-flow.spec.ts
**Purpose**: Playwright E2E tests covering the complete user flow from page load through notebook generation.

**Tests (3)**:
1. Page loads with headline, form elements, disabled generate button
2. Entering API key + uploading PDF enables the generate button
3. Clicking generate shows processing spinner → result view with download button (mocked APIs)

**How it works**:
The third test uses `page.route()` to mock both `/api/extract` and `/api/generate`, controlling
the entire pipeline without real API calls. A 1-second delay on the generate mock lets the test
capture the processing spinner before the result appears. Screenshots are saved at each step.

---

### tests/e2e/theme-toggle.spec.ts
**Purpose**: Playwright E2E test for the dark/light theme toggle.

**Tests (1)**:
- Emulates dark color scheme → verifies `data-theme="dark"` → clicks toggle → verifies light → clicks again → verifies dark

**How it works**:
Uses `page.emulateMedia({ colorScheme: "dark" })` before navigation to force a deterministic
initial state. Without this, Chromium defaults to light mode, causing the test to fail in
headless CI environments.

---

### tests/e2e/drag-drop.spec.ts
**Purpose**: Playwright E2E tests for PDF upload via file input.

**Tests (3)**:
- File upload shows filename in dropzone
- Dropzone shows "Drag & drop your PDF" initially
- File size displayed in MB after upload

**How it works**:
Uses a minimal PDF fixture created in `beforeAll` (instead of `research.pdf` which isn't in git).
Uses `setInputFiles()` rather than simulating actual drag-and-drop for reliability across
environments.

---

### tests/e2e/quality.spec.ts
**Purpose**: Real end-to-end quality test using actual Groq API and `research.pdf`.

**Tests (1)** — excluded from CI, runs only via `npm run test:e2e -- --project=quality`:
- Uploads real PDF, calls real Groq API (120s timeout)
- Validates: valid JSON, nbformat 4, ≥6 cells, code + markdown cells present, non-empty source, no dangerous patterns

**How it works**:
Reads `GROQ_API_KEY` from environment. Skips if not set. Runs in headed mode (`headless: false`)
with `slowMo: 500ms` so you can watch the browser. Takes 5 screenshots at each step. This is the
ultimate smoke test — it proves the entire pipeline works end-to-end with real data.

---

### vitest.config.ts
**Purpose**: Vitest configuration for unit and integration tests.

**Key configuration**:
- `@/` path alias pointing to project root (required for integration tests that import route handlers using `@/lib/...`)
- Includes `tests/unit/**/*.test.ts` and `tests/integration/**/*.test.ts`
- Node environment (not jsdom)

---

### playwright.config.ts
**Purpose**: Playwright configuration for E2E tests.

**Key configuration**:
- Two projects: `chromium` (headless, excludes quality test) and `quality` (headed, only quality test)
- Auto-starts Next.js dev server before tests
- 2 retries in CI, 0 locally
- Screenshots on demand, traces on first retry

---

### .github/workflows/ci.yml
**Purpose**: GitHub Actions CI pipeline triggered on every push to main and all PRs.

**Jobs (5 parallel + 1 gate)**:
1. **Lint** — `npm run lint` (ESLint)
2. **Test** — `npm test` (254 Vitest unit + integration tests)
3. **E2E** — builds app, runs Playwright (7 tests), uploads failure artifacts
4. **Audit** — `npm audit --audit-level=high`
5. **Security** — semgrep static analysis on `app/`, `components/`, `lib/`, `middleware.ts`
6. **CI Gate** — aggregator job that fails if any of the 5 jobs fail; single required status check

**How it works**:
All 5 test jobs run in parallel on Ubuntu with Node 20. The CI Gate job uses `needs:` to
depend on all 5 and checks each job's result. If any failed, it prints a summary and exits 1.
This lets you configure a single required check ("CI Gate") in branch protection instead of 5.

```yaml
ci-gate:
  name: CI Gate
  needs: [lint, test, e2e, audit, security]
  if: always()
  runs-on: ubuntu-latest
  steps:
    - name: Check all jobs passed
      run: |
        if [[ "${{ needs.lint.result }}" != "success" ]] || ...
```

---

### .github/workflows/deploy.yml
**Purpose**: GitHub Actions CD pipeline that auto-deploys to AWS when CI passes on main.

**Trigger**: `workflow_run` — runs after CI workflow completes successfully on main (not PRs).

**Steps**:
1. Configure AWS credentials from GitHub Secrets
2. Log in to Amazon ECR
3. Build Docker image, tag with git SHA + `latest`, push to ECR
4. Force new ECS deployment (`aws ecs update-service --force-new-deployment`)

**Required GitHub Secrets**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`

---

### Dockerfile
**Purpose**: Multi-stage Docker build producing a minimal production image.

**Stages**:
1. **deps** — `node:20-alpine`, installs production dependencies only (`npm ci --omit=dev`)
2. **builder** — installs all dependencies, runs `next build` (standalone output)
3. **runner** — copies only standalone output + static files, runs as non-root `nextjs` user

**How it works**:
The standalone output mode (enabled in `next.config.js` with `output: "standalone"`) bundles
the Node.js server and all needed `node_modules` into a self-contained directory. The final
image only contains this output — no source code, no dev dependencies, no test files:

```dockerfile
FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
CMD ["node", "server.js"]
```

---

### .dockerignore
**Purpose**: Excludes unnecessary files from Docker build context.

**Excludes**: `node_modules`, `.next`, `.git`, `tests/`, `sprints/`, `*.md`, `.env*`, IDE configs, test artifacts.

---

### docker-compose.yml
**Purpose**: Single-command local development with Docker.

**Configuration**:
- Single `web` service building from the Dockerfile
- Port 3000 mapped, `NODE_ENV=production`
- Passes `GROQ_API_KEY`, `GITHUB_TOKEN`, `NEXT_PUBLIC_BASE_URL` from host
- Health check: wget to `localhost:3000` every 30s
- Restart policy: `unless-stopped`

---

### terraform/main.tf
**Purpose**: Complete AWS infrastructure definition for ECS Fargate deployment.

**Resources (14)**:
- **Networking**: VPC (10.0.0.0/16), 2 public subnets across AZs, internet gateway, route table
- **Security**: ALB security group (HTTP/HTTPS inbound), ECS security group (ALB → port 3000 only)
- **Load Balancing**: Application Load Balancer, target group (health check on `/`), HTTP listener
- **Compute**: ECS cluster, Fargate task definition (0.25 vCPU, 512 MB), ECS service (1 task)
- **Storage**: ECR repository (scan-on-push enabled)
- **Logging**: CloudWatch log group (14-day retention)
- **IAM**: ECS task execution role with `AmazonECSTaskExecutionRolePolicy`

---

### terraform/variables.tf
**Purpose**: Input variables with sensible defaults.

**Variables**: `aws_region` (us-east-1), `app_name` (paper-to-colab), `container_port` (3000), `image_tag` (latest), `task_cpu` (256), `task_memory` (512), `desired_count` (1).

---

### terraform/outputs.tf
**Purpose**: Exports key resource identifiers after `terraform apply`.

**Outputs**: `alb_dns_name`, `ecr_repository_url`, `ecs_cluster_name`, `ecs_service_name`.

---

### next.config.js (modified)
**Purpose**: Added `output: "standalone"` to enable Next.js standalone build mode for Docker.

---

### .gitignore (modified)
**Purpose**: Added `aws-cred*` and `*credentials*` patterns to prevent accidental commit of AWS credential files.

---

## Data Flow

### CI/CD Pipeline
1. Developer pushes to `main` or opens a PR
2. GitHub Actions triggers CI workflow → 5 parallel jobs run
3. CI Gate checks all jobs passed → green checkmark
4. If push to `main` + CI passed → CD workflow triggers
5. CD builds Docker image → pushes to ECR with SHA tag
6. CD updates ECS service → Fargate pulls new image → rolling deployment

### Test Execution
1. `npm test` → Vitest runs 254 tests (unit + integration) in Node.js
2. `npm run test:e2e` → Playwright launches Chromium, starts Next.js dev server, runs 7 browser tests
3. `npm run test:e2e -- --project=quality` → Playwright runs 1 real API test with headed browser (manual only)

### AWS Request Flow
1. User hits ALB DNS name on port 80
2. ALB forwards to ECS Fargate task on port 3000
3. Next.js standalone server handles the request
4. Logs stream to CloudWatch (`/ecs/paper-to-colab`)

## Test Coverage

| Layer | Count | What it covers |
|-------|------:|----------------|
| **Unit** | 53 | buildNotebook, uploadGist, notebookPrompt, validateCells, statusMessages |
| **Integration** | 21 | /api/extract (8), /api/generate (13) with mocked pdf-parse, Groq, GitHub |
| **E2E (mocked)** | 7 | Page load, form flow, processing view, theme toggle, file upload |
| **E2E (real)** | 1 | Full pipeline with real Groq API + research.pdf |
| **Pre-existing** | 180 | Security tests, component tests from v1/v2 |
| **Total** | **262** | Pyramid: ~70% unit, ~20% integration, ~10% E2E |

## Security Measures

- **Static analysis**: Semgrep runs on every push/PR scanning `app/`, `components/`, `lib/`, `middleware.ts`
- **Dependency audit**: `npm audit --audit-level=high` in CI
- **ECR image scanning**: Scan-on-push enabled for vulnerability detection
- **Non-root Docker user**: Container runs as `nextjs` (uid 1001), not root
- **Secret management**: AWS credentials stored as GitHub Secrets, `.gitignore` blocks credential files
- **ECS security group**: Only accepts traffic from ALB, not direct internet access
- **Prompt injection filtering**: Tested in notebookPrompt unit tests
- **Path traversal prevention**: Tested in uploadGist unit tests
- **Dangerous code detection**: Tested in validateCells unit tests

## Known Limitations

- **HTTP only**: ALB serves on port 80 without TLS. CloudFront (HTTPS) requires CloudFront IAM permissions or a custom domain with ACM certificate
- **No auto-scaling**: ECS service runs exactly 1 task. No scaling policies defined
- **No staging environment**: CI deploys directly to production on main
- **No health endpoint**: ALB health check hits `/` (the full page), not a lightweight `/health` route
- **No monitoring/alerting**: CloudWatch collects logs but no alarms or dashboards are configured
- **Quality test requires local setup**: Needs `GROQ_API_KEY` env var and `research.pdf` in repo root, both unavailable in CI
- **Terraform state is local**: No remote backend (S3 + DynamoDB) for team collaboration
- **No database**: App is stateless — no persistence of generated notebooks

## What's Next

A v4 sprint could focus on:
1. **Custom domain + HTTPS** — Route 53 hosted zone, ACM certificate, HTTPS ALB listener
2. **Auto-scaling** — ECS service auto-scaling policy based on CPU/request count
3. **Monitoring** — CloudWatch alarms, dashboard for error rates and latency
4. **Staging environment** — Separate ECS service/ALB for pre-production testing
5. **Health endpoint** — Lightweight `/api/health` route for ALB and uptime monitoring
6. **Remote Terraform state** — S3 backend with DynamoDB locking for team use
7. **User accounts** — Authentication, saved notebooks, generation history
