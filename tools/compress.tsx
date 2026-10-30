"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import Select from "@/components/Select";
import ToolSkeleton from "@/components/ToolSkeleton";
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
  MAX_IMAGE_FILE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  compressImage,
  type ImageResult,
  type OutputFormat,
} from "@/lib/imageCompress";

// Loaded only when the PDF tab is opened; pdf.js / pdf-lib load on first compress.
const PdfPanel = dynamic(() => import("@/components/compress/PdfPanel"), {
  ssr: false,
  loading: ToolSkeleton,
});

type Mode = "image" | "pdf";

export default function CompressTool() {
  const [mode, setMode] = usePersistedState("compress:mode", "image");
  const active: Mode = mode === "pdf" ? "pdf" : "image";

  return (
    <ToolShell
      title="Image & PDF Compressor"
      description="Shrink pictures and scanned PDFs. Files never leave your device."
    >
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 p-1">
        {(["image", "pdf"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active === m}
            onClick={() => setMode(m)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              active === m
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            )}
          >
            {m === "image" ? "Picture" : "PDF"}
          </button>
        ))}
      </div>
      <div key={active} className="animate-fade-in-fast flex flex-col gap-4">
        {active === "image" ? <ImagePanel /> : <PdfPanel />}
      </div>
    </ToolShell>
  );
}

const SIZE_OPTIONS = [
  { value: "", label: "Keep original size" },
  { value: "3840", label: "Longest side 3840 px (4K)" },
  { value: "2560", label: "Longest side 2560 px" },
  { value: "1920", label: "Longest side 1920 px (Full HD)" },
  { value: "1280", label: "Longest side 1280 px" },
  { value: "800", label: "Longest side 800 px" },
];

function ImagePanel() {
  const [presetId, setPresetId] = usePersistedState("compress:preset", "medium");
  const [maxSide, setMaxSide] = usePersistedState("compress:maxside", "");
  const [format, setFormat] = usePersistedState("compress:format", "auto");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [error, setError] = useState("");
  const runId = useRef(0);

  const preset = getPreset(presetId);

  useEffect(() => {
    if (!file) return;
    const id = ++runId.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      setEstimate(null);
      try {
        const res = await compressImage(
          file,
          {
            quality: preset.imageQuality,
            maxSide: maxSide ? Number(maxSide) : null,
            format: format as OutputFormat,
          },
          (bytes) => id === runId.current && setEstimate(bytes)
        );
        if (id !== runId.current) return;
        setResult(res);
        setPreviewUrl(URL.createObjectURL(res.blob));
        setError("");
      } catch (err) {
        if (id !== runId.current) return;
        setResult(null);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Could not read this image. It may be damaged or in an unsupported format."
        );
      } finally {
        if (id === runId.current) setBusy(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [file, preset.imageQuality, maxSide, format]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(next: File) {
    if (!SUPPORTED_IMAGE_TYPES.includes(next.type)) {
      setError("Unsupported file. Use a JPG, PNG, or WebP image.");
      return;
    }
    if (next.size > MAX_IMAGE_FILE_BYTES) {
      setError(`This image is ${formatBytes(next.size)}. The limit is ${formatBytes(MAX_IMAGE_FILE_BYTES)}.`);
      return;
    }
    setError("");
    setResult(null);
    setPreviewUrl("");
    setFile(next);
  }

  const larger = !!file && !!result && result.blob.size >= file.size;

  return (
    <>
      <FileDropzone
        accept="image/jpeg,image/png,image/webp"
        label={file ? "Choose another image" : "Choose image"}
        hint="or drag and drop · JPG, PNG, WebP · up to 50 MB"
        onFile={handleFile}
      />
      <ErrorText>{error}</ErrorText>

      {file && (
        <>
          <PresetPicker value={preset.id as PresetId} onChange={setPresetId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Resize">
              <Select value={maxSide} onChange={(e) => setMaxSide(e.target.value)}>
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Format">
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="auto">Auto (PNG becomes WebP)</option>
                <option value="image/jpeg">JPEG (no transparency)</option>
                <option value="image/webp">WebP</option>
                <option value="image/png">PNG (lossless, resize only)</option>
              </Select>
            </Field>
          </div>

          {busy && (
            <div className="flex flex-col gap-2">
              <ProgressBar label="Compressing…" />
              <EstimateLine original={file.size} estimate={estimate} pending={false} />
            </div>
          )}

          {result && (
            <div className={clsx("animate-fade-in flex flex-col gap-3", busy && "opacity-60")}>
              <SizeStats original={file.size} compressed={result.blob.size} />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {result.sourceWidth}×{result.sourceHeight} → {result.width}×{result.height} px. Metadata such as
                location is removed.
              </p>
              {result.note && <p className="text-xs text-amber-600 dark:text-amber-500">{result.note}</p>}
              {larger && <LargerNotice kind="image" />}
              {previewUrl && (
                <div className="flex justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={previewUrl} src={previewUrl} alt="Compressed preview" className="animate-fade-in-fast max-h-96 max-w-full object-contain" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => downloadBlob(file, file.name)}
                  className={larger ? primaryButtonClass : buttonClass}
                >
                  Download original
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => downloadBlob(result.blob, renamedFile(file.name, "-compressed", result.blob.type))}
                  className={larger ? buttonClass : primaryButtonClass}
                >
                  Download compressed
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
