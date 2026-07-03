# QA Interview Task - Dynamic Form Builder With Evidence Search

## Product Context

You are joining a team building a dynamic form/questionnaire system.

The product allows users to:

- Create and edit questionnaires dynamically
- Upload supporting documentation (evidence) before filling questionnaires
- See semantically relevant document excerpts next to each question
- Submit answers with validation

Example domain: security questionnaires.
Questions may include:

- How long are your passwords?
- What hashing algorithms do you use?
- Do you offload authentication to OAuth2?

Business goal:
Help users submit correct answers on the first try, reducing manual back-and-forth review effort.

## Why This Task Exists

We currently do not have a dedicated QA function.
This task is designed to assess whether you can drive testing efforts as a senior QA, including strategy, execution depth, risk management, and practical automation direction.

## Application Setup

### Prerequisites

- Node.js 20+
- Bun 1.1+
- Docker + Docker Compose

### 1) Start infrastructure

```bash
docker compose up -d
```

This starts:

- Postgres: `localhost:5432`
- Qdrant: `localhost:6333`

### 2) Start backend

```bash
cd backend
bun install
bun run migrate
bun run dev
```

Backend base URL: `http://localhost:4000`

### 3) Start frontend

```bash
cd frontend
bun install
bun run dev
```

Frontend URL: `http://localhost:5173`

### Optional: reset local databases

```bash
bun run db:reset
```

## Authentication and Verification Flow

1. Register from UI
2. Backend prints a mock verification email link to stdout
3. Open the printed verification link (it verifies and redirects to the landing page)
4. Log in using basic auth-backed flow

Note:
Unverified users should not be able to access authenticated functionality.

## Sample Evidence Documents

Use files in:

- `sample-evidence/erp-security-implementation.txt`
- `sample-evidence/iot-fleet-security-design.txt`
- `sample-evidence/hr-portal-controls.txt`

These are intentionally content-heavy and include overlapping security topics so you can evaluate semantic retrieval quality and relevance.

## Core Business/Functional Expectations

- Users can create and edit questionnaires
- Duplicate questionnaire names are not allowed per owner
- Questionnaire and response data is ownership-scoped (no cross-user access)
- Answer validation is enforced (`text`, `number`, optional regex)
- Submission is blocked until questionnaire answers are valid
- Evidence upload and retrieval flow supports helping users answer correctly

## Your QA Assignment

### Part A - Risk-based strategy

Produce a concise test strategy that includes:

- Top product risks and why
- Scope split by priority (must test / should test / nice to have)
- Test layers you would use (API, UI, integration, exploratory)
- Environments/data needs for sustainable testing

### Part B - Test execution

Execute meaningful testing and provide evidence:

- Key scenarios run (including negative paths)
- Bugs/issues found with severity and impact
- Reproduction steps and expected vs actual behavior
- Any gaps you could not cover and why

### Part C - Automation direction

Implement high-value end-to-end automation for key product flows.

Requirements:

- Use Playwright or an automation platform of your choice
- Add a runnable E2E test suite in this repository
- Cover high-value scenarios you consider most critical

In your submission, include:

- What you automated and why
- What you intentionally did not automate yet
- How you would scale coverage over time

### Part D - CI pipeline

Set up a GitHub Actions pipeline that runs the tests.

Requirements:

- Add workflow file(s) under `.github/workflows/`
- Ensure the pipeline can execute your automated tests in CI
- Document any assumptions or environment setup needed for CI execution

### Part E - Release recommendation

Based on your findings, state:

- Would you release now? (Yes/No/Conditional)
- What are the release blockers?
- What can be deferred with mitigations?

## What We Evaluate

We care less about test volume and more about quality of judgment and execution.

We evaluate:

- Test strategy quality and prioritization
- Depth and clarity of execution findings
- Practicality and value of automated E2E coverage
- CI pipeline quality and maintainability
- Communication clarity and decision-making

## Suggested Submission Format

Please submit:

1. `TEST_STRATEGY.md`
2. `TEST_EXECUTION_REPORT.md`
3. `BUG_REPORTS.md` (or issue links)
4. `AUTOMATION_PLAN.md`
5. Implemented E2E tests in the repository
6. GitHub Actions workflow configuration in the repository
