"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { ErrorText } from "@/components/Field";
import {
  FileDropzone,
  EstimateLine,
  LargerNotice,
  PresetPicker,
  ProgressBar,
  SizeStats,
  buttonClass,
  primaryButtonClass,
} from "@/components/compress/shared";
import { usePersistedState } from "@/lib/hooks";
import { downloadBlob, formatBytes, getPreset, renamedFile, type PresetId } from "@/lib/compress";
import {
  MAX_PDF_BYTES,
  PdfCompressError,
  compressPdf,
  compressPdfKeepText,
  estimatePdfKeepTextSize,
  estimatePdfSize,
  renderPdfPreview,
  type PdfMode,
  type PdfProgress,
  type PdfResult,
} from "@/lib/pdfCompress";

export default function PdfPanel() {
  const [presetId, setPresetId] = usePersistedState("compress:preset", "medium");
  const [modeValue, setMode] = usePersistedState("compress:pdfmode", "keep");
  const mode: PdfMode = modeValue === "flatten" ? "flatten" : "keep";
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [progress, setProgress] = useState<PdfProgress | null>(null);
  const [estimate, setEstimate] = useState<{ file: File; key: string; bytes: number; images?: number } | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<PdfResult | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageUrl, setPageUrl] = useState("");
  const [pageLoading, setPageLoading] = useState(false);
  const pageToken = useRef(0);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const preset = getPreset(presetId);
  const busy = progress !== null;
  const estimateKey = `${mode}:${preset.id}`;
  const liveEstimate =
    estimate && estimate.file === file && estimate.key === estimateKey ? estimate.bytes : null;

  const urls = useRef<{ result: string; page: string }>({ result: "", page: "" });

  function clearUrls() {
    if (urls.current.result) URL.revokeObjectURL(urls.current.result);
    if (urls.current.page) URL.revokeObjectURL(urls.current.page);
    urls.current = { result: "", page: "" };
    setResultUrl("");
    setPageUrl("");
  }

  async function showPage(res: PdfResult, index: number) {
    const token = ++pageToken.current;
    setPageIndex(index);
    let blob = res.pages?.[index];
    if (!blob) {
      setPageLoading(true);
      try {
        blob = await renderPdfPreview(res.blob, index + 1);
      } catch {
        if (token === pageToken.current) setPageLoading(false);
        return;
      }
    }
    if (token !== pageToken.current) return;
    if (urls.current.page) URL.revokeObjectURL(urls.current.page);
    urls.current.page = URL.createObjectURL(blob);
    setPageUrl(urls.current.page);
    setPageLoading(false);
  }

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    const key = `${mode}:${preset.id}`;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const res: { bytes: number; images?: number } =
          mode === "flatten"
            ? await estimatePdfSize(file, { dpi: preset.pdfDpi, quality: preset.pdfQuality, signal: controller.signal })
            : await estimatePdfKeepTextSize(file, {
                quality: preset.pdfQuality,
                maxSide: preset.pdfMaxSide,
                signal: controller.signal,
              });
        setEstimate({ file, key, bytes: res.bytes, images: res.images });
      } catch (err) {
        if (err instanceof PdfCompressError && err.code !== "cancelled") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setEstimating(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [file, preset, mode]);

  useEffect(() => {
    const live = urls.current;
    return () => {
      abortRef.current?.abort();
      if (live.result) URL.revokeObjectURL(live.result);
      if (live.page) URL.revokeObjectURL(live.page);
    };
  }, []);

  function handleFile(next: File) {
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Unsupported file. Choose a PDF.");
      return;
    }
    if (next.size > MAX_PDF_BYTES) {
      setError(`This PDF is ${formatBytes(next.size)}. The limit is ${formatBytes(MAX_PDF_BYTES)} to keep your browser from running out of memory.`);
      return;
    }
    setError("");
    setResult(null);
    clearUrls();
    setPageIndex(0);
    setAgreed(false);
    setFile(next);
  }

  async function run() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setResult(null);
    clearUrls();
    setPageIndex(0);
    setProgress({ page: 0, done: 0, total: 0, unit: "page" });
    try {
      const res =
        mode === "flatten"
          ? await compressPdf(file, {
              dpi: preset.pdfDpi,
              quality: preset.pdfQuality,
              signal: controller.signal,
              onProgress: setProgress,
            })
          : await compressPdfKeepText(file, {
              quality: preset.pdfQuality,
              maxSide: preset.pdfMaxSide,
              signal: controller.signal,
              onProgress: setProgress,
            });
      urls.current.result = URL.createObjectURL(res.blob);
      setResultUrl(urls.current.result);
      setResult(res);
      void showPage(res, 0);
    } catch (err) {
      if (err instanceof PdfCompressError) {
        if (err.code !== "cancelled") setError(err.message);
      } else {
        setError("Something went wrong while compressing this PDF.");
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  const larger = !!file && !!result && result.blob.size >= file.size;

  return (
    <>
      <FileDropzone
        accept="application/pdf,.pdf"
        label={file ? "Choose another PDF" : "Choose PDF"}
        hint="or drag and drop · up to 100 MB · best for scanned or image-heavy PDFs"
        onFile={handleFile}
      />
      <ErrorText>{error}</ErrorText>

      {file && (
        <>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {file.name} · {formatBytes(file.size)}
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Method</span>
            <div role="radiogroup" aria-label="Method" className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "keep", label: "Keep text and links", hint: "Shrinks images inside the PDF" },
                  { id: "flatten", label: "Flatten to pictures", hint: "For scans, strongest" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => {
                    setMode(m.id);
                    setResult(null);
                    clearUrls();
                  }}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-left active:scale-[0.98]",
                    mode === m.id
                      ? "border-neutral-900 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-800"
                      : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  )}
                >
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <PresetPicker value={preset.id as PresetId} onChange={setPresetId} />
          <EstimateLine original={file.size} estimate={liveEstimate} pending={estimating} />
          {mode === "keep" && estimate?.file === file && estimate.key === estimateKey && estimate.images === 0 && (
            <p className="animate-fade-in-fast text-xs text-amber-600 dark:text-amber-500">
              No compressible images found. This PDF is mostly text, so this method can&apos;t shrink it much.
              Flatten to pictures only helps if it&apos;s a scan.
            </p>
          )}

          {mode === "keep" ? (
            <div key="keep" className="animate-fade-in-fast flex gap-3 rounded-md border border-neutral-200 px-3 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
              <IconInfoCircle size={18} className="mt-0.5 shrink-0" />
              <p>
                Text, links, bookmarks and forms stay as they are. Only photos and scans embedded in the PDF are
                re-encoded, and images above {preset.pdfMaxSide}px are scaled down.
              </p>
            </div>
          ) : (
            <div key="flatten" className="animate-fade-in-fast flex gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="flex flex-col gap-2">
                <p>
                  <strong>This turns every page into a picture.</strong> Selectable text, search, links,
                  bookmarks, and form fields will be removed. Text-based PDFs may even get larger. Your original
                  file is not changed.
                </p>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>I understand and want to continue</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={(mode === "flatten" && !agreed) || busy} onClick={run} className={primaryButtonClass}>
              Compress PDF
            </button>
            {busy && (
              <button type="button" onClick={() => abortRef.current?.abort()} className={buttonClass}>
                Cancel
              </button>
            )}
          </div>

          {busy && (
            <ProgressBar
              value={progress.total ? progress.done / progress.total : 0}
              label={
                progress.total
                  ? `Processing ${progress.unit} ${Math.min(progress.page, progress.total)} of ${progress.total}`
                  : "Loading PDF…"
              }
            />
          )}

          {result && (
            <div className="animate-fade-in flex flex-col gap-3">
              <SizeStats original={file.size} compressed={result.blob.size} />
              {result.images && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {result.images.total === 0
                    ? "No compressible images were found, so the PDF was only repacked."
                    : `Recompressed ${result.images.recompressed} of ${result.images.total} images. Text and links are unchanged.`}
                </p>
              )}
              {larger && <LargerNotice kind="PDF" />}

              <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2">
                {pageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={pageUrl} src={pageUrl} alt={`Page ${pageIndex + 1} preview`} className={clsx("animate-fade-in-fast max-h-96 max-w-full bg-white object-contain", pageLoading && "opacity-50")} />
                )}
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={pageIndex === 0 || pageLoading}
                    onClick={() => void showPage(result, pageIndex - 1)}
                    className={buttonClass}
                  >
                    Prev
                  </button>
                  <span>
                    Page {pageIndex + 1} of {result.pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={pageIndex >= result.pageCount - 1 || pageLoading}
                    onClick={() => void showPage(result, pageIndex + 1)}
                    className={buttonClass}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadBlob(file, file.name)}
                  className={larger ? primaryButtonClass : buttonClass}
                >
                  Download original
                </button>
                <button
                  type="button"
                  onClick={() => downloadBlob(result.blob, renamedFile(file.name, "-compressed", "application/pdf"))}
                  className={larger ? buttonClass : primaryButtonClass}
                >
                  Download compressed
                </button>
                {resultUrl && (
                  <a href={resultUrl} target="_blank" rel="noreferrer" className={buttonClass}>
                    Open full PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
