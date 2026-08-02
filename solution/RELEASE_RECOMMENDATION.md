# Release Recommendation

## Decision: No

Do not release this build beyond an isolated interview/demo environment.

## Release blockers

1. `BUG-001`: cross-user evidence disclosure — confidentiality boundary is broken.
2. `BUG-002`: editing questionnaires destroys historical answers — submitted data is not trustworthy or auditable.
3. `BUG-004`: rejected uploads leave temporary files on disk — repeated failures can consume server storage.
4. `BUG-009`: an indexed PDF is not returned for an exact contained phrase — the core evidence-assistance promise is unreliable.
5. `BUG-010`: deleted evidence remains searchable in Qdrant — deletion and retention guarantees are ineffective.
6. `BUG-011`: trivially weak passwords are accepted — account protection is inadequate for confidential evidence.
7. `BUG-007`: returning to "Select questionnaire" crashes the UI during a normal questionnaire workflow.
8. Required runtime regression suite has not yet produced a clean execution record in the target environment.

## Conditional release gate

Release only after:

- Qdrant retrieval is owner-filtered and a two-user regression passes.
- Questionnaire edits use immutable versions or are blocked after submission.
- Upload size/type limits and guaranteed cleanup are implemented and tested.
- Evidence relevance is measured against a small agreed corpus and the supplied-PDF regression passes.
- Supported evidence deletion removes both PostgreSQL metadata and Qdrant content.
- All Must tests pass in a fresh CI environment with artifacts retained.
- Product/security owners review Basic Auth, HTTPS and CORS deployment controls.

## Deferrable items with mitigations

The following work can wait while the application is provided as a controlled pre-release version to selected users.

- **Verification-token expiry (`BUG-005`):** This can wait only if registration is limited to selected pre-release users. Public registration must remain disabled, and unused test accounts must be disabled manually.
- **Validation error details (`BUG-003`):** User-friendly error text can wait, but invalid input must return `400` or `422`. A `500` response for an empty or null question is still a defect that must be fixed.
- **Number limits (`BUG-008`):** Product must first decide whether negative numbers and very long decimal values are valid. If they are not valid, the application must reject them before release. Improving the wording of the validation message can wait.
- **Questions containing only spaces (`BUG-012`):** This can wait only if questionnaire creation is restricted to administrators and every questionnaire is reviewed before use. Any blank question must be removed manually.
- **Duplicate evidence and repeated responses:** The final duplicate-handling rules can wait during pre-release user testing. Users should use clear, unique evidence filenames and review saved responses. The pre-release test owner should remove accidental duplicates manually.
- **Other browsers and mobile devices:** Firefox, WebKit, and mobile testing can wait if the pre-release version officially supports desktop Chromium only. Users must be told which browser is supported, and the main workflow must pass in Chromium before access is provided.
- **Larger evidence-search benchmark:** A larger dataset can wait after all supplied TXT evidence tests and the compliance PDF test pass. Pre-release users must check the source filename and text snippet before using suggested evidence.

