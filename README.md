# QA Interview Task - Questionnaire + Evidence RAG

This repository contains a full-stack interview task:

- `frontend`: React + Vite app (with shadcn-inspired UI components)
- `backend`: Bun + TypeScript API with modular architecture
- `docker-compose.yml`: local Postgres + Qdrant vector database

For the candidate-facing QA assignment brief, see:

- [`README-QA-TASK.md`](/README-QA-TASK.md)

## Features

- Basic auth for all API routes (except registration)
- Hashed passwords stored in Postgres
- User data ownership enforced: users can only see or modify their own questionnaires and responses
- Define questionnaires with question rules:
  - `text`
  - `number`
  - optional regex validation
- Upload PDF/DOCX/TXT evidence files
- Chunk + embed evidence with a lightweight local model (`Xenova/all-MiniLM-L6-v2`)
- Store vectors in Qdrant
- Retrieve semantically relevant evidence for each question
- Submit responses with server-side validation

## Requirements

- Node.js 20+
- Bun 1.1+
- Docker + Docker Compose

## Start infrastructure

```bash
docker compose up -d
```

This starts:

- Postgres on `localhost:5432`
- Qdrant on `localhost:6333`

## Reset databases

To wipe and recreate Postgres + Qdrant data, then re-run migrations:

```bash
npm run db:reset
```

This command executes [`scripts/reset-databases.sh`](/scripts/reset-databases.sh).

## Backend setup

```bash
cd backend
bun install
bun run migrate
bun run dev
```

Backend runs on `http://localhost:4000`.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Default flow

1. Register user from UI
2. Backend prints a mock verification link to stdout (`[mock-email] verify-link: ...`)
3. Click the verification link (it verifies account and redirects to the frontend landing page)
4. Log in (Basic auth)
5. Create or edit questionnaire + questions
6. Upload evidence documents
7. Open questionnaire and see relevant documents per question
8. Submit responses

## Mock email verification

Registration now requires account verification before login is allowed.

- On `POST /auth/register`, backend generates a verification token and logs a mock verification link to stdout.
- The printed link calls `GET /auth/verify?token=...`, verifies the user, and redirects to the frontend landing page.
- Until verified, login endpoints protected by basic auth return `403`.
