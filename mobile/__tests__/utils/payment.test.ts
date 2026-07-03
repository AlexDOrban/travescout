import { cardToPaymentMethod } from '../../src/utils/payment';

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
