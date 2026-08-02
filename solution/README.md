# QA Assignment Solution

This folder contains a risk-based QA submission for the Questionnaire + Evidence RAG application.

## Contents

- `TEST_STRATEGY.md` — product risks, priorities, test layers, environments and data
- `TEST_EXECUTION_REPORT.md` — executed checks, results, evidence and coverage gaps
- `BUG_REPORTS.md` — reproducible defects with severity and impact
- `AUTOMATION_PLAN.md` — automation scope, design and growth plan
- `RELEASE_RECOMMENDATION.md` — release decision, blockers and deferrals
- `e2e/` — JavaScript Playwright API and browser tests
- `../.github/workflows/e2e.yml` — runnable GitHub Actions pipeline at repository root
- `bruno/` — importable Bruno collection for manual API testing

## Run locally

Prerequisites: Node.js 20+, Bun 1.1+, Docker and Docker Compose.

From the root of the application fork:

```bash
docker compose up -d
cd backend
bun install
bun run migrate
cd ../frontend
npm install
cd ../solution
npm install
npx playwright install chromium
npm test
```

The Playwright configuration starts the backend with Bun and the frontend with npm. It locates the application as the parent of `solution/`; `APP_DIR` can be used only when running the suite from a different folder layout.

Useful alternatives:

```bash
npm run test:headed
npm run test:runner
npm run test:report
```

Set `APP_DIR` if the application is somewhere else. Set `SKIP_WEBSERVER=1` to test servers that are already running.

The test URLs are dynamic and can be changed without editing the suite:

```powershell
$env:API_BASE_URL="https://api.test.example.com"
$env:FRONTEND_URL="https://app.test.example.com"
$env:SKIP_WEBSERVER="1"
npm.cmd test
```

If these variables are not provided, the suite uses the addresses documented by the application: `http://localhost:4000` for the API and `http://localhost:5173` for the frontend.

Reusable test inputs, including test-user credentials and password boundary values, are centralized in `e2e/fixtures/test-data.js`.

To execute the supplied compliance-PDF regression in PowerShell:

```powershell
$env:COMPLIANCE_PDF_PATH="C:\Users\polinab\Downloads\INTERNATIONAL COMPLIANCE.pdf"
npx.cmd playwright test e2e/evidence-pdf.spec.js
```

## CI setup in the application fork

The submission is intended for the `Polina961233/sap-interview-task` fork. Add this `solution/` directory to the application repository and place the workflow at the repository root:

```text
.github/workflows/e2e.yml
```

The workflow checks out one repository, starts its PostgreSQL and Qdrant services, installs the backend and frontend, and runs the Playwright suite from `solution/`. This means CI tests the same application commit that contains the QA changes and directly satisfies the assignment requirement to keep the runnable E2E suite in the repository.

### GitHub Actions configuration

The workflow runs on pull requests, pushes to `main`, manual requests, and weekdays at `05:00 UTC`. It uses fixed Node and Bun versions and the local services defined by `docker-compose.yml`, so no GitHub repository variables or secrets are required for the current CI run.

Scheduled workflows run only from GitHub's default branch, so the schedule becomes active after `.github/workflows/e2e.yml` is merged into `main`.

The test framework still reads `API_BASE_URL`, `FRONTEND_URL`, `DATABASE_URL`, `QDRANT_URL`, and `QDRANT_COLLECTION` through `e2e/fixtures/environment.js`. This allows a future test or staging workflow to supply different runtime values without changing test code. Add GitHub Environment variables and secrets only when such a deployed environment is actually available.

Test-user credentials, questionnaire inputs, and boundary values remain centralized in `e2e/fixtures/test-data.js`; they are test scenario data rather than environment configuration.

The application currently has no committed backend or frontend dependency lockfiles, so CI uses `bun install` and `npm install` for those folders. For fully repeatable builds, the application team should commit compatible lockfiles; the workflow can then use `bun install --frozen-lockfile` and `npm ci`. The QA solution already commits `solution/package-lock.json` and uses `npm ci`.

## Test-data policy

Global setup creates two deterministic, verified users directly in the local test database. This deliberately bypasses the mock-email log because email delivery is not the subject of most tests. Registration and verification should be covered separately at API/component level once the mock-email service exposes a test adapter.

Never run this suite against production. It writes questionnaires, responses and evidence.
