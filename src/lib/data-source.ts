import { getDb } from './db';
import { generateSynthetic } from './synthetic';
import { readTm1, Tm1Error } from './tm1';
import { factSchema } from './validation';
import type { Dataset, Fact } from './types';
import { loadConnection, readProfileRest } from './connections';
export async function getDataset(session?: string): Promise<Dataset> {
  const checkedAt = new Date().toISOString();
  let tm1: 'disconnected' | 'unreachable' | 'error' = 'disconnected',
    reason = '';
  try {
    const profile = session
      ? await loadConnection(session).catch(() => null)
      : null;
    if (profile?.activeSource === 'neon')
      throw new Tm1Error(
        'disconnected',
        'Synthetic data is selected in Connections.'
      );
    let facts: Fact[];
    if (profile?.activeSource === 'rest') {
      try {
        facts = await readProfileRest(profile);
      } catch (error) {
        if (error instanceof Tm1Error) throw error;
        throw new Tm1Error(
          'unreachable',
          'The configured TM1 REST endpoint could not be reached or authenticated. Check the connection settings.'
        );
      }
    } else facts = await readTm1();
    let databaseConnected = false;
    try {
      await getDb().query('SELECT 1');
      databaseConnected = true;
    } catch {
      /* A Neon outage must not discard a successful TM1 read. */
    }
    return {
      facts,
      status: {
        tm1: 'connected',
        source: 'tm1',
        mode: 'live',
        reason:
          'Connected to IBM Planning Analytics. Values read from the configured cube.',
        databaseConnected,
        checkedAt,
      },
    };
  } catch (e) {
    tm1 = e instanceof Tm1Error ? e.state : 'error';
    reason =
      e instanceof Tm1Error ? e.message : 'TM1 configuration is invalid.';
  }
  try {
    const { rows } = await getDb().query(
      'SELECT id, period, entity, department, product, account, version, amount::float8 AS amount, unit FROM finance_fact ORDER BY period, entity, account'
    );
    if (!rows.length) throw new Error('Empty demonstration dataset');
    const facts: Fact[] = rows.map((row) => factSchema.parse(row));
    return {
      facts,
      status: {
        tm1,
        source: 'neon',
        mode: 'demonstration',
        reason,
        databaseConnected: true,
        checkedAt,
      },
    };
  } catch {
    return {
      facts: generateSynthetic(),
      status: {
        tm1,
        source: 'memory',
        mode: 'demonstration',
        reason: `${reason} Neon is unavailable; using a temporary in-memory fixture. Saved scenarios are unavailable.`,
        databaseConnected: false,
        checkedAt,
      },
    };
  }
}
