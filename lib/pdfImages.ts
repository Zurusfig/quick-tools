import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
  type PDFDocument,
  type PDFObject,
} from "pdf-lib";
import { fitDimensions } from "./compress.ts";

const MIN_IMAGE_BYTES = 20_000;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_CANVAS_PIXELS = 16_000_000;
// Only swap an image in when it gets at least this much smaller.
const MIN_GAIN = 0.95;

export type ImageItem = {
  ref: PDFRef;
  stream: PDFRawStream;
  kind: "jpeg" | "flate";
  width: number;
  height: number;
  colors: 1 | 3;
  predictor: number;
  bytes: number;
};

export type ImageOptions = { quality: number; maxSide: number };

/** Undo PNG row filters (PDF predictors 10-15). 8 bits per component only. */
export function unpredictPng(data: Uint8Array, columns: number, colors: number): Uint8Array | null {
  const rowBytes = columns * colors;
  const stride = rowBytes + 1;
  if (data.length % stride !== 0) return null;
  const rows = data.length / stride;
  const out = new Uint8Array(rows * rowBytes);
  for (let y = 0; y < rows; y++) {
    const filter = data[y * stride];
    const src = y * stride + 1;
    const dst = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const left = x >= colors ? out[dst + x - colors] : 0;
      const up = y > 0 ? out[dst - rowBytes + x] : 0;
      const upLeft = y > 0 && x >= colors ? out[dst - rowBytes + x - colors] : 0;
      let pred = 0;
      if (filter === 1) pred = left;
      else if (filter === 2) pred = up;
      else if (filter === 3) pred = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) return null;
      out[dst + x] = (data[src + x] + pred) & 255;
    }
  }
  return out;
}

const name = (n: string) => PDFName.of(n);

function num(dict: PDFDict, key: string): number | undefined {
  const v = dict.lookup(name(key));
  return v instanceof PDFNumber ? v.asNumber() : undefined;
}

function componentCount(dict: PDFDict): 1 | 3 | null {
  const cs = dict.lookup(name("ColorSpace"));
  if (cs === name("DeviceRGB")) return 3;
  if (cs === name("DeviceGray")) return 1;
  if (cs instanceof PDFArray && cs.lookup(0) === name("ICCBased")) {
    const profile = cs.lookup(1);
    const n = profile instanceof PDFRawStream ? num(profile.dict, "N") : undefined;
    if (n === 1 || n === 3) return n;
  }
  return null;
}

/** Images this tool knows how to recompress safely. Everything else is left untouched. */
export function collectImages(doc: PDFDocument): ImageItem[] {
  const items: ImageItem[] = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.lookup(name("Subtype")) !== name("Image")) continue;
    const imageMask = dict.lookup(name("ImageMask"));
    if (imageMask instanceof PDFBool && imageMask.asBoolean()) continue;
    if (dict.has(name("Decode")) || dict.lookup(name("Mask")) instanceof PDFArray) continue;
    const smask = dict.lookup(name("SMask"));
    if (smask instanceof PDFRawStream && smask.dict.has(name("Matte"))) continue;

    let filter: PDFObject | undefined = dict.lookup(name("Filter"));
    if (filter instanceof PDFArray && filter.size() === 1) filter = filter.lookup(0);
    const kind = filter === name("DCTDecode") ? "jpeg" : filter === name("FlateDecode") ? "flate" : null;
    if (!kind) continue;

    const width = num(dict, "Width");
    const height = num(dict, "Height");
    const colors = componentCount(dict);
    if (!width || !height || !colors || width * height > MAX_IMAGE_PIXELS) continue;
    if (obj.contents.length < MIN_IMAGE_BYTES) continue;

    let predictor = 1;
    if (kind === "flate") {
      if (num(dict, "BitsPerComponent") !== 8) continue;
      let parms: PDFObject | undefined = dict.lookup(name("DecodeParms"));
      if (parms instanceof PDFArray) parms = parms.lookup(0);
      if (parms instanceof PDFDict) {
        predictor = num(parms, "Predictor") ?? 1;
        const columns = num(parms, "Columns") ?? 1;
        const parmColors = num(parms, "Colors") ?? 1;
        const parmBpc = num(parms, "BitsPerComponent") ?? 8;
        if (predictor >= 10 && (columns !== width || parmColors !== colors || parmBpc !== 8)) continue;
        if (predictor === 2 || (predictor > 1 && predictor < 10) || predictor > 15) continue;
      }
    }
    items.push({ ref, stream: obj, kind, width, height, colors, predictor, bytes: obj.contents.length });
  }
  return items;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function toSource(item: ImageItem): Promise<{ source: CanvasImageSource; close: () => void } | null> {
  if (item.kind === "jpeg") {
    const bitmap = await createImageBitmap(new Blob([item.stream.contents as BlobPart], { type: "image/jpeg" }), {
      imageOrientation: "none",
    });
    if (bitmap.width !== item.width || bitmap.height !== item.height) {
      bitmap.close();
      return null;
    }
    return { source: bitmap, close: () => bitmap.close() };
  }

  let pixels: Uint8Array = decodePDFRawStream(item.stream).decode();
  if (item.predictor >= 10) {
    const plain = unpredictPng(pixels, item.width, item.colors);
    if (!plain) return null;
    pixels = plain;
  }
  if (pixels.length !== item.width * item.height * item.colors) return null;

  const canvas = document.createElement("canvas");
  canvas.width = item.width;
  canvas.height = item.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(item.width, item.height);
  const rgba = image.data;
  for (let i = 0, p = 0, q = 0; i < item.width * item.height; i++) {
    if (item.colors === 3) {
      rgba[q++] = pixels[p++];
      rgba[q++] = pixels[p++];
      rgba[q++] = pixels[p++];
    } else {
      const g = pixels[p++];
      rgba[q++] = g;
      rgba[q++] = g;
      rgba[q++] = g;
    }
    rgba[q++] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return {
    source: canvas,
    close: () => {
      canvas.width = canvas.height = 0;
    },
  };
}

export type Recompressed = { data: Uint8Array; width: number; height: number };

/** Re-encode one image as a smaller JPEG, or null if it isn't worth swapping. */
export async function recompressImage(item: ImageItem, opts: ImageOptions): Promise<Recompressed | null> {
  let decoded: Awaited<ReturnType<typeof toSource>>;
  try {
    decoded = await toSource(item);
  } catch {
    return null;
  }
  if (!decoded) return null;
  try {
    const { width, height } = fitDimensions(item.width, item.height, opts.maxSide, MAX_CANVAS_PIXELS);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.source, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, opts.quality);
    canvas.width = canvas.height = 0;
    if (!blob || blob.size >= item.bytes * MIN_GAIN) return null;
    return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    decoded.close();
  }
}

export function applyRecompressed(doc: PDFDocument, item: ImageItem, next: Recompressed): void {
  const dict = item.stream.dict.clone();
  dict.set(name("Width"), PDFNumber.of(next.width));
  dict.set(name("Height"), PDFNumber.of(next.height));
  dict.set(name("ColorSpace"), name("DeviceRGB"));
  dict.set(name("BitsPerComponent"), PDFNumber.of(8));
  dict.set(name("Filter"), name("DCTDecode"));
  dict.set(name("Length"), PDFNumber.of(next.data.length));
  dict.delete(name("DecodeParms"));
  doc.context.assign(item.ref, PDFRawStream.of(dict, next.data));
}
