export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type) || file.size > IMAGE_MAX_BYTES) {
    return 'Bitte ein JPG, PNG oder WebP bis 2 MB wählen.';
  }
  return null;
}

/** Crops the centered region with the target aspect ratio and scales it to width×height (WebP). */
export async function cropToWebp(file: File, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const target = width / height;
  const sw = Math.min(bitmap.width, bitmap.height * target);
  const sh = sw / target;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image could not be converted'))), 'image/webp', 0.88));
}

/** Crops a centered square and scales it to size×size (WebP). */
export function cropToSquareWebp(file: File, size = 256): Promise<Blob> {
  return cropToWebp(file, size, size);
}
