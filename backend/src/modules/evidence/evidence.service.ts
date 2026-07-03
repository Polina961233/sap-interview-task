import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { embedText, chunkText } from "../../lib/embedding";
import { config } from "../../lib/config";
import { qdrant } from "../../lib/qdrant";
import { pool } from "../../lib/db";
import { HttpError } from "../../lib/errors";

type MulterFile = {
  path: string;
  mimetype: string;
  originalname: string;
};

async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const data = await fs.readFile(filePath);
    const parsed = await pdf(data);
    return parsed.text || "";
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const parsed = await mammoth.extractRawText({ path: filePath });
    return parsed.value || "";
  }

  if (mimeType === "text/plain") {
    return fs.readFile(filePath, "utf8");
  }

  throw new HttpError(400, "Unsupported file type. Use PDF, DOCX, or TXT.");
}

export async function ingestEvidence(file: MulterFile, uploadedBy: string) {
  const text = await extractText(file.path, file.mimetype);
  const chunks = chunkText(text, 600);

  if (!chunks.length) {
    throw new HttpError(400, "Could not extract useful text from file");
  }

  const insertFile = await pool.query(
    `INSERT INTO evidence_files (original_name, mime_type, uploaded_by)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [file.originalname, file.mimetype, uploadedBy]
  );

  const evidenceFileId = insertFile.rows[0].id;

  const points = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const vector = await embedText(chunk);

    points.push({
      id: uuidv4(),
      vector,
      payload: {
        evidenceFileId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        text: chunk,
        chunkIndex: i,
        uploadedBy
      }
    });
  }

  await qdrant.upsert(config.qdrantCollection, {
    wait: true,
    points
  });

  await fs.unlink(file.path).catch(() => undefined);

  return {
    evidenceFileId,
    chunks: chunks.length
  };
}

export function uploadsDir() {
  return path.resolve(process.cwd(), "uploads");
}
