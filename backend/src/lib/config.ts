export const config = {
  port: Number(process.env.PORT || 4000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:4000",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://qa_user:qa_password@localhost:5432/qa_task",
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  qdrantCollection: process.env.QDRANT_COLLECTION || "evidence_chunks",
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2"
};
