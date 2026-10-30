import { estimatePdfBytes, fitDimensions, samplePageNumbers } from "./compress.ts";

export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_PAGES = 200;
const MAX_PAGE_PIXELS = 12_000_000;

export class PdfCompressError extends Error {
  constructor(message: string, readonly code: "encrypted" | "invalid" | "toomany" | "cancelled" | "memory" | "other") {
    super(message);
  }
}

export type PdfProgress = { page: number; done: number; total: number };

export type PdfResult = {
  blob: Blob;
  pages: Blob[];
};

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    return mod;
  });
  return pdfjsPromise;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality)
  );
}

type PdfDoc = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

async function checkHeader(file: File): Promise<void> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!new TextDecoder("latin1").decode(head).includes("%PDF-")) {
    throw new PdfCompressError("This file doesn't look like a valid PDF.", "invalid");
  }
}

async function openPdf(file: File, signal?: AbortSignal): Promise<{ doc: PdfDoc; close: () => void }> {
  await checkHeader(file);
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const cancel = () => task.destroy();
  signal?.addEventListener("abort", cancel);
  const close = () => {
    signal?.removeEventListener("abort", cancel);
    task.destroy();
  };
  try {
    const doc = await task.promise;
    if (doc.numPages > MAX_PDF_PAGES) {
      throw new PdfCompressError(`This PDF has ${doc.numPages} pages. The limit is ${MAX_PDF_PAGES} to keep your browser from running out of memory.`, "toomany");
    }
    return { doc, close };
  } catch (err) {
    close();
    if (err instanceof PdfCompressError) throw err;
    if (signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
    if ((err as { name?: string })?.name === "PasswordException") {
      throw new PdfCompressError("This PDF is password protected. Remove the password first, then try again.", "encrypted");
    }
    throw new PdfCompressError("This PDF is damaged or in a format the browser can't read.", "invalid");
  }
}

async function renderPageJpeg(doc: PdfDoc, pageNumber: number, dpi: number, quality: number) {
  const page = await doc.getPage(pageNumber);
  const canvas = document.createElement("canvas");
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = dpi / 72;
    const target = fitDimensions(Math.round(base.width * scale), Math.round(base.height * scale), null, MAX_PAGE_PIXELS);
    const viewport = page.getViewport({ scale: target.width / base.width });
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PdfCompressError("Canvas is not available in this browser.", "memory");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    const jpeg = await canvasToJpeg(canvas, quality);
    return { jpeg, width: base.width, height: base.height };
  } finally {
    canvas.width = canvas.height = 0;
    page.cleanup();
  }
}

/** Predict the compressed size by rendering a few sample pages. */
export async function estimatePdfSize(
  file: File,
  opts: { dpi: number; quality: number; signal?: AbortSignal }
): Promise<{ bytes: number; pages: number }> {
  const { doc, close } = await openPdf(file, opts.signal);
  try {
    const sizes: number[] = [];
    for (const n of samplePageNumbers(doc.numPages)) {
      if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
      sizes.push((await renderPageJpeg(doc, n, opts.dpi, opts.quality)).jpeg.size);
    }
    return { bytes: estimatePdfBytes(sizes, doc.numPages), pages: doc.numPages };
  } catch (err) {
    if (err instanceof PdfCompressError) throw err;
    if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
    throw new PdfCompressError("Could not estimate the size of this PDF.", "other");
  } finally {
    close();
  }
}

export async function compressPdf(
  file: File,
  opts: { dpi: number; quality: number; onProgress?: (p: PdfProgress) => void; signal?: AbortSignal }
): Promise<PdfResult> {
  const [{ doc, close }, { PDFDocument }] = await Promise.all([openPdf(file, opts.signal), import("pdf-lib")]);
  try {
    const out = await PDFDocument.create();
    const pages: Blob[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
      opts.onProgress?.({ page: i, done: i - 1, total: doc.numPages });
      try {
        const { jpeg, width, height } = await renderPageJpeg(doc, i, opts.dpi, opts.quality);
        pages.push(jpeg);
        const image = await out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
        out.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
        opts.onProgress?.({ page: i, done: i, total: doc.numPages });
      } catch (err) {
        if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
        if (err instanceof PdfCompressError) throw err;
        throw new PdfCompressError(`Page ${i} could not be processed. The PDF may be too large for this device's memory.`, "memory");
      }
    }
    const bytes = await out.save();
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), pages };
  } finally {
    close();
  }
}
