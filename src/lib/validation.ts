import { z } from 'zod';
import { ENTITIES, ACCOUNTS, VERSIONS, type Filters } from './types';
export const factSchema = z.object({
  id: z.string(),
  period: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
  entity: z.enum(ENTITIES),
  department: z.string(),
  product: z.string(),
  account: z.enum(ACCOUNTS),
  version: z.enum(VERSIONS),
  amount: z.number().finite(),
  unit: z.enum(['EUR', 'FTE', 'count']),
});
const filterSchema = z
  .object({
    year: z.coerce.number().int().min(2025).max(2026).default(2026),
    toMonth: z.coerce.number().int().min(1).max(12).default(9),
    entity: z.enum(['All entities', ...ENTITIES]).default('All entities'),
  })
  .refine((f) => f.year !== 2026 || f.toMonth <= 9, {
    message: 'The demonstration actual period ends in September 2026.',
    path: ['toMonth'],
  });
export function parseFilters(url: string): Filters {
  return filterSchema.parse(Object.fromEntries(new URL(url).searchParams));
}
export const scenarioSchema = z.object({
  name: z.string().trim().min(1).max(80),
  filters: filterSchema,
  revenuePercent: z.number().min(-30).max(30),
  salaryPercent: z.number().min(-10).max(20),
  additionalFte: z.number().int().min(-100).max(100),
});
