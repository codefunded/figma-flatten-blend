// Blend mode classification and smart default reference colors.
// Pure functions — no Figma API, no DOM. Testable in isolation.

export type BlendModeCategory =
  | 'darken'
  | 'lighten'
  | 'contrast'
  | 'comparative'
  | 'component'
  | 'other';

const CATEGORY_MAP: Record<string, BlendModeCategory> = {
  DARKEN:       'darken',
  MULTIPLY:     'darken',
  LINEAR_BURN:  'darken',
  COLOR_BURN:   'darken',
  LIGHTEN:      'lighten',
  SCREEN:       'lighten',
  LINEAR_DODGE: 'lighten',
  COLOR_DODGE:  'lighten',
  OVERLAY:      'contrast',
  SOFT_LIGHT:   'contrast',
  HARD_LIGHT:   'contrast',
  DIFFERENCE:   'comparative',
  EXCLUSION:    'comparative',
  HUE:          'component',
  SATURATION:   'component',
  COLOR:        'component',
  LUMINOSITY:   'component',
};

const DEFAULT_COLOR: Record<BlendModeCategory, string> = {
  darken:      '#FFFFFF',
  lighten:     '#000000',
  contrast:    '#808080',
  comparative: '#000000',
  component:   '#FFFFFF',
  other:       '#FFFFFF',
};

export function getBlendModeCategory(mode: string): BlendModeCategory {
  return CATEGORY_MAP[mode] ?? 'other';
}

export function getDefaultReferenceColor(mode: string): string {
  return DEFAULT_COLOR[getBlendModeCategory(mode)];
}

export function hasNonNormalBlendModes(modes: string[]): boolean {
  return modes.some((m) => m !== 'NORMAL' && m !== 'PASS_THROUGH');
}

export const BLEND_MODE_TOOLTIPS: Record<string, string> = {
  DARKEN:       'White is neutral — darkening against white captures the full darkening contribution',
  MULTIPLY:     'White is neutral — darkening against white captures the full darkening contribution',
  LINEAR_BURN:  'White is neutral — darkening against white captures the full darkening contribution',
  COLOR_BURN:   'White is neutral — darkening against white captures the full darkening contribution',
  LIGHTEN:      'Black is neutral — lightening against black captures the full lightening contribution',
  SCREEN:       'Black is neutral — lightening against black captures the full lightening contribution',
  LINEAR_DODGE: 'Black is neutral — lightening against black captures the full lightening contribution',
  COLOR_DODGE:  'Black is neutral — lightening against black captures the full lightening contribution',
  OVERLAY:      '50% gray is the contrast pivot — mid-gray preserves the most information',
  SOFT_LIGHT:   '50% gray is the contrast pivot — mid-gray preserves the most information',
  HARD_LIGHT:   '50% gray is the contrast pivot — mid-gray preserves the most information',
  DIFFERENCE:   'Black yields zero difference — no visible shift against a black base',
  EXCLUSION:    'Black yields zero difference — no visible shift against a black base',
  HUE:          'White is a neutral luminance base for component modes',
  SATURATION:   'White is a neutral luminance base for component modes',
  COLOR:        'White is a neutral luminance base for component modes',
  LUMINOSITY:   'White is a neutral luminance base for component modes',
  PASS_THROUGH: 'Treated as white neutral for compositing purposes',
  NORMAL:       'No blend mode active — export is identical to a standard Figma export',
};
