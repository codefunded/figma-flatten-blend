// Shared message types between Figma sandbox and UI iframe

export interface NodeMetadata {
  name: string;
  width: number;
  height: number;
  blendMode: string;
  opacity: number;
}

export interface ExportRequest {
  referenceColor: string; // 6-digit hex, e.g. "#FFFFFF"
  scale: number;          // 1 | 2 | 3 | 4
}

export interface ExportPayload {
  composited: number[];   // PNG bytes from composited export
  alphaSource: number[];  // PNG bytes from alpha-only export
  width: number;
  height: number;
}

export type PluginMessage =
  | { type: 'node-metadata'; payload: NodeMetadata }
  | { type: 'export-payload'; payload: ExportPayload }
  | { type: 'error'; message: string }
  | { type: 'no-selection' }
  | { type: 'export-request'; payload: ExportRequest };
