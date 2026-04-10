// src/plugin/code.ts
// Figma plugin sandbox. Access to figma.* API. No DOM, no window, no fetch.
import type { ExportRequest, NodeMetadata, PluginMessage } from '@common/types';
import { isExportRequest } from '@common/types';

figma.showUI(__html__, { width: 320, height: 520 });

// ─── Orphan cleanup ────────────────────────────────────────────────────────
function cleanOrphanTempNodes(): void {
  const orphans = figma.currentPage.findAll(
    (n) => n.name.startsWith('__bf_temp_'),
  );
  for (const orphan of orphans) {
    orphan.remove();
  }
}
cleanOrphanTempNodes();

// ─── Blend mode analysis ───────────────────────────────────────────────────
function getEffectiveBlendModes(node: SceneNode): string[] {
  const found = new Set<string>();
  function walk(n: SceneNode): void {
    if ('blendMode' in n && n.blendMode !== 'NORMAL') {
      found.add(n.blendMode);
    }
    if ('children' in n) {
      for (const child of n.children) walk(child);
    }
  }
  walk(node);
  return Array.from(found);
}

// ─── Selection analysis ────────────────────────────────────────────────────
function sendSelectionMetadata(): void {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({ type: 'no-selection' } satisfies PluginMessage);
    return;
  }
  const node = selection[0];
  if (!('width' in node)) {
    figma.ui.postMessage({ type: 'no-selection' } satisfies PluginMessage);
    return;
  }

  const effectiveModes = getEffectiveBlendModes(node);
  const ownBlendMode = 'blendMode' in node ? String(node.blendMode) : 'NORMAL';

  const payload: NodeMetadata = {
    name: node.name,
    width: node.width,
    height: node.height,
    blendMode: ownBlendMode,
    effectiveModes,
    opacity: 'opacity' in node ? node.opacity : 1,
    nodeType: node.type,
  };
  figma.ui.postMessage({ type: 'node-metadata', payload } satisfies PluginMessage);
}

sendSelectionMetadata();
figma.on('selectionchange', sendSelectionMetadata);

// ─── Export pipeline ───────────────────────────────────────────────────────
async function runExportPipeline(request: ExportRequest): Promise<void> {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Selection changed during export. Re-select the layer and try again.',
    } satisfies PluginMessage);
    return;
  }

  const node = selection[0];
  if (!('width' in node) || !('height' in node)) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Selected node has no exportable dimensions.',
    } satisfies PluginMessage);
    return;
  }

  const { scale } = request;
  const outputWidth  = node.width  * scale;
  const outputHeight = node.height * scale;

  if (outputWidth > 8192 || outputHeight > 8192) {
    figma.ui.postMessage({
      type: 'error',
      message: `Output would be ${Math.round(outputWidth)}×${Math.round(outputHeight)}px at ${scale}× — exceeds the 8192px limit. Reduce the scale factor.`,
    } satisfies PluginMessage);
    return;
  }

  const tempNodes: SceneNode[] = [];

  try {
    // Step A: Deep-clone the node
    const clone = (node as SceneNode & { clone(): SceneNode }).clone();
    clone.name = '__bf_temp_clone';
    figma.currentPage.appendChild(clone);
    tempNodes.push(clone);

    // Step B: Background rectangle (starts white, will be changed to black)
    const rect = figma.createRectangle();
    rect.name = '__bf_temp_rect';
    rect.resize(node.width, node.height);
    rect.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1, visible: true }];
    rect.blendMode = 'NORMAL';
    rect.opacity = 1;
    figma.currentPage.appendChild(rect);
    tempNodes.push(rect);

    // Step C: Wrapper frame (NORMAL — contains all blending within its bounds)
    const wrapper = figma.createFrame();
    wrapper.name = '__bf_temp_frame';
    wrapper.resize(node.width, node.height);
    wrapper.fills = [];
    wrapper.strokes = [];
    wrapper.clipsContent = true;
    wrapper.blendMode = 'NORMAL';
    wrapper.opacity = 1;
    figma.currentPage.appendChild(wrapper);
    tempNodes.push(wrapper);

    wrapper.appendChild(rect);
    wrapper.appendChild(clone);
    rect.x = 0; rect.y = 0;
    clone.x = 0; clone.y = 0;

    // Step D: Export on pure WHITE background
    const whiteBgBytes = await wrapper.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: scale },
      colorProfile: 'SRGB',
    });

    // Step E: Swap to BLACK background, export again
    rect.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true }];
    const blackBgBytes = await wrapper.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: scale },
      colorProfile: 'SRGB',
    });

    // Step F: Send both renders to UI for dual-background alpha extraction
    figma.ui.postMessage({
      type: 'export-result',
      payload: {
        whiteBg: whiteBgBytes,
        blackBg: blackBgBytes,
        width:  Math.round(node.width  * scale),
        height: Math.round(node.height * scale),
      },
    } satisfies PluginMessage);

  } finally {
    // Step H: Clean up all remaining temp nodes
    for (const n of tempNodes) {
      try { n.remove(); } catch { /* already removed */ }
    }
  }
}

// ─── Message handler ───────────────────────────────────────────────────────
figma.ui.onmessage = (rawMsg: unknown): void => {
  if (isExportRequest(rawMsg)) {
    runExportPipeline(rawMsg.payload).catch((err: unknown) => {
      figma.ui.postMessage({
        type: 'error',
        message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies PluginMessage);
    });
  }
};
