export type PresetId = "low" | "medium" | "high";

export type Preset = {
  id: PresetId;
  label: string;
  hint: string;
  imageQuality: number;
  pdfDpi: number;
  pdfQuality: number;
  /** Longest side, in px, that embedded PDF images are scaled down to. */
  pdfMaxSide: number;
};

export const PRESETS: Preset[] = [
  { id: "low", label: "Low", hint: "Light compression, best quality", imageQuality: 0.9, pdfDpi: 180, pdfQuality: 0.85, pdfMaxSide: 3000 },
  { id: "medium", label: "Medium", hint: "Balanced size and quality", imageQuality: 0.75, pdfDpi: 130, pdfQuality: 0.7, pdfMaxSide: 2000 },
  { id: "high", label: "High", hint: "Smallest file, visible quality loss", imageQuality: 0.55, pdfDpi: 96, pdfQuality: 0.5, pdfMaxSide: 1400 },
];

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[1];
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Positive = saved, negative = file grew. */
export function percentSaved(original: number, compressed: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

/** Scale down so the longest side is <= maxSide and the area is <= maxPixels. Never upscales. */
export function fitDimensions(
  width: number,
  height: number,
  maxSide: number | null,
  maxPixels: number
): { width: number; height: number } {
  let scale = 1;
  if (maxSide && Math.max(width, height) > maxSide) scale = maxSide / Math.max(width, height);
  if (width * height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (width * height));
  if (scale >= 1) return { width, height };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function renamedFile(name: string, suffix: string, mime: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "file";
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : mime === "application/pdf" ? "pdf" : "bin";
  return `${base}${suffix}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Scale the bytes of an encoded sample up to the full pixel count. */
export function extrapolateSize(sampleBytes: number, samplePixels: number, totalPixels: number): number {
  if (samplePixels <= 0) return 0;
  return Math.round((sampleBytes / samplePixels) * totalPixels);
}

const PDF_BASE_OVERHEAD = 1500;
const PDF_PAGE_OVERHEAD = 300;

/** Predict output PDF size from the JPEG sizes of a few sampled pages. */
export function estimatePdfBytes(sampleBytes: number[], pageCount: number): number {
  if (sampleBytes.length === 0) return 0;
  const mean = sampleBytes.reduce((a, b) => a + b, 0) / sampleBytes.length;
  return Math.round(mean * pageCount + PDF_BASE_OVERHEAD + PDF_PAGE_OVERHEAD * pageCount);
}

/** Up to `count` page numbers (1-based) spread evenly across the document. */
export function samplePageNumbers(pageCount: number, count = 3): number[] {
  if (pageCount <= count) return Array.from({ length: pageCount }, (_, i) => i + 1);
  return Array.from(new Set(Array.from({ length: count }, (_, i) => Math.round(1 + (i * (pageCount - 1)) / (count - 1)))));
}
