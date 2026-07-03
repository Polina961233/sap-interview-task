import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config";

export const qdrant = new QdrantClient({
  url: config.qdrantUrl
});

const VECTOR_SIZE = 384;

export async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === config.qdrantCollection
  );

  if (!exists) {
    await qdrant.createCollection(config.qdrantCollection, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine"
      }
    });
  }
}
