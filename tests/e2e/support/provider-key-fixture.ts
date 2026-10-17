import { Pool } from "pg";

import { getEnvironment } from "../../../shared/config/environment";

export async function installUnreadableProviderCredential(userId: string) {
  const pool = new Pool({ connectionString: getEnvironment().DATABASE_URL, max: 1 });
  try {
    await pool.query(
      `insert into openai_credentials
         (user_id, encrypted_api_key, initialization_vector, authentication_tag, encryption_version)
       values ($1, 'synthetic-unreadable-ciphertext', 'synthetic-iv', 'synthetic-tag', 999)`,
      [userId],
    );
  } catch (error) {
    await pool.end();
    throw error;
  }
  return {
    async read() {
      const result = await pool.query(
        `select encrypted_api_key, initialization_vector, authentication_tag, encryption_version,
                created_at, updated_at
           from openai_credentials where user_id = $1`,
        [userId],
      );
      return result.rows;
    },
    async cleanup() {
      try {
        await pool.query("delete from openai_credentials where user_id = $1", [userId]);
      } finally {
        await pool.end();
      }
    },
  };
}
