/** Originals may be large phone photos – they are cropped and compressed in the browser before upload. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
/** What we actually upload stays well below the 2 MB storage limit. */
export const UPLOAD_TARGET_BYTES = 1.5 * 1024 * 1024;

export const IMAGE_TOO_BIG = 'Bitte ein Foto (JPG, PNG, WebP oder HEIC) bis 25 MB wählen.';
export const IMAGE_UNREADABLE = 'Dieses Bild kann dein Browser nicht öffnen. Versuch ein JPG oder PNG.';

export function validateImageFile(file: { type: string; size: number; name?: string }): string | null {
  // Some phones report HEIC files without a MIME type – fall back to the file extension.
  const type = file.type || (/\.(heic|heif)$/i.test(file.name ?? '') ? 'image/heic' : '');
  if (!IMAGE_TYPES.includes(type) || file.size > IMAGE_MAX_BYTES) return IMAGE_TOO_BIG;
  return null;
}

export interface CompressedImage { blob: Blob; ext: 'webp' | 'jpg'; contentType: 'image/webp' | 'image/jpeg' }

/** Decodes with EXIF rotation applied; falls back to an <img> element (e.g. HEIC in Safari). */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error(IMAGE_UNREADABLE);
    }
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Crops the centered region with the target aspect ratio, scales it to width×height and compresses it:
 * WebP where the browser can encode it (JPEG otherwise), lowering the quality until it fits the target size.
 */
export async function compressImage(file: File, width: number, height: number): Promise<CompressedImage> {
  const img = await decode(file);
  const target = width / height;
  const sw = Math.min(img.width, img.height * target);
  const sh = sw / target;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img.source, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, width, height);
  img.done();

  for (const quality of [0.88, 0.78, 0.66, 0.52, 0.4]) {
    const webp = await encode(canvas, 'image/webp', quality);
    // Browsers without a WebP encoder silently return PNG – use JPEG there.
    const blob = webp?.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg', quality);
    if (!blob) break;
    if (blob.size <= UPLOAD_TARGET_BYTES || quality === 0.4) {
      return blob.type === 'image/webp'
        ? { blob, ext: 'webp', contentType: 'image/webp' }
        : { blob, ext: 'jpg', contentType: 'image/jpeg' };
    }
  }
  throw new Error('Image could not be converted');
}
