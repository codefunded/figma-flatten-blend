# Flatten Blend — Figma Plugin Specification

## Role Definition

You are an expert Figma plugin developer with deep knowledge of the Figma Plugin API, TypeScript, image compositing math (premultiplied alpha, blend modes), and PNG encoding/decoding. You understand the limitations of blend mode export in Figma and know how Adobe Photoshop handles multiply-layer flattening internally. Your goal is to build a production-ready, marketplace-publishable Figma plugin.

---

## Context & Problem Statement

Figma cannot export a layer with any non-`NORMAL` blend mode (e.g. `MULTIPLY`, `SCREEN`, `OVERLAY`, `COLOR_DODGE`, etc.) as a transparent PNG that preserves the visual result of the blend. This is because **all blend modes are context-dependent** — they require a base color to blend against. When exporting with transparency, there is no base, so Figma either ignores the blend or produces incorrect results. This affects every blend mode in Figma's palette: darken-group, lighten-group, contrast, comparative, and component modes alike.

Adobe Photoshop solves this by **pre-compositing** the blended layer against a reference color (typically white), storing the resulting RGB values in the PNG while preserving the original alpha channel. This produces a "baked" PNG that looks correct when placed on the expected background.

**No existing plugin on the Figma Community marketplace addresses this problem.** Forum threads dating back to 2021 confirm repeated user demand with no solution — across multiply, lighten, overlay, and other blend modes.

### Source Discussions (Proof of Demand)

- [Preview and export a Color Burn layer image](https://forum.figma.com/ask-the-community-7/preview-and-export-a-color-burn-layer-image-8052) — Figma Forum, 2024. Only advice: "Blend modes don't work without a background."
- [Flatten layers with blending modes](https://www.reddit.com/r/FigmaDesign/comments/1abno8o/flatten_layers_with_blending_modes/) — Reddit r/FigmaDesign, 2024. No solution offered.
- [How to export layers with "Exclusion" layer mode](https://forum.figma.com/ask-the-community-7/how-to-export-layers-with-exclusion-layer-mode-32312) — Figma Forum, 2023. User wants transparent background. No answer.
- [Export image with blend mode Lighten to PNG](https://forum.figma.com/ask-the-community-7/export-image-with-blend-mode-lighten-to-png-21300) — Figma Forum, 2023. User gets black background. Closed without resolution.

### How This Differs from Convertify

[Convertify](https://www.figma.com/community/plugin/849159306117999028/convertify-sketch-adobe-google) is a file format converter (Figma ↔ Sketch/XD/PSD/After Effects/InDesign/etc). It translates entire files between design tools. It does not solve pixel-level blend mode compositing for PNG export. These are completely different problem domains with zero feature overlap.

This plugin fills that gap for **all blend modes at once**, with zero per-mode implementation effort thanks to delegating compositing to Figma's own rendering engine.

---

## Main Goal

Build a Figma plugin called **"Flatten Blend"** that:

1. Takes a selected layer with **any** non-`NORMAL` blend mode (all 17 modes supported from day one).
2. Composites it against a user-chosen reference color (smart default based on blend mode category).
3. Preserves the original alpha channel.
4. Exports the result as a downloadable transparent PNG.

**Key architectural insight:** The plugin does NOT re-implement blend math. It uses Figma's own renderer via `exportAsync` to composite the blend, then extracts the alpha channel separately. This means every blend mode Figma supports works automatically — zero per-mode code.

---

## Technical Architecture

### Figma Plugin Structure

```
blend-flatten/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ui.ts     # Vite config for UI build (inlines into single HTML)
├── vite.config.plugin.ts # Vite config for sandbox/plugin build
├── .gitignore
├── LICENSE
├── README.md
├── CHANGELOG.md
├── src/
│   ├── plugin/
│   │   └── code.ts       # Plugin sandbox logic (Figma API)
│   ├── ui/
│   │   ├── index.html    # Plugin UI entry (iframe)
│   │   ├── main.ts       # UI logic (compiled & inlined into index.html)
│   │   └── style.css     # UI styles (inlined at build)
│   └── common/
│       └── types.ts      # Shared message types between plugin & UI
├── dist/                  # Build output (gitignored)
│   ├── code.js
│   └── ui.html
└── assets/
    ├── icon-128.png       # Plugin icon 128x128
    └── cover.png          # Marketplace cover image
```

### Two-Context Communication

Figma plugins operate in two isolated contexts:

| Context | File | Access |
|---|---|---|
| **Sandbox** (main thread) | `code.ts` → `code.js` | Figma API (`figma.*`), no DOM |
| **UI** (iframe) | `ui.html` + inlined JS | DOM, Canvas API, no Figma API |

Communication is via `figma.ui.postMessage()` ↔ `parent.postMessage({ pluginMessage: ... }, '*')`.

---

## Implementation Steps

### Step 1: Project Setup

1. Create plugin via Figma Desktop App → Plugins → Development → New Plugin → "With UI & browser APIs".
2. Replace generated boilerplate with the project structure above.
3. Install dependencies:
   ```bash
   npm init -y
   npm install --save-dev vite vite-plugin-singlefile typescript \
     vitest vitest-canvas-mock @figma/plugin-typings
   ```
   **Toolchain note:** This project uses Vite (VoidZero ecosystem) as the build tool. Figma's older docs default to Webpack, but there is no Webpack requirement — Figma only needs a `code.js` and a single `ui.html` with all JS/CSS inlined. Vite + `vite-plugin-singlefile` handles this with far less config and faster builds. When Vite+ (the unified VoidZero toolchain) reaches stable, consider migrating via `vp migrate` to consolidate linting/formatting/testing under one dependency.
4. Configure `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "node",
       "strict": true,
       "outDir": "./dist",
       "typeRoots": [
         "./node_modules/@types",
         "./node_modules/@figma"
       ]
     },
     "include": ["src/**/*.ts"]
   }
   ```
5. Configure `vite.config.ui.ts` (UI build — inlines everything into one HTML file):
   ```typescript
   import { defineConfig } from 'vite';
   import { viteSingleFile } from 'vite-plugin-singlefile';
   import path from 'path';

   export default defineConfig({
     plugins: [viteSingleFile()],
     root: path.resolve('src/ui'),
     build: {
       outDir: path.resolve('dist'),
       emptyOutDir: false,
       target: 'es2020',
       rollupOptions: {
         output: { entryFileNames: '[name].js' },
       },
     },
     resolve: {
       alias: { '@common': path.resolve('src/common') },
     },
   });
   ```
6. Configure `vite.config.plugin.ts` (sandbox build — plain JS bundle):
   ```typescript
   import { defineConfig } from 'vite';
   import path from 'path';

   export default defineConfig({
     build: {
       lib: {
         entry: path.resolve('src/plugin/code.ts'),
         formats: ['iife'],
         name: 'plugin',
         fileName: () => 'code.js',
       },
       outDir: path.resolve('dist'),
       emptyOutDir: false,
       target: 'es2020',
       rollupOptions: {
         output: { entryFileNames: 'code.js' },
       },
     },
     resolve: {
       alias: { '@common': path.resolve('src/common') },
     },
   });
   ```
7. Configure `manifest.json`:
   ```json
   {
     "name": "Flatten Blend",
     "id": "<assigned-by-figma>",
     "api": "1.0.0",
     "main": "dist/code.js",
     "ui": "dist/ui.html",
     "editorType": ["figma"],
     "documentAccess": "dynamic-page",
     "networkAccess": {
       "allowedDomains": ["none"]
     }
   }
   ```

### Step 2: Sandbox Logic (`code.ts`)

1. On plugin launch, call `figma.showUI(__html__, { width: 320, height: 480 })`.
2. Read `figma.currentPage.selection`.
3. Validate selection:
   - Exactly 1 node selected.
   - Node supports `exportAsync` (i.e., is a `SceneNode`).
4. Analyze the node's blend mode context:
   - Read the node's own `blendMode` and `opacity`.
   - If node has children (Frame, Group, Component, Instance), recursively scan the subtree for any descendant with a non-`NORMAL` blend mode. Collect a list of blend modes found.
   - This is for **display purposes only** — the export pipeline is identical regardless.
5. Send node metadata to UI:
   - `name`, `width`, `height`
   - `nodeBlendMode` — the node's own blend mode
   - `childBlendModes` — deduplicated list of non-NORMAL blend modes found in descendants (may be empty)
   - `nodeType` — e.g. `"FRAME"`, `"RECTANGLE"`, `"GROUP"`, etc.
6. Listen for `'export-request'` message from UI containing `{ referenceColor: string, scale: number }`.
7. On export request:
   - **Step A:** Clone the selected node. This deep-clones the entire subtree (children, their blend modes, effects, masks — everything).
   - **Step B:** Create a temporary `Rectangle` behind the clone, same dimensions, filled with the reference color, opacity 1, blend mode `NORMAL`.
   - **Step C:** Create a temporary wrapper `Frame` containing both (clone on top of rectangle).
   - **Step D:** Set the wrapper frame's blend mode to `NORMAL` (not `PASS_THROUGH`) to contain all blending within it.
   - **Step E:** Export the wrapper frame via `exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } })` → this gives us the **composited RGB**. Figma's renderer walks the entire cloned subtree, applying every child's blend mode against siblings and the reference color background. This is the key insight: one `exportAsync` call handles arbitrary nesting of blend modes.
   - **Step F:** Remove the background rectangle from the wrapper. Force the clone's blend mode to `NORMAL` (preserve its children's blend modes — but those now have nothing external to blend against, which is fine — we only need alpha). Export the wrapper again → this gives us the **original alpha channel**.
   - **Step G:** Send both `Uint8Array` buffers to the UI: `{ composited: [...], alphaSource: [...], width, height }`.
   - **Step H:** Clean up all temporary nodes (wrapper frame, clone, rectangle).

**Important nuance on Step F (alpha extraction):** When the selected node is a Frame with children that have their own blend modes (like the shadow layer example), the alpha export captures the combined alpha of the entire subtree rendered in isolation. Children with multiply blend mode will still interact with *each other* in the alpha pass — which is correct, because that's the shape of the visible content. What we're removing is the interaction with the *external* reference color background.

### Step 3: Pixel Compositing (`composite.ts` — runs in UI context)

1. Decode both PNGs onto offscreen `<canvas>` elements using `createImageBitmap()`.
2. Extract raw RGBA pixel data via `getImageData()`.
3. For each pixel `(i)`:
   ```
   output.R[i] = composited.R[i]
   output.G[i] = composited.G[i]
   output.B[i] = composited.B[i]
   output.A[i] = alphaSource.A[i]
   ```
4. Put the combined pixel data back onto a canvas.
5. Export via `canvas.toBlob('image/png')`.

### Step 4: UI (`ui.html` + `ui.ts`)

The UI must include:

1. **Header** — Plugin name + short description.
2. **Selection info** — Shows:
   - Selected node name, type (Layer / Frame / Group / Component), and dimensions.
   - Node's own blend mode.
   - If the node has children with blend modes: a summary line, e.g. "Children use: Multiply, Screen" — so the user understands why flattening is needed even if the parent is NORMAL.
3. **Reference color picker** — HEX input + native color input. Smart default based on the *most impactful* blend mode detected (node's own, or the first non-NORMAL child blend mode). User can always override.
4. **Scale selector** — Dropdown: 1x, 2x, 3x, 4x. Default 2x.
5. **Preview area** — Shows a checkerboard-background preview of the output (so transparency is visible).
6. **Export button** — Triggers the compositing pipeline and initiates browser download.
7. **Status/progress indicator** — Shows current step ("Compositing...", "Encoding...", "Done").
8. **Warning text** — "The output looks correct only on backgrounds close to the reference color. The further the actual background diverges, the less accurate the result."

**UI behavior:**
- If no valid node is selected, show an instructional empty state.
- If neither the node nor any descendant has a non-NORMAL blend mode, show a warning that flattening is unnecessary (but still allow export — the user may have reasons).
- Disable the export button during processing.
- After export, auto-trigger download of the PNG with filename: `{node-name}-flattened-{scale}x.png`. (Drop blend mode from filename when the node is a frame with mixed child blend modes — it would be confusing.)

### Step 5: Download Mechanism

In the UI iframe, convert the canvas blob to a downloadable file:

```typescript
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();
URL.revokeObjectURL(url);
```

### Step 6: Build & Bundle

Vite handles both build targets. Two separate configs are needed because Figma's plugin has two isolated contexts (sandbox and UI iframe) that must be bundled independently:

- **UI build** (`vite.config.ui.ts`): Compiles `src/ui/main.ts` + CSS and inlines everything into a single `dist/ui.html` via `vite-plugin-singlefile`. Figma requires a single HTML file with all JS/CSS inlined — no external references allowed.
- **Plugin build** (`vite.config.plugin.ts`): Compiles `src/plugin/code.ts` → `dist/code.js` as an IIFE bundle (no imports, Figma sandbox doesn't support modules).

Scripts in `package.json`:
```json
{
  "scripts": {
    "build:ui": "vite build --config vite.config.ui.ts",
    "build:plugin": "vite build --config vite.config.plugin.ts",
    "build": "npm run build:plugin && npm run build:ui",
    "dev:ui": "vite build --config vite.config.ui.ts --watch",
    "dev:plugin": "vite build --config vite.config.plugin.ts --watch",
    "dev": "concurrently \"npm run dev:plugin\" \"npm run dev:ui\"",
    "test": "vitest run --config vite.config.test.ts",
    "test:watch": "vitest --config vite.config.test.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

> **Note:** `concurrently` is an optional dev dependency for running both watchers in parallel. Alternatively, use two terminal tabs.

### Step 7: Local Development & Testing

Figma plugins are tested locally before publishing. No marketplace submission needed during development.

**Initial setup (once):**
1. Run `npm run build` to produce `dist/code.js` + `dist/ui.html`.
2. Open **Figma Desktop App** (required — browser Figma doesn't support local dev plugins).
3. Right-click on canvas → Plugins → Development → **Import plugin from manifest…**
4. Navigate to your project folder and select `manifest.json`.

**Development loop:**
1. Run `npm run dev` — starts both Vite watchers.
2. Make code changes → Vite rebuilds automatically on save.
3. In Figma: right-click → Plugins → Development → **Flatten Blend** to re-run.
4. No reimport needed — Figma picks up the rebuilt `dist/` files automatically.
5. Open Figma's developer console (Menu → Plugins → Development → Open Console) to see `console.log` output from `code.ts` and plugin errors.

**Testing checklist for local dev:**
- Test with a single layer (blend mode on the layer itself).
- Test with a frame containing children with blend modes (the shadow + character scenario).
- Test with a frame that itself has a blend mode, containing children that also have blend modes.
- Test with no selection, invalid selection (e.g., a page node), and a NORMAL-only selection.
- Test at all scale factors (1x, 2x, 3x, 4x).
- Test with different reference colors.
- Verify no orphaned temp nodes remain after export (check layers panel).
- Verify no orphaned temp nodes remain after cancelling mid-export or after an error.

---

## Acceptance Criteria

### Functional

- [ ] Plugin launches without errors from Figma Desktop → Plugins → Development menu.
- [ ] Correctly detects blend modes on the selected node AND its descendants, displays both in the UI.
- [ ] Shows empty/instructional state when nothing is selected or selection is invalid.
- [ ] Color picker smart-defaults based on the most impactful blend mode detected (node or children).
- [ ] Produces a transparent PNG where:
  - RGB values match the visual result of all blend modes in the subtree composited against the reference color.
  - Alpha channel matches the combined transparency of the entire subtree rendered in isolation.
- [ ] Works on **single layers** with a blend mode (e.g., one multiply image).
- [ ] Works on **frames/groups with children** where children have blend modes but the parent is NORMAL (e.g., character + shadow layer example).
- [ ] Works on **frames/groups that themselves have a blend mode**, with children that also have blend modes (nested blending).
- [ ] Preview area shows correct output on checkerboard background before download.
- [ ] Works with **all 17 non-NORMAL blend modes** — darken group (`MULTIPLY`, `DARKEN`, `LINEAR_BURN`, `COLOR_BURN`), lighten group (`SCREEN`, `LIGHTEN`, `LINEAR_DODGE`, `COLOR_DODGE`), contrast group (`OVERLAY`, `SOFT_LIGHT`, `HARD_LIGHT`), comparative group (`DIFFERENCE`, `EXCLUSION`), component group (`HUE`, `SATURATION`, `COLOR`, `LUMINOSITY`), and `PASS_THROUGH`.
- [ ] Auto-selects the correct default reference color per blend mode category (white/black/gray per the Smart Default Logic table).
- [ ] User can override the auto-selected reference color for any blend mode.
- [ ] Works with layers that have partial opacity (e.g., 50% opacity multiply).
- [ ] Works at all scale factors: 1x, 2x, 3x, 4x.
- [ ] No temporary nodes left behind in the document after export (even if export fails).
- [ ] Plugin UI is responsive and doesn't freeze during processing.

### Edge Cases

- [ ] Graceful handling when neither node nor any descendant has a non-NORMAL blend mode (warn, still allow export).
- [ ] Graceful handling of very large nodes (>4000px) — show warning about memory/performance.
- [ ] Handles layers inside components and instances (clone first to avoid modifying originals).
- [ ] Handles layers with effects (drop shadows, blurs) — these should be included in the export.
- [ ] Handles vector layers, text layers, image fills, groups, and frames.
- [ ] Handles layers with masks — the mask should affect the alpha channel.
- [ ] Handles deeply nested structures (frame → group → frame → layer with blend mode).
- [ ] Handles mixed blend modes in the same subtree (e.g., one child is MULTIPLY, another is SCREEN).
- [ ] Cleans up temp nodes even if an error occurs mid-pipeline (use try/finally).

### Performance

- [ ] Export of a 1000x1000px layer at 2x completes in under 5 seconds.
- [ ] No memory leaks from canvas elements or object URLs.
- [ ] Temp nodes exist for the minimum time necessary.

---

## Known Risks & Issues to Address

### 1. Alpha Channel Accuracy

**Risk:** The "export clone with NORMAL mode" approach may not perfectly capture the original alpha if the layer has complex internal structure (nested groups with their own blend modes).

**Mitigation:** Document this limitation. For complex layer trees, recommend the user flatten the subtree first (Ctrl+E), then use the plugin.

### 2. Color Space Mismatch

**Risk:** Figma can work in sRGB or Display P3. Canvas API in the iframe may default to sRGB. Mismatch produces color shifts.

**Mitigation:** Export both PNGs with the same color profile settings. Use `{ colorProfile: 'SRGB' }` in `exportAsync` if available. Document that the plugin operates in sRGB.

### 3. Large Layer Memory Pressure

**Risk:** A 4000x4000 layer at 4x = 16000x16000 pixels = ~1GB uncompressed RGBA. This will crash the browser tab.

**Mitigation:** Calculate estimated memory before processing. Show a hard warning/block above a threshold (e.g., output dimensions > 8192px on any axis). Suggest reducing scale.

### 4. Temporary Node Cleanup

**Risk:** If the plugin crashes or the user closes the plugin mid-export, temp nodes remain in the document.

**Mitigation:** Wrap all node creation/deletion in `try/finally`. Use unique naming convention for temp nodes (e.g., `__bf_temp_*`) so they can be identified. On plugin startup, scan for and delete any orphaned temp nodes from previous runs.

### 5. `figma.flatten()` Limitations

**Risk:** `figma.flatten()` merges vector geometry, not raster compositing. It won't help for raster blend mode flattening. Don't use it for the core compositing pipeline — use `exportAsync` instead.

**Mitigation:** Use the dual-export approach (composited + alpha source) as described in Step 2.

### 6. Component Instance Restrictions

**Risk:** Modifying children of instances or remote components may throw errors.

**Mitigation:** Always `.clone()` the node before any modifications. Work on the clone, never the original.

### 7. Non-Paint Blend Modes

**Risk:** Blend modes can be set on the **layer** or on individual **fills/strokes**. Plugin should handle both cases.

**Mitigation:** Check both `node.blendMode` and iterate `node.fills` for per-fill blend modes. Display the effective blend mode in the UI.

---

## Distribution Requirements

### Figma Community Marketplace

Per Figma's review guidelines:

1. **Review process:** First submission requires Figma review (5–10 business days). Subsequent updates publish immediately.
2. **manifest.json requirements:**
   - `"api": "1.0.0"` — use the supported API version.
   - `"documentAccess": "dynamic-page"` — required for all new plugins.
   - `"networkAccess": { "allowedDomains": ["none"] }` — this plugin needs zero network access.
   - `"editorType": ["figma"]` — Figma Design only (not FigJam).
3. **Assets required for submission:**
   - Plugin icon: 128x128 PNG.
   - Cover image for Community page.
   - Description text (what it does, how to use it, limitations).
   - Support contact (email or link).
   - At least 1 screenshot or GIF showing the plugin in action.
4. **Quality standards:**
   - No crashes.
   - No orphaned temp nodes.
   - Graceful error handling with user-friendly messages (no raw JS errors).
   - Efficient memory/CPU usage.
   - Works on Windows, macOS, and Figma Web.
5. **Legal:**
   - Comply with Figma Developer Terms, Creator Agreement, and Community Terms.
   - Include a LICENSE in the repo.
   - No copyrighted material.
6. **Pricing:** Free plugin. No third-party accounts required. No network access.

### GitHub Repository

**Repository name:** `figma-blend-flatten`

**`.gitignore`:**
```gitignore
node_modules/
dist/
*.js.map
.DS_Store
Thumbs.db
.env
.env.*
.vscode/
*.code-workspace
.eslintcache
coverage/
*.tsbuildinfo
```

> **Important:** Do NOT gitignore `manifest.json`. Figma needs it. Do NOT gitignore `dist/` if you want users to install from source without building. Recommended: gitignore `dist/` and document the build step in README.

**`README.md` must include:**
- What the plugin does (with GIF/screenshot).
- Why it exists (the Figma blend mode export limitation).
- How to install from Figma Community (link).
- How to install for development.
- How to build.
- How the algorithm works (brief).
- Known limitations.
- License (MIT recommended).

**`CHANGELOG.md`** — maintain from v1.0.0.

**Branch strategy:** `main` for stable releases. Tag releases as `v1.0.0`, `v1.1.0`, etc.

**CI (recommended):** GitHub Actions workflow to run `npm run typecheck && npm run test && npm run build` on push/PR to `main`. See TEST_SPEC.md for the full workflow YAML and test strategy.

---

## Supported Blend Modes

**All 17 non-NORMAL blend modes are supported from v1.0.0.** This is not a stretch goal — it's a direct consequence of the dual-export architecture. The plugin delegates compositing to Figma's renderer, so any blend mode Figma can render, the plugin can flatten. No per-mode code exists or is needed.

### Full List (from Figma Plugin API `BlendMode` type)

| Category | Modes | Default Reference Color |
|---|---|---|
| **Darken group** | `DARKEN`, `MULTIPLY`, `LINEAR_BURN`, `COLOR_BURN` | `#FFFFFF` (white) |
| **Lighten group** | `LIGHTEN`, `SCREEN`, `LINEAR_DODGE`, `COLOR_DODGE` | `#000000` (black) |
| **Contrast group** | `OVERLAY`, `SOFT_LIGHT`, `HARD_LIGHT` | `#808080` (50% gray) |
| **Comparative group** | `DIFFERENCE`, `EXCLUSION` | `#000000` (black) |
| **Component group** | `HUE`, `SATURATION`, `COLOR`, `LUMINOSITY` | `#FFFFFF` (white) |
| **Pass-through** | `PASS_THROUGH` | `#FFFFFF` (white) |

### Smart Default Logic

When the user selects a layer, the plugin reads its `blendMode` and auto-sets the reference color picker to the optimal default for that category. The user can always override this.

**Rationale for defaults:**
- **Darken modes** produce identity (no visible effect) against white — so white is the neutral base that captures the full darkening contribution.
- **Lighten modes** produce identity against black — so black captures the full lightening contribution.
- **Contrast modes** pivot around 50% gray — mid-gray captures the most balanced result.
- **Comparative modes** produce identity (zero difference) against black.
- **Component modes** are best captured against white as a neutral luminance base.

The UI should display these defaults with a brief tooltip explaining why that color was chosen, so the user can make an informed decision to override.

---

## Future Enhancements (Out of Scope for v1)

- Batch export of multiple selected layers.
- Export as WebP in addition to PNG.
- "Smart" reference color detection from the layer beneath the selected one.
- Option to replace the original layer with the flattened result in-place.
- Preset reference colors saved per-file via `figma.clientStorage`.