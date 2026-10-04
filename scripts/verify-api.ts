import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
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
    provider: 'built-in',
  }),
}).then((r) => r.json());
assert.equal(ai.mode, 'calculated');
assert.match(ai.notice, /no language model used/);
const providerConfig = await fetch(`${base}/api/copilot`).then((r) => r.json());
for (const provider of ['openrouter', 'ollama'] as const) {
  assert.deepEqual(Object.keys(providerConfig[provider]), ['configured']);
  if (!providerConfig[provider].configured) {
    const response = await fetch(`${base}/api/copilot`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({
        question: 'Explain the financial performance.',
        provider,
      }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.mode, 'calculated');
    assert.match(result.notice, /not configured/);
  }
}
const analysis = await fetch(
  `${base}/api/analysis?fromMonth=7&toMonth=9&entity=Germany&metric=fte&dimension=period&comparison=Forecast`
).then((r) => r.json());
assert.equal(analysis.rows.length, 3);
assert.equal(analysis.unit, 'FTE');
assert.ok(
  Math.abs(
    analysis.rows.reduce(
      (sum: number, row: { value: number }) => sum + row.value,
      0
    ) /
      3 -
      analysis.total
  ) < 0.001
);
const connection = await fetch(`${base}/api/connections`, {
  headers: { Cookie: cookie },
}).then((r) => r.json());
assert.equal(connection.profile.rest.secret, '');
assert.equal(connection.profile.activeSource, 'neon');
const rejected = await fetch(`${base}/api/connections`, {
  method: 'POST',
  headers: postHeaders,
  body: JSON.stringify({
    action: 'test-mcp',
    profile: {
      ...connection.profile,
      mcp: { ...connection.profile.mcp, url: 'https://127.0.0.1/api/mcp' },
    },
  }),
});
assert.equal(rejected.status, 400);
const testProfile = {
  ...connection.profile,
  activeSource: 'rest',
  rest: {
    url: 'https://tm1.connection-test.invalid/api/v1',
    auth: 'basic',
    username: 'test-fixture',
    secret: 'fixture-only',
    mdx: 'SELECT test-fixture',
  },
};
const saveProfile = await fetch(`${base}/api/connections`, {
  method: 'POST',
  headers: postHeaders,
  body: JSON.stringify({ action: 'save', profile: testProfile }),
});
assert.equal(saveProfile.status, 200);
const masked = await fetch(`${base}/api/connections`, {
  headers: { Cookie: cookie },
}).then((r) => r.json());
assert.equal(masked.profile.rest.secret, '');
assert.equal(masked.profile.rest.secretConfigured, true);
const otherProfile = await fetch(`${base}/api/connections`).then((r) =>
  r.json()
);
assert.equal(otherProfile.profile.rest.url, '');
const failedLive = await fetch(`${base}/api/dashboard`, {
  headers: { Cookie: cookie },
}).then((r) => r.json());
assert.equal(failedLive.status.tm1, 'unreachable');
assert.equal(failedLive.status.source, 'neon');
const restore = await fetch(`${base}/api/connections`, {
  method: 'POST',
  headers: postHeaders,
  body: JSON.stringify({ action: 'save', profile: connection.profile }),
});
assert.equal(restore.status, 200);
const mcp = new Client({ name: 'talentplan-verification', version: '1.0.0' });
try {
  await mcp.connect(
    new StreamableHTTPClientTransport(new URL(`${base}/api/mcp`))
  );
  const tools = await mcp.listTools();
  assert.equal(tools.tools.length, 3);
  assert.ok(
    tools.tools.every((tool) => tool.annotations?.readOnlyHint === true)
  );
  const summary = await mcp.callTool({
    name: 'finance_summary',
    arguments: {
      entity: 'Germany',
      fromMonth: 7,
      toMonth: 9,
      comparison: 'Forecast',
    },
  });
  assert.equal(summary.isError, undefined);
  const content = summary.content as { type: string; text: string }[];
  const data = JSON.parse(content[0].text);
  assert.equal(data.filters.entity, 'Germany');
  assert.ok(data.actual.revenue > 0);
  assert.equal(data.status.source, 'neon');
} finally {
  await mcp.close();
}
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
  'API flow verified: Neon data, filters, validation, complete CSV/Excel, explorer, provider metadata, visual analysis, MCP handshake/read tools, endpoint protection, saved scenario persistence, session isolation and request origin.'
);
