// Filename generation for exported PNGs.
// Pure function — no Figma API, no DOM. Testable in isolation.

const MAX_NAME_LENGTH = 80;

/**
 * Generates the download filename for a flattened export.
 * Format: `{sanitized-node-name}-flattened-{scale}x.png`
 * Falls back to "untitled" if the name is empty after sanitization.
 */
export function generateFilename(nodeName: string, scale: number): string {
  // Strip path-unsafe characters but preserve spaces, hyphens, underscores, Unicode letters/numbers
  const sanitized = nodeName
    .replace(/[/\\:*?"<>|]/g, '_')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  const safeName = sanitized.length > 0 ? sanitized : 'untitled';
  return `${safeName}-flattened-${scale}x.png`;
}
