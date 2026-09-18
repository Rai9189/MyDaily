import { describe, it, expect } from 'vitest';
import { formatNumericDisplay, parseNumericInput, handleNumericKeyInput } from './numericInput';

describe('numericInput utilities', () => {
  describe('formatNumericDisplay', () => {
    it('formats whole numbers with dot thousand separators', () => {
      expect(formatNumericDisplay(1000000)).toBe('1.000.000');
      expect(formatNumericDisplay(1500000)).toBe('1.500.000');
    });

    it('formats numbers with decimals using comma', () => {
      expect(formatNumericDisplay(1500.5)).toBe('1.500,5');
      expect(formatNumericDisplay(100.25)).toBe('100,25');
    });

    it('handles small amounts', () => {
      expect(formatNumericDisplay(100)).toBe('100');
      expect(formatNumericDisplay(1000)).toBe('1.000');
    });

    it('returns empty string for zero or falsy values', () => {
      expect(formatNumericDisplay(0)).toBe('');
      expect(formatNumericDisplay(null as any)).toBe('');
    });
  });

  describe('parseNumericInput', () => {
    it('parses formatted numbers back to numeric value', () => {
      expect(parseNumericInput('1.000.000')).toBe(1000000);
      expect(parseNumericInput('1.500.000')).toBe(1500000);
    });

    it('parses decimals with comma separator', () => {
      expect(parseNumericInput('1.500,5')).toBe(1500.5);
      expect(parseNumericInput('100,25')).toBe(100.25);
    });

    it('handles unformatted numbers', () => {
      expect(parseNumericInput('1000000')).toBe(1000000);
      expect(parseNumericInput('100')).toBe(100);
    });

    it('returns 0 for invalid input', () => {
      expect(parseNumericInput('abc')).toBe(0);
      expect(parseNumericInput('')).toBe(0);
    });
  });

  describe('handleNumericKeyInput', () => {
    it('formats as user types', () => {
      expect(handleNumericKeyInput('1500')).toBe('1.500');
      expect(handleNumericKeyInput('1000000')).toBe('1.000.000');
    });

    it('handles decimal input with comma', () => {
      expect(handleNumericKeyInput('1500,5')).toBe('1.500,5');
      expect(handleNumericKeyInput('100,25')).toBe('100,25');
    });

    it('rejects multiple commas', () => {
      expect(handleNumericKeyInput('1.000,5,5')).toBe('1.000,5');
    });

    it('rejects more than 2 decimal places', () => {
      expect(handleNumericKeyInput('100,255')).toBe('100,25');
    });

    it('removes non-numeric characters except dot and comma', () => {
      expect(handleNumericKeyInput('1500abc')).toBe('1.500');
      expect(handleNumericKeyInput('abc1500')).toBe('1.500');
    });

    it('returns empty string for empty input', () => {
      expect(handleNumericKeyInput('')).toBe('');
      expect(handleNumericKeyInput('abc')).toBe('');
    });
  });
});
