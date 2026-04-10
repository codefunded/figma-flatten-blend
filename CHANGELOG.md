# Changelog

All notable changes to Flatten Blend will be documented in this file.

## [1.0.0] — 2026-04-10

### Added

- Export any layer with a non-NORMAL blend mode as a transparent PNG
- Dual-background compositing algorithm (white + black reference renders) for mathematically correct alpha extraction — handles MULTIPLY with white-background images, nested blend mode trees, and all other cases
- Support for all 17 non-NORMAL Figma blend modes
- Smart reference color defaults per blend mode category (white for darken group, black for lighten group, 50% gray for contrast group)
- User-overridable reference color picker (hex input + native color swatch)
- Export scale selector: 1×, 2×, 3×, 4×
- Live preview canvas with checkerboard transparency indicator
- Status/progress indicator (Requesting export → Compositing pixels → Encoding → Done)
- Automatic download of the exported PNG on completion
- Orphan node cleanup on plugin startup (removes any `__bf_temp_*` nodes left from previous crashed runs)
- All temporary nodes cleaned up in `try/finally` — document is never left dirty
- 8192px per-axis output guard with user-friendly error message
