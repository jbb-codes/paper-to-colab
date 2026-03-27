# Sprint v3 — PRD: Production-Ready (Testing, CI/CD, Docker & AWS)

## Overview
Sprint v3 takes the security-hardened Paper-to-Colab app from "works on localhost" to
production-ready. It adds comprehensive test coverage following the testing pyramid
(unit → integration → E2E), a GitHub Actions CI/CD pipeline that gates every merge, Docker
containerisation for the Next.js app, and automated deployment to AWS ECS Fargate via Terraform.

## Goals
- Test coverage follows the testing pyramid: ~70% unit, ~20% integration, ~10% E2E
- All backend modules (`buildNotebook`, `uploadGist`, `notebookPrompt`, `validateCells`,
  `statusMessages`) have dedicated unit tests beyond the security tests added in v2
- Integration tests exercise both API routes (`/api/extract`, `/api/generate`) with mocked
  external services (Groq, GitHub Gist)
- Playwright E2E tests cover the full user flow with screenshots at each step
- A real quality test generates a notebook from `research.pdf` and validates: valid JSON,
  correct section count, valid Python syntax, safety disclaimer present
- GitHub Actions CI runs Vitest, Playwright, `npm audit`, and semgrep on every push/PR —
  merge is blocked if any check fails
- The app is containerised with a production Dockerfile and `docker-compose.yml`
- Terraform config provisions AWS ECS Fargate infrastructure
- CD pipeline auto-deploys to AWS when tests pass on `main`

## User Stories
- As a developer, I want comprehensive tests so I can refactor with confidence
- As a developer, I want CI to block broken PRs so bugs never reach `main`
- As a developer, I want to run the app in Docker locally so I can test in a production-like
  environment
- As a site operator, I want automated deployment so pushing to `main` goes live without
  manual steps
- As a researcher, I want confidence the app produces quality notebooks — validated by an
  automated quality test against a real paper

## Technical Architecture

### Testing Stack
- **Unit tests**: Vitest (existing) — test each `lib/` module in isolation
- **Integration tests**: Vitest — test API routes with mocked `fetch` (Groq, GitHub APIs)
- **E2E tests**: Playwright (already in `devDependencies`) — headless browser, full user flow
- **Quality test**: Playwright with `headed: true` — real Groq API call, notebook validation

### CI/CD Stack
- **CI**: GitHub Actions workflow (`.github/workflows/ci.yml`)
  - Triggers: push to `main`, all pull requests
  - Jobs: lint, unit/integration tests, E2E tests, `npm audit`, semgrep
  - Branch protection: require status checks to pass before merge
- **CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`)
  - Triggers: push to `main` (after CI passes)
  - Steps: build Docker image → push to ECR → update ECS service

### Docker Stack
- **Dockerfile**: Multi-stage build (deps → build → production runtime)
  - Stage 1: Install dependencies
  - Stage 2: `next build` (standalone output mode)
  - Stage 3: Minimal Node.js runtime with standalone server
- **docker-compose.yml**: Single service for local development/testing
- **`.dockerignore`**: Exclude `node_modules`, `.next`, tests, `.git`

### AWS Infrastructure (Terraform)
```
                         ┌─────────────────────┐
                         │   Route 53 / ALB    │
                         │   (HTTPS listener)   │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │    ECS Fargate       │
                         │  ┌────────────────┐  │
                         │  │  Next.js        │  │
                         │  │  (standalone)   │  │
                         │  │  Port 3000      │  │
                         │  └────────────────┘  │
                         └──────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ECR (image)    CloudWatch (logs)   VPC (networking)
```

- **ECR**: Private container registry for Docker images
- **ECS Cluster + Service**: Fargate launch type (no EC2 management)
- **ALB**: Application Load Balancer with health check on `/`
- **VPC**: Public subnets, security group allowing port 80/443 inbound
- **CloudWatch**: Log group for container stdout/stderr
- **IAM**: Task execution role with ECR pull + CloudWatch permissions

### Next.js Config Change
- Add `output: "standalone"` to `next.config.js` for Docker-optimised builds

## Test Plan — Pyramid Breakdown

| Layer       | Count (approx) | What's tested                                                |
|-------------|-----------------|--------------------------------------------------------------|
| Unit        | ~30 new tests   | `buildNotebook`, `uploadGist`, `notebookPrompt`, `validateCells`, `statusMessages` — logic, edge cases, error paths |
| Integration | ~15 new tests   | `/api/extract` with real PDF bytes + mocked pdf-parse; `/api/generate` with mocked Groq + mocked Gist API; error codes, headers |
| E2E         | ~5 tests        | Full browser flow: enter key → upload PDF → loading → download; theme toggle; drag-drop; screenshot at each step |
| Quality     | 1 test          | Real Groq call with `research.pdf` → validate JSON, sections, Python, disclaimer |

## Out of Scope (v4+)
- User authentication / accounts
- Server-side Groq key (hosted model access)
- Notebook history / saved generations
- ArXiv URL input (direct paper fetch)
- Custom domain + SSL certificate (Route 53 hosted zone)
- Auto-scaling ECS tasks based on load
- Monitoring / alerting (CloudWatch alarms, PagerDuty)
- Staging environment (single environment for now)

## Dependencies
- All v1 + v2 deliverables (working app with 177 passing tests)
- GitHub repository (for Actions CI/CD)
- AWS account with IAM user `paper-to-notebook-deploy` (ECR, ECS, ALB, VPC, CloudWatch, IAM permissions)
- Groq API key (for the real quality test — user provides interactively)
- `research.pdf` in repo root (exists)
- Docker Desktop installed locally
