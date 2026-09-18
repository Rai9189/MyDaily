import { describe, it, expect } from 'vitest';
import { fmtIDR, fmtIDRCompact } from './formatCurrency';

describe('formatCurrency', () => {
  describe('fmtIDR', () => {
    it('formats positive whole numbers with currency symbol', () => {
      expect(fmtIDR(1000000)).toBe('Rp 1.000.000');
      expect(fmtIDR(1500000)).toBe('Rp 1.500.000');
    });

    it('formats small amounts', () => {
      expect(fmtIDR(100)).toBe('Rp 100');
      expect(fmtIDR(1000)).toBe('Rp 1.000');
    });

    it('handles zero', () => {
      expect(fmtIDR(0)).toBe('Rp 0');
    });

    it('formats negative numbers', () => {
      expect(fmtIDR(-1000000)).toBe('-Rp 1.000.000');
      expect(fmtIDR(-500000)).toBe('-Rp 500.000');
    });

    it('formats large amounts (billions)', () => {
      expect(fmtIDR(1000000000)).toBe('Rp 1.000.000.000');
      expect(fmtIDR(5500000000)).toBe('Rp 5.500.000.000');
    });

    it('handles decimals (truncates to whole numbers)', () => {
      expect(fmtIDR(1500000.99)).toBe('Rp 1.500.001');
      expect(fmtIDR(100.5)).toBe('Rp 101');
    });
  });

  describe('fmtIDRCompact', () => {
    it('formats millions with M notation', () => {
      expect(fmtIDRCompact(1500000)).toBe('1,5M');
      expect(fmtIDRCompact(2000000)).toBe('2M');
    });

    it('formats thousands with K notation', () => {
      expect(fmtIDRCompact(15000)).toBe('15K');
      expect(fmtIDRCompact(1500)).toBe('1,5K');
    });

    it('formats billions with B notation', () => {
      expect(fmtIDRCompact(1500000000)).toBe('1,5B');
      expect(fmtIDRCompact(2000000000)).toBe('2B');
    });

    it('handles small amounts without notation', () => {
      expect(fmtIDRCompact(100)).toBe('100');
      expect(fmtIDRCompact(500)).toBe('500');
    });

    it('handles zero', () => {
      expect(fmtIDRCompact(0)).toBe('0');
    });

    it('formats negative numbers', () => {
      expect(fmtIDRCompact(-1500000)).toBe('-1,5M');
      expect(fmtIDRCompact(-15000)).toBe('-15K');
    });

    it('truncates decimals appropriately', () => {
      expect(fmtIDRCompact(1550000)).toBe('1,6M');
      expect(fmtIDRCompact(1549999)).toBe('1,5M');
    });
  });
});
