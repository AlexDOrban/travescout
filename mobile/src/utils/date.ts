// Days in a given month, accounting for leap years. month is 1-12.
export function daysInMonth(year: number, month: number): number {
  if (!month || month < 1 || month > 12) return 31;
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
