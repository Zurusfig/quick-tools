"use client";

import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ErrorText } from "@/components/Field";
import {
  FileDropzone,
  LargerNotice,
  PresetPicker,
  SizeStats,
  buttonClass,
  primaryButtonClass,
} from "@/components/compress/shared";
import { usePersistedState } from "@/lib/hooks";
import { downloadBlob, formatBytes, getPreset, renamedFile, type PresetId } from "@/lib/compress";
import { MAX_PDF_BYTES, PdfCompressError, compressPdf, type PdfResult } from "@/lib/pdfCompress";

export default function PdfPanel() {
  const [presetId, setPresetId] = usePersistedState("compress:preset", "balanced");
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
  const [result, setResult] = useState<PdfResult | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageUrl, setPageUrl] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const preset = getPreset(presetId);
  const busy = progress !== null;

  const urls = useRef<{ result: string; page: string }>({ result: "", page: "" });

  function clearUrls() {
    if (urls.current.result) URL.revokeObjectURL(urls.current.result);
    if (urls.current.page) URL.revokeObjectURL(urls.current.page);
    urls.current = { result: "", page: "" };
    setResultUrl("");
    setPageUrl("");
  }

  function showPage(res: PdfResult, index: number) {
    if (urls.current.page) URL.revokeObjectURL(urls.current.page);
    urls.current.page = URL.createObjectURL(res.pages[index]);
    setPageIndex(index);
    setPageUrl(urls.current.page);
  }

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
    setProgress({ page: 0, total: 0 });
    try {
      const res = await compressPdf(file, {
        dpi: preset.pdfDpi,
        quality: preset.pdfQuality,
        signal: controller.signal,
        onProgress: setProgress,
      });
      urls.current.result = URL.createObjectURL(res.blob);
      setResultUrl(urls.current.result);
      setResult(res);
      showPage(res, 0);
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
          <PresetPicker value={preset.id as PresetId} onChange={setPresetId} />

          <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-2">
              <p>
                <strong>This turns every page into a picture.</strong> Selectable text, search, links, bookmarks,
                and form fields will be removed. Text-based PDFs may even get larger. Your original file is not
                changed.
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

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!agreed || busy} onClick={run} className={primaryButtonClass}>
              Compress PDF
            </button>
            {busy && (
              <button type="button" onClick={() => abortRef.current?.abort()} className={buttonClass}>
                Cancel
              </button>
            )}
          </div>

          {busy && (
            <div className="flex flex-col gap-1" role="status">
              <div className="h-2 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100 transition-[width]"
                  style={{ width: progress.total ? `${(progress.page / progress.total) * 100}%` : "5%" }}
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {progress.total ? `Processing page ${progress.page} of ${progress.total}…` : "Loading PDF…"}
              </p>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-3">
              <SizeStats original={file.size} compressed={result.blob.size} />
              {larger && <LargerNotice kind="PDF" />}

              <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2">
                {pageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pageUrl} alt={`Page ${pageIndex + 1} preview`} className="max-h-96 max-w-full bg-white object-contain" />
                )}
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={pageIndex === 0}
                    onClick={() => showPage(result, pageIndex - 1)}
                    className={buttonClass}
                  >
                    Prev
                  </button>
                  <span>
                    Page {pageIndex + 1} of {result.pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={pageIndex >= result.pages.length - 1}
                    onClick={() => showPage(result, pageIndex + 1)}
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
