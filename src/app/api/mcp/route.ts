import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { getDataset } from '@/lib/data-source';
import { buildDashboard, selectFacts } from '@/lib/finance';
import { parseFilters } from '@/lib/validation';
import { NextRequest } from 'next/server';
import { sessionId } from '@/lib/security';
export const dynamic = 'force-dynamic';
const filterShape = {
  year: z.number().int().min(2025).max(2026).default(2026),
  fromMonth: z.number().int().min(1).max(12).default(1),
  toMonth: z.number().int().min(1).max(12).default(9),
  entity: z
    .enum(['All entities', 'Germany', 'United Kingdom'])
    .default('All entities'),
  department: z.string().default('All departments'),
  comparison: z.enum(['Budget', 'Forecast']).default('Budget'),
};
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return new Response('Invalid origin', { status: 403 });
  const server = new McpServer({
    name: 'talentplan-finance',
    version: '2.0.0',
  });
  const result = (value: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  });
  const getData = () =>
    getDataset(
      request.cookies.has('talentplan-session') ? sessionId(request) : undefined
    );
  server.registerTool(
    'finance_summary',
    {
      title: 'Finance summary',
      description:
        'Read financial KPIs, variance, source provenance and coverage. Amounts are EUR; FTE is averaged across months.',
      inputSchema: filterShape,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (input) => {
      const url = new URL(request.url);
      Object.entries(input).forEach(([k, v]) =>
        url.searchParams.set(k, String(v))
      );
      return result(
        buildDashboard(await getData(), parseFilters(url.toString()))
      );
    }
  );
  server.registerTool(
    'finance_facts',
    {
      title: 'Finance facts',
      description:
        'Read up to 100 validated leaf facts from the selected reporting scope. No writeback.',
      inputSchema: {
        ...filterShape,
        version: z.enum(['Actual', 'Budget', 'Forecast']).default('Actual'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (input) => {
      const url = new URL(request.url);
      Object.entries(input).forEach(([k, v]) =>
        url.searchParams.set(k, String(v))
      );
      const dataset = await getData(),
        facts = selectFacts(dataset.facts, parseFilters(url.toString())).filter(
          (f) => f.version === input.version
        );
      return result({
        facts: facts.slice(0, 100),
        total: facts.length,
        status: dataset.status,
      });
    }
  );
  server.registerTool(
    'finance_source_status',
    {
      title: 'Source status',
      description:
        'Read active source and TM1 connectivity. No credentials are returned.',
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => result((await getData()).status)
  );
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
export function GET() {
  return new Response('Use a Streamable HTTP MCP client with POST /api/mcp.', {
    status: 405,
    headers: { Allow: 'POST' },
  });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
