import { ACCOUNTS, DEPARTMENTS, ENTITIES, VERSIONS, type Fact } from './types';
export const DATASET_VERSION = 'talentplan-v1';
export const LAST_CLOSED_PERIOD = '2026-09';
const round = (x: number) => Math.round(x * 100) / 100;
// A fixed seed makes every fixture, database load and regression reproducible.
function randomGenerator(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function generateSynthetic(): Fact[] {
  const random = randomGenerator(20261004);
  const facts: Fact[] = [];
  for (const year of [2025, 2026])
    for (let month = 1; month <= 12; month++) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      for (const [ei, entity] of ENTITIES.entries()) {
        const scale = ei === 0 ? 1 : 0.62;
        const season = [
          1.02, 1.03, 1.08, 1.04, 1.01, 0.96, 0.88, 0.9, 1.12, 1.1, 1.03, 0.82,
        ][month - 1];
        const growth = year === 2026 ? 1.11 : 1;
        const noise = 0.98 + random() * 0.04;
        for (const version of VERSIONS) {
          if (version === 'Actual' && period > LAST_CLOSED_PERIOD) continue;
          const add = (
            account: Fact['account'],
            amount: number,
            department = 'Commercial',
            product = 'All products',
            unit: Fact['unit'] = 'EUR'
          ) => {
            const id = [
              period,
              entity,
              department,
              product,
              account,
              version,
            ].join('|');
            facts.push({
              id,
              period,
              entity,
              department,
              product,
              account,
              version,
              amount: round(amount),
              unit,
            });
          };
          // Weaker paid-listing demand in Germany in Q3; subscription income cushions the gap.
          const demand =
            version === 'Actual'
              ? (ei === 0 && year === 2026 && month >= 7 ? 0.9 : 0.97) * noise
              : version === 'Forecast'
                ? 0.955
                : 1;
          const listings = Math.round(10200 * scale * season * growth * demand);
          const price =
            540 *
            (year === 2026 ? 1.03 : 1) *
            (version === 'Actual' && month >= 7 ? 0.985 : 1);
          const subscriptions = Math.round(
            2350 *
              scale *
              growth *
              (version === 'Actual'
                ? 1.035
                : version === 'Forecast'
                  ? 1.025
                  : 1)
          );
          add('Listings', listings, 'Commercial', 'Job advertising', 'count');
          add(
            'Subscriptions',
            subscriptions,
            'Commercial',
            'Employer subscriptions',
            'count'
          );
          add('Revenue', listings * price, 'Commercial', 'Job advertising');
          add(
            'Revenue',
            subscriptions * 820,
            'Commercial',
            'Employer subscriptions'
          );
          add(
            'Revenue',
            480000 *
              scale *
              growth *
              season *
              (version === 'Actual' ? 1.02 * noise : 1),
            'Commercial',
            'Talent solutions'
          );
          for (const [di, department] of DEPARTMENTS.entries()) {
            const baseFte =
              [290, 260, 150, 90][di] * scale * (year === 2026 ? 1.06 : 1);
            const fte =
              baseFte +
              (version === 'Actual' && year === 2026 && ei === 0 && di === 1
                ? 18 + month
                : version === 'Forecast' && year === 2026 && di === 1
                  ? 15
                  : 0);
            // UK costs converted using illustrative GBP/EUR assumptions; all facts report in EUR.
            const fxImpact =
              ei === 1 && version === 'Actual' && year === 2026 ? 1.025 : 1;
            const salary =
              [64000, 82000, 47000, 76000][di] * (year === 2026 ? 1.04 : 1);
            const employerRate =
              version === 'Actual' && year === 2026 && ei === 0 ? 1.235 : 1.22;
            add('FTE', fte, department, 'All products', 'FTE');
            add(
              'Personnel',
              ((fte * salary) / 12) * employerRate * fxImpact,
              department
            );
            add(
              'Marketing',
              [980000, 18000, 15000, 8000][di] *
                scale *
                growth *
                season *
                (version === 'Actual' && year === 2026 && month >= 7
                  ? 1.08
                  : 1),
              department
            );
            add(
              'Technology',
              [24000, 480000, 36000, 20000][di] *
                scale *
                growth *
                (version === 'Actual' ? 1.035 : 1),
              department
            );
            add(
              'General & Administrative',
              [42000, 58000, 66000, 265000][di] * scale * growth * fxImpact,
              department
            );
          }
        }
      }
    }
  if (facts.some((f) => !ACCOUNTS.includes(f.account)))
    throw new Error('Invalid synthetic account');
  return facts;
}
