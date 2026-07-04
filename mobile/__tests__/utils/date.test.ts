import { formatDateInput, daysInMonth } from '../../src/utils/date';

describe('daysInMonth', () => {
  it('knows 30/31 day months', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
  it('handles February leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29); // leap
    expect(daysInMonth(2100, 2)).toBe(28); // century non-leap
    expect(daysInMonth(2000, 2)).toBe(29); // 400-divisible leap
  });
});

describe('formatDateInput', () => {
  it('inserts the dash after the year', () => {
    expect(formatDateInput('2026')).toBe('2026-');
  });

  it('pads a single-digit month typed as 8 -> 08', () => {
    expect(formatDateInput('20268')).toBe('2026-08-');
  });

  it('waits on a leading 0 or 1 for the month', () => {
    expect(formatDateInput('20261')).toBe('2026-1');
    expect(formatDateInput('202612')).toBe('2026-12-');
  });

  it('caps an impossible month (13 -> 01, digit carries to day)', () => {
    expect(formatDateInput('202613')).toBe('2026-01-3');
  });

  it('pads a single-digit day typed as 9 -> 09', () => {
    expect(formatDateInput('2026039')).toBe('2026-03-09');
  });

  it('caps the day at the days in that month (Feb -> 28)', () => {
    expect(formatDateInput('20260230')).toBe('2026-02-28');
  });

  it('allows a valid leap-day in a leap year', () => {
    expect(formatDateInput('20280229')).toBe('2028-02-29');
  });

  it('caps April at 30 days', () => {
    expect(formatDateInput('20260431')).toBe('2026-04-30');
  });

  it('formats a complete valid date', () => {
    expect(formatDateInput('20260910')).toBe('2026-09-10');
  });

  it('lets backspace remove characters (no re-padding while deleting)', () => {
    expect(formatDateInput('2026-08', '2026-08-')).toBe('2026-08');
    expect(formatDateInput('2026-0', '2026-08')).toBe('2026-0');
  });
});
