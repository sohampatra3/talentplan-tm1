import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
const base = process.argv[2] || 'http://localhost:3000';
const initial = await fetch(`${base}/api/dashboard`);
assert.equal(initial.status, 200);
const cookie = initial.headers.get('set-cookie')?.split(';')[0] || '';
const d = await initial.json();
assert.equal(d.status.source, 'neon');
assert.equal(d.status.databaseConnected, true);
assert.equal(d.status.tm1, 'disconnected');
const filtered = await fetch(`${base}/api/dashboard?entity=Germany`).then((r) =>
  r.json()
);
assert.ok(filtered.actual.revenue < d.actual.revenue);
const bad = await fetch(`${base}/api/dashboard?year=oops`);
assert.equal(bad.status, 400);
const csv = await fetch(`${base}/api/export?format=csv&scope=all`);
assert.equal(csv.status, 200);
assert.match(csv.headers.get('content-disposition') || '', /csv/);
assert.equal((await csv.text()).split('\r\n').length, 3451);
const xlsx = await fetch(`${base}/api/export?format=xlsx&scope=all`);
assert.equal(xlsx.status, 200);
const workbook = new ExcelJS.Workbook();
// ExcelJS's published Buffer alias differs from modern @types/node's generic Buffer.
await workbook.xlsx.load(
  Buffer.from(await xlsx.arrayBuffer()) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0]
);
assert.equal(workbook.getWorksheet('Finance facts')!.rowCount, 3451);
assert.ok(workbook.getWorksheet('Read me'));
assert.ok(workbook.getWorksheet('Dashboard summary'));
const explorer = await fetch(
  `${base}/api/explorer?version=Actual&account=Revenue`
).then((r) => r.json());
assert.equal(explorer.facts.length, 30);
assert.ok(
  explorer.facts.every((f: { account: string }) => f.account === 'Revenue')
);
const postHeaders = {
  'Content-Type': 'application/json',
  Origin: base,
  Cookie: cookie,
};
const ai = await fetch(`${base}/api/copilot`, {
  method: 'POST',
  headers: postHeaders,
  body: JSON.stringify({
    question: 'Why is EBITDA below budget?',
    provider: 'openrouter',
  }),
}).then((r) => r.json());
assert.equal(ai.mode, 'calculated');
assert.match(ai.notice, /not configured/);
const saved = await fetch(`${base}/api/scenarios`, {
  method: 'POST',
  headers: postHeaders,
  body: JSON.stringify({
    name: 'Verification: revenue +3%',
    filters: { year: 2026, toMonth: 9, entity: 'All entities' },
    revenuePercent: 3,
    salaryPercent: 0,
    additionalFte: 0,
  }),
});
assert.equal(saved.status, 200);
const sc = await saved.json();
const list = await fetch(`${base}/api/scenarios`, {
  headers: { Cookie: cookie },
}).then((r) => r.json());
assert.ok(list.scenarios.some((s: { id: string }) => s.id === sc.scenario.id));
const stranger = await fetch(`${base}/api/scenarios`).then((r) => r.json());
assert.ok(
  !stranger.scenarios.some((s: { id: string }) => s.id === sc.scenario.id)
);
const csrf = await fetch(`${base}/api/scenarios`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://example.org',
  },
  body: '{}',
});
assert.equal(csrf.status, 403);
console.log(
  'API flow verified: Neon data, filters, validation, complete CSV/Excel, explorer, provider fallback, saved scenario persistence, session isolation and request origin.'
);
