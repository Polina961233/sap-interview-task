import { pipeline } from "@xenova/transformers";
import { config } from "./config";

let extractor: any;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", config.embeddingModel);
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getExtractor();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export function chunkText(text: string, maxChars = 600): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChars) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
