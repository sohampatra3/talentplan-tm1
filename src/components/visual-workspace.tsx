'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import type { Filters, SourceStatus, DashboardData } from '@/lib/types';
import { csvCell } from '@/lib/export';
import type { AnalysisOptions } from '@/lib/analysis';
import { useLocale } from './locale';
import {
  Chart,
  ChartSelect,
  Panel,
  Scope,
  Select,
  filterQuery,
  readJson,
  type ChartKind,
} from './ui';
type AnalysisData = {
  rows: { name: string; value: number; baseline: number; delta: number }[];
  unit: string;
  total: number;
  status: SourceStatus;
  filters: Filters;
  options: AnalysisOptions;
  coverage?: DashboardData['coverage'];
};
export function VisualWorkspace({
  initial,
  onClose,
}: {
  initial: Partial<AnalysisOptions> & { filters: Filters };
  onClose: () => void;
}) {
  const { t, money, num, month } = useLocale(),
    dialog = useRef<HTMLDialogElement>(null);
  const [filters, setFilters] = useState(initial.filters),
    [options, setOptions] = useState<AnalysisOptions>({
      metric: initial.metric || 'revenue',
      dimension: initial.dimension || 'period',
      version: initial.version || 'Actual',
    }),
    [kind, setKind] = useState<ChartKind>(
      initial.dimension === 'product'
        ? 'pie'
        : initial.metric === 'variance'
          ? 'bar'
          : 'area'
    ),
    [data, setData] = useState<AnalysisData | null>(null),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const q = `${filterQuery(filters)}&${new URLSearchParams(options)}`;
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError('');
    fetch(`/api/analysis?${q}`, { signal: controller.signal })
      .then(readJson)
      .then((result) => {
        setData(result);
        setSelected('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(t('chatError'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [q, t]);
  const setMetric = (metric: AnalysisOptions['metric']) => {
    setOptions((o) => ({
      ...o,
      metric,
      dimension:
        metric === 'variance'
          ? 'account'
          : o.dimension === 'account'
            ? 'period'
            : o.dimension === 'product' && metric !== 'revenue'
              ? 'department'
              : o.dimension,
    }));
    if (metric === 'variance') setKind('bar');
  };
  const dimensions =
    options.metric === 'variance'
      ? ['account']
      : [
          'period',
          'entity',
          'department',
          ...(options.metric === 'revenue' ? ['product'] : []),
        ];
  const format = (value: number) =>
    data?.unit === 'FTE' ? num(value, 1) : money(value, false);
  const label = (name: string) =>
    /^20\d{2}-\d{2}$/.test(name) ? month(Number(name.slice(5))) : t(name);
  function download() {
    if (!data) return;
    const rows = [
      ['Group', 'Value', 'Comparison', 'Variance', 'Unit', 'Source'],
      ...data.rows.map((row) => [
        row.name,
        row.value,
        row.baseline,
        row.delta,
        data.unit,
        data.status.source,
      ]),
    ];
    const csv =
      '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `talentplan-analysis-${options.metric}-${options.dimension}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <dialog ref={dialog} className="visual-dialog" onCancel={onClose}>
      <div className="visual-header">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={15} /> TALENTPLAN / {t('visualize')}
          </span>
          <h1>{t('visualTitle')}</h1>
          <p>{t('visualSub')}</p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t('close')}
        >
          <X />
        </button>
      </div>
      <div className="visual-body">
        <Scope
          filters={filters}
          onChange={setFilters}
          compact
          annual={options.version === 'Outlook'}
        />
        <div className="builder-controls">
          <Select
            label={t('metric')}
            value={options.metric}
            onChange={(v) => setMetric(v as AnalysisOptions['metric'])}
            options={['revenue', 'ebitda', 'personnel', 'fte', 'variance'].map(
              (value) => ({
                value,
                label: t(value === 'variance' ? 'varianceMetric' : value),
              })
            )}
          />
          <Select
            label={t('dimension')}
            value={options.dimension}
            onChange={(v) =>
              setOptions((o) => ({
                ...o,
                dimension: v as AnalysisOptions['dimension'],
              }))
            }
            options={dimensions.map((value) => ({ value, label: t(value) }))}
          />
          {options.metric !== 'variance' && (
            <Select
              label={t('version')}
              value={options.version}
              onChange={(v) =>
                setOptions((o) => ({
                  ...o,
                  version: v as AnalysisOptions['version'],
                }))
              }
              options={['Actual', 'Budget', 'Forecast', 'Outlook'].map(
                (value) => ({
                  value,
                  label: t(value),
                })
              )}
            />
          )}
          <ChartSelect value={kind} onChange={setKind} />
        </div>
        {options.version === 'Outlook' && (
          <p className="note">{t('annualNote')}</p>
        )}
        {data?.coverage?.missingOutlookPeriods.length ? (
          <div className="coverage-banner">
            <strong>{t('coverage')}</strong>
            <p>
              {t('missing')}: {data.coverage.missingOutlookPeriods.join(', ')}.{' '}
              {t('coverageNote')}
            </p>
          </div>
        ) : null}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {data && (
          <>
            <div className="analysis-strip">
              <div>
                <span>{t('total')}</span>
                <strong>{format(data.total)}</strong>
              </div>
              <span className="tag">
                {t(data.status.mode === 'live' ? 'live' : 'synthetic')} ·{' '}
                {data.status.source.toUpperCase()}
              </span>
              <button className="secondary" onClick={download}>
                <Download size={16} />
                {t('downloadChart')}
              </button>
            </div>
            <Panel
              title={t(
                options.metric === 'variance'
                  ? 'varianceMetric'
                  : options.metric
              )}
              subtitle={loading ? t('loading') : t('chartClick')}
              actions={
                loading ? <Loader2 className="spin" size={18} /> : undefined
              }
            >
              <Chart
                rows={data.rows}
                kind={kind}
                unit={data.unit}
                comparison={filters.comparison}
                version={
                  options.metric === 'variance'
                    ? 'contribution'
                    : options.version
                }
                showComparison={options.metric !== 'variance'}
                onPick={setSelected}
                height={360}
              />
              {options.metric === 'fte' && (
                <p className="note">{t('fteNote')}</p>
              )}
              {options.dimension === 'product' && (
                <p className="note">{t('productNote')}</p>
              )}
            </Panel>
            <Panel title={t('chartData')}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t(options.dimension)}</th>
                      <th>{t('value')}</th>
                      {options.metric !== 'variance' && (
                        <>
                          <th>{t(filters.comparison || 'Budget')}</th>
                          <th>{t('delta')}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr
                        key={row.name}
                        className={selected === row.name ? 'selected-row' : ''}
                      >
                        <td>
                          <button
                            className="text-button"
                            onClick={() =>
                              setSelected(selected === row.name ? '' : row.name)
                            }
                          >
                            {label(row.name)}
                          </button>
                        </td>
                        <td>{format(row.value)}</td>
                        {options.metric !== 'variance' && (
                          <>
                            <td>{format(row.baseline)}</td>
                            <td>{format(row.delta)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
        {!data && loading && <p className="empty">{t('loading')}</p>}
      </div>
    </dialog>
  );
}
