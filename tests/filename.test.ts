import { describe, it, expect } from 'vitest';
import { generateFilename } from '@common/filename';

describe('generateFilename', () => {
  it('simple name 1x', () => expect(generateFilename('Frame 1', 1)).toBe('Frame 1-flattened-1x.png'));
  it('simple name 2x', () => expect(generateFilename('Frame 1', 2)).toBe('Frame 1-flattened-2x.png'));
  it('name with spaces preserved', () => expect(generateFilename('Hero Image', 3)).toBe('Hero Image-flattened-3x.png'));
  it('empty name falls back to untitled', () => expect(generateFilename('', 2)).toBe('untitled-flattened-2x.png'));
  it('special chars stripped', () => {
    const result = generateFilename('my/layer:v2', 2);
    expect(result).not.toContain('/');
    expect(result).not.toContain(':');
    expect(result).toMatch(/flattened-2x\.png$/);
  });
  it('very long name truncated', () => {
    const long = 'a'.repeat(200);
    const result = generateFilename(long, 1);
    expect(result.length).toBeLessThan(200);
  });
  it('unicode name preserved', () => {
    const result = generateFilename('Ícône ñ', 1);
    expect(result).toContain('flattened-1x.png');
  });
});
