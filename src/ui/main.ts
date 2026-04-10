// src/ui/main.ts
// UI entry point — Figma plugin iframe context.
import { compositeBlob } from './composite';
import type { ExportResult, NodeMetadata, PluginMessage } from '@common/types';
import { getDefaultReferenceColor, BLEND_MODE_TOOLTIPS } from '@common/blend-mode-utils';
import { isValidHex } from '@common/color-utils';
import { generateFilename } from '@common/filename';

// ─── DOM references ────────────────────────────────────────────────────────
const emptyState         = document.getElementById('empty-state')!;
const mainContent        = document.getElementById('main-content')!;
const nodeName           = document.getElementById('node-name')!;
const nodeType           = document.getElementById('node-type')!;
const nodeSize           = document.getElementById('node-size')!;
const nodeBlend          = document.getElementById('node-blend')!;
const childModesRow      = document.getElementById('child-modes-row')!;
const childModes         = document.getElementById('child-modes')!;
const colorPicker        = document.getElementById('color-picker') as HTMLInputElement;
const hexInput           = document.getElementById('hex-input') as HTMLInputElement;
const tooltipBtn         = document.getElementById('tooltip-btn')!;
const colorTooltip       = document.getElementById('color-tooltip')!;
const scaleSelect        = document.getElementById('scale-select') as HTMLSelectElement;
const previewCanvas      = document.getElementById('preview-canvas') as HTMLCanvasElement;
const previewPlaceholder = document.getElementById('preview-placeholder')!;
const exportBtn          = document.getElementById('export-btn') as HTMLButtonElement;
const statusLine         = document.getElementById('status-line')!;
const normalNotice       = document.getElementById('normal-notice')!;

// ─── State ─────────────────────────────────────────────────────────────────
let currentNodeName  = 'layer';
let tooltipVisible   = false;

// ─── Helpers ───────────────────────────────────────────────────────────────
function normalizeHex(raw: string): string {
  return raw.replace('#', '').padEnd(6, '0').slice(0, 6).toLowerCase();
}

function formatNodeType(type: string): string {
  const map: Record<string, string> = {
    FRAME: 'Frame', GROUP: 'Group', COMPONENT: 'Component', INSTANCE: 'Instance',
    RECTANGLE: 'Rectangle', ELLIPSE: 'Ellipse', VECTOR: 'Vector', TEXT: 'Text',
    LINE: 'Line', POLYGON: 'Polygon', STAR: 'Star',
    BOOLEAN_OPERATION: 'Boolean', SECTION: 'Section',
  };
  return map[type] ?? type.charAt(0) + type.slice(1).toLowerCase();
}

function formatBlendMode(mode: string): string {
  return mode.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function setStatus(message: string, variant: 'default' | 'success' | 'error' = 'default'): void {
  statusLine.textContent = message;
  statusLine.className = 'status-line' + (variant !== 'default' ? ` ${variant}` : '');
}

// ─── Color picker sync ─────────────────────────────────────────────────────
function applyHex(hex6: string): void {
  colorPicker.value = `#${hex6}`;
  hexInput.value = hex6;
  hexInput.classList.remove('invalid');
}

colorPicker.addEventListener('input', () => {
  hexInput.value = normalizeHex(colorPicker.value);
  hexInput.classList.remove('invalid');
});

hexInput.addEventListener('input', () => {
  const raw = hexInput.value.replace('#', '');
  if (isValidHex(raw)) {
    hexInput.classList.remove('invalid');
    colorPicker.value = `#${raw}`;
  } else {
    hexInput.classList.add('invalid');
  }
});

hexInput.addEventListener('blur', () => {
  const raw = hexInput.value.replace('#', '');
  if (!isValidHex(raw)) {
    hexInput.value = normalizeHex(colorPicker.value);
    hexInput.classList.remove('invalid');
  }
});

// ─── Tooltip ───────────────────────────────────────────────────────────────
tooltipBtn.addEventListener('click', () => {
  tooltipVisible = !tooltipVisible;
  colorTooltip.hidden = !tooltipVisible;
});

// ─── Message handlers ──────────────────────────────────────────────────────
function handleNoSelection(): void {
  emptyState.hidden = false;
  mainContent.hidden = true;
  exportBtn.disabled = true;
  setStatus('');
}

function handleNodeMetadata(payload: NodeMetadata): void {
  emptyState.hidden = true;
  mainContent.hidden = false;

  currentNodeName = payload.name;
  nodeName.textContent = payload.name;
  nodeName.setAttribute('title', payload.name);
  nodeType.textContent = formatNodeType(payload.nodeType);
  nodeSize.textContent = `${Math.round(payload.width)} × ${Math.round(payload.height)}`;
  nodeBlend.textContent = formatBlendMode(payload.blendMode);

  const childOnlyModes = payload.effectiveModes.filter((m) => m !== payload.blendMode);
  if (childOnlyModes.length > 0) {
    childModes.textContent = childOnlyModes.map(formatBlendMode).join(', ');
    childModesRow.hidden = false;
  } else {
    childModesRow.hidden = true;
  }

  const primaryMode = payload.blendMode !== 'NORMAL'
    ? payload.blendMode
    : (payload.effectiveModes[0] ?? 'NORMAL');

  const defaultHex = getDefaultReferenceColor(primaryMode).replace('#', '').toLowerCase();
  applyHex(defaultHex);

  colorTooltip.textContent = BLEND_MODE_TOOLTIPS[primaryMode] ?? '';
  colorTooltip.hidden = true;
  tooltipVisible = false;

  const allNormal = payload.blendMode === 'NORMAL' && payload.effectiveModes.length === 0;
  normalNotice.hidden = !allNormal;

  previewCanvas.hidden = true;
  previewPlaceholder.hidden = false;
  setStatus('');
  exportBtn.disabled = false;
}

async function handleExportResult(payload: ExportResult): Promise<void> {
  setStatus('Compositing pixels…');

  try {
    const blob = await compositeBlob(
      new Uint8Array(payload.composited),
      new Uint8Array(payload.alphaSource),
      payload.width,
      payload.height,
    );

    setStatus('Encoding…');

    const previewUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext('2d');
      if (!ctx) return;
      previewCanvas.width  = payload.width;
      previewCanvas.height = payload.height;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(previewUrl);
      previewPlaceholder.hidden = true;
      previewCanvas.hidden = false;
    };
    img.src = previewUrl;

    const scale = Number(scaleSelect.value);
    const filename = generateFilename(currentNodeName, scale);

    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);

    setStatus('Done ✓', 'success');
  } catch (err) {
    setStatus(`Compositing failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
  } finally {
    exportBtn.disabled = false;
  }
}

function handleError(message: string): void {
  setStatus(message, 'error');
  exportBtn.disabled = false;
}

// ─── Message routing ───────────────────────────────────────────────────────
window.onmessage = (event: MessageEvent): void => {
  const msg = (event.data as { pluginMessage?: PluginMessage })?.pluginMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'no-selection':   handleNoSelection();              break;
    case 'node-metadata':  handleNodeMetadata(msg.payload);  break;
    case 'export-result':  void handleExportResult(msg.payload); break;
    case 'error':          handleError(msg.message);         break;
  }
};

// ─── Export button ─────────────────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  const rawHex = hexInput.value.replace('#', '');
  if (!isValidHex(rawHex)) {
    hexInput.classList.add('invalid');
    setStatus('Enter a valid 6-digit hex color', 'error');
    return;
  }

  exportBtn.disabled = true;
  setStatus('Requesting export…');

  const msg: PluginMessage = {
    type: 'export-request',
    payload: { referenceColor: `#${rawHex.toUpperCase()}`, scale: Number(scaleSelect.value) as 1 | 2 | 3 | 4 },
  };
  parent.postMessage({ pluginMessage: msg }, '*');
});
