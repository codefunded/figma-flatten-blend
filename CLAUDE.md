# Blend Flatten — Claude Project Context

## What this is

A Figma plugin that exports blend-mode layers as transparent PNGs. It delegates compositing to Figma's own renderer rather than re-implementing blend math.

## Two-Context Architecture (Critical)

Figma plugins run in two completely isolated environments that cannot share code at runtime:

| Context | File | What's available | What's NOT available |
|---|---|---|---|
| **Sandbox** | `src/plugin/code.ts` → `dist/code.js` | `figma.*` API, full Node-like env | DOM, Canvas, `window`, `document` |
| **UI iframe** | `src/ui/` → `dist/ui.html` | DOM, Canvas API, `window` | `figma.*` — any call will throw |

**Cross-context communication is only via message passing:**
- Sandbox → UI: `figma.ui.postMessage(msg)`
- UI → Sandbox: `parent.postMessage({ pluginMessage: msg }, '*')`

Never import sandbox code into UI or vice versa. `src/common/types.ts` holds the shared message type contracts — both sides import from there.

## Build System

Two separate Vite configs, two separate bundles:

```bash
npm run build:plugin   # src/plugin/code.ts → dist/code.js (IIFE, no imports)
npm run build:ui       # src/ui/ → dist/ui.html (singlefile, all JS+CSS inlined)
npm run build          # both in sequence
npm run dev            # both in watch mode (via concurrently)
npm run typecheck      # tsc --noEmit across all src/**/*.ts
```

## Key Constraints

- `dist/code.js` must be an IIFE (Figma sandbox has no module loader). Configured in `vite.config.plugin.ts`.
- `dist/ui.html` must be a single self-contained HTML file — no external JS/CSS references. `vite-plugin-singlefile` handles this.
- All temp Figma nodes must be named with `__bf_temp_` prefix and cleaned up in `try/finally`.
- TypeScript strict mode is on. No `any` without justification.
- No network access — plugin operates entirely locally. `manifest.json` declares `"allowedDomains": ["none"]`.

## Shared Types

All plugin↔UI message types live in `src/common/types.ts`. When adding a new message type, update the `PluginMessage` discriminated union there first, then implement both sides.

## Testing

No automated test runner is set up for v1. Verification is manual:
1. `npm run build` must succeed with zero errors.
2. `npm run typecheck` must pass with zero errors.
3. Load in Figma Desktop via Plugins → Development → Import plugin from manifest.
