import { describe, it, expect } from 'vitest';
import {
  formatDateShort,
  formatDateCompact,
  formatDateLong,
  formatDateWithWeekday,
  formatDateTime,
  formatNumber,
} from './dateTimeFormat';

describe('dateTimeFormat utilities', () => {
  const testDate = new Date('2024-12-25T14:30:00Z');

  describe('formatDateShort', () => {
    it('formats date with day, short month, and year', () => {
      expect(formatDateShort(testDate)).toMatch(/Dec 25.*2024/);
    });

    it('handles various dates', () => {
      const jan1 = new Date('2024-01-01');
      expect(formatDateShort(jan1)).toMatch(/Jan 1.*2024/);
    });
  });

  describe('formatDateCompact', () => {
    it('formats date without year', () => {
      expect(formatDateCompact(testDate)).toMatch(/Dec 25/);
      expect(formatDateCompact(testDate)).not.toContain('2024');
    });
  });

  describe('formatDateLong', () => {
    it('formats date with full month and year', () => {
      expect(formatDateLong(testDate)).toMatch(/December.*2024/);
    });
  });

  describe('formatDateWithWeekday', () => {
    it('returns weekday name', () => {
      // Dec 25, 2024 is a Wednesday
      expect(formatDateWithWeekday(testDate)).toBe('Wednesday');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time with separators', () => {
      const result = formatDateTime(testDate);
      expect(result).toContain('12');
      expect(result).toContain('25');
      expect(result).toContain('2024');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with ID locale thousand separators', () => {
      expect(formatNumber(1000000)).toBe('1.000.000');
      expect(formatNumber(1500)).toBe('1.500');
      expect(formatNumber(100)).toBe('100');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-1000000)).toBe('-1.000.000');
    });
  });
});
