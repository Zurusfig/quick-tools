export type PresetId = "smaller" | "balanced" | "higher";

export type Preset = {
  id: PresetId;
  label: string;
  hint: string;
  imageQuality: number;
  pdfDpi: number;
  pdfQuality: number;
};

export const PRESETS: Preset[] = [
  { id: "smaller", label: "Smaller File", hint: "Smallest size, visible quality loss", imageQuality: 0.55, pdfDpi: 96, pdfQuality: 0.5 },
  { id: "balanced", label: "Balanced", hint: "Good size, looks fine on screen", imageQuality: 0.75, pdfDpi: 130, pdfQuality: 0.7 },
  { id: "higher", label: "Higher Quality", hint: "Larger file, sharper result", imageQuality: 0.9, pdfDpi: 180, pdfQuality: 0.85 },
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
