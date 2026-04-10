// UI entry point — runs in the plugin iframe.
// Has access to DOM and Canvas API. No figma.* access.
// TODO: Implement full UI (see SPEC.md Step 4)

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;
  // TODO: handle messages from sandbox
  console.log('Message from sandbox:', msg);
};

// Send a test message to the sandbox on load
parent.postMessage({ pluginMessage: { type: 'ready' } }, '*');
