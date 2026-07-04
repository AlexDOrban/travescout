// Maps an entered card number to the matching Stripe *test* PaymentMethod
// token by brand, so the card the user types actually drives the payment
// (it is no longer decorative).
//
// NOTE: real card tokenization requires the native @stripe/stripe-react-native
// SDK and a dev build — it cannot run inside Expo Go. Until the app moves to a
// dev build this stays in Stripe test mode; unknown/unsupported numbers are
// rejected rather than silently charged with a hardcoded token.

const luhnValid = (digits: string): boolean => {
  let sum = 0;
  let even = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (even) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    even = !even;
  }
  return sum % 10 === 0;
};

function brandToken(digits: string): string | null {
  // Visa
  if (/^4/.test(digits)) return 'pm_card_visa';
  // Mastercard (51-55, 2221-2720)
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return 'pm_card_mastercard';
  // American Express (34, 37)
  if (/^3[47]/.test(digits)) return 'pm_card_amex';
  // Discover (6011, 65, 644-649)
  if (/^6(011|5|4[4-9])/.test(digits)) return 'pm_card_discover';
  return null;
}

// Groups the card number into blocks of 4 digits as the user types
// (e.g. "4242424242424242" -> "4242 4242 4242 4242").
export function formatCardNumber(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 19);
  return digits.match(/.{1,4}/g)?.join(' ') ?? '';
}

// Smart MM/YY expiry formatting:
//  - auto-inserts the "/" after the month
//  - pads a single-digit month typed as e.g. "8" into "08/"
//  - handles a two-digit lead that can't be a month ("1" then "3" -> "01/3")
// `prev` is the value before this keystroke so deletion (backspace) still works
// (it won't immediately re-insert a slash the user just removed).
export function formatExpiry(text: string, prev = ''): string {
  const deleting = text.length < prev.length;
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';

  if (digits.length === 1) {
    // A leading 2-9 can only be a single-digit month → pad and advance.
    if (!deleting && digits >= '2') return `0${digits}/`;
    return digits;
  }

  let month = digits.slice(0, 2);
  let rest = digits.slice(2);
  if (parseInt(month, 10) > 12) {
    // e.g. "13": the first digit was the month, the rest is the year.
    month = `0${digits[0]}`;
    rest = digits.slice(1);
  }
  // While deleting, don't force the trailing slash so the month stays editable.
  if (deleting && rest.length === 0) return month;
  return `${month}/${rest.slice(0, 2)}`;
}

// Digits-only CVC, capped at 4.
export function formatCvc(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

export interface CardTokenResult {
  paymentMethodId?: string;
  error?: string;
}

// Returns a Stripe test PaymentMethod id for the entered card, or an error.
export function cardToPaymentMethod(cardNumber: string): CardTokenResult {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) {
    return { error: 'Enter a valid card number' };
  }
  const token = brandToken(digits);
  if (!token) {
    return { error: 'Unsupported card. Use a Stripe test card, e.g. 4242 4242 4242 4242' };
  }
  return { paymentMethodId: token };
}
