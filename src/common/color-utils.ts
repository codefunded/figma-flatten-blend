// Hex color parsing utilities.
// Pure functions — no Figma API, no DOM. Testable in isolation.

const HEX6_RE = /^#?([0-9a-fA-F]{6})$/;

/** Parse a 6-digit hex color. Returns null for invalid input (3-digit, garbage, etc.). */
export function parseHex(input: string): { r: number; g: number; b: number } | null {
  const match = HEX6_RE.exec(input);
  if (!match) return null;
  const hex = match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/** Returns true for valid 6-digit hex (with or without leading #). */
export function isValidHex(input: string): boolean {
  return parseHex(input) !== null;
}

/**
 * Parse a 6-digit hex into normalized 0–1 values for Figma's RGB type.
 * @throws {Error} if input is not a valid 6-digit hex color
 */
export function hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
  const parsed = parseHex(hex);
  if (!parsed) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parsed.r / 255,
    g: parsed.g / 255,
    b: parsed.b / 255,
  };
}
