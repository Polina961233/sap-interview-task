function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

const apiBase = withoutTrailingSlash(
  process.env.API_BASE_URL || "http://localhost:4000"
);

const frontendBase = withoutTrailingSlash(
  process.env.FRONTEND_URL || "http://localhost:5173"
);

const databaseUrl =
  process.env.DATABASE_URL || "postgres://qa_user:qa_password@localhost:5432/qa_task";

const qdrantUrl = withoutTrailingSlash(
  process.env.QDRANT_URL || "http://localhost:6333"
);

const qdrantCollection = process.env.QDRANT_COLLECTION || "evidence_chunks";

module.exports = { apiBase, frontendBase, databaseUrl, qdrantUrl, qdrantCollection };
