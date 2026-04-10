import { describe, it, expect } from 'vitest';
import { compositePixels } from '@ui/composite';

function rgba(...values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values);
}

describe('compositePixels', () => {
  it('single opaque pixel: RGB from composited, A from alpha', () => {
    const result = compositePixels(rgba(255, 0, 0, 255), rgba(0, 0, 0, 255));
    expect(Array.from(result)).toEqual([255, 0, 0, 255]);
  });

  it('single transparent pixel: RGB preserved, A=0', () => {
    const result = compositePixels(rgba(255, 0, 0, 255), rgba(0, 0, 0, 0));
    expect(Array.from(result)).toEqual([255, 0, 0, 0]);
  });

  it('semi-transparent pixel: RGB from composited, A=128', () => {
    const result = compositePixels(rgba(100, 150, 200, 255), rgba(0, 0, 0, 128));
    expect(Array.from(result)).toEqual([100, 150, 200, 128]);
  });

  it('multiple pixels: per-pixel RGB from composited, A from alpha', () => {
    const composited = rgba(255, 0, 0, 255, 0, 255, 0, 255);
    const alpha      = rgba(0,   0, 0, 200, 0,   0, 0,  50);
    const result = compositePixels(composited, alpha);
    expect(Array.from(result)).toEqual([255, 0, 0, 200, 0, 255, 0, 50]);
  });

  it('all transparent: all A=0, RGB preserved from composited', () => {
    const composited = rgba(10, 20, 30, 255, 40, 50, 60, 255);
    const alpha      = rgba(0,  0,  0,  0,   0,  0,  0,  0);
    const result = compositePixels(composited, alpha);
    expect(result[3]).toBe(0);
    expect(result[7]).toBe(0);
    expect(result[0]).toBe(10);
  });

  it('all opaque: output identical to composited', () => {
    const composited = rgba(1, 2, 3, 255, 4, 5, 6, 255);
    const alpha      = rgba(0, 0, 0, 255, 0, 0, 0, 255);
    const result = compositePixels(composited, alpha);
    expect(Array.from(result)).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
  });

  it('throws on mismatched array lengths', () => {
    expect(() => compositePixels(rgba(1, 2, 3, 4), rgba(1, 2, 3, 4, 5, 6, 7, 8))).toThrow();
  });

  it('returns empty array for empty input', () => {
    const result = compositePixels(new Uint8ClampedArray(0), new Uint8ClampedArray(0));
    expect(result.length).toBe(0);
  });

  it('handles large-ish image (100x100) without error', () => {
    const size = 100 * 100 * 4;
    const composited = new Uint8ClampedArray(size).fill(128);
    const alpha = new Uint8ClampedArray(size).fill(200);
    const result = compositePixels(composited, alpha);
    expect(result.length).toBe(size);
  });

  it('throws when length is not a multiple of 4', () => {
    expect(() =>
      compositePixels(new Uint8ClampedArray(5), new Uint8ClampedArray(5))
    ).toThrow();
  });
});
