import { describe, it, expect } from 'vitest';
import { inDateRange } from './exportRange';

describe('inDateRange', () => {
  it('includes both bounds', () => {
    expect(inDateRange('2026-10-01', '2026-10-01', '2026-10-31')).toBe(true);
    expect(inDateRange('2026-10-31', '2026-10-01', '2026-10-31')).toBe(true);
  });

  it('excludes dates outside the range', () => {
    expect(inDateRange('2026-09-30', '2026-10-01', '2026-10-31')).toBe(false);
    expect(inDateRange('2026-11-01', '2026-10-01', '2026-10-31')).toBe(false);
  });

  it('treats a single day range as that day', () => {
    expect(inDateRange('2026-10-15', '2026-10-15', '2026-10-15')).toBe(true);
    expect(inDateRange('2026-10-16', '2026-10-15', '2026-10-15')).toBe(false);
  });

  it('leaves an empty bound open', () => {
    expect(inDateRange('2020-01-01', '', '')).toBe(true);
    expect(inDateRange('2030-01-01', '2026-10-01', '')).toBe(true);
    expect(inDateRange('2020-01-01', '', '2026-10-31')).toBe(true);
  });

  it('matches nothing when the start is after the end', () => {
    expect(inDateRange('2026-10-15', '2026-10-31', '2026-10-01')).toBe(false);
  });
});
