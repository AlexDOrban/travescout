const { parseSearchParams } = require('../../src/validators/search');

describe('parseSearchParams', () => {
  const valid = { from: 'LON', to: 'PAR', departDate: '2026-04-15' };

  it('returns parsed params for valid input', () => {
    const result = parseSearchParams(valid);
    expect(result).toMatchObject({ from: 'LON', to: 'PAR', departDate: '2026-04-15', adults: 1 });
  });

  it('defaults adults to 1', () => {
    expect(parseSearchParams(valid).adults).toBe(1);
  });

  it('parses adults as integer', () => {
    expect(parseSearchParams({ ...valid, adults: '2' }).adults).toBe(2);
  });

  it('throws if from is missing', () => {
    expect(() => parseSearchParams({ to: 'PAR', departDate: '2026-04-15' })).toThrow();
  });

  it('throws if to is missing', () => {
    expect(() => parseSearchParams({ from: 'LON', departDate: '2026-04-15' })).toThrow();
  });

  it('throws if departDate is missing', () => {
    expect(() => parseSearchParams({ from: 'LON', to: 'PAR' })).toThrow();
  });

  it('throws if departDate is not YYYY-MM-DD', () => {
    expect(() => parseSearchParams({ ...valid, departDate: '15-04-2026' })).toThrow();
  });

  it('throws on an impossible calendar date (JS would roll 02-30 into March)', () => {
    expect(() => parseSearchParams({ ...valid, departDate: '2030-02-30' })).toThrow(/valid calendar date/);
    expect(() => parseSearchParams({ ...valid, departDate: '2030-13-01' })).toThrow(/valid calendar date/);
    expect(() => parseSearchParams({ ...valid, departDate: '2030-04-31' })).toThrow(/valid calendar date/);
  });

  it('accepts Feb 29 only in leap years', () => {
    expect(parseSearchParams({ ...valid, departDate: '2028-02-29' }).departDate).toBe('2028-02-29');
    expect(() => parseSearchParams({ ...valid, departDate: '2027-02-29' })).toThrow();
  });

  it('throws if returnDate is before departDate', () => {
    expect(() => parseSearchParams({ ...valid, returnDate: '2026-04-14' })).toThrow(/returnDate/);
  });

  it('accepts optional returnDate in YYYY-MM-DD format', () => {
    const result = parseSearchParams({ ...valid, returnDate: '2026-04-18' });
    expect(result.returnDate).toBe('2026-04-18');
  });

  it('throws if returnDate is malformed', () => {
    expect(() => parseSearchParams({ ...valid, returnDate: 'bad' })).toThrow();
  });

  // adults validation
  it('throws if adults is a non-numeric string', () => {
    expect(() => parseSearchParams({ ...valid, adults: 'abc' })).toThrow();
  });

  it('throws if adults is 0', () => {
    expect(() => parseSearchParams({ ...valid, adults: '0' })).toThrow();
  });

  it('throws if adults is negative', () => {
    expect(() => parseSearchParams({ ...valid, adults: '-1' })).toThrow();
  });

  it('throws if adults is greater than 9', () => {
    expect(() => parseSearchParams({ ...valid, adults: '10' })).toThrow();
  });

  it('accepts adults of 9 (boundary)', () => {
    expect(parseSearchParams({ ...valid, adults: '9' }).adults).toBe(9);
  });

  // calendar date validation
  it('throws if departDate has an invalid month (13)', () => {
    expect(() => parseSearchParams({ ...valid, departDate: '2026-13-01' })).toThrow();
  });

  it('throws if departDate has an invalid day (99)', () => {
    expect(() => parseSearchParams({ ...valid, departDate: '2026-01-99' })).toThrow();
  });
});
