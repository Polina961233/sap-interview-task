# Test Execution Report

## Scope and environment

- **Latest execution:** 2026-08-02
- **Application revision inspected:** `994abce`
- **Environment:** Windows, Node 24, Bun 1.3, Docker Desktop, Chromium
- **Services:** PostgreSQL, Qdrant, backend, and Vite frontend
- **Command:** `npm.cmd test`
- **Method:** Playwright browser/API tests plus PostgreSQL, Qdrant, filesystem, and PDF integration checks

## Full Playwright result

```text
24 tests discovered
22 passed
2 skipped
Duration: 40.8 seconds
Exit code: 0
```

The 22 passing results contain:

- 9 normal passing scenarios
- 13 executed expected-failure regressions for confirmed bugs
- 1 skipped deployment-configuration check because no external `API_BASE_URL` was supplied
- 1 skipped compliance-PDF regression because `COMPLIANCE_PDF_PATH` was not set for the full run

An `x` in Playwright output means the known-bug test executed and failed in the documented way. It is not silently skipped. The separate compliance-PDF test was previously executed with the supplied file and reproduced BUG-009.

## Key scenarios run

| Area | Scenario | Result |
|---|---|---|
| Authentication | Anonymous request rejected | Passed |
| Authentication | Verified user logs in through UI | Passed |
| Authentication | Passwords `1` and `123` rejected | Known failure, BUG-011 reproduced |
| Verification | Verification token dated 30 days earlier is rejected | Known failure, BUG-005 reproduced |
| Deployment configuration | Frontend can use a non-local API address | Not confirmed: only the local environment was available |
| API errors | Empty and null prompts return a client error | Known failure, BUG-003 reproduced |
| Evidence deletion | PostgreSQL deletion also removes Qdrant content | Known failure, BUG-010 reproduced |
| Upload cleanup | Rejected upload removes its temporary file | Known failure, BUG-004 reproduced |
| Evidence retrieval | Supplied ERP, IoT fleet, and HR portal TXT files upload, index, and return for matching text | Passed |
| Evidence isolation | User B cannot receive user A’s uniquely marked evidence | Known failure, BUG-001 reproduced |
| Questionnaire ownership | User B cannot read or update user A’s questionnaire | Passed |
| Duplicate title | Same owner cannot create the same title twice | Passed |
| Answer validation | Missing, invalid-number, and regex-invalid answers rejected | Passed |
| Number boundaries | Negative and excessive-precision values rejected | Known failure, BUG-008 reproduced |
| Prompt validation | Whitespace-only prompt rejected | Known failure, BUG-012 reproduced |
| Browser flow | Login, create, select, answer, and submit | Passed |
| UI stability | Return to “Select questionnaire” without crashing | Known failure, BUG-007 reproduced |
| Response history | Editing preserves previously submitted answers | Known failure, BUG-002 reproduced |
| Compliance PDF | Exact contained phrase returns the uploaded PDF | Previously executed separately; BUG-009 reproduced |

Every finding remaining in `BUG_REPORTS.md` has API, UI, or integration evidence. The former API-address finding was removed: observing localhost in the only available local environment does not prove that deployment configuration is defective. Complete reproduction steps, impact, expected behavior, and actual behavior for confirmed findings are in `BUG_REPORTS.md`.

## Test evidence

Playwright produces:

- `playwright-report/` - HTML execution report
- `test-results/` - traces, screenshots, and error context for failures
- CI JUnit output under `test-results/junit.xml`

The BUG-007 execution captured a browser trace and screenshot. API and database regressions are reproducible from their named files under `e2e/`.

## Coverage gaps and reasons

| Gap | Why it was not covered | What is needed next |
|---|---|---|
| Frontend API address in a deployed environment | Only the local environment was available, where localhost is expected. This does not prove whether the production build can use another API address | Deploy the frontend with a non-local API address, then verify browser requests, HTTPS, and CORS through DevTools or Playwright |
| Compliance PDF in regular CI | The PDF is outside the repository, so CI cannot access it automatically | Add an approved non-sensitive PDF fixture to the repository or provide `COMPLIANCE_PDF_PATH` in the test environment |
| Complete registration-to-verification-link flow | The verification token is printed only to backend output; the test suite has no supported way to read a mock inbox or request the token | Provide a test email adapter, mock inbox, or test-only token retrieval interface |
| Damaged, encrypted, image-only, Unicode, and very large PDF/DOCX coverage | Approved binary fixtures are not yet stored in the repository, and image-only documents may require OCR behavior that the product does not define | Create a versioned, non-sensitive document fixture set and define expected behavior for each file type |
| Maximum upload size and resource exhaustion | No maximum size, expected processing time, or resource limit is defined. Sending uncontrolled large files could destabilize the shared local environment | Agree file-size and processing limits, then run in an isolated environment with CPU, memory, disk, and timeout monitoring |
| PostgreSQL/Qdrant behavior when a service is unavailable | The expected API response, stored-data state, retry behavior, and recovery time are not defined. These scenarios were not executed, so no bug is reported for them | Agree expected behavior, then add controlled tests that stop one service at a time |
| Intentional identical responses | It is unclear whether identical answers should be blocked, warned about, update the previous response, or create a new historical response | Product decision and acceptance criteria |
| Duplicate evidence behavior | It is unclear whether identical content should be rejected, reused, replaced, or stored as a new version | Product decision, content-hash rule, and versioning expectations |
| Multi browser support | Chromium was selected for the initial release gate. Most confirmed defects are API/database issues, and running several browsers would add time before the main suite is stable | Add Firefox/WebKit after Chromium regressions are stable; run them before release |
| Load and concurrency at scale | Expected user count, simultaneous uploads, document volume, and acceptable response times are not defined| Agree performance targets and use an isolated production-like environment with monitoring |
| Long-running/soak testing | There are no agreed limits for memory, storage growth, or performance degradation | Add monitoring and run repeated upload/search/submit/delete workflows for several hours in a dedicated environment |
