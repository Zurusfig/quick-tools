import { fitDimensions } from "./compress.ts";

export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_PAGES = 200;
const MAX_PAGE_PIXELS = 12_000_000;

export class PdfCompressError extends Error {
  constructor(message: string, readonly code: "encrypted" | "invalid" | "toomany" | "cancelled" | "memory" | "other") {
    super(message);
  }
}

export type PdfProgress = { page: number; total: number };

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

export async function compressPdf(
  file: File,
  opts: { dpi: number; quality: number; onProgress?: (p: PdfProgress) => void; signal?: AbortSignal }
): Promise<PdfResult> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!new TextDecoder("latin1").decode(head).includes("%PDF-")) {
    throw new PdfCompressError("This file doesn't look like a valid PDF.", "invalid");
  }

  const [pdfjs, { PDFDocument }] = await Promise.all([loadPdfJs(), import("pdf-lib")]);
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const cancel = () => task.destroy();
  opts.signal?.addEventListener("abort", cancel);

  try {
    let doc;
    try {
      doc = await task.promise;
    } catch (err) {
      if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
      const name = (err as { name?: string })?.name;
      if (name === "PasswordException") {
        throw new PdfCompressError("This PDF is password protected. Remove the password first, then try again.", "encrypted");
      }
      throw new PdfCompressError("This PDF is damaged or in a format the browser can't read.", "invalid");
    }

    if (doc.numPages > MAX_PDF_PAGES) {
      throw new PdfCompressError(`This PDF has ${doc.numPages} pages. The limit is ${MAX_PDF_PAGES} to keep your browser from running out of memory.`, "toomany");
    }

    const out = await PDFDocument.create();
    const pages: Blob[] = [];
    const scale = opts.dpi / 72;

    for (let i = 1; i <= doc.numPages; i++) {
      if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
      opts.onProgress?.({ page: i, total: doc.numPages });

      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const target = fitDimensions(
        Math.round(base.width * scale),
        Math.round(base.height * scale),
        null,
        MAX_PAGE_PIXELS
      );
      const viewport = page.getViewport({ scale: target.width / base.width });

      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PdfCompressError("Canvas is not available in this browser.", "memory");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        const jpeg = await canvasToJpeg(canvas, opts.quality);
        pages.push(jpeg);
        const image = await out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
        const p = out.addPage([base.width, base.height]);
        p.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
      } catch (err) {
        if (opts.signal?.aborted) throw new PdfCompressError("Cancelled.", "cancelled");
        if (err instanceof PdfCompressError) throw err;
        throw new PdfCompressError(`Page ${i} could not be processed. The PDF may be too large for this device's memory.`, "memory");
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
    }

    const bytes = await out.save();
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), pages };
  } finally {
    opts.signal?.removeEventListener("abort", cancel);
    task.destroy();
  }
}
