# Sprint v1 — PRD: Research Paper → Google Colab Notebook Generator

## Overview
A web application where researchers upload a PDF of a research paper, provide their Groq API key, and receive a production-quality, fully-implemented Google Colab notebook that replicates the paper's core algorithms as a structured tutorial — ready to be used by researchers at top AI labs to accelerate replication workflows.

## Goals
- User can enter their Groq API key and upload a research paper PDF in a beautiful dark-themed web UI
- The system extracts and understands the paper's methodology, algorithms, and mathematical formulations
- A high-quality `.ipynb` notebook is generated with real, structured tutorial content (markdown explanations + working Python code with realistic synthetic data)
- User can download the `.ipynb` file directly
- User can open the notebook directly in Google Colab via a one-click link
- During processing, animated status messages keep the user engaged and informed

## User Stories
- As a researcher, I want to upload a PDF and get a Colab notebook, so I can replicate experiments without reading the full paper first
- As a researcher, I want the notebook to use realistic synthetic data, so I can validate my understanding of the algorithm on concrete examples
- As a researcher, I want clear markdown explanations interleaved with code, so the notebook serves as a standalone tutorial
- As a researcher, I want to open the result directly in Google Colab, so I can run it immediately without extra steps
- As a researcher, I want to see live progress during generation, so I know the system is working and what it's doing

## Technical Architecture

**Frontend**: Next.js 14 (App Router) + Tailwind CSS
**Theme**: Dark, minimal — inspired by arcprize.org (near-black background, stark white type, monospaced code accents, precise grid layout)
**Font**: Inter (headings) + JetBrains Mono (code/accents) — matching arcprize aesthetic
**Backend**: Next.js API routes (serverless functions)
**PDF Parsing**: `pdf-parse` npm package (server-side text extraction)
**AI Model**: Groq `llama-3.3-70b-versatile` via the Groq Node SDK (user supplies API key at runtime; key is never stored)
**Notebook Format**: Standard Jupyter `.ipynb` JSON, constructed programmatically
**Open in Colab**: Anonymous GitHub Gist API → Colab URL (`colab.research.google.com/gist/...`)

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Next.js)                 │
│                                                      │
│  [API Key Input] → [PDF Upload] → [Processing View] │
│                         │                            │
│              [Download .ipynb] [Open in Colab]       │
└──────────────────────────┬──────────────────────────┘
                           │ POST /api/generate
                           ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Route (Server)              │
│                                                      │
│  1. pdf-parse → extract full paper text              │
│  2. Groq llama-3.3-70b-versatile → generate notebook │
│     content (system prompt engineering for quality) │
│  3. Build .ipynb JSON from AI output                 │
│  4. POST to GitHub Gist API (anonymous)              │
│  5. Return: { notebookJson, gistId, colabUrl }       │
└─────────────────────────────────────────────────────┘
```

### Notebook Structure (Generated)
Each notebook will follow this structure:
1. **Header cell** — paper title, authors, abstract summary
2. **Background** — key concepts and notation explained in markdown
3. **Algorithm walkthrough** — pseudocode → Python translation, step by step
4. **Synthetic data generation** — realistic, domain-appropriate data (not toy arrays)
5. **Full implementation** — clean, typed, documented Python code
6. **Experiments** — run the algorithm, visualize results (matplotlib/seaborn)
7. **Extensions / Discussion** — where to take this next

### Processing Status Messages (displayed during generation)
Shown sequentially while the AI is working:
- "Parsing PDF and extracting paper structure..."
- "Identifying core algorithms and mathematical formulations..."
- "Designing synthetic data that mirrors real experimental conditions..."
- "Implementing the methodology in structured Python..."
- "Building tutorial narrative and markdown explanations..."
- "Assembling the Colab notebook..."
- "Uploading to GitHub Gist for Colab access..."

## Out of Scope (v2+)
- User authentication / accounts
- Usage tracking or rate limiting
- Saving notebooks server-side / history
- Batch processing (multiple PDFs)
- Editing the notebook in-browser before download
- Support for papers with heavy visual figures/charts (image understanding)
- Custom notebook templates
- Deployment infrastructure / CI/CD

## Dependencies
- Groq API access (user-provided key, `llama-3.3-70b-versatile` model)
- GitHub Gist API (unauthenticated — no token required for anonymous gists)
- `pdf-parse` npm package for server-side PDF text extraction
- `groq-sdk` npm package for Groq API calls
- Next.js 14 with App Router
