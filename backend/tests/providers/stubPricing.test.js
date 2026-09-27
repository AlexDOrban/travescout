const { stubFare, stubDateFactor } = require('../../src/providers/stubPricing');

describe('stub pricing', () => {
  it('is deterministic per date', () => {
    expect(stubFare(40, '2030-05-01')).toBe(stubFare(40, '2030-05-01'));
  });

  it('stays within the weekday/jitter band', () => {
    for (let d = 1; d <= 28; d++) {
      const f = stubDateFactor(`2030-02-${String(d).padStart(2, '0')}`);
      expect(f).toBeGreaterThanOrEqual(0.88);
      expect(f).toBeLessThanOrEqual(1.2 * 1.12 + 1e-9);
    }
  });

  it('varies across a week', () => {
    const fares = new Set(['2030-05-06', '2030-05-07', '2030-05-08', '2030-05-09', '2030-05-10']
      .map(d => stubFare(50, d)));
    expect(fares.size).toBeGreaterThan(1);
  });
});
