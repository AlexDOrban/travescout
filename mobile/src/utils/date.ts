// Days in a given month, accounting for leap years. month is 1-12.
export function daysInMonth(year: number, month: number): number {
  if (!month || month < 1 || month > 12) return 31;
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// Smart YYYY-MM-DD input formatting as the user types:
//  - inserts the dashes automatically
//  - pads a single-digit month/day that can't lead a 2-digit value
//    (month 2-9 -> 02-09, day 4-9 -> 04-09)
//  - caps the month at 12 (an impossible "13" becomes month 01 + carries the
//    digit to the day, matching sequential typing)
//  - caps the day at the real number of days in that month (leap-year aware)
// `prev` is the value before this keystroke so backspacing still works (it
// won't immediately re-insert a dash/pad the user just removed).
export function formatDateInput(text: string, prev = ''): string {
  const deleting = text.length < prev.length;
  const digits = text.replace(/\D/g, '').slice(0, 8); // YYYYMMDD
  if (digits.length === 0) return '';

  // While deleting, format loosely (dashes only) so characters can be removed.
  if (deleting) {
    let out = digits.slice(0, 4);
    if (digits.length > 4) out += `-${digits.slice(4, 6)}`;
    if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
    return out;
  }

  const year = digits.slice(0, 4);
  if (digits.length < 4) return year;
  if (digits.length === 4) return `${year}-`;

  // --- month ---
  const md = digits.slice(4); // month + day digits
  let month: string;
  let dayDigits: string;
  if (md.length === 1) {
    if (md >= '2') {
      // single-digit month (2-9) -> pad and advance to day
      return `${year}-0${md}-`;
    }
    return `${year}-${md}`; // 0 or 1: wait for the second digit
  }
  const mm = md.slice(0, 2);
  if (parseInt(mm, 10) > 12) {
    // e.g. "13": the first digit was the month, the rest is the day
    month = `0${md[0]}`;
    dayDigits = md.slice(1);
  } else {
    month = mm;
    dayDigits = md.slice(2);
  }

  if (dayDigits.length === 0) return `${year}-${month}-`;

  // --- day ---
  const maxDays = daysInMonth(parseInt(year, 10), parseInt(month, 10));
  if (dayDigits.length === 1) {
    if (dayDigits >= '4') {
      // single-digit day (4-9) -> pad
      return `${year}-${month}-0${dayDigits}`;
    }
    return `${year}-${month}-${dayDigits}`; // 0-3: wait for the second digit
  }
  let dd = parseInt(dayDigits.slice(0, 2), 10);
  if (dd > maxDays) dd = maxDays;
  if (dd < 1) dd = 1;
  return `${year}-${month}-${pad2(dd)}`;
}
