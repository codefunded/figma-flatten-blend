// src/ui/composite.ts
// Pixel compositing — UI iframe context only. No figma.* APIs.

/**
 * Dual-background alpha extraction.
 *
 * Given the same scene rendered once on pure white and once on pure black,
 * extracts a true RGBA result that composites correctly on ANY background:
 *
 *   diff[c]  = white[c] - black[c]          (per channel, 0–255)
 *   alpha    = 255 - max(diff.R, diff.G, diff.B)
 *   color[c] = black[c] * 255 / alpha       (unmultiply; clamped to 255)
 *
 * Why this works:
 *   - Fully transparent area   → white shows bg (255), black shows bg (0)  → diff=255, alpha=0
 *   - Opaque pixel (NORMAL)    → same on both backgrounds                  → diff=0,   alpha=255
 *   - MULTIPLY white pixel     → white×white=255, white×black=0            → diff=255, alpha=0  ✓
 *   - MULTIPLY shadow (gray N) → N on white, 0 on black                    → diff=N,   alpha=255-N  ✓
 */
export function compositePixels(
  whiteBg: Uint8ClampedArray,
  blackBg: Uint8ClampedArray,
): Uint8ClampedArray {
  if (whiteBg.length !== blackBg.length) {
    throw new Error(
      `Array length mismatch: whiteBg=${whiteBg.length}, blackBg=${blackBg.length}`,
    );
  }
  if (whiteBg.length % 4 !== 0) {
    throw new Error(`Array length must be a multiple of 4, got ${whiteBg.length}`);
  }

  const output = new Uint8ClampedArray(whiteBg.length);

  for (let i = 0; i < whiteBg.length; i += 4) {
    const rW = whiteBg[i + 0], gW = whiteBg[i + 1], bW = whiteBg[i + 2];
    const rB = blackBg[i + 0], gB = blackBg[i + 1], bB = blackBg[i + 2];

    const dR = rW - rB;
    const dG = gW - gB;
    const dB = bW - bB;

    const alpha = 255 - Math.max(dR, dG, dB);

    let r = 0, g = 0, b = 0;
    if (alpha > 0) {
      r = Math.min(255, Math.round(rB * 255 / alpha));
      g = Math.min(255, Math.round(gB * 255 / alpha));
      b = Math.min(255, Math.round(bB * 255 / alpha));
    }

    output[i + 0] = r;
    output[i + 1] = g;
    output[i + 2] = b;
    output[i + 3] = alpha;
  }

  return output;
}

/**
 * Decodes a PNG byte array into ImageData via an OffscreenCanvas.
 */
async function decodeToImageData(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<ImageData> {
  const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for compositing');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Full compositing pipeline: decodes two PNGs (white-bg and black-bg renders),
 * runs dual-background extraction, returns a transparent PNG Blob.
 */
export async function compositeBlob(
  whiteBgBytes: Uint8Array,
  blackBgBytes: Uint8Array,
  width: number,
  height: number,
): Promise<Blob> {
  const [whiteBgData, blackBgData] = await Promise.all([
    decodeToImageData(whiteBgBytes, width, height),
    decodeToImageData(blackBgBytes, width, height),
  ]);

  const output = compositePixels(whiteBgData.data, blackBgData.data);

  const outputCanvas = new OffscreenCanvas(width, height);
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for output canvas');
  ctx.putImageData(new ImageData(output as ImageDataArray, width, height), 0, 0);

  return outputCanvas.convertToBlob({ type: 'image/png' });
}
