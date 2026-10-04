import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { generateSynthetic, DATASET_VERSION } from '../src/lib/synthetic';
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
const client = await pool.connect();
try {
  const facts = generateSynthetic();
  await client.query('BEGIN');
  await client.query(await readFile('db/001_initial.sql', 'utf8'));
  await client.query(
    `INSERT INTO finance_fact (id, period, entity, department, product, account, version, amount, unit, dataset_version)
    SELECT x.id, x.period, x.entity, x.department, x.product, x.account, x.version, x.amount, x.unit, $2
    FROM jsonb_to_recordset($1::jsonb) AS x(id text, period text, entity text, department text, product text, account text, version text, amount numeric, unit text)
    ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(facts), DATASET_VERSION]
  );
  const result = await client.query(
    'SELECT count(*)::int AS n FROM finance_fact WHERE dataset_version=$1',
    [DATASET_VERSION]
  );
  if (result.rows[0].n !== facts.length)
    throw new Error('Seed reconciliation failed');
  await client.query(
    'INSERT INTO load_audit (dataset_version, row_count, reconciled) VALUES ($1,$2,true) ON CONFLICT (dataset_version) DO UPDATE SET row_count=EXCLUDED.row_count, reconciled=true, loaded_at=now()',
    [DATASET_VERSION, facts.length]
  );
  await client.query('COMMIT');
  console.log(
    `Neon load reconciled: ${facts.length} synthetic records. Dataset ${DATASET_VERSION}.`
  );
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
  await pool.end();
}
