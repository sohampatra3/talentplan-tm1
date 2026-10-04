import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db';
import { endpointUrl, pinnedFetch } from './outbound';
import { parseCellset } from './tm1';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const serviceSchema = z.object({
  url: z.string().trim().max(2048).default(''),
  auth: z.enum(['basic', 'bearer', 'ibm-api-key']).default('ibm-api-key'),
  username: z.string().max(200).default(''),
  secret: z.string().max(2048).default(''),
});
export const connectionSchema = z.object({
  activeSource: z.enum(['neon', 'rest']).default('neon'),
  rest: serviceSchema.extend({ mdx: z.string().max(16000).default('') }),
  mcp: serviceSchema,
});
export type ConnectionProfile = z.infer<typeof connectionSchema>;
export const blankConnection: ConnectionProfile = {
  activeSource: 'neon',
  rest: { url: '', auth: 'basic', username: '', secret: '', mdx: '' },
  mcp: { url: '', auth: 'ibm-api-key', username: '', secret: '' },
};
function encryptionKey() {
  if (!process.env.SESSION_SECRET)
    throw new Error('Connection storage is not configured.');
  return createHmac('sha256', process.env.SESSION_SECRET)
    .update('talentplan-connection-v1')
    .digest();
}
export function encryptProfile(profile: ConnectionProfile, id: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(id));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(profile)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decryptProfile(value: string, id: string): ConnectionProfile {
  const bytes = Buffer.from(value, 'base64'),
    decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      bytes.subarray(0, 12)
    );
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return connectionSchema.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString()
    )
  );
}
export async function loadConnection(id: string) {
  const { rows } = await getDb().query(
    'SELECT encrypted_profile FROM connection_profile WHERE session_id=$1',
    [id]
  );
  return rows[0] ? decryptProfile(rows[0].encrypted_profile, id) : null;
}
export function publicProfile(profile: ConnectionProfile) {
  return {
    activeSource: profile.activeSource,
    rest: {
      ...profile.rest,
      secret: '',
      secretConfigured: !!profile.rest.secret,
    },
    mcp: { ...profile.mcp, secret: '', secretConfigured: !!profile.mcp.secret },
  };
}
export function validateProfile(profile: ConnectionProfile) {
  for (const service of [profile.rest, profile.mcp]) {
    if (service.url) endpointUrl(service.url);
    if (service.url && !service.secret)
      throw new Error('Enter the connection credential.');
    if (service.url && service.auth === 'basic' && !service.username)
      throw new Error('Enter the connection username.');
  }
  if (
    profile.activeSource === 'rest' &&
    (!profile.rest.url || !profile.rest.mdx)
  )
    throw new Error('REST requires an endpoint and a mapped MDX query.');
}
export function connectionAuth(service: ConnectionProfile['mcp']) {
  if (service.auth === 'bearer') return `Bearer ${service.secret}`;
  return `Basic ${Buffer.from(`${service.auth === 'ibm-api-key' ? 'apikey' : service.username}:${service.secret}`).toString('base64')}`;
}
export async function saveConnection(id: string, profile: ConnectionProfile) {
  validateProfile(profile);
  await getDb().query(
    'INSERT INTO connection_profile (session_id,encrypted_profile) VALUES ($1,$2) ON CONFLICT (session_id) DO UPDATE SET encrypted_profile=EXCLUDED.encrypted_profile,updated_at=now()',
    [id, encryptProfile(profile, id)]
  );
}
export async function readProfileRest(profile: ConnectionProfile) {
  const service = profile.rest;
  if (!service.url || !service.mdx)
    throw new Error('REST requires an endpoint and a mapped MDX query.');
  const url = endpointUrl(service.url).toString().replace(/\/$/, ''),
    auth = connectionAuth(service);
  let cellset: Parameters<typeof parseCellset>[0] | undefined;
  try {
    const expansion =
      'Axes($expand=Tuples($expand=Members($select=Name;$expand=Hierarchy($expand=Dimension($select=Name))))),Cells($select=Ordinal,Value)';
    const response = await pinnedFetch(
      `${url}/ExecuteMDX?$expand=${encodeURIComponent(expansion)}`,
      {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ MDX: service.mdx }),
      }
    );
    if (!response.ok)
      throw new Error(`REST connection failed (HTTP ${response.status}).`);
    cellset = await response.json();
    return parseCellset(cellset!);
  } finally {
    if (cellset?.ID)
      await pinnedFetch(
        `${url}/Cellsets('${encodeURIComponent(cellset.ID)}')`,
        { method: 'DELETE', headers: { Authorization: auth } }
      ).catch(() => {});
  }
}
export async function discoverMcp(profile: ConnectionProfile) {
  if (!profile.mcp.url) throw new Error('Enter the MCP endpoint.');
  const client = new Client({ name: 'talentplan', version: '2.0.0' });
  const transport = new StreamableHTTPClientTransport(
    endpointUrl(profile.mcp.url),
    {
      requestInit: { headers: { Authorization: connectionAuth(profile.mcp) } },
      fetch: pinnedFetch,
    }
  );
  try {
    await client.connect(transport, { timeout: 18000 });
    const { tools } = await client.listTools(undefined, { timeout: 18000 });
    return tools.slice(0, 150).map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      readOnly: tool.annotations?.readOnlyHint === true,
      inputSchema: tool.inputSchema,
    }));
  } finally {
    await client.close().catch(() => {});
  }
}
