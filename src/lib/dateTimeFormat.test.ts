import { describe, it, expect } from 'vitest';
import { formatDateShort } from './dateTimeFormat';

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
});
