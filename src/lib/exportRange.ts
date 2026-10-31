// Dates are compared as YYYY-MM-DD strings, so no timezone can shift a day. An empty bound is open.
export function inDateRange(date: string, from: string, to: string): boolean {
  const day = date.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}
