import { daysInMonth } from '../../src/utils/date';

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
