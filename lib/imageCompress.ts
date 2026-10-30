import { extrapolateSize, fitDimensions } from "./compress.ts";

export const MAX_IMAGE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_DECODED_PIXELS = 120_000_000;
// Mobile browsers (notably iOS Safari) refuse canvases much larger than this.
const MAX_CANVAS_PIXELS = 16_000_000;
const SAMPLE_SIDE = 384;

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type OutputFormat = "auto" | "image/jpeg" | "image/webp" | "image/png";

export type ImageResult = {
  blob: Blob;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  /** Set when the browser could not encode the requested format and used another. */
  note?: string;
};

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

export async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(
  file: File,
  opts: { quality: number; maxSide: number | null; format: OutputFormat },
  onEstimate?: (bytes: number) => void
): Promise<ImageResult> {
  const decoded = await decodeImage(file);
  try {
    if (decoded.width * decoded.height > MAX_DECODED_PIXELS) {
      throw new Error("This image is too large to process in the browser.");
    }
    const { width, height } = fitDimensions(decoded.width, decoded.height, opts.maxSide, MAX_CANVAS_PIXELS);

    const requested =
      opts.format === "auto" ? (file.type === "image/png" ? "image/webp" : file.type) : opts.format;

    const render = (sx: number, sy: number, sw: number, sh: number, w: number, h: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      if (requested === "image/jpeg") {
        ctx.fillStyle = "#ffffff"; // JPEG has no alpha
        ctx.fillRect(0, 0, w, h);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(decoded.source, sx, sy, sw, sh, 0, 0, w, h);
      return canvas;
    };

    // Encode a centre crop at final resolution first, so the UI can show a prediction right away.
    if (onEstimate && width * height > SAMPLE_SIDE * SAMPLE_SIDE * 4) {
      const scale = width / decoded.width;
      const sw = Math.min(decoded.width, Math.ceil(SAMPLE_SIDE / scale));
      const sh = Math.min(decoded.height, Math.ceil(SAMPLE_SIDE / scale));
      const cw = Math.max(1, Math.round(sw * scale));
      const ch = Math.max(1, Math.round(sh * scale));
      const sample = render(Math.floor((decoded.width - sw) / 2), Math.floor((decoded.height - sh) / 2), sw, sh, cw, ch);
      const sampleBlob = await toBlob(sample, requested, opts.quality);
      sample.width = sample.height = 0;
      if (sampleBlob) onEstimate(extrapolateSize(sampleBlob.size, cw * ch, width * height));
    }

    const canvas = render(0, 0, decoded.width, decoded.height, width, height);
    const blob = await toBlob(canvas, requested, opts.quality);
    canvas.width = canvas.height = 0;
    if (!blob) throw new Error("The browser could not encode this image. Try a smaller size.");
    const note =
      blob.type !== requested
        ? `This browser can't save ${requested.replace("image/", "").toUpperCase()}, so it was saved as ${blob.type.replace("image/", "").toUpperCase()} instead.`
        : undefined;
    return { blob, width, height, sourceWidth: decoded.width, sourceHeight: decoded.height, note };
  } finally {
    decoded.close();
  }
}
