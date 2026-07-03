import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "./lib/config";
import { ensureCollection } from "./lib/qdrant";
import { authRouter } from "./modules/auth/auth.routes";
import { questionnairesRouter } from "./modules/questionnaires/questionnaires.routes";
import { evidenceRouter } from "./modules/evidence/evidence.routes";
import { responsesRouter } from "./modules/responses/responses.routes";
import { errorHandler, notFound } from "./lib/errors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/questionnaires", questionnairesRouter);
app.use("/evidence", evidenceRouter);
app.use("/responses", responsesRouter);

app.use(notFound);
app.use(errorHandler);

ensureCollection()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Backend listening on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize application", error);
    process.exit(1);
  });
