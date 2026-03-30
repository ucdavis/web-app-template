import { describe, expect, it } from 'vitest';
import { toExcelCsv } from '@/lib/csv.ts';

describe('csv utilities', () => {
  it('formats excel-friendly csv output with escaping and a BOM', () => {
    const csv = toExcelCsv(
      [
        {
          amount: 1234.5,
          date: '2024-07-04',
          summary: 'Sunny, "bright"',
        },
      ],
      [
        { format: 'date', header: 'Date', key: 'date' },
        { format: 'currency', header: 'Amount', key: 'amount' },
        { header: 'Summary', key: 'summary' },
      ]
    );

    expect(csv.startsWith('\ufeffDate,Amount,Summary\r\n')).toBe(true);
    expect(csv).toContain('07/04/2024');
    expect(csv).toContain('"1,234.50"');
    expect(csv).toContain('"Sunny, ""bright"""');
  });
});
