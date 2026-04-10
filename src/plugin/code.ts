// Figma plugin sandbox entry point
// Runs in Figma's sandbox — has access to figma.* API, no DOM access.
// TODO: Implement full export pipeline (see SPEC.md Step 2)

figma.showUI(__html__, { width: 320, height: 480 });

figma.ui.onmessage = (msg) => {
  // TODO: handle 'export-request' message
  figma.ui.postMessage({ type: 'error', message: 'Not yet implemented' });
};
