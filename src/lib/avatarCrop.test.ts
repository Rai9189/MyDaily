import { describe, it, expect } from 'vitest';
import { clampOffset, coverScale, cropRect, zoomOffset } from './avatarCrop';

describe('coverScale', () => {
  it('fits the shorter side to the viewport', () => {
    expect(coverScale(900, 1600, 300)).toBeCloseTo(1 / 3);
    expect(coverScale(1600, 900, 300)).toBeCloseTo(1 / 3);
  });
});

describe('clampOffset', () => {
  it('stops the image leaving a gap at either edge', () => {
    expect(clampOffset(50, 600, 300)).toBe(0);
    expect(clampOffset(-400, 600, 300)).toBe(-300);
    expect(clampOffset(-100, 600, 300)).toBe(-100);
  });

  it('pins an image that exactly fits', () => {
    expect(clampOffset(-20, 300, 300)).toBe(0);
  });
});

describe('zoomOffset', () => {
  it('keeps the viewport centre on the same image point', () => {
    const offset = zoomOffset(-100, 1, 2, 300);
    expect((150 - offset) / 2).toBe((150 - -100) / 1);
  });
});

describe('cropRect', () => {
  it('maps the viewport back to source pixels', () => {
    expect(cropRect(-300, 0, 1 / 3, 300)).toEqual({ sx: 900, sy: -0, size: 900 });
  });

  it('selects the bottom of a tall photo', () => {
    const scale = coverScale(900, 1600, 300);
    const y = clampOffset(-10_000, 1600 * scale, 300);
    const { sy, size } = cropRect(0, y, scale, 300);
    expect(sy + size).toBeCloseTo(1600);
  });
});
