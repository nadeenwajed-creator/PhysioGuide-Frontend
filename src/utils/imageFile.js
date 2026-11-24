// The API accepts uploads up to 2 MB, while a photo straight from a phone is
// usually several megabytes. Shrink large images in the browser first so an
// ordinary photo still uploads; the server keeps its own validation.

const MAX_EDGE = 1600;
const MAX_BYTES = 1_900_000;
// Re-encoding an animated GIF would drop the animation, so it is left alone.
const SKIP_TYPES = new Set(['image/gif']);

const extensionFor = (type) =>
  type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';

function renamed(name, type) {
  const base = String(name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
  return `${base}.${extensionFor(type)}`;
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Returns the original file when it already fits, when it is a GIF, or when the
// browser cannot decode it (the server then reports the real problem).
export async function fitImageFile(file, { maxEdge = MAX_EDGE, maxBytes = MAX_BYTES } = {}) {
  if (!file || !file.type?.startsWith('image/') || SKIP_TYPES.has(file.type)) return file;
  if (file.size <= maxBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = Math.min(1, maxEdge / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    // WebP keeps transparency for PNG sources; JPEG is smaller for photos.
    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    let blob = await toBlob(canvas, type, 0.86);
    if (blob && blob.size > maxBytes) blob = await toBlob(canvas, type, 0.7);
    if (blob && blob.size > maxBytes) {
      const smaller = document.createElement('canvas');
      const shrink = Math.min(1, 1100 / longest);
      smaller.width = Math.max(1, Math.round(canvas.width * shrink));
      smaller.height = Math.max(1, Math.round(canvas.height * shrink));
      smaller.getContext('2d')?.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      blob = await toBlob(smaller, type, 0.7);
    }
    if (!blob) return file;

    const result = new File([blob], renamed(file.name, type), { type: blob.type || type });
    // If it is still over the cap, send the original so the server's limit and
    // the "image too large" feedback stay truthful.
    return result.size < file.size ? result : file;
  } catch {
    return file;
  }
}
