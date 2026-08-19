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

type CaptureOptions = {
  pixelRatio?: number;
  backgroundColor?: string;
  /** Inline styles applied to the clone so it reflects the animation's end state, not a live/mid-animation frame. */
  finalStyles?: Partial<CSSStyleDeclaration>;
};

/**
 * Clones `node`, strips any CSS animation/transform from the clone (and its
 * descendants) so a currently-playing entrance animation can never leak into
 * an export, then runs `capture` against the static clone before removing it.
 */
async function withStaticClone<T>(
  node: HTMLElement,
  finalStyles: Partial<CSSStyleDeclaration> | undefined,
  capture: (clone: HTMLElement) => Promise<T>
): Promise<T> {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.animation = "none";
  clone.style.transform = "none";
  if (finalStyles) Object.assign(clone.style, finalStyles);
  clone.querySelectorAll<HTMLElement>("*").forEach((child) => {
    child.style.animation = "none";
  });
  // Kept fully "visible" (no opacity/display/off-screen tricks — html-to-image
  // renders the clone's actual computed style, so hiding it that way produces
  // a blank capture). Instead it's pinned behind the page's own background via
  // z-index, which keeps it out of view without affecting how it rasterises.
  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.zIndex = "-1";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);
  try {
    return await capture(clone);
  } finally {
    document.body.removeChild(clone);
  }
}

export function captureAnimatedNodeAsPngDataUrl(node: HTMLElement, options: CaptureOptions = {}): Promise<string> {
  return withStaticClone(node, options.finalStyles, (clone) => captureNodeAsPngDataUrl(clone, options));
}

export function captureAnimatedNodeAsPngBlob(node: HTMLElement, options: CaptureOptions = {}): Promise<Blob | null> {
  return withStaticClone(node, options.finalStyles, (clone) => captureNodeAsPngBlob(clone, options));
}
