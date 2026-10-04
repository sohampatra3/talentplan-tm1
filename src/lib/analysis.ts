import { z } from 'zod';
import { buildDashboard, selectFacts, summarize } from './finance';
import type { Dataset, Filters, Version } from './types';
export const analysisSchema = z.object({
  metric: z
    .enum(['revenue', 'ebitda', 'personnel', 'fte', 'variance'])
    .default('revenue'),
  dimension: z
    .enum(['period', 'entity', 'department', 'product', 'account'])
    .default('period'),
  version: z
    .enum(['Actual', 'Budget', 'Forecast', 'Outlook'])
    .default('Actual'),
});
export type AnalysisOptions = z.infer<typeof analysisSchema>;
export function visualIntent(question: string): Partial<AnalysisOptions> {
  if (
    /variance|gap|below|behind|abweichung|lücke|unter.*budget/i.test(question)
  )
    return { metric: 'variance', dimension: 'account' };
  if (
    /fte|headcount|workforce|salary|personnel|hiring|personal|mitarbeiter|gehalt/i.test(
      question
    )
  )
    return { metric: 'personnel', dimension: 'department' };
  if (
    /forecast|outlook|full.year|prognose|jahresausblick|ganzjahr/i.test(
      question
    )
  )
    return {
      metric: /ebitda/i.test(question) ? 'ebitda' : 'revenue',
      dimension: 'period',
      version: 'Outlook',
    };
  if (/mix|product|produkt/i.test(question))
    return { metric: 'revenue', dimension: 'product' };
  if (/market|entity|country|land|markt/i.test(question))
    return { metric: 'revenue', dimension: 'entity' };
  return { metric: 'revenue', dimension: 'period' };
}
export function buildAnalysis(
  dataset: Dataset,
  filters: Filters,
  options: AnalysisOptions
) {
  if (options.dimension === 'product' && options.metric !== 'revenue')
    throw new Error(
      'Product analysis supports revenue. Shared costs require an allocation model.'
    );
  if (options.metric === 'variance') {
    const dashboard = buildDashboard(dataset, filters);
    return {
      rows: dashboard.variance
        .filter((v) => v.account !== 'EBITDA')
        .map((v) => ({
          name: v.account,
          value: v.favourable,
          baseline: 0,
          delta: v.favourable,
        })),
      unit: 'EUR',
      status: dataset.status,
      filters,
      options: { ...options, dimension: 'account' },
      total: dashboard.actual.ebitda - dashboard.budget.ebitda,
    };
  }
  const facts = selectFacts(
    dataset.facts,
    options.version === 'Outlook'
      ? { ...filters, fromMonth: 1, toMonth: 12 }
      : filters
  );
  const coordinate = (f: (typeof facts)[number]) =>
    JSON.stringify([f.period, f.entity, f.department, f.product, f.account]);
  const actualCoordinates = new Set(
    facts.filter((f) => f.version === 'Actual').map(coordinate)
  );
  const selected =
    options.version === 'Outlook'
      ? facts
          .filter(
            (f) =>
              f.version === 'Actual' ||
              (f.version === 'Forecast' &&
                !actualCoordinates.has(coordinate(f)))
          )
          .map((f) => ({ ...f, version: 'Forecast' as const }))
      : facts.filter((f) => f.version === options.version);
  const selectedVersion =
    options.version === 'Outlook' ? 'Forecast' : options.version;
  const groups = [...new Set(facts.map((f) => f[options.dimension]))].sort();
  const comparison: Version = filters.comparison || 'Budget';
  const rows = groups.map((name) => {
    const group = facts.filter((f) => f[options.dimension] === name);
    const a = summarize(
        selected.filter((f) => f[options.dimension] === name),
        selectedVersion
      ),
      b = summarize(group, comparison);
    return {
      name,
      value: a[options.metric as 'revenue' | 'ebitda' | 'personnel' | 'fte'],
      baseline: b[options.metric as 'revenue' | 'ebitda' | 'personnel' | 'fte'],
      delta:
        a[options.metric as 'revenue' | 'ebitda' | 'personnel' | 'fte'] -
        b[options.metric as 'revenue' | 'ebitda' | 'personnel' | 'fte'],
    };
  });
  // Across periods FTE is an average. Entity/department groups are additive.
  const total = summarize(selected, selectedVersion)[
    options.metric as 'revenue' | 'ebitda' | 'personnel' | 'fte'
  ];
  return {
    rows,
    unit: options.metric === 'fte' ? 'FTE' : 'EUR',
    status: dataset.status,
    filters,
    options,
    coverage:
      options.version === 'Outlook'
        ? buildDashboard(dataset, filters).coverage
        : undefined,
    total,
  };
}
