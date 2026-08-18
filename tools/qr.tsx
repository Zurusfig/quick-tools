"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import TextArea from "@/components/TextArea";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { usePersistedState, useDebounced } from "@/lib/hooks";

type EcLevel = "L" | "M" | "Q" | "H";

export default function QrTool() {
  const [text, setText] = usePersistedState("qr:text", "https://example.com");
  const [ecLevel, setEcLevel] = usePersistedState("qr:ec", "M");
  const [size, setSize] = usePersistedState("qr:size", "256");
  const [margin, setMargin] = usePersistedState("qr:margin", "2");
  const [fg, setFg] = usePersistedState("qr:fg", "#000000");
  const [bg, setBg] = usePersistedState("qr:bg", "#ffffff");
  const [error, setError] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debouncedText = useDebounced(text);
  const debouncedSize = useDebounced(size);
  const debouncedMargin = useDebounced(margin);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!debouncedText.trim()) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const options = {
      errorCorrectionLevel: ecLevel as EcLevel,
      width: Number(debouncedSize) || 256,
      margin: Number(debouncedMargin) || 0,
      color: { dark: fg, light: bg },
    };

    QRCode.toCanvas(canvas, debouncedText, options)
      .then(() => setError(""))
      .catch((err: Error) => setError(err.message));

    QRCode.toString(debouncedText, { ...options, type: "svg" })
      .then((svg: string) => setSvgMarkup(svg))
      .catch(() => setSvgMarkup(""));
  }, [debouncedText, ecLevel, debouncedSize, debouncedMargin, fg, bg]);

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
