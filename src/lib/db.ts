import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
let pool: Pool | undefined;
export function getDb(): Pool {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is not configured');
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 8000,
      statement_timeout: 10000,
    });
    attachDatabasePool(pool);
  }
  return pool;
}
