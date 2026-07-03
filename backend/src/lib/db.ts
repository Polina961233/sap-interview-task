import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool({
  connectionString: config.databaseUrl
});

type TxClient = {
  query: (text: string, params?: unknown[]) => Promise<any>;
  release: () => void;
};

export async function withTx<T>(fn: (client: TxClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
