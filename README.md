# Blend Flatten

A Figma plugin that exports any layer with a non-NORMAL blend mode as a flattened, transparent PNG — so it composites correctly in any design tool or browser.

## Why it exists

Figma's built-in export does not honour blend modes. When you export a layer set to Multiply, Screen, Overlay, or any of the other 17 non-NORMAL blend modes, you get a flat PNG with the blend effect baked against a white background — not a transparent PNG that preserves the visual intent. Blend Flatten works around this limitation by rendering the layer against a chosen reference colour, then mathematically inverting the composite to recover the per-pixel alpha, giving you a transparent PNG that looks identical when placed back over the same reference colour in any other tool.

## Install from Figma Community

Search for **Blend Flatten** in the Figma Community plugins tab, or open the link directly from the Figma Community page, and click **Install**.

The published plugin works in both **Figma Desktop** and **Figma Web**.

## How to build for development

### Prerequisites

- Node 20+
- npm 10+
- Figma Desktop (required for loading a local development build)

### Setup

```bash
git clone https://github.com/wojciechbak/flatten-blend.git
cd flatten-blend
npm install
npm run build
```

### Load in Figma Desktop

1. Open Figma Desktop.
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select the `manifest.json` file at the root of this repository.

> Note: loading a plugin from a local manifest file requires **Figma Desktop**. The published plugin (installed from the Community) works in both Desktop and Web.

## Development (watch mode)

```bash
npm run dev
```

Vite will watch for changes and rebuild automatically. Reload the plugin in Figma Desktop to pick up updates.

## Type checking

```bash
npm run typecheck
```

## How it works

1. **Select a layer** — the plugin reads the layer's blend mode and suggests a smart reference colour (e.g. white for Multiply/Darken group, black for Screen/Lighten group, 50% grey for contrast modes).
2. **Choose a reference colour** — you can override the suggestion with any colour via the colour picker.
3. **Choose export scale** — 1x, 2x, 3x, or 4x.
4. **Render** — the plugin clones the target layer twice, places each clone on a solid-colour rectangle (reference colour and its inverse), exports both as PNGs, then uses pixel arithmetic to solve for the true alpha channel.
5. **Download** — the resulting transparent PNG is handed back to the Figma UI and downloaded through the browser save dialog. All temporary nodes are removed in a `try/finally` block so the document is never left in a dirty state.

## Known limitations

- **Visual accuracy depends on reference colour.** For some blend modes (e.g. Hue, Saturation, Color, Luminosity) the alpha-recovery math is approximate; choose a neutral grey for best results.
- **Nested blend modes are not supported.** If the target layer contains children that themselves use non-NORMAL blend modes, the export represents only the outermost composite.
- **Large or high-resolution layers may hit Figma's memory limits.** If the export fails, try a lower scale.
- **Colour profile is sRGB.** Figma exports in sRGB; wide-gamut colour spaces are not preserved.

## License

MIT — see [LICENSE](LICENSE).
