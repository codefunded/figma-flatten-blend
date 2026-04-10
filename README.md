<div align="center">

# Flatten Blend

**Export Figma layers with blend modes as correct, transparent PNGs.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-a259ff?logo=figma&logoColor=white)](https://www.figma.com/community/plugin/flatten-blend)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.json)

</div>

---

## The Problem

Figma cannot export a layer with a blend mode (Multiply, Screen, Overlay, and all the others) as a transparent PNG. The blend effect disappears, colors shift, or a white background appears out of nowhere. This isn't a bug — blend modes are mathematically context-dependent, and without a background to blend against, the export has no meaning.

**This has been a known, unsolved pain point since at least 2021.** Dozens of forum threads, zero solutions, until now.

---

## Demo

<video src="demo.mp4" autoplay loop muted playsinline width="100%"></video>

---

## Install

**[→ Get it from the Figma Community](https://www.figma.com/community/plugin/flatten-blend)**

Search for **"Flatten Blend"** in the Figma Community plugins tab and click **Install**. Works in both Figma Desktop and Figma Web. Free, no account required.

---

## Features

- **All 17 blend modes** — Multiply, Screen, Overlay, Soft Light, Hard Light, Darken, Lighten, Color Dodge, Color Burn, Linear Dodge, Linear Burn, Difference, Exclusion, Hue, Saturation, Color, Luminosity
- **Smart reference color defaults** — automatically picks the best reference background per blend mode category:

  | Category | Modes | Default |
  |---|---|---|
  | Darken | Multiply, Darken, Linear Burn, Color Burn | White `#FFFFFF` |
  | Lighten | Screen, Lighten, Linear Dodge, Color Dodge | Black `#000000` |
  | Contrast | Overlay, Soft Light, Hard Light | 50% Gray `#808080` |
  | Comparative | Difference, Exclusion | Black `#000000` |
  | Component | Hue, Saturation, Color, Luminosity | White `#FFFFFF` |

- **Export scales** — 1×, 2×, 3×, 4×
- **Live preview** — checkerboard canvas shows the transparent result before you download
- **100% local** — no network access, no accounts, no telemetry. Your designs never leave Figma.

---

## How It Works

1. **Select a layer** with any blend mode (or a frame/group that contains blend-mode layers).
2. **Open Flatten Blend.** The plugin reads the layer's blend mode and auto-selects a reference color.
3. **Override the reference color** if needed, choose your export scale, and hit **Export**.

Under the hood, the plugin renders your layer twice — once against a pure white background and once against pure black — then uses the difference between the two renders to mathematically recover the true per-pixel alpha. This is the same technique used internally by professional compositing software, and it handles complex cases like MULTIPLY layers with white-background images or nested blend mode trees.

The result: a transparent PNG whose colors match exactly what you see on canvas in Figma.

---

## Development

### Prerequisites

- Node 20+
- npm 10+
- Figma Desktop (required for loading a local build)

### Setup

```bash
git clone https://github.com/wojciechbak/flatten-blend.git
cd flatten-blend
npm install
npm run build
```

### Load in Figma Desktop

1. Open Figma Desktop.
2. **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` at the root of this repo.

### Watch mode

```bash
npm run dev
```

Vite rebuilds on every save. Reload the plugin in Figma Desktop to pick up changes.

### Type check

```bash
npm run typecheck
```

---

## Known Limitations

- **Approximate for some component blend modes.** Hue, Saturation, Color, and Luminosity modes are non-linear and may show slight color inaccuracies. A neutral gray reference gives the best results.
- **Large exports may hit Figma's memory limit.** If the export fails, try a lower scale factor.
- **sRGB only.** Wide-gamut (Display P3) color spaces are not preserved.

---

## Support This Project

If Flatten Blend saved you time, consider buying me a coffee. It helps me keep the plugin free and maintained.

<div align="center">

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=github&logoColor=white)](https://github.com/sponsors/wojciechbak)

</div>

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for bug reports, pull request guidelines, and code style notes.

## License

MIT — see [LICENSE](LICENSE).
