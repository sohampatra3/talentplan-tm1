import type { Fact } from './types';
import { factSchema } from './validation';
type Member = { Name: string; Hierarchy?: { Dimension?: { Name: string } } };
type Cellset = {
  ID?: string;
  Axes?: { Ordinal: number; Tuples: { Members: Member[] }[] }[];
  Cells?: { Ordinal: number; Value: unknown }[];
};
export class Tm1Error extends Error {
  constructor(
    public state: 'disconnected' | 'unreachable' | 'error',
    message: string
  ) {
    super(message);
  }
}
export function tm1Configuration() {
  if (!process.env.TM1_URL)
    throw new Tm1Error(
      'disconnected',
      'TM1 credentials are not configured. Demonstration data is active.'
    );
  if (
    !process.env.TM1_API_KEY &&
    !(process.env.TM1_USER && process.env.TM1_PASSWORD)
  )
    throw new Tm1Error('disconnected', 'TM1 authentication is not configured.');
  if (!process.env.TM1_MDX)
    throw new Tm1Error(
      'disconnected',
      'TM1 cube mapping (TM1_MDX) is not configured.'
    );
  if (!process.env.APP_ACCESS_PASSWORD)
    throw new Tm1Error(
      'disconnected',
      'Configure application access protection before enabling live financial data.'
    );
  const url = new URL(process.env.TM1_URL);
  if (url.protocol !== 'https:')
    throw new Tm1Error('error', 'TM1 requires a trusted HTTPS endpoint.');
  const auth = process.env.TM1_API_KEY
    ? `Bearer ${process.env.TM1_API_KEY}`
    : `Basic ${Buffer.from(`${process.env.TM1_USER}:${process.env.TM1_PASSWORD}`).toString('base64')}`;
  return {
    url: url.toString().replace(/\/$/, ''),
    auth,
    mdx: process.env.TM1_MDX,
  };
}
export function parseCellset(cellset: Cellset): Fact[] {
  const columns = cellset.Axes?.find((a) => a.Ordinal === 0)?.Tuples;
  const rows = cellset.Axes?.find((a) => a.Ordinal === 1)?.Tuples;
  if (!rows?.length || columns?.length !== 1 || !cellset.Cells?.length)
    throw new Tm1Error(
      'error',
      'TM1 returned an empty or incompatible cube view.'
    );
  const values = new Map(cellset.Cells.map((c) => [c.Ordinal, c.Value]));
  return rows.map((tuple, i) => {
    const coordinates = Object.fromEntries(
      tuple.Members.map((m) => [m.Hierarchy?.Dimension?.Name, m.Name])
    );
    const account = coordinates.Account;
    const row = {
      id: `tm1-${i}`,
      period: coordinates.Period,
      entity: coordinates.Entity,
      department: coordinates.Department,
      product: coordinates.Product,
      account,
      version: coordinates.Version,
      amount: values.get(i),
      unit:
        account === 'FTE'
          ? 'FTE'
          : ['Listings', 'Subscriptions'].includes(account)
            ? 'count'
            : 'EUR',
    };
    const result = factSchema.safeParse(row);
    if (!result.success)
      throw new Tm1Error(
        'error',
        'TM1 cube coordinates do not match the documented finance contract.'
      );
    return result.data;
  });
}
export async function readTm1(): Promise<Fact[]> {
  const { url, auth, mdx } = tm1Configuration();
  let cellset: Cellset | undefined;
  try {
    const expansion =
      'Axes($expand=Tuples($expand=Members($select=Name;$expand=Hierarchy($expand=Dimension($select=Name))))),Cells($select=Ordinal,Value)';
    const response = await fetch(
      `${url}/ExecuteMDX?$expand=${encodeURIComponent(expansion)}`,
      {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ MDX: mdx }),
        signal: AbortSignal.timeout(6500),
        cache: 'no-store',
      }
    );
    if (!response.ok)
      throw new Tm1Error(
        response.status === 401 || response.status === 403
          ? 'error'
          : 'unreachable',
        response.status === 401 || response.status === 403
          ? 'TM1 rejected authentication or cube permissions.'
          : `TM1 request failed (HTTP ${response.status}).`
      );
    cellset = await response.json();
    return parseCellset(cellset!);
  } catch (e) {
    if (e instanceof Tm1Error) throw e;
    throw new Tm1Error(
      'unreachable',
      'TM1 is not reachable or timed out. Demonstration data is active.'
    );
  } finally {
    if (cellset?.ID)
      await fetch(`${url}/Cellsets('${encodeURIComponent(cellset.ID)}')`, {
        method: 'DELETE',
        headers: { Authorization: auth },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
  }
}
