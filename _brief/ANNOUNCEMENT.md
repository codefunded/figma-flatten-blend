# Flatten Blend — Announcement

## The One-Liner

**Flatten Blend** is a free Figma plugin that exports layers with blend modes (Multiply, Screen, Overlay, and all others) as transparent PNGs that actually look correct.

---

## The Problem

If you've ever used a blend mode in Figma and tried to export the layer as a transparent PNG, you know the pain. The export comes out wrong — colors shift, backgrounds appear out of nowhere, or the blend effect vanishes entirely.

This isn't a bug. It's a fundamental limitation: blend modes are context-dependent. Multiply needs something to multiply *against*. Screen needs something to screen *over*. When you export with transparency, that "something" is gone, and the math breaks.

The workaround until now? Manually flatten against a background, export as opaque, then strip the background in Photoshop. Or give up and use `mix-blend-mode` in CSS and hope your use case allows it.

**This problem has been reported repeatedly for years, with no solution:**

- [Preview and export a Color Burn layer image](https://forum.figma.com/ask-the-community-7/preview-and-export-a-color-burn-layer-image-8052) — Figma Forum, 2024. The only advice: "Blend modes don't work without a background."
- [Flatten layers with blending modes](https://www.reddit.com/r/FigmaDesign/comments/1abno8o/flatten_layers_with_blending_modes/) — Reddit r/FigmaDesign, 2024. No solution offered.
- [How to export layers with "Exclusion" layer mode](https://forum.figma.com/ask-the-community-7/how-to-export-layers-with-exclusion-layer-mode-32312) — Figma Forum, 2023. User: "I just want the transparent background." Response: no answer.
- [Export image with blend mode Lighten to PNG](https://forum.figma.com/ask-the-community-7/export-image-with-blend-mode-lighten-to-png-21300) — Figma Forum, 2023. User gets black background instead of transparency. Closed without resolution.

Designers have been asking for this since at least 2021. No plugin on the Figma Community marketplace solves it.

**Flatten Blend does.**

---

## How It Works

1. Select a layer with any blend mode.
2. Open Flatten Blend.
3. Pick a reference color (smart default chosen automatically based on your blend mode).
4. Hit Export.
5. Get a transparent PNG where the RGB pixels reflect the blended result and the alpha channel is preserved from the original layer.

The plugin uses Figma's own rendering engine to composite the blend, then surgically extracts the alpha channel from the original layer. No manual pixel math. No approximations. The output is what Photoshop would give you if you "Save As PNG" with a multiply layer — except you never have to leave Figma.

---

## What Makes It Different

### It's not Convertify

[Convertify](https://www.figma.com/community/plugin/849159306117999028/convertify-sketch-adobe-google) is a great plugin — for converting entire files between Figma, Sketch, Adobe XD, PSD, and other formats. It's a file format translator.

Flatten Blend does something completely different. It solves a specific pixel-level compositing problem: exporting a single blended layer as a correct, transparent PNG. Convertify doesn't attempt this. Neither does any other plugin on the marketplace.

### It supports all 17 blend modes

Not just Multiply. Not just the popular ones. Every non-Normal blend mode Figma offers:

| Darken group | Lighten group | Contrast group | Other |
|---|---|---|---|
| Darken | Lighten | Overlay | Difference |
| Multiply | Screen | Soft Light | Exclusion |
| Linear Burn | Linear Dodge | Hard Light | Hue |
| Color Burn | Color Dodge | | Saturation |
| | | | Color |
| | | | Luminosity |

Each category gets a smart default reference color (white for darken modes, black for lighten modes, 50% gray for contrast modes) so you get the best result with zero configuration. Override it anytime if you know your target background.

### It's free and offline

No accounts. No API keys. No network requests. Everything runs locally inside Figma. Your designs never leave your machine.

---

## Who Is This For

- **Designers** who use blend modes for overlays, textures, or color effects and need to hand off assets to developers as PNGs.
- **Design-to-dev handoff** where CSS `mix-blend-mode` isn't viable (email templates, native apps, game assets, print).
- **Icon and illustration designers** who use multiply/screen effects and need standalone transparent exports.
- **Anyone** who's ever searched "Figma export blend mode transparent PNG" and found only forum threads with no answers.

---

## Technical Details

- Built with TypeScript and Vite.
- Zero dependencies at runtime. Two dev dependencies: Vite + vite-plugin-singlefile.
- Uses Figma's Plugin API `exportAsync` to delegate compositing to Figma's renderer — no custom blend mode math, which means results are pixel-identical to what you see on canvas.
- Dual-export architecture: one render captures the composited RGB, another captures the original alpha. Combined in a `<canvas>` element in the plugin UI.
- Open source (MIT license).

---

## Links

- **Figma Community:** *(link after publish)*
- **GitHub:** *(link after publish)*
- **Spec:** See SPEC.md in the repository for full technical specification.

---

*Built because I needed it. Shared because everyone needs it.*