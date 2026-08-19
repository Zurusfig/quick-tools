import { toPng, toBlob } from "html-to-image";

/**
 * html-to-image reads currently-loaded font glyphs when it rasterises — without
 * waiting for document.fonts.ready, Thai (or any late-loading) text can render
 * as empty boxes in the captured image.
 */
async function waitForFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }
}

export async function captureNodeAsPngDataUrl(
  node: HTMLElement,
  options: { pixelRatio?: number; backgroundColor?: string } = {}
): Promise<string> {
  await waitForFonts();
  return toPng(node, { pixelRatio: options.pixelRatio ?? 3, backgroundColor: options.backgroundColor });
}

export async function captureNodeAsPngBlob(
  node: HTMLElement,
  options: { pixelRatio?: number; backgroundColor?: string } = {}
): Promise<Blob | null> {
  await waitForFonts();
  return toBlob(node, { pixelRatio: options.pixelRatio ?? 3, backgroundColor: options.backgroundColor });
}
