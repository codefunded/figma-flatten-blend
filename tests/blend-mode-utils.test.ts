import { describe, it, expect } from 'vitest';
import {
  getBlendModeCategory,
  getDefaultReferenceColor,
  hasNonNormalBlendModes,
} from '@common/blend-mode-utils';

describe('getBlendModeCategory', () => {
  it('classifies MULTIPLY as darken', () => expect(getBlendModeCategory('MULTIPLY')).toBe('darken'));
  it('classifies COLOR_BURN as darken', () => expect(getBlendModeCategory('COLOR_BURN')).toBe('darken'));
  it('classifies SCREEN as lighten', () => expect(getBlendModeCategory('SCREEN')).toBe('lighten'));
  it('classifies COLOR_DODGE as lighten', () => expect(getBlendModeCategory('COLOR_DODGE')).toBe('lighten'));
  it('classifies OVERLAY as contrast', () => expect(getBlendModeCategory('OVERLAY')).toBe('contrast'));
  it('classifies HARD_LIGHT as contrast', () => expect(getBlendModeCategory('HARD_LIGHT')).toBe('contrast'));
  it('classifies DIFFERENCE as comparative', () => expect(getBlendModeCategory('DIFFERENCE')).toBe('comparative'));
  it('classifies HUE as component', () => expect(getBlendModeCategory('HUE')).toBe('component'));
  it('classifies NORMAL as other', () => expect(getBlendModeCategory('NORMAL')).toBe('other'));
  it('classifies PASS_THROUGH as other', () => expect(getBlendModeCategory('PASS_THROUGH')).toBe('other'));

  it('returns valid category for all 17 non-NORMAL modes', () => {
    const modes = [
      'DARKEN','MULTIPLY','LINEAR_BURN','COLOR_BURN',
      'LIGHTEN','SCREEN','LINEAR_DODGE','COLOR_DODGE',
      'OVERLAY','SOFT_LIGHT','HARD_LIGHT',
      'DIFFERENCE','EXCLUSION',
      'HUE','SATURATION','COLOR','LUMINOSITY',
    ];
    const valid = new Set(['darken','lighten','contrast','comparative','component','other']);
    for (const m of modes) {
      expect(valid.has(getBlendModeCategory(m))).toBe(true);
    }
  });
});

describe('getDefaultReferenceColor', () => {
  it('returns white for MULTIPLY (darken)', () => expect(getDefaultReferenceColor('MULTIPLY')).toBe('#FFFFFF'));
  it('returns black for SCREEN (lighten)', () => expect(getDefaultReferenceColor('SCREEN')).toBe('#000000'));
  it('returns gray for OVERLAY (contrast)', () => expect(getDefaultReferenceColor('OVERLAY')).toBe('#808080'));
  it('returns black for DIFFERENCE (comparative)', () => expect(getDefaultReferenceColor('DIFFERENCE')).toBe('#000000'));
  it('returns white for LUMINOSITY (component)', () => expect(getDefaultReferenceColor('LUMINOSITY')).toBe('#FFFFFF'));
  it('returns white for NORMAL (other)', () => expect(getDefaultReferenceColor('NORMAL')).toBe('#FFFFFF'));
});

describe('hasNonNormalBlendModes', () => {
  it('returns false for empty array', () => expect(hasNonNormalBlendModes([])).toBe(false));
  it('returns false for only NORMAL', () => expect(hasNonNormalBlendModes(['NORMAL'])).toBe(false));
  it('returns true for mixed', () => expect(hasNonNormalBlendModes(['NORMAL', 'MULTIPLY'])).toBe(true));
  it('returns true for all non-normal', () => expect(hasNonNormalBlendModes(['SCREEN', 'OVERLAY'])).toBe(true));
});
