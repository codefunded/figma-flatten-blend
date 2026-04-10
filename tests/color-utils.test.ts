import { describe, it, expect } from 'vitest';
import { parseHex, isValidHex, hexToRgbNormalized } from '@common/color-utils';

describe('parseHex', () => {
  it('parses 6-digit hex with hash', () => expect(parseHex('#FF0000')).toEqual({ r: 255, g: 0, b: 0 }));
  it('parses 6-digit hex without hash', () => expect(parseHex('FF0000')).toEqual({ r: 255, g: 0, b: 0 }));
  it('parses lowercase', () => expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0 }));
  it('parses white', () => expect(parseHex('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 }));
  it('parses black', () => expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0 }));
  it('parses mid gray', () => expect(parseHex('#808080')).toEqual({ r: 128, g: 128, b: 128 }));
  it('rejects 3-digit hex', () => expect(parseHex('#FFF')).toBeNull());
  it('rejects too short', () => expect(parseHex('#FF00')).toBeNull());
  it('rejects too long', () => expect(parseHex('#FF00001')).toBeNull());
  it('rejects invalid chars', () => expect(parseHex('#GGGGGG')).toBeNull());
  it('rejects empty string', () => expect(parseHex('')).toBeNull());
  it('rejects garbage', () => expect(parseHex('pizza')).toBeNull());
});

describe('isValidHex', () => {
  it('returns true for valid hex', () => expect(isValidHex('#AABBCC')).toBe(true));
  it('returns false for invalid', () => expect(isValidHex('nope')).toBe(false));
});

describe('hexToRgbNormalized', () => {
  it('normalizes white to 1,1,1', () => expect(hexToRgbNormalized('#FFFFFF')).toEqual({ r: 1, g: 1, b: 1 }));
  it('normalizes black to 0,0,0', () => expect(hexToRgbNormalized('#000000')).toEqual({ r: 0, g: 0, b: 0 }));
  it('normalizes mid-range r ≈ 0.502', () => {
    const result = hexToRgbNormalized('#800000');
    expect(result.r).toBeCloseTo(0.502, 2);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });
  it('throws on invalid hex', () => expect(() => hexToRgbNormalized('#nope')).toThrow());
});
