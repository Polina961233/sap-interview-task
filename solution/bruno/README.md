# Bruno Manual API Collection

## Import

1. Start PostgreSQL, Qdrant, and the backend.
2. Open Bruno.
3. Select **Open Collection**.
4. Choose this `solution/bruno` folder.
5. Select the **Local** environment in the upper-right corner.

The local environment uses `http://localhost:4000` and reusable `{{variable}}` placeholders, following Bruno's environment-variable format.

## Recommended execution order

1. Run `00 Health/Health`.
2. Change `username` if it already exists, then run `01 Auth/01 Register`.
3. Copy the token from the backend line `[mock-email] verify-link: ...` into `verificationToken`.
4. Run either POST verification or the browser-link request once.
5. Run `04 Current User` to confirm authentication.
6. Run `02 Create Questionnaire`; it stores `questionnaireId` automatically.
7. Run `03 Get Questionnaire With Evidence`; it stores `questionId1` and `questionId2`.
8. Run validation and submission requests.
9. Set `evidenceFilePath` to an absolute local path and run Upload Evidence.
10. Reload the questionnaire to trigger evidence search.

## Authentication

Protected requests use Bruno's Basic Auth configuration:

```text
Username: {{username}}
Password: {{password}}
```

Bruno creates the `Authorization: Basic ...` header. Do not manually Base64-encode the credentials.

## Important manual checks

- Use a unique questionnaire title before repeating Create.
- After Update, rerun Get because the application recreates question IDs.
- Register and verify `secondaryUsername` before running the cross-user request.
- Evidence upload supports PDF, DOCX, and TXT.
- Do not add a multipart `Content-Type` header manually; Bruno must generate the boundary.
- Known-defect requests document the expected secure behavior and current result.

## Endpoint coverage

| Method | Endpoint | Collection request |
|---|---|---|
| GET | `/health` | Health |
| POST | `/auth/register` | Register, Weak Password |
| POST | `/auth/verify` | Verify Account POST, Invalid Token |
| GET | `/auth/verify` | Verify Account Browser Link |
| GET | `/auth/me` | Current User |
| GET | `/questionnaires` | List, Missing Authentication |
| POST | `/questionnaires` | Create Questionnaire |
| GET | `/questionnaires/:id` | Get With Evidence, Cross User Read |
| PUT | `/questionnaires/:id` | Update Questionnaire |
| POST | `/questionnaires/:id/responses` | Valid, invalid, incomplete, and known-defect submissions |
| POST | `/evidence/upload` | Upload Evidence |
| GET | `/responses/mine` | List My Responses |

The application currently has no API for listing or deleting evidence and no endpoint for retrieving individual response answers.
