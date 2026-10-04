import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getDataset } from '@/lib/data-source';
import { parseFilters } from '@/lib/validation';
import { selectFacts, buildDashboard } from '@/lib/finance';
import { makeCsv, factColumns, exportRows } from '@/lib/export';
import { sessionId } from '@/lib/security';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request.url),
      format = request.nextUrl.searchParams.get('format') || 'xlsx';
    if (!['csv', 'xlsx'].includes(format))
      return NextResponse.json(
        { error: 'Choose csv or xlsx.' },
        { status: 400 }
      );
    const dataset = await getDataset(sessionId(request));
    const facts =
      request.nextUrl.searchParams.get('scope') === 'all'
        ? dataset.facts
        : selectFacts(dataset.facts, filters);
    const filename = `talentplan-${dataset.status.mode}-${request.nextUrl.searchParams.get('scope') === 'all' ? 'all-data' : filters.year}-${new Date().toISOString().slice(0, 10)}.${format}`;
    const headers = {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    };
    if (format === 'csv')
      return new NextResponse(makeCsv(facts, dataset.status), {
        headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' },
      });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TalentPlan';
    workbook.created = new Date();
    const dashboard = buildDashboard(dataset, filters);
    const info = workbook.addWorksheet('Read me');
    info.columns = [{ width: 32 }, { width: 100 }];
    info.addRows([
      ['TalentPlan finance export', 'TM1 financial planning proof of concept'],
      ['Data source', dataset.status.source],
      ['Mode', dataset.status.mode],
      ['TM1 status', dataset.status.tm1],
      ['Connection details', dataset.status.reason],
      ['Checked at (UTC)', dataset.status.checkedAt],
      ['Exported rows', facts.length],
      [
        'Reporting currency',
        dataset.status.mode === 'demonstration'
          ? 'EUR; illustrative GBP/EUR conversion is embedded in demo costs'
          : 'EUR; conversion must be supplied by the configured TM1 view',
      ],
      [
        'Actual cutover',
        dataset.status.mode === 'demonstration'
          ? 'Synthetic Actuals end September 2026. No future actuals.'
          : `Last returned Actual period in selected year: ${dashboard.coverage.lastActualPeriod || 'none'}`,
      ],
      [
        'Data disclosure',
        dataset.status.mode === 'demonstration'
          ? 'Fictional recruitment marketplace. No StepStone actuals or employee records.'
          : 'Live data from the configured IBM cube. Validate the MDX scope and mapping with your model owner.',
      ],
      ['FTE aggregation', 'Average monthly FTE, never a sum across months.'],
      [
        'Cost convention',
        'Costs stored as positive values; EBITDA = revenue minus operating expenses.',
      ],
      [
        'Forecast',
        'Actual where available for a coordinate; otherwise its Forecast value. Budget is never an outlook substitute.',
      ],
      [
        'Coverage',
        `Partial Actual periods: ${dashboard.coverage.partialActualPeriods.join(', ') || 'none'}. Missing outlook periods: ${dashboard.coverage.missingOutlookPeriods.join(', ') || 'none'}. Coverage is relative to the returned scope.`,
      ],
      [
        'Scope',
        request.nextUrl.searchParams.get('scope') === 'all'
          ? 'All available years, entities and versions'
          : JSON.stringify(filters),
      ],
    ]);
    const summary = workbook.addWorksheet('Dashboard summary');
    summary.columns = [{ width: 32 }, { width: 24 }, { width: 24 }];
    summary.addRow(['Selected dashboard slice', JSON.stringify(filters)]);
    summary.addRow([
      'Account',
      'Actual EUR',
      `${filters.comparison || 'Budget'} EUR`,
    ]);
    for (const v of dashboard.variance)
      summary.addRow([v.account, v.actual, v.budget]);
    const sheet = workbook.addWorksheet('Finance facts');
    sheet.columns = factColumns.map((h, i) => ({
      header: h,
      key: h,
      width: [15, 24, 30, 28, 32, 15, 20, 12, 15, 20][i],
    }));
    sheet.addRows(exportRows(facts, dataset.status));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'J1' };
    sheet.getColumn(7).numFmt = '#,##0.00;[Red](#,##0.00)';
    for (const ws of workbook.worksheets) {
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF172F29' },
      };
    }
    return new NextResponse(new Uint8Array(await workbook.xlsx.writeBuffer()), {
      headers: {
        ...headers,
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not generate the export.' },
      { status: 500 }
    );
  }
}
