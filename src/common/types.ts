// Shared message types between Figma sandbox and UI iframe

export interface NodeMetadata {
  name: string;
  width: number;
  height: number;
  blendMode: string;        // node's own blend mode
  effectiveModes: string[]; // all non-NORMAL modes found anywhere in subtree
  opacity: number;
  nodeType: string;         // e.g. "FRAME", "GROUP", "RECTANGLE"
}

export interface ExportRequest {
  referenceColor: string; // 6-digit hex with leading #, e.g. "#FFFFFF"
  scale: 1 | 2 | 3 | 4;  // export scale multiplier
}

export interface ExportResult {
  whiteBg: Uint8Array;  // PNG bytes exported on pure white (#FFFFFF) background
  blackBg: Uint8Array;  // PNG bytes exported on pure black (#000000) background
  width: number;
  height: number;
}

export type PluginMessage =
  | { type: 'node-metadata'; payload: NodeMetadata }
  | { type: 'export-result'; payload: ExportResult }
  | { type: 'error'; message: string }
  | { type: 'no-selection' }
  | { type: 'export-request'; payload: ExportRequest };

// ─── Runtime type guards ────────────────────────────────────────────────────

const VALID_SCALES = new Set<1 | 2 | 3 | 4>([1, 2, 3, 4]);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isExportRequest(msg: unknown): msg is { type: 'export-request'; payload: ExportRequest } {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (m['type'] !== 'export-request') return false;
  const p = m['payload'] as Record<string, unknown> | undefined;
  if (typeof p !== 'object' || p === null) return false;
  const color = p['referenceColor'];
  const scale = p['scale'];
  return (
    typeof color === 'string' &&
    HEX_RE.test(color) &&
    typeof scale === 'number' &&
    VALID_SCALES.has(scale as 1 | 2 | 3 | 4)
  );
}

export function isNodeMetadata(msg: unknown): msg is { type: 'node-metadata'; payload: NodeMetadata } {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (m['type'] !== 'node-metadata') return false;
  const p = m['payload'] as Record<string, unknown> | undefined;
  if (typeof p !== 'object' || p === null) return false;
  return (
    typeof p['name'] === 'string' &&
    typeof p['width'] === 'number' &&
    typeof p['height'] === 'number' &&
    typeof p['blendMode'] === 'string' &&
    Array.isArray(p['effectiveModes']) &&
    typeof p['opacity'] === 'number' &&
    typeof p['nodeType'] === 'string'
  );
}

export function isExportResult(msg: unknown): msg is { type: 'export-result'; payload: ExportResult } {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (m['type'] !== 'export-result') return false;
  const p = m['payload'] as Record<string, unknown> | undefined;
  if (typeof p !== 'object' || p === null) return false;
  return (
    p['whiteBg'] instanceof Uint8Array &&
    p['blackBg'] instanceof Uint8Array &&
    typeof p['width'] === 'number' &&
    typeof p['height'] === 'number'
  );
}
