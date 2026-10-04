'use client';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLocale } from './locale';
import { ENTITIES, DEPARTMENTS, type Filters } from '@/lib/types';
export const palette = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
export type ChartKind = 'area' | 'line' | 'bar' | 'pie';
export type ChartRow = {
  name: string;
  value: number | null;
  baseline?: number;
  forecast?: number | null;
  actual?: number | null;
};
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="field compact">
      <span>{label}</span>
      <select
        aria-label={label}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Scope({
  filters,
  onChange,
  compact = false,
  annual = false,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  compact?: boolean;
  annual?: boolean;
}) {
  const { t, month } = useLocale();
  const max = filters.year === 2026 ? 9 : 12;
  const set = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    const limit = next.year === 2026 ? 9 : 12;
    next.toMonth = Math.min(next.toMonth, limit);
    next.fromMonth = Math.min(next.fromMonth || 1, next.toMonth);
    onChange(next);
  };
  return (
    <div className={`scope ${compact ? 'scope-compact' : ''}`}>
      <Select
        label={t('year')}
        value={String(filters.year)}
        onChange={(value) => set({ year: Number(value) })}
        options={[2026, 2025].map((year) => ({
          value: String(year),
          label: String(year),
        }))}
      />
      <Select
        label={t('from')}
        disabled={annual}
        value={String(filters.fromMonth || 1)}
        onChange={(value) =>
          set({
            fromMonth: Number(value),
            toMonth: Math.max(Number(value), filters.toMonth),
          })
        }
        options={Array.from({ length: max }, (_, i) => ({
          value: String(i + 1),
          label: month(i + 1),
        }))}
      />
      <Select
        label={t('to')}
        disabled={annual}
        value={String(filters.toMonth)}
        onChange={(value) => set({ toMonth: Number(value) })}
        options={Array.from({ length: max }, (_, i) => ({
          value: String(i + 1),
          label: month(i + 1),
        })).filter((o) => Number(o.value) >= (filters.fromMonth || 1))}
      />
      <Select
        label={t('entity')}
        value={filters.entity}
        onChange={(value) => set({ entity: value })}
        options={['All entities', ...ENTITIES].map((value) => ({
          value,
          label: t(value),
        }))}
      />
      <Select
        label={t('department')}
        value={filters.department || 'All departments'}
        onChange={(value) => set({ department: value })}
        options={['All departments', ...DEPARTMENTS].map((value) => ({
          value,
          label: t(value),
        }))}
      />
      <Select
        label={t('comparison')}
        value={filters.comparison || 'Budget'}
        onChange={(value) =>
          set({ comparison: value as 'Budget' | 'Forecast' })
        }
        options={['Budget', 'Forecast'].map((value) => ({
          value,
          label: t(value),
        }))}
      />
    </div>
  );
}
export function ChartSelect({
  value,
  onChange,
  allowPie = true,
}: {
  value: ChartKind;
  onChange: (value: ChartKind) => void;
  allowPie?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Select
      label={t('chartType')}
      value={value}
      onChange={(value) => onChange(value as ChartKind)}
      options={(
        ['area', 'line', 'bar', ...(allowPie ? ['pie'] : [])] as ChartKind[]
      ).map((value) => ({ value, label: t(value) }))}
    />
  );
}
export function Chart({
  rows,
  kind = 'bar',
  unit = 'EUR',
  comparison = 'Budget',
  version = 'Actual',
  onPick,
  height = 310,
  showComparison = true,
}: {
  rows: ChartRow[];
  kind?: ChartKind;
  unit?: string;
  comparison?: string;
  version?: string;
  onPick?: (name: string) => void;
  height?: number;
  showComparison?: boolean;
}) {
  const { t, money, num, month } = useLocale();
  const data = rows.map((row) => ({
    ...row,
    label: /^20\d{2}-\d{2}$/.test(row.name)
      ? month(Number(row.name.slice(5)))
      : t(row.name),
  }));
  const hasForecast = rows.some(
    (row) => row.forecast !== undefined && row.forecast !== null
  );
  const pieAllowed =
    data.every((row) => row.value !== null && row.value >= 0) &&
    data.some((row) => row.value !== null && row.value > 0);
  const type = kind === 'pie' && !pieAllowed ? 'bar' : kind;
  const value = (v: number) => (unit === 'FTE' ? num(v, 1) : money(v));
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: 'var(--surface-solid)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        color: 'var(--ink)',
      }}
      labelStyle={{ color: 'var(--ink)' }}
      formatter={(v) => value(Number(v))}
    />
  );
  const grid = (
    <CartesianGrid
      vertical={false}
      stroke="var(--line)"
      strokeDasharray="3 4"
    />
  );
  const x = (
    <XAxis
      dataKey="label"
      tick={{ fill: 'var(--muted)', fontSize: 13 }}
      tickLine={false}
      axisLine={false}
      minTickGap={10}
    />
  );
  const y = (
    <YAxis
      tick={{ fill: 'var(--muted)', fontSize: 13 }}
      tickLine={false}
      axisLine={false}
      width={unit === 'FTE' ? 65 : 80}
      tickFormatter={(v) =>
        unit === 'FTE' ? num(Number(v)) : money(Number(v))
      }
    />
  );
  const pick = (entry: unknown) => {
    const item = entry as { name?: string; payload?: { name?: string } };
    const name = item.payload?.name || item.name;
    if (name) onPick?.(name);
  };
  if (!rows.length) return <p className="empty">{t('noData')}</p>;
  return (
    <>
      <div className="chart" style={{ height }} aria-label={t('chartType')}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'pie' ? (
            <PieChart>
              {tooltip}
              <Pie
                data={data}
                nameKey="label"
                dataKey="value"
                innerRadius="48%"
                outerRadius="78%"
                paddingAngle={3}
                onClick={pick}
              >
                {data.map((row, i) => (
                  <Cell
                    key={row.name}
                    fill={palette[i % palette.length]}
                    style={{ cursor: onPick ? 'pointer' : 'default' }}
                  />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 14, color: 'var(--ink)' }} />
            </PieChart>
          ) : type === 'bar' ? (
            <BarChart
              data={data}
              margin={{ left: 0, right: 12, top: 12, bottom: 8 }}
            >
              {grid}
              {x}
              {y}
              {tooltip}
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Bar
                dataKey="value"
                name={t(version)}
                radius={[5, 5, 0, 0]}
                onClick={pick}
              >
                {data.map((row, i) => (
                  <Cell
                    key={row.name}
                    fill={
                      Number(row.value) < 0
                        ? '#b45b51'
                        : palette[i % palette.length]
                    }
                    cursor={onPick ? 'pointer' : 'default'}
                  />
                ))}
              </Bar>
              {showComparison && (
                <Bar
                  dataKey="baseline"
                  name={t(comparison)}
                  fill="var(--chart-secondary)"
                  radius={[5, 5, 0, 0]}
                />
              )}
              {hasForecast && (
                <Bar
                  dataKey="forecast"
                  name={t('Outlook')}
                  fill="#be965f"
                  radius={[5, 5, 0, 0]}
                />
              )}
            </BarChart>
          ) : type === 'line' ? (
            <LineChart
              data={data}
              margin={{ left: 0, right: 12, top: 12, bottom: 8 }}
            >
              {grid}
              {x}
              {y}
              {tooltip}
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Line
                dataKey="value"
                name={t(version)}
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              {showComparison && (
                <Line
                  dataKey="baseline"
                  name={t(comparison)}
                  stroke="var(--chart-secondary)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              {hasForecast && (
                <Line
                  dataKey="forecast"
                  name={t('Outlook')}
                  stroke="#be965f"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 4"
                />
              )}
            </LineChart>
          ) : (
            <AreaChart
              data={data}
              margin={{ left: 0, right: 12, top: 12, bottom: 8 }}
            >
              {grid}
              {x}
              {y}
              {tooltip}
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Area
                dataKey="value"
                name={t(version)}
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.12}
                strokeWidth={3}
                connectNulls={false}
              />
              {showComparison && (
                <Area
                  dataKey="baseline"
                  name={t(comparison)}
                  stroke="var(--chart-secondary)"
                  fillOpacity={0}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              {hasForecast && (
                <Area
                  dataKey="forecast"
                  name={t('Outlook')}
                  stroke="#be965f"
                  fillOpacity={0}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      {kind === 'pie' && !pieAllowed && (
        <p className="note">{t('signedPie')}</p>
      )}
    </>
  );
}
export function Metric({
  label,
  value,
  delta,
  unit = 'EUR',
  onClick,
}: {
  label: string;
  value: number;
  delta?: number;
  unit?: string;
  onClick?: () => void;
}) {
  const { money, num } = useLocale();
  const formatted =
    unit === 'EUR'
      ? money(value)
      : unit === '%'
        ? `${num(value, 1)}%`
        : num(value, 1);
  return (
    <button className="metric" onClick={onClick} disabled={!onClick}>
      <span>{label}</span>
      <strong>{formatted}</strong>
      {delta !== undefined && (
        <small className={delta < 0 ? 'adverse' : 'favourable'}>
          {delta >= 0 ? '+' : ''}
          {num(delta, 1)}%
        </small>
      )}
    </button>
  );
}
export function filterQuery(filters: Filters) {
  return new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString();
}
export async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}
