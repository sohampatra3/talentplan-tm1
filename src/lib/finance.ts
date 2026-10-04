import {
  DEPARTMENTS,
  ENTITIES,
  type Fact,
  type Filters,
  type Summary,
  type Dataset,
  type DashboardData,
  type Version,
} from './types';
export function selectFacts(facts: Fact[], filters: Filters): Fact[] {
  return facts.filter(
    (f) =>
      f.period.startsWith(`${filters.year}-`) &&
      Number(f.period.slice(5)) <= filters.toMonth &&
      (filters.entity === 'All entities' || f.entity === filters.entity)
  );
}
export function summarize(facts: Fact[], version: Version): Summary {
  const selected = facts.filter((f) => f.version === version);
  const sum = (account: string) =>
    selected
      .filter((f) => f.account === account)
      .reduce((s, f) => s + f.amount, 0);
  const periods = new Set(selected.map((f) => f.period)).size;
  const revenue = sum('Revenue'),
    personnel = sum('Personnel'),
    marketing = sum('Marketing'),
    technology = sum('Technology'),
    admin = sum('General & Administrative');
  const opex = personnel + marketing + technology + admin,
    ebitda = revenue - opex;
  return {
    revenue,
    personnel,
    marketing,
    technology,
    admin,
    opex,
    ebitda,
    margin: revenue ? (ebitda / revenue) * 100 : 0,
    fte: periods ? sum('FTE') / periods : 0,
    listings: sum('Listings'),
  };
}
export function buildDashboard(
  dataset: Dataset,
  filters: Filters
): DashboardData {
  const facts = selectFacts(dataset.facts, filters);
  const actual = summarize(facts, 'Actual'),
    budget = summarize(facts, 'Budget');
  const fullYear = selectFacts(dataset.facts, { ...filters, toMonth: 12 });
  // Actual takes precedence only for the same leaf coordinate. A partial
  // Actual month must not suppress the other entities/accounts' Forecasts.
  const coordinate = (f: Fact) =>
    JSON.stringify([f.period, f.entity, f.department, f.product, f.account]);
  const actualCoordinates = new Set(
    fullYear.filter((f) => f.version === 'Actual').map(coordinate)
  );
  const rolling = fullYear
    .filter(
      (f) =>
        f.version === 'Actual' ||
        (f.version === 'Forecast' && !actualCoordinates.has(coordinate(f)))
    )
    .map((f) => ({ ...f, version: 'Forecast' as const }));
  const forecast = summarize(rolling, 'Forecast');
  const coverage: DashboardData['coverage'] = {
    actualPeriods: [],
    completeActualPeriods: [],
    partialActualPeriods: [],
    missingOutlookPeriods: [],
    lastActualPeriod: null,
  };
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const period = `${filters.year}-${String(i + 1).padStart(2, '0')}`;
    const rows = fullYear.filter((f) => f.period === period);
    const outlookRows = rolling.filter((f) => f.period === period);
    // Coverage is relative to the returned view, not proof that the MDX
    // includes every leaf in the source cube. Budget supplies expected
    // coordinates but never supplies substitute forecast amounts.
    const expected = new Set(rows.map(coordinate));
    const actual = new Set(
      rows.filter((f) => f.version === 'Actual').map(coordinate)
    );
    const outlook = new Set(outlookRows.map(coordinate));
    const hasActual = actual.size > 0;
    if (hasActual) {
      coverage.actualPeriods.push(period);
      coverage.lastActualPeriod = period;
      if (actual.size === expected.size)
        coverage.completeActualPeriods.push(period);
      else coverage.partialActualPeriods.push(period);
    }
    if (!expected.size || outlook.size < expected.size)
      coverage.missingOutlookPeriods.push(period);
    const a = summarize(rows, 'Actual'),
      b = summarize(rows, 'Budget'),
      r = summarize(outlookRows, 'Forecast');
    return {
      month: new Date(2026, i, 1).toLocaleString('en', { month: 'short' }),
      actual: hasActual ? a.revenue : null,
      budget: b.revenue,
      forecast: r.revenue,
      ebitda: hasActual ? a.ebitda : null,
    };
  });
  const products = [
    'Job advertising',
    'Employer subscriptions',
    'Talent solutions',
  ].map((name) => {
    const s = facts.filter((f) => f.product === name);
    return {
      name,
      value: summarize(s, 'Actual').revenue,
      budget: summarize(s, 'Budget').revenue,
    };
  });
  const entities = ENTITIES.filter(
    (name) => filters.entity === 'All entities' || filters.entity === name
  ).map((name) => {
    const s = facts.filter((f) => f.entity === name),
      a = summarize(s, 'Actual');
    return {
      name,
      actual: a.revenue,
      budget: summarize(s, 'Budget').revenue,
      ebitda: a.ebitda,
      fte: a.fte,
    };
  });
  const departments = DEPARTMENTS.map((name) => {
    const rows = facts.filter((f) => f.department === name),
      a = summarize(rows, 'Actual'),
      b = summarize(rows, 'Budget');
    return {
      name,
      fte: a.fte,
      budgetFte: b.fte,
      cost: a.personnel,
      budgetCost: b.personnel,
    };
  });
  const variance = [
    ['Revenue', actual.revenue, budget.revenue, 1],
    ['Personnel', actual.personnel, budget.personnel, -1],
    ['Marketing', actual.marketing, budget.marketing, -1],
    ['Technology', actual.technology, budget.technology, -1],
    ['General & Administrative', actual.admin, budget.admin, -1],
    ['EBITDA', actual.ebitda, budget.ebitda, 1],
  ].map(([account, a, b, direction]) => {
    const delta = Number(a) - Number(b);
    return {
      account: String(account),
      actual: Number(a),
      budget: Number(b),
      delta,
      favourable: delta * Number(direction),
      percent: Number(b) ? (delta / Math.abs(Number(b))) * 100 : null,
    };
  });
  return {
    status: dataset.status,
    filters,
    actual,
    budget,
    forecast,
    coverage,
    monthly,
    products,
    entities,
    departments,
    variance,
    rowCount: facts.length,
    periods: [...new Set(facts.map((f) => f.period))].sort(),
  };
}
export function scenario(
  base: Summary,
  revenuePercent: number,
  salaryPercent: number,
  additionalFte: number
) {
  const revenue = base.revenue * (1 + revenuePercent / 100);
  const costPerFte = base.fte ? base.personnel / base.fte : 0;
  const personnel =
    (base.personnel + additionalFte * costPerFte) * (1 + salaryPercent / 100);
  const opex = personnel + base.marketing + base.technology + base.admin;
  return {
    revenue,
    personnel,
    opex,
    ebitda: revenue - opex,
    margin: revenue ? ((revenue - opex) / revenue) * 100 : 0,
    delta: revenue - opex - base.ebitda,
  };
}
