import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSynthetic, LAST_CLOSED_PERIOD } from '../src/lib/synthetic';
import { buildDashboard, scenario, summarize } from '../src/lib/finance';
import { makeCsv, csvCell } from '../src/lib/export';
import { parseCellset, Tm1Error } from '../src/lib/tm1';
import type { SourceStatus } from '../src/lib/types';
import { deterministicAnalysis } from '../src/lib/copilot';
import { readTm1 } from '../src/lib/tm1';
import { getDataset } from '../src/lib/data-source';
const facts = generateSynthetic();
const status: SourceStatus = {
  tm1: 'disconnected',
  source: 'neon',
  mode: 'demonstration',
  reason: 'Test fixture',
  databaseConnected: true,
  checkedAt: '2026-10-04T12:00:00Z',
};
const filters = { year: 2026, toMonth: 9, entity: 'All entities' };
test('synthetic facts are deterministic, unique and have no future actuals', () => {
  assert.deepEqual(generateSynthetic(), facts);
  assert.equal(new Set(facts.map((f) => f.id)).size, facts.length);
  assert.ok(
    facts.every((f) => f.version !== 'Actual' || f.period <= LAST_CLOSED_PERIOD)
  );
});
test('EBITDA reconciles and cost variance has the right direction', () => {
  const d = buildDashboard({ facts, status }, filters);
  assert.ok(
    Math.abs(d.actual.revenue - d.actual.opex - d.actual.ebitda) < 0.01
  );
  assert.ok(
    Math.abs(
      d.variance
        .filter((v) => v.account !== 'EBITDA')
        .reduce((s, v) => s + v.favourable, 0) -
        (d.actual.ebitda - d.budget.ebitda)
    ) < 0.01
  );
  assert.ok(d.variance.find((v) => v.account === 'Personnel')!.favourable < 0);
});
test('FTE averages across months and aggregates across entities', () => {
  const d = buildDashboard({ facts, status }, filters);
  const raw = facts
    .filter(
      (f) =>
        f.version === 'Actual' &&
        f.account === 'FTE' &&
        f.period.startsWith('2026-') &&
        Number(f.period.slice(5)) <= 9
    )
    .reduce((s, f) => s + f.amount, 0);
  assert.ok(Math.abs(d.actual.fte - raw / 9) < 0.001);
  assert.ok(
    Math.abs(d.entities.reduce((s, e) => s + e.fte, 0) - d.actual.fte) < 0.001
  );
});
test('forecast uses closed actuals and only open forecast periods', () => {
  const d = buildDashboard({ facts, status }, filters);
  const rolling = facts
    .filter(
      (f) =>
        f.period.startsWith('2026-') &&
        f.version === (f.period <= '2026-09' ? 'Actual' : 'Forecast')
    )
    .map((f) => ({ ...f, version: 'Forecast' as const }));
  assert.deepEqual(d.forecast, summarize(rolling, 'Forecast'));
  assert.equal(d.monthly[9].actual, null);
  assert.ok(d.monthly[9].forecast > 0);
});
test('entity filters are additive and annual historical actuals available', () => {
  const all = buildDashboard({ facts, status }, filters);
  const de = buildDashboard(
    { facts, status },
    { ...filters, entity: 'Germany' }
  );
  const uk = buildDashboard(
    { facts, status },
    { ...filters, entity: 'United Kingdom' }
  );
  assert.ok(
    Math.abs(all.actual.revenue - de.actual.revenue - uk.actual.revenue) < 0.01
  );
  const prior = buildDashboard(
    { facts, status },
    { ...filters, year: 2025, toMonth: 12 }
  );
  assert.ok(prior.monthly.every((m) => m.actual !== null));
});
test('scenario zero assumptions reproduces baseline; salary rise reduces EBITDA', () => {
  const a = buildDashboard({ facts, status }, filters).actual;
  assert.equal(scenario(a, 0, 0, 0).delta, 0);
  assert.ok(Math.abs(scenario(a, 0, 5, 0).delta + a.personnel * 0.05) < 0.01);
  assert.ok(scenario(a, 0, 0, 10).delta < 0);
});
test('CSV escapes text formula injection and includes every row', () => {
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell(-5), '"-5"');
  assert.equal(makeCsv(facts, status).split('\r\n').length, facts.length + 1);
});
test('TM1 cellset validates coordinates and preserves zero cells', () => {
  const coordinates = {
    Period: '2026-01',
    Entity: 'Germany',
    Department: 'Corporate',
    Product: 'All products',
    Account: 'Personnel',
    Version: 'Actual',
  };
  const rows = parseCellset({
    Axes: [
      { Ordinal: 0, Tuples: [{ Members: [] }] },
      {
        Ordinal: 1,
        Tuples: [
          {
            Members: Object.entries(coordinates).map(([name, Name]) => ({
              Name,
              Hierarchy: { Dimension: { Name: name } },
            })),
          },
        ],
      },
    ],
    Cells: [{ Ordinal: 0, Value: 0 }],
  });
  assert.equal(rows[0].amount, 0);
  assert.equal(rows[0].account, 'Personnel');
  assert.throws(() => parseCellset({ Axes: [], Cells: [] }), Tm1Error);
});
test('calculated live explanations do not invent synthetic business causes', () => {
  const live = buildDashboard(
    {
      facts,
      status: { ...status, tm1: 'connected', source: 'tm1', mode: 'live' },
    },
    filters
  );
  const answer = deterministicAnalysis(live, 'Why is EBITDA below budget?');
  assert.match(answer, /configured TM1 cube/);
  assert.doesNotMatch(answer, /synthetic assumptions|Q3 paid listings/);
});
test('missing TM1 config has a usable and explicitly labelled fallback', async () => {
  const previous = process.env.TM1_URL;
  delete process.env.TM1_URL;
  try {
    const d = await getDataset();
    assert.equal(d.status.tm1, 'disconnected');
    assert.equal(d.status.mode, 'demonstration');
    assert.ok(d.facts.length > 0);
    assert.match(d.status.reason, /not configured/);
  } finally {
    if (previous === undefined) delete process.env.TM1_URL;
    else process.env.TM1_URL = previous;
  }
});
test('TM1 network failure produces an unreachable state', async () => {
  const keys = [
    'TM1_URL',
    'TM1_API_KEY',
    'TM1_MDX',
    'APP_ACCESS_PASSWORD',
  ] as const;
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    TM1_URL: 'https://tm1.example.test/api/v1',
    TM1_API_KEY: 'test-only',
    TM1_MDX: 'test-only',
    APP_ACCESS_PASSWORD: 'test-only',
  });
  globalThis.fetch = async () => {
    throw new Error('Network failure fixture');
  };
  try {
    await assert.rejects(
      readTm1(),
      (error: unknown) =>
        error instanceof Tm1Error && error.state === 'unreachable'
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const k of keys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
  }
});
