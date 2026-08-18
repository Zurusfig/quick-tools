"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import TextArea from "@/components/TextArea";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { usePersistedState, useDebounced } from "@/lib/hooks";
import { renderQrToCanvas, renderQrToSvgString } from "@/lib/qrRender";

type EcLevel = "L" | "M" | "Q" | "H";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export default function QrTool() {
  const [text, setText] = usePersistedState("qr:text", "https://example.com");
  const [ecLevel, setEcLevel] = usePersistedState("qr:ec", "M");
  const [size, setSize] = usePersistedState("qr:size", "256");
  const [margin, setMargin] = usePersistedState("qr:margin", "2");
  const [fg, setFg] = usePersistedState("qr:fg", "#000000");
  const [bg, setBg] = usePersistedState("qr:bg", "#ffffff");
  const [roundness, setRoundness] = usePersistedState("qr:roundness", "0");
  const [logoScale, setLogoScale] = usePersistedState("qr:logoscale", "20");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const debouncedText = useDebounced(text);
  const debouncedSize = useDebounced(size);
  const debouncedMargin = useDebounced(margin);
  const debouncedRoundness = useDebounced(roundness);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!debouncedText.trim()) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        setSvgMarkup("");
        return;
      }

      try {
        const qr = QRCode.create(debouncedText, { errorCorrectionLevel: ecLevel as EcLevel });
        const renderOptions = {
          pixelSize: Number(debouncedSize) || 256,
          marginModules: Number(debouncedMargin) || 0,
          fg,
          bg,
          roundness: Number(debouncedRoundness) || 0,
          logoDataUrl: logo || undefined,
          logoScale: (Number(logoScale) || 20) / 100,
        };

        await renderQrToCanvas(canvas, qr.modules, renderOptions);
        if (cancelled) return;
        setError("");
        setSvgMarkup(renderQrToSvgString(qr.modules, renderOptions));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not generate QR code.");
          setSvgMarkup("");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedText, ecLevel, debouncedSize, debouncedMargin, fg, bg, debouncedRoundness, logo, logoScale]);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo image is too large (max 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogo("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "qrcode.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ToolShell
      title="QR Code Generator"
      description="Generate a QR code from text or a URL. Everything happens in your browser."
    >
      <Field label="Text or URL">
        <TextArea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <ErrorText>{debouncedText.trim() ? error : ""}</ErrorText>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Error correction">
          <Select value={ecLevel} onChange={(e) => setEcLevel(e.target.value)}>
            <option value="L">L (7%)</option>
            <option value="M">M (15%)</option>
            <option value="Q">Q (25%)</option>
            <option value="H">H (30%)</option>
          </Select>
        </Field>
        <Field label="Size (px)">
          <Input type="number" min={64} max={1024} value={size} onChange={(e) => setSize(e.target.value)} />
        </Field>
        <Field label="Margin">
          <Input type="number" min={0} max={10} value={margin} onChange={(e) => setMargin(e.target.value)} />
        </Field>
        <Field label="Colors">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fg}
              onChange={(e) => setFg(e.target.value)}
              className="h-9 w-9 rounded border border-neutral-300 dark:border-neutral-700"
              aria-label="Foreground color"
            />
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="h-9 w-9 rounded border border-neutral-300 dark:border-neutral-700"
              aria-label="Background color"
            />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Roundness (${roundness}%)`}>
          <input
            type="range"
            min={0}
            max={100}
            value={roundness}
            onChange={(e) => setRoundness(e.target.value)}
            className="w-full accent-neutral-600 dark:accent-neutral-400"
          />
        </Field>
        <Field label={`Logo size (${logoScale}% of code)`}>
          <input
            type="range"
            min={10}
            max={35}
            value={logoScale}
            onChange={(e) => setLogoScale(e.target.value)}
            disabled={!logo}
            className="w-full accent-neutral-600 dark:accent-neutral-400 disabled:opacity-50"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {logo ? "Replace logo" : "Add logo"}
        </button>
        {logo && (
          <button
            type="button"
            onClick={removeLogo}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Remove logo
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        {logo && (
          <span className="text-xs text-neutral-500">
            Use error correction Q or H so scanners can recover the covered area.
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <canvas ref={canvasRef} className="max-w-full" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadPng}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Download SVG
          </button>
        </div>
      </div>
    </ToolShell>
  );
}
