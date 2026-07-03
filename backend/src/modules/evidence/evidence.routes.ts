import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { requireBasicAuth } from "../auth/auth.middleware";
import { ingestEvidence, uploadsDir } from "./evidence.service";

if (!fs.existsSync(uploadsDir())) {
  fs.mkdirSync(uploadsDir(), { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir()),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  }
});

const upload = multer({ storage });

export const evidenceRouter = Router();

evidenceRouter.use(requireBasicAuth);

evidenceRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await ingestEvidence(req.file, req.user!.id);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});
