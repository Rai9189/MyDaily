import { describe, it, expect } from 'vitest';
import {
  validateName,
  validateDescription,
  validateAmount,
  validateDate,
  validateColor,
  validateEnum,
} from './validation';

describe('validation utilities', () => {
  describe('validateName', () => {
    it('accepts valid names', () => {
      expect(validateName('My Item')).toEqual({ valid: true });
      expect(validateName('A')).toEqual({ valid: true });
    });

    it('rejects empty names', () => {
      const result = validateName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('rejects names exceeding max length', () => {
      const result = validateName('x'.repeat(101), 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100 characters');
    });

    it('trims whitespace', () => {
      expect(validateName('  Valid  ')).toEqual({ valid: true });
    });
  });

  describe('validateDescription', () => {
    it('accepts empty descriptions', () => {
      expect(validateDescription('')).toEqual({ valid: true });
    });

    it('accepts valid descriptions', () => {
      expect(validateDescription('This is a description')).toEqual({ valid: true });
    });

    it('rejects descriptions exceeding max length', () => {
      const result = validateDescription('x'.repeat(10001), 10000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10000 characters');
    });
  });

  describe('validateAmount', () => {
    it('accepts positive amounts', () => {
      expect(validateAmount(1000)).toEqual({ valid: true });
      expect(validateAmount(1000000000)).toEqual({ valid: true });
    });

    it('rejects zero or negative amounts', () => {
      expect(validateAmount(0).valid).toBe(false);
      expect(validateAmount(-100).valid).toBe(false);
    });

    it('rejects amounts exceeding max', () => {
      const result = validateAmount(1000000001, 1000000000);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('accepts valid future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validateDate(tomorrow).valid).toBe(true);
    });

    it('rejects past dates by default', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validateDate(yesterday).valid).toBe(false);
    });

    it('allows past dates when allowPast is true', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validateDate(yesterday, true).valid).toBe(true);
    });

    it('rejects invalid dates', () => {
      expect(validateDate(new Date('invalid')).valid).toBe(false);
    });
  });

  describe('validateColor', () => {
    it('accepts valid hex colors', () => {
      expect(validateColor('#3b82f6')).toEqual({ valid: true });
      expect(validateColor('#fff')).toEqual({ valid: true });
      expect(validateColor('#000000')).toEqual({ valid: true });
    });

    it('rejects invalid colors', () => {
      expect(validateColor('red').valid).toBe(false);
      expect(validateColor('#gggggg').valid).toBe(false);
      expect(validateColor('#12345').valid).toBe(false);
    });
  });

  describe('validateEnum', () => {
    it('accepts valid enum values', () => {
      expect(validateEnum('income', ['income', 'expense'])).toEqual({ valid: true });
    });

    it('rejects invalid enum values', () => {
      const result = validateEnum('invalid', ['income', 'expense']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('income, expense');
    });
  });
});
