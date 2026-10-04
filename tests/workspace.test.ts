import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSynthetic } from '../src/lib/synthetic';
import {
  buildDashboard,
  selectFacts,
  summarize,
  scenario,
} from '../src/lib/finance';
import { buildAnalysis, visualIntent } from '../src/lib/analysis';
import { parseFilters } from '../src/lib/validation';
import {
  encryptProfile,
  decryptProfile,
  publicProfile,
  blankConnection,
  connectionAuth,
} from '../src/lib/connections';
import { endpointUrl, publicAddress } from '../src/lib/outbound';
import {
  deterministicAnalysis,
  providerConfiguration,
  copilotEvidence,
} from '../src/lib/copilot';
import { messages, translate, formatMoney } from '../src/lib/i18n';
import type { Dataset, Filters } from '../src/lib/types';
const dataset: Dataset = {
  facts: generateSynthetic(),
  status: {
    tm1: 'disconnected',
    source: 'neon',
    mode: 'demonstration',
    reason: 'Test fixture',
    databaseConnected: true,
    checkedAt: '2026-10-04T00:00:00Z',
  },
};
const filters: Filters = {
  year: 2026,
  fromMonth: 7,
  toMonth: 9,
  entity: 'Germany',
  department: 'Product & Engineering',
  comparison: 'Forecast',
};
test('quarter/department scope and Forecast comparisons reconcile without changing annual context', () => {
  const d = buildDashboard(dataset, filters),
    selected = selectFacts(dataset.facts, filters);
  assert.ok(
    selected.every(
      (f) =>
        f.period >= '2026-07' &&
        f.period <= '2026-09' &&
        f.department === filters.department &&
        f.entity === 'Germany'
    )
  );
  assert.deepEqual(d.actual, summarize(selected, 'Actual'));
  assert.deepEqual(d.budget, summarize(selected, 'Forecast'));
  assert.equal(d.monthly.length, 12);
  assert.ok(d.monthly[0].actual !== null);
  assert.ok(
    Math.abs(
      d.variance
        .filter((v) => v.account !== 'EBITDA')
        .reduce((sum, v) => sum + v.favourable, 0) -
        (d.actual.ebitda - d.budget.ebitda)
    ) < 0.001
  );
  assert.throws(() =>
    parseFilters('http://localhost/api/dashboard?fromMonth=8&toMonth=4')
  );
  assert.throws(() =>
    parseFilters('http://localhost/api/dashboard?department=Invented')
  );
});
test('visual analysis is additive for entities and averages FTE across periods', () => {
  const scope = {
    ...filters,
    entity: 'All entities',
    department: 'All departments',
  };
  const revenue = buildAnalysis(dataset, scope, {
    metric: 'revenue',
    dimension: 'entity',
    version: 'Actual',
  });
  assert.ok(
    Math.abs(revenue.rows.reduce((s, r) => s + r.value, 0) - revenue.total) <
      0.001
  );
  const fte = buildAnalysis(dataset, scope, {
    metric: 'fte',
    dimension: 'period',
    version: 'Actual',
  });
  assert.equal(fte.rows.length, 3);
  assert.ok(
    Math.abs(fte.rows.reduce((s, r) => s + r.value, 0) / 3 - fte.total) < 0.001
  );
  const variance = buildAnalysis(dataset, scope, {
    metric: 'variance',
    dimension: 'account',
    version: 'Actual',
  });
  assert.ok(
    Math.abs(variance.rows.reduce((s, r) => s + r.value, 0) - variance.total) <
      0.001
  );
  assert.throws(
    () =>
      buildAnalysis(dataset, scope, {
        metric: 'ebitda',
        dimension: 'product',
        version: 'Actual',
      }),
    /allocation/
  );
  assert.deepEqual(visualIntent('Zeige die Abweichung zum Budget'), {
    metric: 'variance',
    dimension: 'account',
  });
});
test('encrypted connection credentials cannot be decrypted for another browser and are never returned', () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test-fixture-secret-only';
  try {
    const profile = structuredClone(blankConnection);
    profile.rest.secret = 'sensitive-fixture';
    const value = encryptProfile(profile, 'session-A');
    assert.ok(!value.includes(profile.rest.secret));
    assert.deepEqual(decryptProfile(value, 'session-A'), profile);
    assert.throws(() => decryptProfile(value, 'session-B'));
    assert.equal(publicProfile(profile).rest.secret, '');
    assert.equal(publicProfile(profile).rest.secretConfigured, true);
    assert.equal(
      connectionAuth({ ...profile.mcp, secret: 'fixture' }),
      'Basic ' + Buffer.from('apikey:fixture').toString('base64')
    );
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  }
});
test('connection endpoints reject private addresses, credentials, insecure schemes and reserved IPs', () => {
  for (const url of [
    'http://example.org/api',
    'https://user:pass@example.org/api',
    'https://localhost/api',
    'https://127.0.0.1/api',
    'https://169.254.169.254/api',
    'https://[::1]/api',
    'https://[fc00::1]/api',
  ])
    assert.throws(() => endpointUrl(url));
  for (const ip of [
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    '2001:db8::1',
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  assert.equal(endpointUrl('https://example.org/api').protocol, 'https:');
});
test('provider metadata omits models and locale-specific explanations respect the selected comparison', () => {
  for (const config of Object.values(providerConfiguration()))
    assert.deepEqual(Object.keys(config), ['configured']);
  const data = buildDashboard(dataset, {
    ...filters,
    department: 'All departments',
  });
  assert.match(
    deterministicAnalysis(data, 'Explain the EBITDA gap'),
    /forecast/
  );
  const de = deterministicAnalysis(data, 'Erkläre die EBITDA-Abweichung', 'de');
  assert.match(de, /Prognose/);
  assert.match(de, /synthetische Finanzdaten/);
  assert.match(formatMoney(1234, 'de', false), /1\.234,00/);
  for (const [key, pair] of Object.entries(messages)) {
    assert.equal(pair.length, 2, key);
    assert.ok(
      pair.every((v) => v.length > 0),
      key
    );
  }
  assert.equal(translate('de', 'guide'), 'Benutzerhandbuch');
});

test('scenario planning rejects a negative resulting workforce', () => {
  const d = buildDashboard(dataset, filters);
  assert.throws(
    () => scenario(d.actual, 0, 0, -Math.ceil(d.actual.fte) - 1),
    /below zero/
  );
});

test('forecast visualisation reconciles to annual coordinate-level rolling outlook', () => {
  const scope = { ...filters, department: 'All departments' };
  const analysis = buildAnalysis(dataset, scope, {
    metric: 'revenue',
    dimension: 'period',
    version: 'Outlook',
  });
  assert.equal(analysis.rows.length, 12);
  assert.equal(analysis.total, buildDashboard(dataset, scope).forecast.revenue);
  assert.deepEqual(visualIntent('Explain the full-year forecast.'), {
    metric: 'revenue',
    dimension: 'period',
    version: 'Outlook',
  });
  assert.deepEqual(analysis.coverage?.missingOutlookPeriods, []);
});

test('AI evidence preserves Forecast figures without ambiguous budget field names', () => {
  const dashboard = buildDashboard(dataset, filters),
    evidence = copilotEvidence(dashboard);
  assert.equal(evidence.comparisonVersion, 'Forecast');
  assert.deepEqual(evidence.comparison, dashboard.budget);
  assert.equal(evidence.variance[0].comparison, dashboard.variance[0].budget);
  assert.doesNotMatch(JSON.stringify(evidence), /budget/i);
});
