# Bugs and Issues Found

This report supports Part B of the assignment. It contains defects found through Playwright browser/API execution and integration checks across PostgreSQL, Qdrant, and the local filesystem.

## Severity definitions

| Severity | Meaning |
|---|---|
| Critical | Confidentiality breach or system-wide security failure |
| High | Core workflow failure, data loss, serious availability risk, or major security weakness |
| Medium | Important incorrect behavior with a workaround or limited immediate impact |
| Low | Minor issue with limited user or business impact |

## Findings summary

| ID | Severity | Finding | Evidence status |
|---|---:|---|---|
| BUG-001 | Critical | Evidence from one user can be returned to another | Integration finding: API upload/search plus two-user Qdrant flow |
| BUG-002 | High | Editing a questionnaire deletes historical answers | Integration finding: API workflow plus PostgreSQL verification |
| BUG-003 | Medium | Invalid request bodies are returned as HTTP 500 | API finding |
| BUG-004 | High | A rejected upload leaves a temporary file on disk | API/filesystem integration finding |
| BUG-005 | Medium | Verification tokens never expire | API/PostgreSQL integration finding |
| BUG-007 | High | Returning to "Select questionnaire" crashes the UI | Reproduced with Playwright |
| BUG-008 | Medium | Negative and excessive-precision number answers are accepted | Reproduced through API tests |
| BUG-009 | High | Indexed compliance PDF is not returned for an exact contained phrase | Reproduced through API/Qdrant tests |
| BUG-010 | High | Deleted PostgreSQL evidence remains searchable in Qdrant | Reproduced through integration test |
| BUG-011 | High | Registration accepts trivially weak passwords | Reproduced through API tests |
| BUG-012 | Medium | A whitespace-only question prompt is accepted | Reproduced through API test |

## BUG-001 - Evidence from one user can be returned to another

- **Severity:** Critical
- **Impact:** Confidential filenames and document text may be exposed to another user.
- **Evidence:** Reproduced through a two-user integration test in `e2e/known-defects.spec.js`: user A uploads uniquely marked evidence and user B receives it through the questionnaire API.

### Reproduction

1. Register and verify users A and B.
2. As user A, upload a document containing a unique phrase.
3. As user B, create a questionnaire question containing that phrase.
4. Load user B’s questionnaire.

**Expected:** Only evidence uploaded by user B is returned.

**Actual:** The global Qdrant search can return user A’s filename and document text to user B.

## BUG-002 - Editing a questionnaire deletes historical answers

- **Severity:** High
- **Impact:** Previously submitted answers can disappear, leaving an incomplete response record.
- **Evidence:** Reproduced in `e2e/response-history.spec.js` by submitting an answer, editing the questionnaire through the API, and checking PostgreSQL afterward.

### Reproduction

1. Create a questionnaire.
2. Submit answers for it.
3. Record the rows in `response_answers`.
4. Update the questionnaire.
5. Inspect the original response again.

**Expected:** Previously submitted answers remain unchanged and available.

**Actual:** Deleting the original questions also deletes their historical answer rows.

## BUG-003 - Invalid request bodies are returned as HTTP 500

- **Severity:** Medium
- **Impact:** Client mistakes look like backend failures, making troubleshooting and monitoring misleading.
- **Evidence:** Reproduced through API requests in `e2e/error-contract.spec.js`. Empty and null prompts both returned `500 Internal server error`.

### Reproduction

1. Send `POST /questionnaires` with an empty question prompt or JSON `null`.
2. Inspect the HTTP response.

**Expected:** HTTP 400 or 422 with a safe field-validation message.

**Actual:** HTTP 500 with `{"message":"Internal server error"}`.

## BUG-004 - A rejected upload leaves a temporary file on disk

- **Severity:** High
- **Impact:** Repeated failed uploads can fill server storage. Large uploads also have no observed early rejection protection.
- **Evidence:** Reproduced through `e2e/upload-cleanup.spec.js`: an unsupported upload returns HTTP 400 but its uniquely named file is still found under `backend/uploads`.

### Reproduction

1. Upload a uniquely named file using unsupported MIME type `application/octet-stream`.
2. Confirm that the API returns HTTP 400.
3. Inspect `backend/uploads` for the unique filename.

**Expected:** The upload is rejected and its temporary file is removed.

**Actual:** The request is rejected, but the temporary file remains on disk. The automated test removes its own leaked fixture after recording the result.

## BUG-005 - Verification tokens never expire

- **Severity:** Medium
- **Impact:** An old unused verification link remains valid indefinitely.
- **Evidence:** Reproduced through `e2e/verification-expiry.spec.js`: registration creates a token, its PostgreSQL timestamp is moved 30 days into the past, and the API still verifies it.

### Reproduction

1. Register a new user through the API.
2. Move `verification_sent_at` 30 days into the past in the test database.
3. Submit the original token to `POST /auth/verify`.

**Expected:** An expired verification token is rejected.

**Actual:** Any unused token remains valid because no expiry condition is applied.

## BUG-007 - Returning to "Select questionnaire" crashes the UI

- **Severity:** High
- **Impact:** A normal action removes the application UI and forces the user to reload and log in again.
- **Evidence:** Reproduced with `e2e/questionnaire-ui.spec.js`; trace and screenshot were captured in `test-results`.

### Reproduction

1. Log in.
2. Create or select an existing questionnaire under **Fill Questionnaire**.
3. Open the dropdown again.
4. Choose **Select questionnaire**.

**Expected:** The loaded questionnaire is cleared and the page remains usable.

**Actual:** The application content disappears.


## BUG-008 - Negative and excessive-precision number answers are accepted

- **Severity:** Medium
- **Impact:** Questions representing positive whole-number values, such as password length, can store unsuitable data.
- **Evidence:** Reproduced using expected-failure cases in `e2e/questionnaire-api.spec.js`.

### Reproduction

1. Create a questionnaire containing a number question.
2. Submit `-12` as the answer.
3. Repeat with `12.555555555555555555555555555555555555555555`.

**Expected:** Values outside the question’s sign, whole-number, range, or precision rules are rejected.

**Actual:** Both values are accepted because validation only checks whether `Number(value)` is `NaN`.

### Requirement note

The README defines a generic `number` type but does not specify whether negatives or decimals are allowed. Requires further product agreement.

## BUG-009 - Indexed compliance PDF is not returned for an exact contained phrase

- **Severity:** High
- **Impact:** Users cannot rely on the main evidence-assistance feature even when the uploaded document contains the question wording.
- **Evidence:** Reproduced with `e2e/evidence-pdf.spec.js`. PDF extraction returned text, upload indexed three chunks, and Qdrant inspection confirmed the expected phrase was stored.

### Reproduction

1. Upload `INTERNATIONAL COMPLIANCE.pdf`.
2. Create a question using the visitor-log sentence contained in the PDF.
3. Load the questionnaire.

**Expected:** The PDF’s visitor-log section appears in the returned evidence.

**Actual:** The PDF is absent while unrelated DOCX and ERP excerpts are returned.


## BUG-010 - Deleted PostgreSQL evidence remains searchable in Qdrant

- **Severity:** High
- **Impact:** Evidence that appears deleted can remain visible and searchable, affecting privacy and retention expectations.
- **Evidence:** Reproduced with `e2e/evidence-deletion-consistency.spec.js`.

### Reproduction

1. Upload evidence containing a unique marker.
2. Delete its row from PostgreSQL `evidence_files`.
3. Create or load a matching questionnaire question.

**Expected:** The deleted document and its text are no longer returned.

**Actual:** Deleted evidence is still searchable.

## BUG-011 - Registration accepts weak passwords

- **Severity:** High
- **Impact:** Easily guessed credentials increase the likelihood of account compromise and unauthorized access to confidential evidence.
- **Evidence:** Reproduced with `e2e/auth.spec.js` using passwords `1` and `123`.

### Reproduction

1. Send `POST /auth/register` with a valid unique username.
2. Set the password to `1` or `123`.

**Expected:** HTTP 400 with a password-policy validation message.

**Actual:** HTTP 201; the account is created because the schema requires only one character.

## BUG-012 - A whitespace-only question prompt is accepted

- **Severity:** Medium
- **Impact:** Users can create blank-looking questions that do not communicate what answer is required.
- **Evidence:** Reproduced with `e2e/questionnaire-api.spec.js` and represented in the Bruno negative-test collection.

### Reproduction

1. Send `POST /questionnaires` with a valid title.
2. Set `questions[0].prompt` to three spaces: `"   "`.

**Expected:** HTTP 400 because the prompt is blank after surrounding whitespace is ignored.

**Actual:** HTTP 201; the questionnaire is created because `.min(1)` counts spaces as characters.

### Empty-string and null distinction

- `"prompt": ""` is an empty string and produces the Zod `too_small` issue.
- `"prompt": null` is JSON null and produces an invalid-type issue internally.
- `"prompt": "null"` is ordinary text containing four characters.

In the current API, the first two validation failures are exposed as HTTP 500, as recorded under BUG-003.

## Coverage status and gaps

- BUG-001 through BUG-012 now have API, UI, or integration evidence. Some integration tests use direct PostgreSQL inspection to verify stored state that is not exposed by the API.
- Upload resource exhaustion and maximum-size handling were not tested with production-scale files to avoid destabilizing the local environment.
- Verification-token expiry cannot be fully tested because no expiry requirement is currently defined.
- Evidence ranking was tested with the supplied PDF and local indexed data, but no agreed larger relevance benchmark exists.
- PostgreSQL/Qdrant service-failure combinations were not executed. No expected recovery behavior or acceptance criteria are defined, so this remains a future test area rather than a confirmed defect.
- Accessibility, cross-browser, load, and long-running tests remain outside this execution pass.
