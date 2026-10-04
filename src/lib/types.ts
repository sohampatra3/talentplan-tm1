export const ENTITIES = ['Germany', 'United Kingdom'] as const;
export const DEPARTMENTS = [
  'Commercial',
  'Product & Engineering',
  'Customer Operations',
  'Corporate',
] as const;
export const ACCOUNTS = [
  'Revenue',
  'Personnel',
  'Marketing',
  'Technology',
  'General & Administrative',
  'FTE',
  'Listings',
  'Subscriptions',
] as const;
export const VERSIONS = ['Actual', 'Budget', 'Forecast'] as const;
export type Version = (typeof VERSIONS)[number];
export type Account = (typeof ACCOUNTS)[number];
export interface Fact {
  id: string;
  period: string;
  entity: string;
  department: string;
  product: string;
  account: Account;
  version: Version;
  amount: number;
  unit: 'EUR' | 'FTE' | 'count';
}
export interface SourceStatus {
  tm1: 'connected' | 'disconnected' | 'unreachable' | 'error';
  source: 'tm1' | 'neon' | 'memory';
  mode: 'live' | 'demonstration';
  reason: string;
  databaseConnected: boolean;
  checkedAt: string;
}
export interface Dataset {
  facts: Fact[];
  status: SourceStatus;
}
export interface Filters {
  year: number;
  toMonth: number;
  entity: string;
  fromMonth?: number;
  department?: string;
  comparison?: 'Budget' | 'Forecast';
}
export interface Summary {
  revenue: number;
  personnel: number;
  marketing: number;
  technology: number;
  admin: number;
  opex: number;
  ebitda: number;
  margin: number;
  fte: number;
  listings: number;
}
export interface DashboardData {
  status: SourceStatus;
  filters: Filters;
  actual: Summary;
  budget: Summary;
  forecast: Summary;
  coverage: {
    actualPeriods: string[];
    completeActualPeriods: string[];
    partialActualPeriods: string[];
    missingOutlookPeriods: string[];
    lastActualPeriod: string | null;
  };
  monthly: {
    month: string;
    actual: number | null;
    budget: number;
    forecast: number;
    ebitda: number | null;
    budgetEbitda: number;
    forecastEbitda: number;
    fte: number | null;
    budgetFte: number;
    forecastFte: number;
  }[];
  products: { name: string; value: number; budget: number }[];
  entities: {
    name: string;
    actual: number;
    budget: number;
    ebitda: number;
    fte: number;
  }[];
  departments: {
    name: string;
    fte: number;
    budgetFte: number;
    cost: number;
    budgetCost: number;
  }[];
  variance: {
    account: string;
    actual: number;
    budget: number;
    delta: number;
    favourable: number;
    percent: number | null;
  }[];
  rowCount: number;
  periods: string[];
}
