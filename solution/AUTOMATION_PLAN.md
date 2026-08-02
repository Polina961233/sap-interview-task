# Automation Direction

## Goal

The JavaScript Playwright suite protects the application’s highest-risk user journeys and API rules. It combines browser tests for assembled workflows with faster API and database checks for security, validation, evidence search, and stored-data behavior.

Known bugs are marked with Playwright `test.fail()`. Their tests still run and must fail in the documented way. If a known bug unexpectedly stops failing, Playwright reports it so the expectation can be reviewed and converted into a normal passing regression.

## What is automated and why

| Area | Automated coverage | Why it is high value |
|---|---|---|
| Authentication | Anonymous rejection, verified login, weak passwords | Protects access to confidential questionnaires and evidence |
| Verification expiry | Old verification token rejected after its timestamp is moved into the past | Verifies account links do not remain usable indefinitely |
| Questionnaire ownership | Cross-user read and update attempts | Prevents one user accessing another user’s data |
| Questionnaire creation | Create through API and browser, duplicate titles | Covers a main business workflow and owner-specific uniqueness |
| Answer validation | Required answers, invalid numbers, regex, negative/long decimals | Prevents incorrect responses from being stored |
| Prompt validation | Whitespace-only, empty, and null prompts | Prevents meaningless questionnaires and verifies API errors |
| Response submission | Complete create-to-submit browser flow | Confirms the main user journey works end to end |
| UI stability | Returning to “Select questionnaire” | Reproduces the confirmed full-page crash |
| Frontend deployment configuration | Optional check against an explicitly supplied external API address | Validates environment configuration when a deployed test environment becomes available |
| Response history | Edit after submission and database verification | Detects deletion of previously submitted answers |
| Evidence retrieval | Upload, index, and retrieve all three supplied ERP, IoT fleet, and HR portal TXT files | Confirms the complete upload-to-search pipeline and supplied evidence corpus in CI |
| Evidence isolation | User A uploads private marker; user B searches | Exercises the Critical cross-user evidence leak |
| Evidence deletion | Delete PostgreSQL metadata and search again | Exposes PostgreSQL/Qdrant mismatch |
| Failed-upload cleanup | Reject unsupported upload and inspect the temporary directory | Detects files left on server disk after failed processing |
| PDF retrieval | Optional compliance-PDF exact-phrase regression | Reproduces the observed missing relevant PDF result |

## Test organization

```text
e2e/
  auth.spec.js
  questionnaire-api.spec.js
  questionnaire-ui.spec.js
  error-contract.spec.js
  response-history.spec.js
  evidence-txt.spec.js
  evidence-pdf.spec.js
  evidence-deletion-consistency.spec.js
  upload-cleanup.spec.js
  verification-expiry.spec.js
  deployment-ui.spec.js
  known-defects.spec.js
  global-setup.js
  fixtures/test-data.js
```

- API tests carry most validation and ownership combinations because they are faster and more precise than browser tests.
- Browser tests cover login, questionnaire creation, selection, validation, and submission as the user experiences them.
- Database checks are used only where an API response cannot prove stored history is correct.
- Evidence tests use unique filenames and marker text so results can be identified reliably.
- Global setup creates two verified test users and removes their previous PostgreSQL and Qdrant data.
- Tests use one worker because the current application shares one database and one Qdrant collection.

## Run the suite

From `solution/`:

```powershell
npm.cmd install
npx.cmd playwright install chromium
npm.cmd test
```

Focused runs:

```powershell
npm.cmd run test:api
npm.cmd run test:ui
npm.cmd run test:evidence
npm.cmd run test:known-defects
npm.cmd run test:headed
npm.cmd run test:runner
```

The committed compliance PDF runs automatically:

```powershell
npx.cmd playwright test e2e/evidence-pdf.spec.js
```

Set `COMPLIANCE_PDF_PATH` only when intentionally testing a different PDF.

## Reliability and evidence

- A fresh test run starts with clean data for the two automated users.
- Titles, marker text, and evidence filenames are unique.
- Chromium runs with one worker to prevent shared-data races.
- CI retains HTML report, JUnit result, traces, and screenshots.
- Local runs do not retry; CI retries once and preserves failure artifacts.
- A known defect is never silently skipped: it is either executed as an expected failure or clearly skipped because an external fixture is unavailable.

## Intentionally not automated yet

- Complete registration-to-mock-email-link verification: the token is printed only to backend output and has no test interface.
- Full PDF/DOCX matrix: valid, damaged, image-only, encrypted, large, and Unicode fixtures are not yet versioned in the repository.
- Large-file resource exhaustion: unsafe for the shared local environment without agreed limits.
- Questionnaire edit behavior beyond the confirmed data-loss regression: the product must decide on questionnaire versioning.
- Intentional submission of identical answers: the product must decide whether to block, warn, update, or create a new historical response.
- Duplicate evidence behavior: the product must decide whether to reject, reuse, or version identical content.
- PostgreSQL/Qdrant behavior when one service is unavailable: not automated because expected behavior and recovery timing are not defined.
- Frontend configuration outside localhost: the current local environment cannot prove whether another deployment can configure its API address. Run the conditional deployment check when a deployed test environment is available.
- Accessibility, Firefox/WebKit, load, soak, and broad visual checks: these follow the Critical and High functional risks.
- A larger evidence-search benchmark: expected document rankings and acceptable scores need product agreement.

## How coverage should scale

1. Fix Critical/High defects and convert their expected-failure tests into required passing regressions.
2. Add backend unit tests for schemas, chunking, number rules, password rules, and response validation.
3. Add versioned PDF/DOCX fixtures and run the parser matrix in CI.
4. Add separate PostgreSQL schemas and Qdrant collections per worker and enable parallel execution, if suite becomes bigger and test duration is taking long time.
5. Add duplicate-request protection and concurrent submission tests after the API behavior is defined.
6. After recovery requirements are agreed, add controlled tests that make PostgreSQL and Qdrant unavailable.
7. Build a versioned evidence-search dataset and track whether expected evidence appears in the first five results.
8. Run Chromium smoke tests on pull requests; run Firefox, WebKit, accessibility, and larger evidence tests nightly or before realease.
9. Add response-time targets for startup, upload, indexing, and questionnaire loading.
10. Publish results to a reporting tool such as Allure for better visibility. The report should show pass rate, failed and skipped tests, unexpected failures, retries, screenshots, and logs for failed tests. Keep historical results so the team can see trends by build, browser, environment, and product area. Display the Allure report as a downloadable CI artifact or hosted dashboard.

## CI direction

The GitHub Actions workflow first type-checks the backend, builds the frontend, validates the Playwright framework, and discovers the tests. The dependent E2E job starts fresh PostgreSQL and Qdrant services, waits for both to become ready, runs migrations, installs Chromium, executes the suite, and uploads artifacts even when tests fail. Concurrency cancellation stops obsolete runs for the same branch. A deployment job should be added only when a real target environment, credentials, approval rules, health check, and rollback process exist. Known defects remain visible in Playwright output while the pipeline stays usable until the application fixes are delivered.
