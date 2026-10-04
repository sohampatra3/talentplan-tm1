'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  Loader2,
  Menu,
  Moon,
  Network,
  Palette,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Table2,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DashboardData, Fact, Filters } from '@/lib/types';
import { ACCOUNTS, VERSIONS } from '@/lib/types';
import { scenario } from '@/lib/finance';
import type { AnalysisOptions } from '@/lib/analysis';
import type { Language } from '@/lib/i18n';
import {
  APPEARANCE_STORAGE_KEY,
  type ColorMode,
  type ThemePalette,
} from '@/lib/appearance';
import { LocaleContext, useLocale } from './locale';
import {
  Chart,
  ChartSelect,
  Metric,
  Panel,
  Scope,
  Select,
  filterQuery,
  readJson,
  type ChartKind,
} from './ui';
import { Connections } from './connections';
import { AppearanceSettings } from './appearance-settings';
import { VisualWorkspace } from './visual-workspace';
type View =
  | 'overview'
  | 'variance'
  | 'workforce'
  | 'scenarios'
  | 'explorer'
  | 'copilot'
  | 'connections'
  | 'guide';
const nav = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'variance', icon: BarChart3 },
  { id: 'workforce', icon: Users },
  { id: 'scenarios', icon: SlidersHorizontal },
  { id: 'explorer', icon: Table2 },
  { id: 'copilot', icon: Sparkles },
  { id: 'connections', icon: Network },
  { id: 'guide', icon: BookOpen },
] as const;
const defaults: Filters = {
  year: 2026,
  fromMonth: 1,
  toMonth: 9,
  entity: 'All entities',
  department: 'All departments',
  comparison: 'Budget',
};
const percent = (a: number, b: number) =>
  b ? ((a - b) / Math.abs(b)) * 100 : 0;
type VisualRequest = Partial<AnalysisOptions> & { filters: Filters };
function Overview({
  data,
  setFilters,
  openVisual,
}: {
  data: DashboardData;
  setFilters: (f: Filters) => void;
  openVisual: (r: VisualRequest) => void;
}) {
  const { t, money, num } = useLocale(),
    [metric, setMetric] = useState<'revenue' | 'ebitda' | 'fte'>('revenue'),
    [chart, setChart] = useState<ChartKind>('area'),
    [product, setProduct] = useState(''),
    [mixKind, setMixKind] = useState<ChartKind>('pie');
  const comparison = data.filters.comparison || 'Budget';
  const a = data.actual,
    b = data.budget;
  const last = data.monthly.findLastIndex((row) => row.actual !== null);
  const trend = data.monthly.map((row, i) => ({
    name: `${data.filters.year}-${String(i + 1).padStart(2, '0')}`,
    value:
      metric === 'revenue'
        ? row.actual
        : metric === 'ebitda'
          ? row.ebitda
          : row.fte,
    baseline:
      metric === 'revenue'
        ? row.budget
        : metric === 'ebitda'
          ? row.budgetEbitda
          : row.budgetFte,
    forecast:
      i >= last
        ? metric === 'revenue'
          ? row.forecast
          : metric === 'ebitda'
            ? row.forecastEbitda
            : row.forecastFte
        : null,
  }));
  const products = data.products.filter((p) => p.value || p.budget);
  const picked = products.find((p) => p.name === product);
  return (
    <>
      <div className="metrics">
        <Metric
          label={t('revenue')}
          value={a.revenue}
          delta={percent(a.revenue, b.revenue)}
          onClick={() =>
            openVisual({
              metric: 'revenue',
              dimension: 'period',
              filters: data.filters,
            })
          }
        />
        <Metric
          label={t('ebitda')}
          value={a.ebitda}
          delta={percent(a.ebitda, b.ebitda)}
          onClick={() =>
            openVisual({
              metric: 'variance',
              dimension: 'account',
              filters: data.filters,
            })
          }
        />
        <Metric
          label={t('margin')}
          value={a.margin}
          unit="%"
          onClick={() => setMetric('ebitda')}
        />
        <Metric
          label={t('fte')}
          value={a.fte}
          unit="FTE"
          delta={percent(a.fte, b.fte)}
          onClick={() =>
            openVisual({
              metric: 'fte',
              dimension: 'department',
              filters: data.filters,
            })
          }
        />
      </div>
      <div className="two-columns wide-left">
        <Panel
          title={t('trend')}
          subtitle={t('trendSub')}
          actions={
            <div className="chart-controls">
              <Select
                label={t('metric')}
                value={metric}
                onChange={(v) => setMetric(v as typeof metric)}
                options={['revenue', 'ebitda', 'fte'].map((value) => ({
                  value,
                  label: t(value),
                }))}
              />
              <ChartSelect value={chart} onChange={setChart} allowPie={false} />
            </div>
          }
        >
          <Chart
            rows={trend}
            kind={chart}
            unit={metric === 'fte' ? 'FTE' : 'EUR'}
            comparison={comparison}
          />
          <p className="note">
            {t('lastActual')}: {data.coverage.lastActualPeriod || '—'} · EUR
          </p>
        </Panel>
        <Panel
          title={t('mix')}
          subtitle={t('mixSub')}
          actions={<ChartSelect value={mixKind} onChange={setMixKind} />}
        >
          <Chart
            rows={products.map((p) => ({
              name: p.name,
              value: p.value,
              baseline: p.budget,
            }))}
            kind={mixKind}
            comparison={comparison}
            onPick={setProduct}
          />
          <div className="product-list">
            {products.map((p) => (
              <button
                key={p.name}
                className={product === p.name ? 'active' : ''}
                onClick={() => setProduct(product === p.name ? '' : p.name)}
              >
                <span>{t(p.name)}</span>
                <strong>
                  {num(a.revenue ? (p.value / a.revenue) * 100 : 0, 1)}%
                </strong>
              </button>
            ))}
          </div>
          {picked && (
            <div className="selection-detail">
              <strong>{t(picked.name)}</strong>
              <span>
                {money(picked.value)} · {t(comparison)} {money(picked.budget)}
              </span>
            </div>
          )}
        </Panel>
      </div>
      <Panel
        title={t('markets')}
        subtitle={t('marketsSub')}
        actions={
          <button
            className="text-button"
            onClick={() =>
              setFilters({ ...data.filters, entity: 'All entities' })
            }
          >
            {t('resetView')}
          </button>
        }
      >
        <div className="market-grid">
          {data.entities.map((entity) => (
            <button
              key={entity.name}
              className="market-card"
              onClick={() =>
                setFilters({ ...data.filters, entity: entity.name })
              }
            >
              <span className="market-name">
                {entity.name === 'Germany' ? '🇩🇪' : '🇬🇧'} {t(entity.name)}{' '}
                <ArrowUpRight size={17} />
              </span>
              <strong>{money(entity.actual)}</strong>
              <span>
                {t('Revenue')} · {num(entity.fte, 1)} FTE
              </span>
              <small
                className={
                  entity.actual < entity.budget ? 'adverse' : 'favourable'
                }
              >
                {num(percent(entity.actual, entity.budget), 1)}% {t('vs')}{' '}
                {t(comparison)}
              </small>
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}
function Variance({
  data,
  openVisual,
}: {
  data: DashboardData;
  openVisual: (r: VisualRequest) => void;
}) {
  const { t, money, num } = useLocale(),
    [account, setAccount] = useState('all'),
    [chart, setChart] = useState<ChartKind>('bar');
  const comparison = data.filters.comparison || 'Budget';
  const rows = data.variance.filter(
    (v) =>
      v.account !== 'EBITDA' && (account === 'all' || account === v.account)
  );
  return (
    <>
      <div className="metrics three">
        <Metric label={t('ebitda')} value={data.actual.ebitda} />
        <Metric
          label={`${t(comparison)} ${t('EBITDA')}`}
          value={data.budget.ebitda}
        />
        <Metric
          label={t('delta')}
          value={data.actual.ebitda - data.budget.ebitda}
          onClick={() =>
            openVisual({
              metric: 'variance',
              dimension: 'account',
              filters: data.filters,
            })
          }
        />
      </div>
      <Panel
        title={t('varianceDrivers')}
        subtitle={t('varianceNote')}
        actions={
          <div className="chart-controls">
            <Select
              label={t('account')}
              value={account}
              onChange={setAccount}
              options={[
                { value: 'all', label: t('allAccounts') },
                ...data.variance
                  .filter((v) => v.account !== 'EBITDA')
                  .map((v) => ({ value: v.account, label: t(v.account) })),
              ]}
            />
            <ChartSelect value={chart} onChange={setChart} allowPie={false} />
          </div>
        }
      >
        <Chart
          rows={rows.map((v) => ({ name: v.account, value: v.favourable }))}
          kind={chart}
          version="contribution"
          showComparison={false}
          onPick={setAccount}
        />
      </Panel>
      <Panel title={t('details')}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('account')}</th>
                <th>{t('Actual')}</th>
                <th>{t(comparison)}</th>
                <th>{t('delta')}</th>
                <th>{t('contribution')}</th>
              </tr>
            </thead>
            <tbody>
              {data.variance
                .filter(
                  (v) =>
                    account === 'all' ||
                    account === v.account ||
                    v.account === 'EBITDA'
                )
                .map((v) => (
                  <tr key={v.account}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          setAccount(account === v.account ? 'all' : v.account)
                        }
                      >
                        {t(v.account)}
                      </button>
                    </td>
                    <td>{money(v.actual, false)}</td>
                    <td>{money(v.budget, false)}</td>
                    <td>{money(v.delta, false)}</td>
                    <td className={v.favourable < 0 ? 'adverse' : 'favourable'}>
                      {money(v.favourable, false)}{' '}
                      {v.percent !== null && (
                        <small>({num(v.percent, 1)}%)</small>
                      )}
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
function Workforce({
  data,
  setFilters,
}: {
  data: DashboardData;
  setFilters: (f: Filters) => void;
}) {
  const { t, money, num } = useLocale(),
    [metric, setMetric] = useState('cost'),
    [chart, setChart] = useState<ChartKind>('bar');
  const rows = data.departments.filter(
      (d) => d.fte || d.cost || d.budgetFte || d.budgetCost
    ),
    comparison = data.filters.comparison || 'Budget';
  return (
    <>
      <div className="metrics three">
        <Metric label={t('fte')} value={data.actual.fte} unit="FTE" />
        <Metric label={t('personnel')} value={data.actual.personnel} />
        <Metric
          label={t('costPerFte')}
          value={data.actual.fte ? data.actual.personnel / data.actual.fte : 0}
        />
      </div>
      <Panel
        title={t(metric === 'cost' ? 'workforceCost' : 'workforceCapacity')}
        subtitle={t('departmentSub')}
        actions={
          <div className="chart-controls">
            <Select
              label={t('metric')}
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'cost', label: t('personnel') },
                { value: 'fte', label: t('fte') },
              ]}
            />
            <ChartSelect value={chart} onChange={setChart} />
          </div>
        }
      >
        <Chart
          rows={rows.map((d) => ({
            name: d.name,
            value: metric === 'cost' ? d.cost : d.fte,
            baseline: metric === 'cost' ? d.budgetCost : d.budgetFte,
          }))}
          kind={chart}
          comparison={comparison}
          unit={metric === 'cost' ? 'EUR' : 'FTE'}
          onPick={(name) => setFilters({ ...data.filters, department: name })}
        />
        <p className="note">{t('fteNote')}</p>
      </Panel>
      <Panel
        title={t('departmentView')}
        actions={
          <button
            className="text-button"
            onClick={() =>
              setFilters({ ...data.filters, department: 'All departments' })
            }
          >
            {t('resetView')}
          </button>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('department')}</th>
                <th>{t('fte')}</th>
                <th>{t(comparison)} FTE</th>
                <th>{t('personnel')}</th>
                <th>{t('delta')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.name}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        setFilters({ ...data.filters, department: d.name })
                      }
                    >
                      {t(d.name)}
                    </button>
                  </td>
                  <td>{num(d.fte, 1)}</td>
                  <td>{num(d.budgetFte, 1)}</td>
                  <td>{money(d.cost, false)}</td>
                  <td
                    className={d.cost > d.budgetCost ? 'adverse' : 'favourable'}
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
    revenuePercent: number;
    salaryPercent: number;
    additionalFte: number;
    filters: Filters;
  };
  results: { ebitda: number };
  created_at: string;
};
function ScenarioLab({ data }: { data: DashboardData }) {
  const { t, money, num } = useLocale(),
    [revenue, setRevenue] = useState(0),
    [salary, setSalary] = useState(0),
    [fte, setFte] = useState(0),
    [name, setName] = useState(''),
    [saved, setSaved] = useState<SavedScenario[]>([]),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [chart, setChart] = useState<ChartKind>('bar');
  const safeFte = Math.max(fte, -Math.floor(data.actual.fte));
  const projected = scenario(data.actual, revenue, salary, safeFte);
  const load = useCallback(
    () =>
      fetch('/api/scenarios')
        .then(readJson)
        .then((r) => setSaved(r.scenarios))
        .catch(() => {}),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  async function save() {
    setBusy(true);
    setStatus('');
    try {
      await readJson(
        await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            filters: data.filters,
            revenuePercent: revenue,
            salaryPercent: salary,
            additionalFte: safeFte,
          }),
        })
      );
      setStatus('saved');
      load();
    } catch {
      setStatus('saveFailed');
    } finally {
      setBusy(false);
    }
  }
  const sliders = [
    {
      id: 'revenueGrowth',
      value: revenue,
      set: setRevenue,
      min: -30,
      max: 30,
      step: 0.5,
      unit: '%',
    },
    {
      id: 'salaryChange',
      value: salary,
      set: setSalary,
      min: -10,
      max: 20,
      step: 0.5,
      unit: '%',
    },
    {
      id: 'additionalFte',
      value: safeFte,
      set: setFte,
      min: Math.max(-100, -Math.floor(data.actual.fte)),
      max: 100,
      step: 1,
      unit: 'FTE',
    },
  ];
  return (
    <>
      <div className="two-columns">
        <Panel title={t('assumptions')} subtitle={t('scenarioNote')}>
          <div className="scenario-controls">
            {sliders.map((slider) => (
              <label key={slider.id} className="slider-field">
                <span>
                  {t(slider.id)}
                  <strong>
                    {slider.value > 0 ? '+' : ''}
                    {num(slider.value, slider.step === 1 ? 0 : 1)} {slider.unit}
                  </strong>
                </span>
                <input
                  type="range"
                  aria-label={t(slider.id)}
                  value={slider.value}
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  onChange={(e) => slider.set(Number(e.target.value))}
                />
                <small>
                  {slider.min} {slider.unit}
                  <span>
                    {slider.max} {slider.unit}
                  </span>
                </small>
              </label>
            ))}
            <label className="field">
              <span>{t('scenarioName')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !name.trim() || !data.status.databaseConnected}
              onClick={save}
            >
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <Download size={17} />
              )}{' '}
              {t('saveScenario')}
            </button>
            {status && <p role="status">{t(status)}</p>}
          </div>
        </Panel>
        <Panel
          title={t('simulation')}
          actions={
            <ChartSelect value={chart} onChange={setChart} allowPie={false} />
          }
        >
          <div className="scenario-result">
            <span>{t('EBITDA')}</span>
            <strong>{money(projected.ebitda)}</strong>
            <span className={projected.delta < 0 ? 'adverse' : 'favourable'}>
              {money(projected.delta)} {t('delta')}
            </span>
          </div>
          <Chart
            rows={[
              {
                name: 'Revenue',
                value: projected.revenue,
                baseline: data.actual.revenue,
              },
              {
                name: 'Personnel',
                value: projected.personnel,
                baseline: data.actual.personnel,
              },
              {
                name: 'EBITDA',
                value: projected.ebitda,
                baseline: data.actual.ebitda,
              },
            ]}
            kind={chart}
            version="simulation"
            comparison="Actual"
            height={240}
          />
        </Panel>
      </div>
      <Panel title={t('savedScenarios')} subtitle={t('savedPrivate')}>
        {saved.length ? (
          <div className="saved-grid">
            {saved.map((s) => (
              <div className="saved-card" key={s.id}>
                <strong>{s.name}</strong>
                <span>{money(s.results.ebitda)} EBITDA</span>
                <small>
                  {s.assumptions.filters.year} ·{' '}
                  {t(s.assumptions.filters.entity)} ·{' '}
                  {num(s.assumptions.revenuePercent, 1)}% /{' '}
                  {num(s.assumptions.salaryPercent, 1)}% /{' '}
                  {num(s.assumptions.additionalFte)} FTE
                </small>
                <button
                  className="text-button"
                  onClick={() => {
                    setRevenue(s.assumptions.revenuePercent);
                    setSalary(s.assumptions.salaryPercent);
                    setFte(s.assumptions.additionalFte);
                    setName(s.name);
                  }}
                >
                  {t('apply')} <ArrowUpRight size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">{t('emptyScenarios')}</p>
        )}
      </Panel>
    </>
  );
}
function Explorer({ filters }: { filters: Filters }) {
  const { t, num } = useLocale(),
    [version, setVersion] = useState('Actual'),
    [account, setAccount] = useState('All accounts'),
    [page, setPage] = useState(1),
    [result, setResult] = useState<{
      facts: Fact[];
      total: number;
      pages: number;
    } | null>(null),
    [error, setError] = useState(false);
  const q = `${filterQuery(filters)}&version=${encodeURIComponent(version)}&account=${encodeURIComponent(account)}&page=${page}`;
  useEffect(() => {
    setPage(1);
  }, [filterQuery(filters), version, account]);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setResult(null);
    fetch(`/api/explorer?${q}`, { signal: controller.signal })
      .then(readJson)
      .then(setResult)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, [q]);
  return (
    <Panel
      title={t('cubeSlice')}
      subtitle={result ? `${num(result.total)} ${t('records')}` : t('loading')}
      actions={
        <div className="chart-controls">
          <Select
            label={t('version')}
            value={version}
            onChange={setVersion}
            options={VERSIONS.map((value) => ({ value, label: t(value) }))}
          />
          <Select
            label={t('account')}
            value={account}
            onChange={setAccount}
            options={['All accounts', ...ACCOUNTS].map((value) => ({
              value,
              label: value === 'All accounts' ? t('allAccounts') : t(value),
            }))}
          />
        </div>
      }
    >
      {error && (
        <p role="alert" className="inline-error">
          {t('chatError')}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                'period',
                'entity',
                'department',
                'product',
                'account',
                'version',
                'amount',
                'unit',
              ].map((key) => (
                <th key={key}>{t(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result?.facts.map((f) => (
              <tr key={f.id}>
                <td>{f.period}</td>
                <td>{t(f.entity)}</td>
                <td>{t(f.department)}</td>
                <td>{t(f.product)}</td>
                <td>{t(f.account)}</td>
                <td>{t(f.version)}</td>
                <td>{num(f.amount, f.unit === 'count' ? 0 : 2)}</td>
                <td>{t(f.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result && !result.facts.length && !error && (
        <p className="empty">{t('noData')}</p>
      )}
      <div className="pagination">
        <span>
          {t('page')} {page} {t('of')} {Math.max(1, result?.pages || 0)}
        </span>
        <button
          className="icon-button"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          aria-label={t('previous')}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="icon-button"
          disabled={page >= (result?.pages || 1)}
          onClick={() => setPage((p) => p + 1)}
          aria-label={t('next')}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </Panel>
  );
}

type Answer = {
  question: string;
  answer: string;
  mode: string;
  notice: string;
  visualization: VisualRequest;
};
function Copilot({
  data,
  openVisual,
}: {
  data: DashboardData;
  openVisual: (r: VisualRequest) => void;
}) {
  const { t, language, money, num, month } = useLocale(),
    [provider, setProvider] = useState('built-in'),
    [config, setConfig] = useState<{
      openrouter: { configured: boolean };
      ollama: { configured: boolean };
    } | null>(null),
    [prompt, setPrompt] = useState(''),
    [answers, setAnswers] = useState<Answer[]>([]),
    [format, setFormat] = useState('text'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/copilot')
      .then(readJson)
      .then((c) => {
        setConfig(c);
        if (c.openrouter.configured) setProvider('openrouter');
        else if (c.ollama.configured) setProvider('ollama');
      })
      .catch(() => {});
  }, []);
  async function ask(question = prompt) {
    if (question.trim().length < 3 || busy) return;
    setBusy(true);
    setError('');
    setPrompt('');
    try {
      const history = answers.slice(-2).flatMap((a) => [
        { role: 'user', content: a.question },
        { role: 'assistant', content: a.answer.slice(0, 6000) },
      ]);
      const response = await fetch(
        `/api/copilot?${filterQuery(data.filters)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, provider, language, history }),
        }
      );
      if (response.status === 429) {
        setError('quota');
        return;
      }
      const r = await readJson(response);
      setAnswers((a) => [...a, { ...r, question }]);
      if (format === 'visual') openVisual(r.visualization);
    } catch {
      setError('chatError');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="copilot-layout">
      <div className="chat-panel">
        <div className="chat-toolbar">
          <span>
            <Sparkles size={20} />
            {t('copilot')}
          </span>
          <div className="chart-controls">
            <Select
              label={t('provider')}
              value={provider}
              onChange={setProvider}
              options={[
                { value: 'built-in', label: t('calculated') },
                {
                  value: 'openrouter',
                  label: `OpenRouter${config && !config.openrouter.configured ? ` · ${t('keyPending')}` : ''}`,
                },
                {
                  value: 'ollama',
                  label: `Ollama Cloud${config && !config.ollama.configured ? ` · ${t('keyPending')}` : ''}`,
                },
              ]}
            />
            <Select
              label={t('answerMode')}
              value={format}
              onChange={setFormat}
              options={[
                { value: 'text', label: t('textOnly') },
                { value: 'visual', label: t('withVisual') },
              ]}
            />
          </div>
        </div>
        <div className="chat-messages">
          {!answers.length && (
            <div className="chat-welcome">
              <div className="copilot-orb">
                <Sparkles size={34} />
              </div>
              <h2>{t('welcome')}</h2>
              <p>{t('welcomeSub')}</p>
              <div className="suggestions">
                {['askGap', 'askWorkforce', 'askForecast'].map((key) => (
                  <button key={key} disabled={busy} onClick={() => ask(t(key))}>
                    {t(key)}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {answers.map((answer, i) => (
            <article className="conversation" key={i}>
              <div className="user-question">{answer.question}</div>
              <div className="answer-label">
                <Sparkles size={17} />
                {t(
                  answer.mode === 'ai' ? 'cloudResponse' : 'calculatedResponse'
                )}
              </div>
              <div className="answer-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                  {answer.answer}
                </ReactMarkdown>
              </div>
              <div className="answer-footer">
                <small>
                  {answer.mode === 'ai'
                    ? answer.notice
                    : t(
                        provider === 'built-in'
                          ? 'calculatedNotice'
                          : 'cloudFallback'
                      )}
                </small>
                <button
                  className="secondary"
                  onClick={() => openVisual(answer.visualization)}
                >
                  <BarChart3 size={16} />
                  {t('openVisual')}
                </button>
              </div>
            </article>
          ))}
          {busy && (
            <p className="thinking">
              <Loader2 className="spin" size={17} />
              {t('thinking')}
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {t(error)}
            </p>
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
            aria-label={t('question')}
            placeholder={t('askPlaceholder')}
            value={prompt}
            maxLength={1200}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            className="primary icon-button"
            aria-label={t('send')}
            disabled={busy || prompt.trim().length < 3}
          >
            <Send size={20} />
          </button>
        </form>
        <p className="chat-disclosure">{t('copilotNote')}</p>
      </div>
      <Panel
        title={t('context')}
        subtitle={t('contextSub')}
        className="context-panel"
      >
        <dl>
          {[
            ['entity', t(data.filters.entity)],
            ['department', t(data.filters.department || 'All departments')],
            [
              'period',
              `${month(data.filters.fromMonth || 1)}–${month(data.filters.toMonth)} ${data.filters.year}`,
            ],
            ['Revenue', money(data.actual.revenue)],
            ['EBITDA', money(data.actual.ebitda)],
            ['records', num(data.rowCount)],
            ['source', t(data.status.mode === 'live' ? 'live' : 'synthetic')],
          ].map(([key, value]) => (
            <div key={key}>
              <dt>{t(key)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <button
          className="secondary"
          onClick={() =>
            openVisual({
              metric: 'revenue',
              dimension: 'period',
              filters: data.filters,
            })
          }
        >
          <BarChart3 size={17} />
          {t('openVisual')}
        </button>
      </Panel>
    </div>
  );
}
function Guide({ navigate }: { navigate: (view: View) => void }) {
  const { t } = useLocale();
  const steps = [
    ['guideScope', 'overview'],
    ['guideAnalyze', 'variance'],
    ['guideSimulate', 'scenarios'],
    ['guideAi', 'copilot'],
    ['guideConnect', 'connections'],
    ['guideExport', 'explorer'],
  ] as const;
  return (
    <>
      <div className="guide-grid">
        {steps.map(([key, view]) => (
          <Panel key={key} title={t(key)}>
            <p>{t(`${key}Text`)}</p>
            <button className="text-button" onClick={() => navigate(view)}>
              {t(view)} <ArrowUpRight size={16} />
            </button>
          </Panel>
        ))}
      </div>
      <Panel title={t('glossary')}>
        <div className="glossary">
          {[
            ['EBITDA', 'ebitdaDefinition'],
            ['FTE', 'fteDefinition'],
            ['Outlook', 'outlookDefinition'],
            ['favourable', 'favourableDefinition'],
          ].map(([term, definition]) => (
            <div key={term}>
              <strong>{t(term)}</strong>
              <p>{t(definition)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function Workspace({
  language,
  setLanguage,
  theme,
  setTheme,
  palette,
  setPalette,
}: {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: ColorMode;
  setTheme: (t: ColorMode) => void;
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
}) {
  const { t, num } = useLocale(),
    [view, setView] = useState<View>('overview'),
    [filters, setFilters] = useState<Filters>(defaults),
    [data, setData] = useState<DashboardData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [reload, setReload] = useState(0),
    [menu, setMenu] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [visual, setVisual] = useState<VisualRequest | null>(null);
  const q = filterQuery(filters);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/dashboard?${q}`, { signal: controller.signal })
      .then(readJson)
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [q, reload]);
  const navigate = (next: View) => {
    setView(next);
    setMenu(false);
    setExportOpen(false);
  };
  const refresh = () => setReload((n) => n + 1);
  async function download(format: 'csv' | 'xlsx', all = false) {
    setExportOpen(false);
    const response = await fetch(
      `/api/export?${q}&format=${format}${all ? '&scope=all' : ''}`
    );
    if (!response.ok) {
      setError(true);
      return;
    }
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download =
      response.headers
        .get('content-disposition')
        ?.match(/filename="([^"]+)"/)?.[1] || `talentplan.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label={t('close')}
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <a className="brand" href="/">
          <span className="brand-mark">t.</span>
          <span>
            <strong>talentplan</strong>
            <small>{t('financePlanning')}</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="status-dot" />
          {t('groupFinance')}
          <b>POC</b>
        </div>
        <span className="nav-label">{t('workspace')}</span>
        <nav>
          {nav.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{t(id)}</span>
              {id === 'copilot' && <span className="ai-tag">AI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            {t('financePlanning')}
            <br />
            <strong>TalentPlan</strong>
          </p>
          <div className="profile">
            <span>SP</span>
            <div>
              <strong>Soham Patra</strong>
              <small>{t('owner')}</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(true)}
              aria-label={t('workspace')}
            >
              <Menu />
            </button>
            <span>{t('workspace')}</span>
            <ChevronRight size={15} />
            <strong>{t(view)}</strong>
          </div>
          <div className="top-actions">
            <span
              className={`tag source-tag ${data?.status.mode === 'live' ? 'good' : ''}`}
            >
              {t(data?.status.mode === 'live' ? 'live' : 'synthetic')}
            </span>
            <div className="language-toggle" aria-label={t('language')}>
              <button
                aria-pressed={language === 'en'}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
              <button
                aria-pressed={language === 'de'}
                onClick={() => setLanguage('de')}
              >
                DE
              </button>
            </div>
            <button
              className="icon-button"
              aria-label={t('appearance')}
              title={t('appearance')}
              onClick={() => navigate('connections')}
            >
              <Palette size={21} />
            </button>
            <button
              className="icon-button theme-toggle"
              aria-label={t(theme === 'light' ? 'dark' : 'light')}
              title={t(theme === 'light' ? 'dark' : 'light')}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={21} /> : <Sun size={21} />}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {t('groupFinance')} / {t('planningAnalytics')}
              </span>
              <h1>{t(`${view}Title`)}</h1>
              <p>{t(`${view}Sub`)}</p>
            </div>
            <div className="page-actions">
              <button
                className="icon-button"
                disabled={loading}
                onClick={refresh}
                aria-label={t('refresh')}
              >
                <RefreshCw size={20} className={loading ? 'spin' : ''} />
              </button>
              <div className="export-wrap">
                <button
                  className="primary"
                  onClick={() => setExportOpen((o) => !o)}
                  disabled={!data}
                  aria-expanded={exportOpen}
                >
                  <Download size={18} />
                  {t('export')}
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    {[
                      ['xlsx', false, 'selectedExcel'],
                      ['csv', false, 'selectedCsv'],
                      ['xlsx', true, 'allExcel'],
                      ['csv', true, 'allCsv'],
                    ].map(([format, all, label]) => (
                      <button
                        key={String(label)}
                        onClick={() =>
                          download(format as 'csv' | 'xlsx', all as boolean)
                        }
                      >
                        {t(label as string)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {view === 'connections' && (
            <AppearanceSettings
              mode={theme}
              palette={palette}
              setMode={setTheme}
              setPalette={setPalette}
            />
          )}
          <div className="filter-panel">
            <Scope filters={filters} onChange={setFilters} />
            <button
              className="text-button reset-filters"
              onClick={() => setFilters({ ...defaults, year: filters.year })}
            >
              {t('reset')}
            </button>
          </div>
          {data && (
            <div
              className={`source-banner ${data.status.mode === 'live' ? 'source-live' : ''}`}
            >
              <div>
                {data.status.mode === 'live' ? (
                  <CheckCircle2 size={21} />
                ) : (
                  <AlertTriangle size={21} />
                )}
                <strong>
                  {t(
                    data.status.tm1 === 'connected'
                      ? 'tm1Connected'
                      : data.status.tm1 === 'disconnected'
                        ? 'tm1Disconnected'
                        : data.status.tm1 === 'unreachable'
                          ? 'tm1Unreachable'
                          : 'tm1Error'
                  )}
                </strong>
                <span>
                  {t(
                    data.status.source === 'memory'
                      ? 'memoryNote'
                      : data.status.mode === 'live'
                        ? 'liveNote'
                        : 'sourceNote'
                  )}
                </span>
              </div>
              <button
                className="text-button"
                onClick={() => navigate('connections')}
              >
                {t('connectionDetails')}
                <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          {data &&
            (data.coverage.partialActualPeriods.length > 0 ||
              data.coverage.missingOutlookPeriods.length > 0) && (
              <div className="coverage-banner">
                <strong>{t('coverage')}</strong>
                <p>
                  {data.coverage.partialActualPeriods.length > 0 &&
                    `${t('partial')}: ${data.coverage.partialActualPeriods.join(', ')}. `}
                  {data.coverage.missingOutlookPeriods.length > 0 &&
                    `${t('missing')}: ${data.coverage.missingOutlookPeriods.join(', ')}. `}
                  {t('coverageNote')}
                </p>
              </div>
            )}
          {error && (
            <div className="inline-error" role="alert">
              {t('chatError')}{' '}
              <button className="text-button" onClick={refresh}>
                {t('retry')}
              </button>
            </div>
          )}
          {!data ? (
            <div className="loading-state">
              <Loader2 className="spin" size={28} />
              <h2>{t('loading')}</h2>
              <p>{t('loadingSub')}</p>
            </div>
          ) : (
            <div className={`view-content ${loading ? 'refreshing' : ''}`}>
              {view === 'overview' && (
                <Overview
                  data={data}
                  setFilters={setFilters}
                  openVisual={setVisual}
                />
              )}{' '}
              {view === 'variance' && (
                <Variance data={data} openVisual={setVisual} />
              )}{' '}
              {view === 'workforce' && (
                <Workforce data={data} setFilters={setFilters} />
              )}{' '}
              {view === 'scenarios' && <ScenarioLab data={data} />}{' '}
              {view === 'explorer' && <Explorer filters={data.filters} />}{' '}
              {view === 'copilot' && (
                <Copilot data={data} openVisual={setVisual} />
              )}{' '}
              {view === 'connections' && (
                <Connections data={data} onRefresh={refresh} />
              )}{' '}
              {view === 'guide' && <Guide navigate={navigate} />}
            </div>
          )}
          <footer>
            <span>TalentPlan · {t('poc')}</span>
            <span>
              {data
                ? `${num(data.rowCount)} ${t('records')} · ${t(data.status.mode === 'live' ? 'live' : 'synthetic')}`
                : '…'}
            </span>
          </footer>
        </div>
      </main>
      {visual && (
        <VisualWorkspace initial={visual} onClose={() => setVisual(null)} />
      )}
    </div>
  );
}
export default function Dashboard() {
  const [language, setLanguage] = useState<Language>('en'),
    [theme, setTheme] = useState<ColorMode>('light'),
    [palette, setPalette] = useState<ThemePalette>('sage'),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const lang = localStorage.getItem('talentplan-language');
      if (lang === 'de' || lang === 'en') setLanguage(lang);
      const saved = JSON.parse(
        localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'null'
      );
      if (saved?.mode === 'dark' || saved?.mode === 'light')
        setTheme(saved.mode);
      if (saved?.palette === 'sage' || saved?.palette === 'glass')
        setPalette(saved.palette);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
    try {
      localStorage.setItem('talentplan-language', language);
      localStorage.setItem(
        APPEARANCE_STORAGE_KEY,
        JSON.stringify({ mode: theme, palette })
      );
    } catch {}
  }, [language, theme, palette, ready]);
  return (
    <LocaleContext.Provider value={language}>
      <Workspace
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        palette={palette}
        setPalette={setPalette}
      />
    </LocaleContext.Provider>
  );
}
