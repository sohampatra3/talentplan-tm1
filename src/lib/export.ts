import type { Fact, SourceStatus } from './types';
export const factColumns = [
  'Period',
  'Entity',
  'Department',
  'Product',
  'Account',
  'Version',
  'Value',
  'Unit',
  'Data source',
  'Mode',
];
export function exportRows(facts: Fact[], status: SourceStatus) {
  return facts.map((f) => [
    f.period,
    f.entity,
    f.department,
    f.product,
    f.account,
    f.version,
    f.amount,
    f.unit,
    status.source,
    status.mode,
  ]);
}
export function csvCell(value: string | number) {
  let text = String(value);
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function makeCsv(facts: Fact[], status: SourceStatus) {
  return (
    '\uFEFF' +
    [factColumns, ...exportRows(facts, status)]
      .map((r) => r.map(csvCell).join(','))
      .join('\r\n')
  );
}
