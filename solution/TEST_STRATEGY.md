# Risk-Based Test Strategy

## Product context

This strategy covers the Questionnaire + Evidence RAG application described in `README.md` and `README-QA-TASK.md`. Verified users create questionnaires, upload PDF/DOCX/TXT evidence, review related document excerpts, and submit validated answers. The business goal is to improve first-time answer accuracy and reduce manual review.

The strategy prioritizes private user data, correctly saved information, and useful evidence results.

## System and test implications

The application consists of a React UI, an Express/Bun API, PostgreSQL, Qdrant, and a local search model. This requires UI, API, database, evidence-search, and cross-system tests. Evidence is retrieved from the question prompt, not from text entered in the answer; therefore upload success alone does not prove retrieval works.

## Top product risks

| Risk | Business impact | Priority | Related finding |
|---|---|---:|---|
| Cross-user evidence disclosure | Confidential document names and contents may leak between users | Must | BUG-001 |
| Questionnaire editing deletes historical answers | Submitted declarations become incomplete and unauditable | Must | BUG-002 |
| Missing or irrelevant evidence | Users may submit incorrect answers while trusting the assistant | Must | BUG-009 |
| PostgreSQL and Qdrant contain different data | Deleted evidence remains searchable or uploads/deletions are only partly completed | Must | BUG-010 |
| Duplicate evidence indexing | Wastes storage and may crowd correct evidence out of the top five | Must | Improvement |
| Invalid answers accepted | Incorrect response data is persisted | Must | BUG-008 |
| Blank question prompts accepted | Meaningless questionnaires can be created and presented to users | Must | BUG-012 |
| Authentication or ownership bypass | Unauthorized users may access private functionality | Must | BUG-001-related |
| Weak passwords accepted | Easily guessed credentials increase account-compromise risk | Must | BUG-011 |
| Unbounded or malformed uploads | Files may exhaust disk, memory, or CPU and remain on disk after failure | Must | BUG-004 |
| UI state failure | A normal selection action can crash the entire application | Must | BUG-007 |
| Duplicate response caused by retry or double-click | Multiple records may represent one intended submission | Must | Improvement |
| Invalid input returned as HTTP 500 | Clients receive misleading errors | Should | BUG-003 |
| Verification and credential weaknesses | Long-lived verification links and repeated Basic Auth increase account risk | Should | BUG-005 |
| Poor upload feedback | Users may not know whether evidence succeeded, failed, or was duplicated | Should | Improvement |
| Slow model startup or search | Questionnaire completion may become impractical at scale | Should | Performance risk |
| Accessibility/browser incompatibility | Some users may be unable to complete questionnaires | Should | Coverage gap |

## Scope by priority

### Must test

#### Authentication and ownership

- Registration, verification, valid login, invalid login, and unverified-user rejection
- Password policy enforcement for length, common passwords, character rules, and documented maximum length
- Weak values such as `1` and `123` must be rejected consistently by UI and API
- Missing, malformed, and incorrect Basic Auth credentials
- Two-user isolation for questionnaire list, read, update, and submission
- Two-user evidence isolation at the Qdrant query level

#### Questionnaire and response correctness

- Create and edit questionnaires
- Case-insensitive duplicate titles per owner; same title allowed for different owners
- Required, text, numeric, and regex validation in UI and API
- Trimmed non-blank questionnaire titles and question prompts; whitespace-only values must be rejected
- Numeric sign, integer/decimal, range, and precision rules once specified
- Missing, duplicate, unknown, and cross-questionnaire answer IDs
- All-or-nothing response saving: either the response and every answer are saved, or nothing is saved
- Editing questionnaire after responses exist without changing historical answers for it
- Protection against duplicate responses caused by double-clicks, network retries, or requests arriving at the same time

Intentional submission of the same answers needs a product decision: block it, show a warning, update the previous response, or save a new response version. An accidental repeated request should not create another response.

#### Evidence upload and retrieval

- Successful TXT, PDF, and DOCX extraction and indexing
- Unsupported, empty, incorrectly labeled, damaged, and oversized files
- Temporary-file cleanup after success and every failure point to avoid unnecessary disk storage usage 
- UI feedback for upload progress, success, failure, duplicate, and retry
- Owner-scoped duplicate-content detection
- Same filename with different content and different filename with identical content
- Search using exact wording and different wording with the same meaning, using the supplied evidence files
- Owner filtering before applying the five-result limit
- Effect of duplicate indexed document sections on the order of search results
- No-relevant-evidence and score-threshold behavior
- Confirmation that answer text does not trigger a new evidence search

Retrieval checks should measure whether expected evidence appears in the first five results, whether returned evidence is relevant, whether duplicate content occupies multiple positions, and whether cross-user leakage remains zero.

#### Evidence deletion and service failures

- Evidence deletion removes PostgreSQL metadata and all Qdrant points for `evidenceFileId`
- Repeating the same deletion is safe and does not cause errors or inconsistent data
- PostgreSQL and Qdrant contain matching data after supported upload and deletion operations

#### Critical UI journeys

- Register, verify, and log in
- Upload evidence and receive clear feedback
- Create, edit, select, and deselect a questionnaire
- Complete and submit valid answers
- Block incomplete or invalid answers
- Preserve the UI after API errors and unexpected state

### Should test

- Concurrent registration and duplicate questionnaire creation
- Multiple legitimate submissions, ordering, and response-history presentation
- Unicode, whitespace, and very long prompts and answers
- Regex denial-of-service patterns
- Stable API error contracts for schema and database failures
- Large documents, many chunks, many questions, and repeated retrieval
- Verification-token expiry, resend, and rate limiting
- Keyboard navigation, labels, focus, contrast, and screen-reader announcements
- Chromium, Firefox, and WebKit smoke coverage
- Configurable frontend API address, secure HTTPS connections, and access allowed only from approved websites
- PostgreSQL, Qdrant, and embedding-model unavailability after the expected error and recovery behavior is defined

### Nice to have

- Visual regression for stable components
- Mobile layout and slow-network behavior
- Larger relevance benchmark beyond the supplied corpus
- Long-running soak, retention, and storage-growth tests
- User feedback such as “not relevant” and ranking analytics

## Test layers

| Layer | Purpose | Representative coverage |
|---|---|---|
| Static review | Find structural risks cheaply | Missing owner filter, destructive cascades, hard-coded URLs |
| Unit | Verify deterministic logic quickly | Chunking, schemas, numeric/regex rules, credential parsing |
| API/service | Exercise security and business rules | Authentication, ownership, validation, duplicate-request protection, error responses |
| PostgreSQL integration | Verify correctly stored and connected data | Uniqueness, response history, all-or-nothing saving, failures, simultaneous requests |
| Qdrant integration | Verify evidence-search behavior | User filters, result order, minimum scores, duplicate content, deletion |
| Cross-system integration | Find operations completed in only one system | PostgreSQL/Qdrant upload and deletion checks, retries, regular consistency checks |
| Browser E2E | Verify assembled critical journeys | Login, upload feedback, create/select/fill/submit, crash regression |
| Exploratory | Assess behavior that is difficult to encode initially | Retrieval usefulness, ambiguous requirements, malformed documents |
| Non-functional | Protect availability and usability | Upload limits, response time, recovery from failures, accessibility, and security |

Most validation permutations should run at API or service level. Browser tests should cover a small number of high-value journeys.

## Environments and test data

### Environments

| Environment | Purpose | Configuration |
|---|---|---|
| Developer | Fast investigation and local automation | Docker PostgreSQL/Qdrant, deterministic fixtures, isolated local data |
| CI | Pull-request release gate | Fresh databases per job, pinned dependencies/images, Chromium, retained failure artifacts |
| Pre-production | Release validation | Production-like HTTPS, allowed website origins, credentials, resource limits, document volume, browsers, and monitoring |

Tests must never use production credentials or collections. Parallel workers require isolated schemas and Qdrant collections, or unique run IDs with verified cleanup.

### Required test data

- Two verified users and one unverified user
- Text, number, valid/invalid regex, and multi-question questionnaires
- `erp-security-implementation.txt`
- `iot-fleet-security-design.txt`
- `hr-portal-controls.txt`
- `INTERNATIONAL COMPLIANCE.pdf`
- Valid and damaged PDF/DOCX files
- Empty, oversized, mislabeled, and Unicode files
- A private marker unique to user A for isolation testing
- Duplicate files covering same/different filename and same/different content
- A unique deletion marker for checking that PostgreSQL and Qdrant match
- Expected query-to-document relevance judgments and threshold-boundary queries

Test data must be versioned, contain no real confidential information, and be removed from both PostgreSQL and Qdrant after execution.

## Open requirements

- Numeric sign, range, integer/decimal, and precision constraints
- Password-policy rules, including minimum length, composition, breached/common-password handling, and maximum length
- Identical-response behavior
- Duplicate-evidence behavior and versioning
- Upload-message placement and duration
- Synchronous versus pending evidence deletion
- Expected API response, stored-data state, retry behavior, and recovery time when PostgreSQL, Qdrant, or the embedding model is unavailable
- Minimum acceptable evidence-search quality and response time

## Entry and exit criteria

### Entry criteria

- PostgreSQL, Qdrant, backend, frontend, and the embedding model are available.
- Database migrations are complete.
- The model version, score threshold, and result limit are known.
- Test users and evidence data are isolated from other runs.
- Open rules for passwords, numbers, duplicate evidence, repeated responses, and deletion are documented.

### Exit criteria

- Registration, verification, login, and rejection of unverified users work as agreed.
- The agreed password policy is enforced by both UI and API.
- User A cannot read, update, submit to, or receive evidence belonging to user B.
- Questionnaire creation, duplicate-title checks, editing, selection, and deselection work without a UI crash.
- Editing a questionnaire does not delete or change previously submitted answers.
- Required, text, number, regex, null, empty, and whitespace validation returns the agreed client-error response.
- A complete valid questionnaire response is saved with every answer; a failed submission saves nothing.
- Valid PDF, DOCX, and TXT files upload successfully and show clear success or failure feedback.
- Successful and rejected uploads leave no temporary original file in `backend/uploads`.
- Expected evidence from the supplied test documents appears within the first five results, unrelated evidence is not misleadingly shown, and no cross-user evidence is returned.
- Supported evidence deletion removes both the PostgreSQL metadata and all matching Qdrant content.
- PostgreSQL and Qdrant contain no unmatched evidence records after the test run.
- The full Playwright release suite passes in CI with no unexpected failures or unexplained retries.
- No Critical or High defect remains open. Any accepted Medium or Low issue has an owner, business approval, and follow-up date.

## Current release position

The current build does not meet the exit criteria because it has confirmed confidentiality, data-loss, upload, UI stability, retrieval, and deletion-consistency defects. Release is not recommended outside an isolated demonstration environment.
