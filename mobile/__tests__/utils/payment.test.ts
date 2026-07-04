import {
  cardToPaymentMethod,
  formatCardNumber,
  formatExpiry,
  formatCvc,
} from '../../src/utils/payment';

describe('formatCardNumber', () => {
  it('groups digits into blocks of four', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('strips non-digits and re-groups as typed', () => {
    expect(formatCardNumber('4242 42')).toBe('4242 42');
    expect(formatCardNumber('424242')).toBe('4242 42');
  });

  it('caps at 19 digits', () => {
    expect(formatCardNumber('12345678901234567890').replace(/\s/g, '')).toHaveLength(19);
  });
});

describe('formatExpiry', () => {
  it('pads a single-digit month 8 into 08/', () => {
    expect(formatExpiry('8')).toBe('08/');
  });

  it('keeps a leading 0 or 1 until the second digit', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('0')).toBe('0');
  });

  it('auto-inserts the slash after a two-digit month', () => {
    expect(formatExpiry('12')).toBe('12/');
    expect(formatExpiry('08')).toBe('08/');
  });

  it('reinterprets an impossible two-digit month (13 -> 01/3)', () => {
    expect(formatExpiry('13')).toBe('01/3');
  });

  it('appends the year after the month', () => {
    expect(formatExpiry('1225')).toBe('12/25');
  });

  it('allows backspacing the slash away (deletion keeps month editable)', () => {
    expect(formatExpiry('12', '12/')).toBe('12');
  });
});

describe('formatCvc', () => {
  it('keeps digits only, capped at 4', () => {
    expect(formatCvc('12a3')).toBe('123');
    expect(formatCvc('123456')).toBe('1234');
  });
});

describe('cardToPaymentMethod', () => {
  it('maps a Visa test card to pm_card_visa', () => {
    expect(cardToPaymentMethod('4242 4242 4242 4242')).toEqual({ paymentMethodId: 'pm_card_visa' });
  });

  it('maps a Mastercard test card to pm_card_mastercard', () => {
    expect(cardToPaymentMethod('5555 5555 5555 4444')).toEqual({ paymentMethodId: 'pm_card_mastercard' });
  });

  it('maps an Amex test card to pm_card_amex', () => {
    expect(cardToPaymentMethod('3782 822463 10005')).toEqual({ paymentMethodId: 'pm_card_amex' });
  });

  it('rejects an empty card number', () => {
    expect(cardToPaymentMethod('').error).toBeTruthy();
  });

  it('rejects a number that fails the Luhn check', () => {
    expect(cardToPaymentMethod('4242 4242 4242 4241').error).toBeTruthy();
  });

  it('rejects an unsupported but Luhn-valid brand', () => {
    // A valid Luhn number that is not one of the supported brands.
    expect(cardToPaymentMethod('7000 0000 0000 0002').error).toBeTruthy();
  });
});
