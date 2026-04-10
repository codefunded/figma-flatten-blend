// src/ui/composite.ts
// Pixel compositing — UI iframe context only. No figma.* APIs.

/**
 * Pure pixel compositor. Combines blend-mode-aware RGB with original alpha.
 * No canvas or DOM required — operates on raw RGBA arrays.
 *
 * @param composited - RGBA pixel data from the blend-mode-composited render (solid bg).
 *   RGB channels = blend-mode-composited pixels. Alpha channel = ignored (fully opaque).
 * @param alphaSource - RGBA pixel data from the NORMAL-mode render (no background).
 *   Alpha channel = true content opacity. RGB channels = ignored.
 * @returns New Uint8ClampedArray with baked RGB and correct alpha.
 * @throws If array lengths don't match or aren't a multiple of 4.
 */
export function compositePixels(
  composited: Uint8ClampedArray,
  alphaSource: Uint8ClampedArray,
): Uint8ClampedArray {
  if (composited.length !== alphaSource.length) {
    throw new Error(
      `Array length mismatch: composited=${composited.length}, alphaSource=${alphaSource.length}`,
    );
  }
  if (composited.length % 4 !== 0) {
    throw new Error(`Array length must be a multiple of 4, got ${composited.length}`);
  }

  const output = new Uint8ClampedArray(composited.length);
  for (let i = 0; i < composited.length; i += 4) {
    output[i + 0] = composited[i + 0]; // R from blend-composited render
    output[i + 1] = composited[i + 1]; // G from blend-composited render
    output[i + 2] = composited[i + 2]; // B from blend-composited render
    output[i + 3] = alphaSource[i + 3]; // A from isolated (NORMAL) render
  }
  return output;
}

/**
 * Decodes a PNG byte array into ImageData via an OffscreenCanvas.
 *
 * PRECONDITION: `bytes` must be a PNG with exactly `width × height` pixels.
 * Dimensions are not validated; a mismatch will silently produce incorrect pixel data.
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
 * Full compositing pipeline: decodes two PNGs, calls compositePixels, returns a PNG Blob.
 */
export async function compositeBlob(
  compositedBytes: Uint8Array,
  alphaBytes: Uint8Array,
  width: number,
  height: number,
): Promise<Blob> {
  const [compositedData, alphaData] = await Promise.all([
    decodeToImageData(compositedBytes, width, height),
    decodeToImageData(alphaBytes, width, height),
  ]);

  const output = compositePixels(compositedData.data, alphaData.data);

  const outputCanvas = new OffscreenCanvas(width, height);
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for output canvas');
  ctx.putImageData(new ImageData(output as ImageDataArray, width, height), 0, 0);

  return outputCanvas.convertToBlob({ type: 'image/png' });
}
