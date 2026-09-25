import {
  formatDuration,
  formatStops,
  dayOffset,
  toISODate,
  addDays,
  formatDayLabel,
  parseISODate,
} from '../../src/utils/format';

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(130)).toBe('2h 10m');
  });
  it('drops zero minutes', () => {
    expect(formatDuration(180)).toBe('3h');
  });
  it('drops zero hours', () => {
    expect(formatDuration(45)).toBe('45m');
  });
  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });
});

describe('formatStops', () => {
  it('says Direct for 0', () => {
    expect(formatStops(0)).toBe('Direct');
  });
  it('uses the singular for 1', () => {
    expect(formatStops(1)).toBe('1 stop');
  });
  it('uses the plural otherwise', () => {
    expect(formatStops(2)).toBe('2 stops');
  });
});

describe('dayOffset', () => {
  it('is 0 for a same-day arrival', () => {
    expect(dayOffset(new Date(2030, 0, 1, 8).toISOString(), new Date(2030, 0, 1, 20).toISOString())).toBe(0);
  });
  it('is 1 for an overnight arrival', () => {
    expect(dayOffset(new Date(2030, 0, 1, 22).toISOString(), new Date(2030, 0, 2, 6).toISOString())).toBe(1);
  });
  it('counts calendar days, not 24h blocks', () => {
    expect(dayOffset(new Date(2030, 0, 1, 23, 50).toISOString(), new Date(2030, 0, 2, 0, 10).toISOString())).toBe(1);
  });
});

describe('ISO date helpers', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2030, 1, 5))).toBe('2030-02-05');
  });
  it('parses YYYY-MM-DD as a local date', () => {
    const d = parseISODate('2030-02-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2030, 1, 5]);
  });
  it('adds days across month ends', () => {
    expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
    expect(addDays('2030-03-01', -1)).toBe('2030-02-28');
  });
});

describe('formatDayLabel', () => {
  it('gives weekday, day and month', () => {
    // 2030-02-05 is a Tuesday
    expect(formatDayLabel('2030-02-05')).toBe('Tue 5 Feb');
  });
});
