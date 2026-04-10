# Flatten Blend — Test Specification

## Role Definition

You are a pragmatic test engineer. You know that testing 10% of code prevents 90% of bugs — if you pick the right 10%. You focus tests on **pure logic** that can break silently, skip what can only be verified visually in Figma, and keep the test suite fast enough that nobody disables it.

---

## Testing Philosophy

This is a Figma plugin. Two hard constraints shape the testing strategy:

1. **No Figma API in CI.** The `figma` global doesn't exist outside the Figma Desktop App. Anything that touches `figma.*` cannot be unit-tested — it's tested manually via the local dev workflow (see SPEC.md, Step 7).
2. **No real Canvas API in CI.** The pixel compositing runs in a browser iframe. In CI, we use `jsdom` + `vitest-canvas-mock` to verify logic flow, but not pixel-accurate output.

This means: **test the pure functions, mock the platform boundaries.**

### What We Test (the right 10%)

| Layer | What | Why |
|---|---|---|
| **Blend mode classification** | `getDefaultReferenceColor()`, `getBlendModeCategory()`, `hasNonNormalBlendModes()` | Core decision logic. Wrong default = wrong output. Easy to test, easy to break. |
| **Message protocol** | Message types between sandbox ↔ UI | Contract violations crash the plugin silently. Type-check + validate at runtime. |
| **Pixel compositing** | `compositePixels(composited, alphaSource)` | The algorithm is 4 lines but if R/G/B/A indexing is off by one, everything is wrong. |
| **Input validation** | HEX color parsing, scale validation, selection validation helpers | User input edge cases (3-digit hex, invalid chars, zero scale). |
| **Filename generation** | `generateFilename(name, scale)` | String formatting bugs are invisible until someone downloads "undefined-NaN.png". |

### What We Don't Test

| What | Why |
|---|---|
| `figma.currentPage.selection` | Requires Figma runtime. Tested manually. |
| `node.exportAsync()` | Requires Figma runtime. Tested manually. |
| `node.clone()`, temp node creation/cleanup | Requires Figma runtime. Tested manually. |
| Canvas rendering accuracy | Requires real browser. Tested manually in Figma plugin UI preview. |
| UI layout/styling | Visual. Tested manually. |

---

## Tooling

### Stack

```
vitest              — test runner (Vite-native, zero-config with existing vite setup)
vitest-canvas-mock  — mock Canvas API for jsdom environment
```

### Install

```bash
npm install --save-dev vitest vitest-canvas-mock
```

### Configuration

Add to `vite.config.test.ts` (separate config for tests):

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@common': path.resolve('src/common'),
      '@plugin': path.resolve('src/plugin'),
      '@ui': path.resolve('src/ui'),
    },
  },
});
```

### Setup File (`tests/setup.ts`)

```typescript
import 'vitest-canvas-mock';
```

### Scripts (add to `package.json`)

```json
{
  "scripts": {
    "test": "vitest run --config vite.config.test.ts",
    "test:watch": "vitest --config vite.config.test.ts"
  }
}
```

---

## Test Structure

```
tests/
├── setup.ts                     # vitest-canvas-mock init
├── blend-mode-utils.test.ts     # blend mode classification & defaults
├── color-utils.test.ts          # HEX parsing & validation
├── composite.test.ts            # pixel compositing logic
├── messages.test.ts             # message protocol validation
└── filename.test.ts             # filename generation
```

---

## Test Cases

### 1. `blend-mode-utils.test.ts`

Tests for functions in `src/common/blend-mode-utils.ts`.

```typescript
// Functions under test:
// getBlendModeCategory(mode: BlendMode): 'darken' | 'lighten' | 'contrast' | 'comparative' | 'component' | 'other'
// getDefaultReferenceColor(mode: BlendMode): string
// hasNonNormalBlendModes(modes: BlendMode[]): boolean
```

**Cases:**

| Test | Input | Expected |
|---|---|---|
| Darken group classification | `'MULTIPLY'` | `'darken'` |
| Darken group classification | `'COLOR_BURN'` | `'darken'` |
| Lighten group classification | `'SCREEN'` | `'lighten'` |
| Lighten group classification | `'COLOR_DODGE'` | `'lighten'` |
| Contrast group classification | `'OVERLAY'` | `'contrast'` |
| Contrast group classification | `'HARD_LIGHT'` | `'contrast'` |
| Comparative group classification | `'DIFFERENCE'` | `'comparative'` |
| Component group classification | `'HUE'` | `'component'` |
| NORMAL is 'other' | `'NORMAL'` | `'other'` |
| PASS_THROUGH is 'other' | `'PASS_THROUGH'` | `'other'` |
| Default color for darken | `'MULTIPLY'` | `'#FFFFFF'` |
| Default color for lighten | `'SCREEN'` | `'#000000'` |
| Default color for contrast | `'OVERLAY'` | `'#808080'` |
| Default color for comparative | `'DIFFERENCE'` | `'#000000'` |
| Default color for component | `'LUMINOSITY'` | `'#FFFFFF'` |
| Default color for NORMAL | `'NORMAL'` | `'#FFFFFF'` |
| Has non-normal: empty array | `[]` | `false` |
| Has non-normal: only NORMAL | `['NORMAL']` | `false` |
| Has non-normal: mixed | `['NORMAL', 'MULTIPLY']` | `true` |
| Has non-normal: all non-normal | `['SCREEN', 'OVERLAY']` | `true` |
| All 17 modes return valid category | *(loop all modes)* | No `undefined`, no throws |

### 2. `color-utils.test.ts`

Tests for functions in `src/common/color-utils.ts`.

```typescript
// Functions under test:
// parseHex(input: string): { r: number, g: number, b: number } | null
// isValidHex(input: string): boolean
// hexToRgbNormalized(hex: string): { r: number, g: number, b: number }  // 0-1 range for Figma
```

**Cases:**

| Test | Input | Expected |
|---|---|---|
| Valid 6-digit hex | `'#FF0000'` | `{ r: 255, g: 0, b: 0 }` |
| Valid 6-digit no hash | `'FF0000'` | `{ r: 255, g: 0, b: 0 }` |
| Valid lowercase | `'#ff0000'` | `{ r: 255, g: 0, b: 0 }` |
| White | `'#FFFFFF'` | `{ r: 255, g: 255, b: 255 }` |
| Black | `'#000000'` | `{ r: 0, g: 0, b: 0 }` |
| Mid gray | `'#808080'` | `{ r: 128, g: 128, b: 128 }` |
| 3-digit hex rejected | `'#FFF'` | `null` |
| Too short | `'#FF00'` | `null` |
| Too long | `'#FF00001'` | `null` |
| Invalid chars | `'#GGGGGG'` | `null` |
| Empty string | `''` | `null` |
| Random garbage | `'pizza'` | `null` |
| isValidHex positive | `'#AABBCC'` | `true` |
| isValidHex negative | `'nope'` | `false` |
| Normalized white | `'#FFFFFF'` | `{ r: 1, g: 1, b: 1 }` |
| Normalized black | `'#000000'` | `{ r: 0, g: 0, b: 0 }` |
| Normalized mid-range | `'#800000'` | `r ≈ 0.502` |

### 3. `composite.test.ts`

Tests for `compositePixels()` in `src/ui/composite.ts`.

```typescript
// Function under test:
// compositePixels(
//   composited: Uint8ClampedArray,  // RGBA from composited export
//   alphaSource: Uint8ClampedArray, // RGBA from alpha-only export
//   width: number,
//   height: number
// ): Uint8ClampedArray  // output RGBA
```

**Cases:**

| Test | Scenario | Expected |
|---|---|---|
| Single opaque pixel | composited `[255, 0, 0, 255]`, alpha `[0, 0, 0, 255]` | output `[255, 0, 0, 255]` |
| Single transparent pixel | composited `[255, 0, 0, 255]`, alpha `[0, 0, 0, 0]` | output `[255, 0, 0, 0]` |
| Semi-transparent pixel | composited `[100, 150, 200, 255]`, alpha `[0, 0, 0, 128]` | output `[100, 150, 200, 128]` |
| Multiple pixels | 2x1 image, mixed alpha | Correct per-pixel RGB from composited, A from alpha |
| All transparent | 2x2, all alpha = 0 | All output alpha = 0, RGB preserved from composited |
| All opaque | 2x2, all alpha = 255 | Output identical to composited |
| Array length validation | Mismatched lengths | Throws error |
| Empty image (0 pixels) | Empty arrays | Returns empty array |
| Large-ish image (100x100) | Random data | Completes without error, correct length (40000) |

### 4. `messages.test.ts`

Tests for message type validation in `src/common/types.ts`.

```typescript
// Functions under test:
// isExportRequest(msg: unknown): msg is ExportRequest
// isNodeMetadata(msg: unknown): msg is NodeMetadata
// isExportResult(msg: unknown): msg is ExportResult
```

**Cases:**

| Test | Input | Expected |
|---|---|---|
| Valid export request | `{ type: 'export-request', referenceColor: '#FFFFFF', scale: 2 }` | `true` |
| Missing type field | `{ referenceColor: '#FFFFFF', scale: 2 }` | `false` |
| Wrong type value | `{ type: 'wrong', referenceColor: '#FFFFFF', scale: 2 }` | `false` |
| Invalid scale (0) | `{ type: 'export-request', referenceColor: '#FFFFFF', scale: 0 }` | `false` |
| Invalid scale (negative) | `{ type: 'export-request', referenceColor: '#FFFFFF', scale: -1 }` | `false` |
| Invalid color | `{ type: 'export-request', referenceColor: 'nope', scale: 2 }` | `false` |
| null input | `null` | `false` |
| undefined input | `undefined` | `false` |
| Valid node metadata | `{ type: 'node-metadata', name: 'Frame 1', ... }` | `true` |
| Valid export result | `{ type: 'export-result', composited: [...], alphaSource: [...], width: 100, height: 100 }` | `true` |

### 5. `filename.test.ts`

Tests for `generateFilename()` in `src/common/filename.ts`.

```typescript
// Function under test:
// generateFilename(nodeName: string, scale: number): string
```

**Cases:**

| Test | Input | Expected |
|---|---|---|
| Simple name, 1x | `'Frame 1', 1` | `'Frame 1-flattened-1x.png'` |
| Simple name, 2x | `'Frame 1', 2` | `'Frame 1-flattened-2x.png'` |
| Name with special chars | `'my/layer:v2', 2` | Slashes and colons stripped or replaced |
| Empty name | `'', 2` | `'untitled-flattened-2x.png'` |
| Very long name (200+ chars) | *(long string)* | Truncated to reasonable length |
| Name with spaces | `'Hero Image', 3` | `'Hero Image-flattened-3x.png'` |
| Unicode name | `'Ícône ñ', 1` | Preserved or safely encoded |

---

## GitHub Actions Workflow

File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build
```

**Order matters:** typecheck → test → build. Fail fast on the cheapest check first.

> **Note:** No `lint` step yet. When you add linting later (e.g., via oxlint or eslint), insert it between typecheck and test. If migrating to Vite+, `vp check` replaces typecheck + lint + format in one command.

---

## What's NOT in This Test Suite (and Why)

| Thing | Why it's excluded | How it's covered instead |
|---|---|---|
| Figma API calls | No `figma` global in CI | Manual testing (SPEC.md Step 7) |
| Real pixel output verification | Canvas mock doesn't render real pixels | Manual testing in Figma plugin preview |
| UI rendering | No DOM assertions needed for this plugin | Manual visual check |
| `exportAsync` behavior | Figma-internal | Manual testing |
| Temp node cleanup | Requires Figma document | Manual testing checklist |
| Cross-platform (Win/Mac/Web) | Requires each platform | Manual testing before marketplace submission |

---

## Future Test Additions (Out of Scope for v1)

- **Snapshot tests** for the compositing output if pixel-accurate canvas mock becomes available.
- **Integration test** using Figma's headless API (if/when they ship one).
- **Performance benchmark** for compositing large images (e.g., 4000x4000 at 4x) to catch regressions.
- **E2E with Playwright** if the plugin UI grows complex enough to warrant it.