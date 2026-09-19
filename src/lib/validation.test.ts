import { describe, it, expect } from 'vitest';
import { validateName, validateColor, validateEnum } from './validation';

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
