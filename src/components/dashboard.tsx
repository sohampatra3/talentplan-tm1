'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  GitBranch,
  Layers3,
  LayoutDashboard,
  Loader2,
  Menu,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Users,
  X,
  PlugZap,
  Info,
  TriangleAlert,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
} from 'recharts';
import { scenario } from '@/lib/finance';
import {
  ACCOUNTS,
  VERSIONS,
  type DashboardData,
  type Fact,
  type Filters,
} from '@/lib/types';
type View =
  | 'overview'
  | 'variance'
  | 'workforce'
  | 'scenario'
  | 'explorer'
  | 'copilot'
  | 'connections'
  | 'guide';
const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'variance', label: 'Variance analysis', icon: BarChart3 },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'scenario', label: 'Scenario lab', icon: SlidersHorizontal },
  { id: 'explorer', label: 'TM1 explorer', icon: Layers3 },
  { id: 'copilot', label: 'Finance copilot', icon: Sparkles },
] as const;
const titles: Record<View, [string, string]> = {
  overview: [
    'Finance, in focus.',
    'A clear view of performance. A confident next decision.',
  ],
  variance: [
    'Understand the difference.',
    'Trace the movement from budget to actual performance.',
  ],
  workforce: [
    'People behind the plan.',
    'Connect workforce decisions to their financial impact.',
  ],
  scenario: [
    'What if becomes what’s next.',
    'Explore your assumptions before making a decision.',
  ],
  explorer: [
    'Explore every dimension.',
    'Slice the finance model and trace the numbers to their source.',
  ],
  copilot: [
    'A second perspective.',
    'Ask a finance question. Start with the numbers.',
  ],
  connections: [
    'Connected by design.',
    'One finance model. A dependable route to your data.',
  ],
  guide: [
    'Built for the conversation.',
    'A guided tour of planning, reporting and the TM1 connection.',
  ],
};
const colors = ['#286b56', '#a7c7b1', '#e1b885'];
const money = (value: number, compact = true) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value);
const num = (v: number, d = 0) =>
  new Intl.NumberFormat('en-GB', { maximumFractionDigits: d }).format(v);
const monthName = (m: number) =>
  new Date(2026, m - 1, 1).toLocaleString('en-GB', { month: 'short' });
const deltaPercent = (a: number, b: number) =>
  b ? ((a - b) / Math.abs(b)) * 100 : 0;
const query = (f: Filters) =>
  new URLSearchParams({
    year: String(f.year),
    toMonth: String(f.toMonth),
    entity: f.entity,
  }).toString();
async function jsonResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Metric({
  label,
  value,
  change,
  caption,
  icon: Icon,
  neutral = false,
  changeUnit = '%',
}: {
  label: string;
  value: string;
  change: number;
  caption: string;
  icon: typeof Activity;
  neutral?: boolean;
  changeUnit?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        <span
          className={
            neutral
              ? 'change neutral'
              : change >= 0
                ? 'change positive'
                : 'change negative'
          }
        >
          {change >= 0 ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}{' '}
          {Math.abs(change).toFixed(1)}
          {changeUnit}
        </span>
        <span>{caption}</span>
      </div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Info size={22} />
      <p>{children}</p>
    </div>
  );
}
function RevenueChart({ data }: { data: DashboardData }) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data.monthly}
          margin={{ top: 12, right: 12, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#286b56" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#286b56" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf0ed" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#8a938c' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000000}m`}
            tick={{ fontSize: 11, fill: '#8a938c' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: '1px solid #e4e9e4',
              fontSize: 12,
            }}
            formatter={(v) => money(Number(v))}
          />
          <ReferenceLine
            x={monthName(data.filters.toMonth)}
            stroke="#cad5cc"
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual revenue"
            stroke="#286b56"
            strokeWidth={2.8}
            fill="url(#revenueGradient)"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="budget"
            name="Budget"
            stroke="#b8c1b8"
            strokeWidth={1.8}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Rolling forecast"
            stroke="#92aaa0"
            strokeWidth={1.6}
            strokeDasharray="2 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
function Overview({
  data,
  onView,
}: {
  data: DashboardData;
  onView: (v: View) => void;
}) {
  const a = data.actual,
    b = data.budget;
  return (
    <>
      <div className="metrics">
        <Metric
          label="Total revenue"
          value={money(a.revenue)}
          change={deltaPercent(a.revenue, b.revenue)}
          caption="vs. budget"
          icon={Activity}
        />
        <Metric
          label="EBITDA"
          value={money(a.ebitda)}
          change={deltaPercent(a.ebitda, b.ebitda)}
          caption="vs. budget"
          icon={BarChart3}
        />
        <Metric
          label="EBITDA margin"
          value={`${a.margin.toFixed(1)}%`}
          change={a.margin - b.margin}
          caption="vs. budget"
          changeUnit=" pp"
          icon={Layers3}
        />
        <Metric
          label="Average workforce"
          value={`${num(a.fte, 1)}`}
          change={deltaPercent(a.fte, b.fte)}
          caption="FTE vs. budget"
          icon={Users}
          neutral
        />
      </div>
      <div className="overview-grid">
        <Panel
          title="Revenue performance"
          subtitle={`${data.filters.year} · full-year outlook, EUR`}
          action={
            <div className="chart-legend">
              <span>
                <i className="dot green" />
                Actual
              </span>
              <span>
                <i className="dot grey" />
                Budget
              </span>
              <span>
                <i className="dot sage" />
                Forecast
              </span>
            </div>
          }
        >
          <RevenueChart data={data} />
          <div className="chart-footnote">
            <span>
              Actuals end{' '}
              {data.filters.year === 2026 ? 'September' : 'December'} · open
              months use forecast
            </span>
            <span>
              Reporting currency <strong>EUR</strong>
            </span>
          </div>
        </Panel>
        <Panel title="Revenue mix" subtitle="Where our performance comes from">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={data.products}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={66}
                  outerRadius={88}
                  paddingAngle={4}
                  stroke="none"
                >
                  {data.products.map((p, i) => (
                    <Cell key={p.name} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span>Revenue</span>
              <strong>{money(a.revenue)}</strong>
            </div>
          </div>
          <div className="mix-list">
            {data.products.map((p, i) => (
              <div key={p.name}>
                <span>
                  <i style={{ background: colors[i] }} className="dot" />
                  {p.name}
                </span>
                <strong>
                  {a.revenue ? ((p.value / a.revenue) * 100).toFixed(1) : '0'}%
                </strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="bottom-grid">
        <Panel
          title="Market performance"
          subtitle="An international view of the plan"
          action={
            <button className="text-button" onClick={() => onView('variance')}>
              View analysis <ArrowRight size={14} />
            </button>
          }
        >
          <div className="market-list">
            {data.entities.map((e, i) => (
              <div className="market-row" key={e.name}>
                <div className="flag">{e.name === 'Germany' ? '🇩🇪' : '🇬🇧'}</div>
                <div className="market-name">
                  <strong>{e.name}</strong>
                  <span>{num(e.fte, 1)} average FTE</span>
                </div>
                <div className="market-revenue">
                  <strong>{money(e.actual)}</strong>
                  <span>Revenue</span>
                </div>
                <div className="market-bar">
                  <span
                    style={{
                      width: `${Math.min(100, (e.actual / e.budget) * 100)}%`,
                      background: colors[i],
                    }}
                  />
                </div>
                <span
                  className={e.actual >= e.budget ? 'positive' : 'negative'}
                >
                  {deltaPercent(e.actual, e.budget).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <div className="insight-card">
          <div className="insight-label">
            <Sparkles size={17} />
            <span>PLANNING PERSPECTIVE</span>
          </div>
          <h2>
            See the story
            <br />
            behind the numbers.
          </h2>
          <p>
            Understand the EBITDA gap, explore hiring decisions, and make your
            next planning conversation count.
          </p>
          <button onClick={() => onView('copilot')}>
            Ask the finance copilot <ArrowUpRight size={16} />
          </button>
          <div className="insight-decoration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </>
  );
}
function Variance({ data }: { data: DashboardData }) {
  const bridge = data.variance.filter((v) => v.account !== 'EBITDA');
  return (
    <>
      <div className="metrics three">
        <Metric
          label="Budget EBITDA"
          value={money(data.budget.ebitda)}
          change={0}
          caption="Planning baseline"
          icon={Layers3}
          neutral
        />
        <Metric
          label="Actual EBITDA"
          value={money(data.actual.ebitda)}
          change={deltaPercent(data.actual.ebitda, data.budget.ebitda)}
          caption="vs. budget"
          icon={BarChart3}
        />
        <Metric
          label="Operating expenses"
          value={money(data.actual.opex)}
          change={-deltaPercent(data.actual.opex, data.budget.opex)}
          caption="favourability vs. budget"
          icon={Activity}
        />
      </div>
      <Panel
        title="What moved EBITDA?"
        subtitle="Favourable variance adds to EBITDA. Adverse variance reduces it."
      >
        <div className="chart-box variance-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bridge}
              layout="vertical"
              margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
            >
              <CartesianGrid stroke="#edf0ed" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => money(v)}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="account"
                width={170}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="#aeb8b0" />
              <Tooltip formatter={(v) => money(Number(v), false)} />
              <Bar
                dataKey="favourable"
                name="EBITDA impact"
                radius={[5, 5, 5, 5]}
                barSize={28}
              >
                {bridge.map((v) => (
                  <Cell
                    key={v.account}
                    fill={v.favourable >= 0 ? '#286b56' : '#c98b6b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel
        title="Budget to actual"
        subtitle="Positive expense values · currency EUR"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Actual</th>
                <th>Budget</th>
                <th>Actual − budget</th>
                <th>EBITDA impact</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.variance.map((v) => (
                <tr
                  className={v.account === 'EBITDA' ? 'total-row' : ''}
                  key={v.account}
                >
                  <td>{v.account}</td>
                  <td>{money(v.actual, false)}</td>
                  <td>{money(v.budget, false)}</td>
                  <td>{money(v.delta, false)}</td>
                  <td className={v.favourable >= 0 ? 'positive' : 'negative'}>
                    {money(v.favourable, false)}
                  </td>
                  <td>
                    <span
                      className={v.favourable >= 0 ? 'badge good' : 'badge bad'}
                    >
                      {v.percent === null
                        ? 'n/a'
                        : `${Math.abs(v.percent).toFixed(1)}%`}{' '}
                      {v.favourable >= 0 ? 'favourable' : 'adverse'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
function Workforce({ data }: { data: DashboardData }) {
  const a = data.actual,
    b = data.budget;
  return (
    <>
      <div className="metrics three">
        <Metric
          label="Average workforce"
          value={`${num(a.fte, 1)} FTE`}
          change={deltaPercent(a.fte, b.fte)}
          caption="vs. budget"
          icon={Users}
          neutral
        />
        <Metric
          label="Personnel expense"
          value={money(a.personnel)}
          change={-deltaPercent(a.personnel, b.personnel)}
          caption="favourability vs. budget"
          icon={Activity}
        />
        <Metric
          label="Personnel / revenue"
          value={`${(a.revenue ? (a.personnel / a.revenue) * 100 : 0).toFixed(1)}%`}
          change={0}
          caption="Workforce cost ratio"
          icon={Layers3}
          neutral
        />
      </div>
      <div className="overview-grid">
        <Panel
          title="Workforce by department"
          subtitle="Average monthly FTE · actual against budget"
        >
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.departments}
                margin={{ left: 0, right: 10, bottom: 25 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0ed" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => `${num(Number(v), 1)} FTE`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="fte"
                  name="Actual"
                  fill="#286b56"
                  radius={[5, 5, 0, 0]}
                  barSize={25}
                />
                <Bar
                  dataKey="budgetFte"
                  name="Budget"
                  fill="#c9dace"
                  radius={[5, 5, 0, 0]}
                  barSize={25}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Planning assumptions"
          subtitle="The synthetic business story"
        >
          <div className="story-list">
            <div>
              <span className="story-number">01</span>
              <h3>Hiring ahead of plan</h3>
              <p>
                Germany’s engineering team expands ahead of budget during 2026.
              </p>
            </div>
            <div>
              <span className="story-number">02</span>
              <h3>Employer on-costs</h3>
              <p>
                Germany actuals use a 23.5% employer cost rate, versus 22%
                planned.
              </p>
            </div>
            <div>
              <span className="story-number">03</span>
              <h3>Currency sensitivity</h3>
              <p>
                UK actual expenses include an illustrative 2.5% FX cost uplift
                in EUR.
              </p>
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Department cost view"
        subtitle="FTE averaged over selected months. Salary costs include employer on-costs."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Actual FTE</th>
                <th>Budget FTE</th>
                <th>Personnel cost</th>
                <th>Budget cost</th>
                <th>Cost variance</th>
              </tr>
            </thead>
            <tbody>
              {data.departments.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{num(d.fte, 1)}</td>
                  <td>{num(d.budgetFte, 1)}</td>
                  <td>{money(d.cost, false)}</td>
                  <td>{money(d.budgetCost, false)}</td>
                  <td
                    className={d.cost <= d.budgetCost ? 'positive' : 'negative'}
                  >
                    {money(d.cost - d.budgetCost, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
type SavedScenario = {
  id: string;
  name: string;
  assumptions: {
    filters: Filters;
    revenuePercent: number;
    salaryPercent: number;
    additionalFte: number;
  };
  results: { ebitda: number; delta: number };
  created_at: string;
  data_source: string;
};
function ScenarioLab({
  data,
  onFilters,
}: {
  data: DashboardData;
  onFilters: (f: Filters) => void;
}) {
  const [revenue, setRevenue] = useState(0),
    [salary, setSalary] = useState(0),
    [fte, setFte] = useState(0),
    [name, setName] = useState('My planning scenario'),
    [saved, setSaved] = useState<SavedScenario[]>([]),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState('');
  const s = scenario(data.actual, revenue, salary, fte);
  const load = useCallback(
    () =>
      fetch('/api/scenarios')
        .then(jsonResponse)
        .then((r) => setSaved(r.scenarios))
        .catch(() => {}),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  async function save() {
    setSaving(true);
    setNotice('');
    try {
      await jsonResponse(
        await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            filters: data.filters,
            revenuePercent: revenue,
            salaryPercent: salary,
            additionalFte: fte,
          }),
        })
      );
      setNotice('Scenario saved in Neon.');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="scenario-grid">
        <Panel
          title="Change the assumptions"
          subtitle="Apply to the selected Actual period"
        >
          <div className="sliders">
            {[
              {
                label: 'Revenue growth',
                value: revenue,
                set: setRevenue,
                min: -30,
                max: 30,
                unit: '%',
              },
              {
                label: 'Salary rate change',
                value: salary,
                set: setSalary,
                min: -10,
                max: 20,
                unit: '%',
              },
              {
                label: 'Additional average FTE',
                value: fte,
                set: setFte,
                min: -100,
                max: 100,
                unit: ' FTE',
              },
            ].map((c) => (
              <div className="slider-field" key={c.label}>
                <div>
                  <label>{c.label}</label>
                  <strong>
                    {c.value > 0 ? '+' : ''}
                    {c.value}
                    {c.unit}
                  </strong>
                </div>
                <input
                  aria-label={c.label}
                  type="range"
                  min={c.min}
                  max={c.max}
                  value={c.value}
                  onChange={(e) => c.set(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>
                    {c.min}
                    {c.unit}
                  </span>
                  <span>
                    {c.max}
                    {c.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="scenario-save">
            <label htmlFor="scenario-name">Scenario name</label>
            <input
              id="scenario-name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="primary"
              onClick={save}
              disabled={
                saving || !name.trim() || !data.status.databaseConnected
              }
            >
              {saving ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Database size={16} />
              )}
              Save scenario
            </button>
            <p className="save-notice" role="status">
              {notice}
            </p>
          </div>
        </Panel>
        <div className="scenario-results">
          <span className="eyebrow">YOUR SCENARIO</span>
          <h2>{money(s.ebitda)}</h2>
          <p>Projected EBITDA for the selected period</p>
          <span
            className={`scenario-delta ${s.delta >= 0 ? 'positive' : 'negative'}`}
          >
            {s.delta >= 0 ? (
              <ArrowUpRight size={18} />
            ) : (
              <ArrowDownRight size={18} />
            )}{' '}
            {money(Math.abs(s.delta))}{' '}
            {s.delta >= 0 ? 'improvement' : 'reduction'}
          </span>
          <div className="scenario-result-rows">
            <div>
              <span>Revenue</span>
              <strong>{money(s.revenue)}</strong>
            </div>
            <div>
              <span>Personnel expense</span>
              <strong>{money(s.personnel)}</strong>
            </div>
            <div>
              <span>Operating expenses</span>
              <strong>{money(s.opex)}</strong>
            </div>
            <div>
              <span>EBITDA margin</span>
              <strong>{s.margin.toFixed(1)}%</strong>
            </div>
            <div>
              <span>Baseline EBITDA</span>
              <strong>{money(data.actual.ebitda)}</strong>
            </div>
          </div>
          <div className="scenario-note">
            <ShieldCheck size={18} />
            <p>
              A simulation using the finance engine. Saved scenarios stay
              separate from Actual, Budget and TM1.
            </p>
          </div>
        </div>
      </div>
      <Panel
        title="Saved scenarios"
        subtitle="Stored in Neon · private to this browser session"
      >
        {saved.length ? (
          <div className="saved-grid">
            {saved.map((sc) => (
              <button
                className="saved-card"
                key={sc.id}
                onClick={() => {
                  onFilters(sc.assumptions.filters);
                  setRevenue(sc.assumptions.revenuePercent);
                  setSalary(sc.assumptions.salaryPercent);
                  setFte(sc.assumptions.additionalFte);
                  setName(sc.name);
                  setNotice('Saved assumptions restored.');
                }}
              >
                <div>
                  <Layers3 size={17} />
                  <span>
                    {new Date(sc.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <strong>{sc.name}</strong>
                <p>{money(sc.results.ebitda)} EBITDA</p>
                <span>
                  {sc.assumptions.filters.entity} ·{' '}
                  {sc.assumptions.filters.year} · {sc.data_source}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty>Your first saved scenario will appear here.</Empty>
        )}
      </Panel>
    </>
  );
}
function Explorer({ filters }: { filters: Filters }) {
  const [version, setVersion] = useState('Actual'),
    [account, setAccount] = useState('All accounts'),
    [page, setPage] = useState(1),
    [result, setResult] = useState<{
      facts: Fact[];
      total: number;
      pages: number;
    } | null>(null),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(
      `/api/explorer?${query(filters)}&version=${version}&account=${encodeURIComponent(account)}&page=${page}`
    )
      .then(jsonResponse)
      .then((d) => {
        if (active) setResult(d);
      })
      .catch(() => {
        if (active) setResult(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, version, account, page]);
  useEffect(() => {
    setPage(1);
  }, [filters, version, account]);
  return (
    <>
      <div className="cube-model">
        <div className="cube-symbol">
          <Layers3 size={30} />
        </div>
        <div>
          <h2>Finance_Plan</h2>
          <p>Period × Entity × Department × Product × Account × Version</p>
        </div>
        <span className="badge neutral">Canonical finance model</span>
      </div>
      <Panel
        title="Cube slice"
        subtitle="The same contract for live TM1 and synthetic facts"
        action={
          <div className="inline-controls">
            <select
              aria-label="Explorer version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            >
              {VERSIONS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              aria-label="Explorer account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {['All accounts', ...ACCOUNTS].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        }
      >
        <div className={`table-scroll ${loading ? 'is-loading' : ''}`}>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Entity</th>
                <th>Department</th>
                <th>Product</th>
                <th>Account</th>
                <th>Value</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {result?.facts.map((f) => (
                <tr key={f.id}>
                  <td>{f.period}</td>
                  <td>{f.entity}</td>
                  <td>{f.department}</td>
                  <td>{f.product}</td>
                  <td>{f.account}</td>
                  <td>
                    {f.unit === 'EUR'
                      ? money(f.amount, false)
                      : num(f.amount, 2)}
                  </td>
                  <td>{f.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !result?.facts.length && (
          <Empty>No records for this slice.</Empty>
        )}
        <div className="pagination">
          <span>
            {num(result?.total || 0)} records · page {page} of{' '}
            {Math.max(1, result?.pages || 1)}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              aria-label="Next page"
              disabled={page >= (result?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}
type Answer = {
  question: string;
  answer: string;
  mode: string;
  notice: string;
  model: string;
};
function Copilot({ data }: { data: DashboardData }) {
  const [provider, setProvider] = useState('built-in'),
    [config, setConfig] = useState<{
      openrouter: { configured: boolean; model: string };
      ollama: { configured: boolean; model: string };
      accessProtected: boolean;
    } | null>(null),
    [question, setQuestion] = useState(''),
    [token, setToken] = useState(''),
    [answers, setAnswers] = useState<Answer[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/copilot')
      .then(jsonResponse)
      .then(setConfig)
      .catch(() => {});
  }, []);
  async function ask(prompt = question) {
    if (prompt.trim().length < 3 || busy) return;
    setBusy(true);
    setError('');
    setQuestion('');
    try {
      const r = await jsonResponse(
        await fetch(`/api/copilot?${query(data.filters)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: prompt,
            provider,
            accessToken: token,
          }),
        })
      );
      setAnswers((a) => [...a, { ...r, question: prompt }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis unavailable.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="copilot-grid">
      <div className="chat-panel">
        <div className="chat-toolbar">
          <span>
            <Sparkles size={18} />
            Finance copilot
          </span>
          <select
            aria-label="AI provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="built-in">Calculated analysis</option>
            <option value="openrouter">
              OpenRouter · GPT-6 Sol
              {!config?.openrouter.configured ? ' (key pending)' : ''}
            </option>
            <option value="ollama">
              Ollama Cloud{!config?.ollama.configured ? ' (key pending)' : ''}
            </option>
          </select>
        </div>
        {provider !== 'built-in' &&
          config?.[provider as 'openrouter' | 'ollama'].configured && (
            <div className="token-field">
              <label htmlFor="presenter-token">Presenter access token</label>
              <input
                id="presenter-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Entered for this session only"
              />
            </div>
          )}
        <div className="chat-messages">
          {answers.length === 0 ? (
            <div className="chat-welcome">
              <div className="copilot-orb">
                <Sparkles size={28} />
              </div>
              <h2>Your numbers have a story.</h2>
              <p>
                Let’s find it together. Ask about performance,
                <br />
                workforce costs or the full-year outlook.
              </p>
              <div className="suggestions">
                {[
                  'Why is EBITDA below budget?',
                  'What is driving workforce costs?',
                  'Explain the full-year forecast.',
                ].map((p) => (
                  <button key={p} onClick={() => ask(p)}>
                    {p}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            answers.map((a, i) => (
              <div className="conversation" key={i}>
                <div className="user-question">{a.question}</div>
                <div className="answer-label">
                  <Sparkles size={14} />
                  {a.mode === 'ai'
                    ? 'Cloud AI response'
                    : 'Calculated finance analysis'}
                </div>
                <div className="answer-text">{a.answer}</div>
                <div className="answer-notice">
                  <Info size={13} />
                  {a.notice}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="thinking">
              <Loader2 className="spin" size={17} />
              Reading the finance evidence…
            </div>
          )}
          {error && (
            <div role="alert" className="inline-error">
              {error}
            </div>
          )}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <input
            aria-label="Finance question"
            value={question}
            maxLength={1200}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your financial plan…"
          />
          <button
            aria-label="Send question"
            disabled={busy || question.trim().length < 3}
          >
            <Send size={18} />
          </button>
        </form>
        <div className="chat-disclosure">
          Answers use the selected finance slice. Review the evidence before a
          decision.
        </div>
      </div>
      <div className="copilot-context">
        <Panel
          title="Grounded in your data"
          subtitle="The current planning context"
        >
          <div className="context-list">
            <div>
              <span>Entity</span>
              <strong>{data.filters.entity}</strong>
            </div>
            <div>
              <span>Period</span>
              <strong>
                Jan–{monthName(data.filters.toMonth)} {data.filters.year}
              </strong>
            </div>
            <div>
              <span>Revenue</span>
              <strong>{money(data.actual.revenue)}</strong>
            </div>
            <div>
              <span>EBITDA</span>
              <strong>{money(data.actual.ebitda)}</strong>
            </div>
            <div>
              <span>Evidence</span>
              <strong>{num(data.rowCount)} records</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>
                {data.status.source === 'tm1' ? 'Live TM1' : 'Synthetic data'}
              </strong>
            </div>
          </div>
        </Panel>
        <div className="subtle-note">
          <ShieldCheck size={20} />
          <h3>Explain. Explore. Review.</h3>
          <p>
            The copilot receives calculated financial evidence. It cannot change
            budgets, execute TI, or write to TM1.
          </p>
          <p>
            Without a provider key, responses are deterministic calculations and
            clearly labelled.
          </p>
        </div>
      </div>
    </div>
  );
}
function Connections({
  data,
  onRefresh,
}: {
  data: DashboardData;
  onRefresh: () => void;
}) {
  return (
    <>
      <div className="connection-grid">
        {[
          {
            name: 'IBM Planning Analytics',
            subtitle: 'TM1 / finance cube',
            icon: Layers3,
            connected: data.status.tm1 === 'connected',
            text:
              data.status.tm1 === 'connected'
                ? 'Connected'
                : data.status.tm1 === 'unreachable'
                  ? 'Not reachable'
                  : 'Disconnected',
            detail: data.status.reason,
          },
          {
            name: 'Neon PostgreSQL',
            subtitle: 'Persistent demo data & scenarios',
            icon: Database,
            connected: data.status.databaseConnected,
            text: data.status.databaseConnected ? 'Connected' : 'Unavailable',
            detail: data.status.databaseConnected
              ? 'The synthetic finance dataset and your saved scenarios are stored in Neon, Frankfurt.'
              : 'The dashboard is using a temporary in-memory fixture.',
          },
          {
            name: 'Vercel',
            subtitle: 'Application hosting',
            icon: Cloud,
            connected: true,
            text: 'Application running',
            detail:
              'Dashboard and backend share one deployment. Every finance request checks the data-source route.',
          },
        ].map((c) => (
          <div className="connection-card" key={c.name}>
            <c.icon size={24} />
            <h2>{c.name}</h2>
            <p>{c.subtitle}</p>
            <span className={c.connected ? 'badge good' : 'badge amber'}>
              <i className="dot" />
              {c.text}
            </span>
            <p className="connection-detail">{c.detail}</p>
          </div>
        ))}
      </div>
      <Panel
        title="The automatic switch"
        subtitle="One shared data contract keeps every finance view consistent."
        action={
          <button className="secondary" onClick={onRefresh}>
            <RefreshCw size={15} />
            Recheck connection
          </button>
        }
      >
        <div className="architecture-flow">
          <div>
            <LayoutDashboard size={23} />
            <strong>Dashboard</strong>
            <span>KPIs · charts · exports</span>
          </div>
          <ArrowRight size={20} />
          <div>
            <GitBranch size={23} />
            <strong>Data-source manager</strong>
            <span>Check credentials & read cube</span>
          </div>
          <ArrowRight size={20} />
          <div className="source-options">
            <span>
              <i className="dot green" />
              TM1 live cube
            </span>
            <span>
              <i className="dot amber-dot" />
              Neon synthetic data
            </span>
          </div>
          <ArrowRight size={20} />
          <div>
            <BarChart3 size={23} />
            <strong>Finance engine</strong>
            <span>Variance · scenario · copilot</span>
          </div>
        </div>
        <div className="architecture-note">
          <Info size={16} />
          <span>
            Checked{' '}
            {new Date(data.status.checkedAt).toLocaleTimeString('en-GB')}.
            Missing configuration, timeouts and incompatible cube views each
            trigger a labelled fallback.
          </span>
        </div>
      </Panel>
      <Panel
        title="Enable live TM1 & cloud AI"
        subtitle="Server-side settings in the Vercel project"
      >
        <div className="setup-grid">
          <div>
            <span className="story-number">01</span>
            <h3>TM1 connection</h3>
            <p>
              Set the HTTPS REST URL, authentication, cube MDX mapping and an
              application access password. The README includes the canonical
              dimensions and a sample MDX query.
            </p>
          </div>
          <div>
            <span className="story-number">02</span>
            <h3>OpenRouter</h3>
            <p>
              Add your API key and presenter access token. The configured model
              is GPT-6 Sol with high reasoning effort for finance questions.
            </p>
          </div>
          <div>
            <span className="story-number">03</span>
            <h3>Ollama Cloud</h3>
            <p>
              Add an Ollama API key to use the alternative cloud provider. The
              model is configurable and the dashboard keeps the provider choice
              visible.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
function Guide() {
  return (
    <>
      <div className="guide-hero">
        <span className="eyebrow">INDEPENDENT INTERVIEW PROOF OF CONCEPT</span>
        <h2>
          Financial planning.
          <br />
          With a TM1 mindset.
        </h2>
        <p>
          TalentPlan is a fictional recruitment marketplace operating in Germany
          and the UK. It connects revenue drivers, workforce planning and
          operating costs in a single financial view.
        </p>
      </div>
      <Panel
        title="A five-minute walkthrough"
        subtitle="A useful route for finance stakeholders and your interview presentation"
      >
        <div className="walkthrough">
          {[
            [
              'Overview',
              'Start with revenue, EBITDA and margin. Point out the synthetic source label.',
            ],
            [
              'Variance analysis',
              'Show the EBITDA impact of revenue shortfalls and cost overruns.',
            ],
            [
              'Workforce',
              'Explain average FTE, employer on-costs and currency sensitivity.',
            ],
            [
              'Scenario lab',
              'Test revenue growth or a hiring change, then save the scenario in Neon.',
            ],
            [
              'TM1 explorer & copilot',
              'Trace a cube slice, export to Excel, and explain the finance evidence.',
            ],
          ].map(([title, detail], i) => (
            <div key={title}>
              <span className="story-number">0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="setup-grid guide-cards">
        <Panel title="Financial language">
          <div className="glossary">
            <p>
              <strong>EBITDA</strong> · Earnings before interest, tax,
              depreciation and amortisation. Revenue less modelled operating
              expenses.
            </p>
            <p>
              <strong>FP&A</strong> · Financial planning and analysis: budget,
              forecast, scenario and performance review.
            </p>
            <p>
              <strong>FTE</strong> · Full-time equivalent. Average monthly
              capacity across the selected period.
            </p>
            <p>
              <strong>Favourable variance</strong> · Higher revenue or lower
              expense than budget.
            </p>
            <p>
              <strong>Rolling forecast</strong> · Actuals for closed periods
              plus forecast for open periods.
            </p>
          </div>
        </Panel>
        <Panel title="TM1 developer perspective">
          <div className="glossary">
            <p>
              <strong>Cube & dimensions</strong> · Period, Entity, Department,
              Product, Account, Version and Measure.
            </p>
            <p>
              <strong>Rules & feeders</strong> · Example calculation sources are
              included in the repository.
            </p>
            <p>
              <strong>TurboIntegrator</strong> · Documented staged load and
              reconciliation workflow.
            </p>
            <p>
              <strong>MDX & REST</strong> · Read a mapped cube view into the
              shared finance contract.
            </p>
            <p>
              <strong>Governance</strong> · Read-only live integration, explicit
              provenance and isolated saved scenarios.
            </p>
          </div>
        </Panel>
      </div>
      <div className="about-note">
        <Info size={18} />
        <p>
          This project is inspired by the public StepStone TM1 developer role.
          It is an independent demonstration with synthetic data; it does not
          reproduce StepStone’s internal systems. IBM integration examples
          require validation on a licensed TM1 environment.
        </p>
      </div>
    </>
  );
}
export default function Dashboard() {
  const [view, setView] = useState<View>('overview'),
    [filters, setFilters] = useState<Filters>({
      year: 2026,
      toMonth: 9,
      entity: 'All entities',
    }),
    [data, setData] = useState<DashboardData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    [mobile, setMobile] = useState(false),
    [exportMenu, setExportMenu] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/dashboard?${query(filters)}`, { signal: controller.signal })
      .then(jsonResponse)
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, refresh]);
  const navigate = (v: View) => {
    setView(v);
    setMobile(false);
  };
  const download = (format: string, scope: string) => {
    window.location.href = `/api/export?${query(filters)}&format=${format}&scope=${scope}`;
    setExportMenu(false);
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <a href="/" className="brand">
          <div className="brand-symbol">
            t<span />
          </div>
          <div>
            <strong>
              talentplan<span>®</span>
            </strong>
            <p>Finance & planning</p>
          </div>
        </a>
        <div className="workspace-label">
          <span className="workspace-dot" />
          <span>Group Finance</span>
          <span className="workspace-badge">POC</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              className={view === n.id ? 'nav-item active' : 'nav-item'}
              key={n.id}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === 'copilot' && <span className="ai-tag">AI</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label system-label">SYSTEM</div>
        <nav>
          <button
            className={view === 'connections' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('connections')}
          >
            <PlugZap size={18} />
            <span>Connections</span>
            <i
              className={`dot ${data?.status.tm1 === 'connected' ? 'green' : 'amber-dot'}`}
            />
          </button>
          <button
            className={view === 'guide' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('guide')}
          >
            <BookOpen size={18} />
            <span>Presentation guide</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <ShieldCheck size={19} />
            <strong>Purpose-built for planning.</strong>
            <p>
              {data?.status.mode === 'live'
                ? 'Live TM1 data is active.'
                : 'Synthetic data. Real possibilities.'}
            </p>
          </div>
          <div className="profile">
            <div className="avatar">SP</div>
            <div>
              <strong>Soham Patra</strong>
              <span>TM1 developer · Portfolio</span>
            </div>
            <Settings2 size={16} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {view === 'overview'
                ? 'Finance overview'
                : nav.find((n) => n.id === view)?.label ||
                  (view === 'guide' ? 'Presentation guide' : 'Connections')}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <i
                className={`dot ${data?.status.mode === 'live' ? 'green' : 'amber-dot'}`}
              />
              {data?.status.mode === 'live' ? 'Live TM1' : 'Demonstration mode'}
            </span>
            <span className="top-date">FY {filters.year}</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">GROUP FINANCE / PLANNING ANALYTICS</div>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary icon-button"
                aria-label="Refresh dashboard"
                onClick={() => setRefresh((r) => r + 1)}
                disabled={loading}
              >
                <RefreshCw size={17} className={loading ? 'spin' : ''} />
              </button>
              <div className="export-wrap">
                <button
                  className="primary"
                  onClick={() => setExportMenu((v) => !v)}
                  disabled={!data}
                >
                  <ArrowDownToLine size={16} />
                  Export data
                  <ChevronRight size={13} className="rotate" />
                </button>
                {exportMenu && (
                  <>
                    <button
                      className="menu-backdrop"
                      aria-label="Close export menu"
                      onClick={() => setExportMenu(false)}
                    />
                    <div className="export-menu">
                      <span>SELECTED VIEW</span>
                      <button onClick={() => download('xlsx', 'current')}>
                        Excel workbook <Table2 size={15} />
                      </button>
                      <button onClick={() => download('csv', 'current')}>
                        CSV file <ArrowDownToLine size={15} />
                      </button>
                      <span>COMPLETE DATASET</span>
                      <button onClick={() => download('xlsx', 'all')}>
                        All data · Excel
                      </button>
                      <button onClick={() => download('csv', 'all')}>
                        All data · CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {view !== 'guide' && (
            <div className="filter-bar">
              <div className="filters">
                <select
                  aria-label="Reporting year"
                  value={filters.year}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      year: Number(e.target.value),
                      toMonth: Number(e.target.value) === 2025 ? 12 : 9,
                    })
                  }
                >
                  <option value={2026}>FY 2026</option>
                  <option value={2025}>FY 2025</option>
                </select>
                <select
                  aria-label="Reporting period"
                  value={filters.toMonth}
                  onChange={(e) =>
                    setFilters({ ...filters, toMonth: Number(e.target.value) })
                  }
                >
                  {Array.from(
                    { length: filters.year === 2026 ? 9 : 12 },
                    (_, i) => (
                      <option value={i + 1} key={i}>
                        Jan – {monthName(i + 1)}
                      </option>
                    )
                  )}
                </select>
                <div className="filter-divider" />
                <select
                  aria-label="Entity"
                  value={filters.entity}
                  onChange={(e) =>
                    setFilters({ ...filters, entity: e.target.value })
                  }
                >
                  <option>All entities</option>
                  <option>Germany</option>
                  <option>United Kingdom</option>
                </select>
              </div>
              <span className="currency-note">
                EUR <span>·</span> Actual vs. Budget
              </span>
            </div>
          )}
          {data && view !== 'guide' && (
            <div
              className={
                data.status.tm1 === 'connected'
                  ? 'source-banner live'
                  : 'source-banner'
              }
            >
              <div className="source-icon">
                {data.status.tm1 === 'connected' ? (
                  <Check size={17} />
                ) : (
                  <TriangleAlert size={17} />
                )}
              </div>
              <div>
                <strong>
                  {data.status.tm1 === 'connected'
                    ? 'TM1 connected'
                    : data.status.tm1 === 'unreachable'
                      ? 'TM1 not reachable'
                      : 'TM1 disconnected'}
                </strong>
                <span>
                  {data.status.source === 'neon'
                    ? 'Showing synthetic finance data stored in Neon.'
                    : data.status.source === 'memory'
                      ? 'Neon unavailable · using a temporary synthetic fixture.'
                      : 'Showing live IBM Planning Analytics data.'}{' '}
                  <span className="banner-reason">
                    {data.status.source !== 'tm1' &&
                      data.status.reason.split('. ')[0] + '.'}
                  </span>
                </span>
              </div>
              <button onClick={() => navigate('connections')}>
                Connection details <ArrowRight size={14} />
              </button>
            </div>
          )}
          {error ? (
            <div className="error-panel" role="alert">
              <TriangleAlert />
              <h2>We couldn’t load your dashboard.</h2>
              <p>{error}</p>
              <button
                className="secondary"
                onClick={() => setRefresh((r) => r + 1)}
              >
                Try again
              </button>
            </div>
          ) : !data ? (
            <div className="loading-dashboard">
              <Loader2 className="spin" size={24} />
              <h2>Connecting your finance workspace…</h2>
              <p>Checking the TM1 route and loading the Neon dataset.</p>
            </div>
          ) : (
            <div className={`view-content ${loading ? 'refreshing' : ''}`}>
              {view === 'overview' && (
                <Overview data={data} onView={navigate} />
              )}{' '}
              {view === 'variance' && <Variance data={data} />}{' '}
              {view === 'workforce' && <Workforce data={data} />}{' '}
              {view === 'scenario' && (
                <ScenarioLab data={data} onFilters={setFilters} />
              )}{' '}
              {view === 'explorer' && <Explorer filters={filters} />}{' '}
              {view === 'copilot' && <Copilot data={data} />}{' '}
              {view === 'connections' && (
                <Connections
                  data={data}
                  onRefresh={() => setRefresh((r) => r + 1)}
                />
              )}{' '}
              {view === 'guide' && <Guide />}
            </div>
          )}
          <footer>
            <span>
              TalentPlan <span>·</span> Independent TM1 interview POC
            </span>
            <span>
              {data?.status.mode === 'live'
                ? 'Live IBM Planning Analytics'
                : 'Synthetic data · no company actuals'}{' '}
              <i className="dot" />{' '}
              {data
                ? `Updated ${new Date(data.status.checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                : 'Connecting'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
