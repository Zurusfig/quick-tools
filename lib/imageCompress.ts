import { fitDimensions } from "./compress.ts";

export const MAX_IMAGE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_DECODED_PIXELS = 120_000_000;
// Mobile browsers (notably iOS Safari) refuse canvases much larger than this.
const MAX_CANVAS_PIXELS = 16_000_000;

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
  opts: { quality: number; maxSide: number | null; format: OutputFormat }
): Promise<ImageResult> {
  const decoded = await decodeImage(file);
  try {
    if (decoded.width * decoded.height > MAX_DECODED_PIXELS) {
      throw new Error("This image is too large to process in the browser.");
    }
    const { width, height } = fitDimensions(decoded.width, decoded.height, opts.maxSide, MAX_CANVAS_PIXELS);

    const requested =
      opts.format === "auto" ? (file.type === "image/png" ? "image/webp" : file.type) : opts.format;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    if (requested === "image/jpeg") {
      ctx.fillStyle = "#ffffff"; // JPEG has no alpha
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.source, 0, 0, width, height);

    let blob = await toBlob(canvas, requested, opts.quality);
    let note: string | undefined;
    if (!blob) throw new Error("The browser could not encode this image. Try a smaller size.");
    if (blob.type !== requested) {
      note = `This browser can't save ${requested.replace("image/", "").toUpperCase()}, so it was saved as ${blob.type.replace("image/", "").toUpperCase()} instead.`;
    }
    canvas.width = canvas.height = 0;
    blob = blob as Blob;
    return { blob, width, height, sourceWidth: decoded.width, sourceHeight: decoded.height, note };
  } finally {
    decoded.close();
  }
}
