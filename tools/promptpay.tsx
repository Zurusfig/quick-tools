"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import ToolShell from "@/components/ToolShell";
import Field, { ErrorText } from "@/components/Field";
import Input from "@/components/Input";
import CopyButton from "@/components/CopyButton";
import SavedIdChips from "@/components/SavedIdChips";
import { renderQrToCanvas, renderQrToSvgString, downloadCanvasPng, downloadSvgString } from "@/lib/qrRender";
import {
  createDefaultState,
  validateId,
  parseAmount,
  formatId,
  idTypeLabel,
  formatThb,
  buildPayloadTrace,
  type PromptPayState,
} from "@/lib/promptpay";

const STORAGE_KEY = "promptpay:v1";
const NOTE_KEY = "promptpay:note-dismissed";
const ACTION_BTN =
  "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800";
const QR_OPTIONS = { pixelSize: 320, marginModules: 4, fg: "#000000", bg: "#ffffff", roundness: 0, logoScale: 0 };

function loadState(): PromptPayState {
  const fallback = createDefaultState();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export default function PromptPayTool() {
  const [state, setState] = useState(loadState);
  const [idInput, setIdInput] = useState(() => state.defaultId);
  const [amountInput, setAmountInput] = useState("");
  const [showSaveField, setShowSaveField] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [noteDismissed, setNoteDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(NOTE_KEY) === "1"
  );
  const [copyImageMessage, setCopyImageMessage] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [payloadError, setPayloadError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const { digits, type, error: idError } = validateId(idInput);
  const { value: amount, error: amountError } = parseAmount(amountInput);

  let payload = "";
  if (type && !amountError) {
    try {
      payload = generatePayload(digits, amount ? { amount } : {});
    } catch {
      // validated digits/amount should never reach here; QR simply won't render
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!payload) {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        setSvgMarkup("");
        setPayloadError("");
        return;
      }
      try {
        const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
        await renderQrToCanvas(canvas, qr.modules, QR_OPTIONS);
        if (cancelled) return;
        setSvgMarkup(renderQrToSvgString(qr.modules, QR_OPTIONS));
        setPayloadError("");
      } catch (err) {
        if (!cancelled) {
          setPayloadError(err instanceof Error ? err.message : "Could not generate this QR.");
          setSvgMarkup("");
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  function saveCurrentId() {
    if (!type) return;
    const label = saveLabel.trim() || formatId(digits, type);
    setState((prev) => ({
      ...prev,
      savedIds: [...prev.savedIds.filter((s) => s.id !== digits), { id: digits, label, type }],
    }));
    setSaveLabel("");
    setShowSaveField(false);
  }

  function toggleDefault(id: string) {
    setState((prev) => ({ ...prev, defaultId: prev.defaultId === id ? "" : id }));
  }

  function deleteSaved(id: string) {
    setState((prev) => ({
      ...prev,
      savedIds: prev.savedIds.filter((s) => s.id !== id),
      defaultId: prev.defaultId === id ? "" : prev.defaultId,
    }));
  }

  function dismissNote() {
    setNoteDismissed(true);
    window.localStorage.setItem(NOTE_KEY, "1");
  }

  function downloadPng() {
    if (canvasRef.current) downloadCanvasPng(canvasRef.current, "promptpay.png");
  }

  function downloadSvg() {
    if (svgMarkup) downloadSvgString(svgMarkup, "promptpay.svg");
  }

  async function copyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setCopyImageMessage("Copying images isn't supported in this browser — use Download PNG instead.");
      return;
    }
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyImageMessage("Image copied.");
    } catch {
      setCopyImageMessage("Could not copy the image — use Download PNG instead.");
    }
  }

  return (
    <ToolShell
      title="PromptPay QR Generator"
      description="Generate a Thai PromptPay QR from a phone number, national ID, or e-Wallet ID. Nothing leaves your browser."
    >
      <SavedIdChips
        savedIds={state.savedIds}
        defaultId={state.defaultId}
        onSelect={setIdInput}
        onToggleDefault={toggleDefault}
        onDelete={deleteSaved}
      />

      <Field label="Recipient ID">
        <div className="flex items-center gap-2">
          <Input
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            placeholder="Mobile, national ID, or e-Wallet ID"
            className="flex-1"
          />
          {type && (
            <span className="shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] text-neutral-500">
              {idTypeLabel(type)}
            </span>
          )}
        </div>
      </Field>
      <ErrorText>{idInput.trim() ? idError : ""}</ErrorText>

      <Field label="Amount (optional)">
        <Input
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="Leave blank — payer enters the amount"
          className="max-w-56"
        />
      </Field>
      <ErrorText>{amountError}</ErrorText>

      {type && !showSaveField && (
        <button type="button" onClick={() => setShowSaveField(true)} className={ACTION_BTN}>
          Save this ID
        </button>
      )}
      {showSaveField && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={saveLabel}
            onChange={(e) => setSaveLabel(e.target.value)}
            placeholder="Label, e.g. My PromptPay"
            className="max-w-56"
          />
          <button type="button" onClick={saveCurrentId} className={ACTION_BTN}>
            Save
          </button>
          <button type="button" onClick={() => setShowSaveField(false)} className={ACTION_BTN}>
            Cancel
          </button>
        </div>
      )}

      <ErrorText>{payloadError}</ErrorText>

      {payload && type && (
        <>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <canvas ref={canvasRef} className="max-w-full" />
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={downloadPng} className={ACTION_BTN}>
                Download PNG
              </button>
              <button type="button" onClick={downloadSvg} className={ACTION_BTN}>
                Download SVG
              </button>
              <button type="button" onClick={copyImage} className={ACTION_BTN}>
                Copy image
              </button>
            </div>
            {copyImageMessage && <p className="text-xs text-neutral-500">{copyImageMessage}</p>}
          </div>

          <div className="flex flex-col gap-1 rounded-md border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
            <p>
              <span className="text-neutral-500">Recipient:</span>{" "}
              <span className="font-mono">{formatId(digits, type)}</span>
            </p>
            <p>
              <span className="text-neutral-500">Type:</span> {idTypeLabel(type)}
            </p>
            <p>
              <span className="text-neutral-500">Amount:</span>{" "}
              {amount ? formatThb(amount) : "payer enters amount"}
            </p>
          </div>

          <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
            <summary className="cursor-pointer px-3 py-2 text-sm">Raw payload</summary>
            <div className="flex flex-col gap-2 px-3 pb-3">
              <pre className="overflow-x-auto whitespace-pre font-mono text-xs text-neutral-600 dark:text-neutral-400">
                {buildPayloadTrace(payload).join("\n")}
              </pre>
              <CopyButton value={payload} className="self-start" />
            </div>
          </details>

          {!noteDismissed && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 p-2 text-xs text-neutral-500">
              <span>Tip: send yourself ฿1 the first time to confirm this ID resolves to the right account name.</span>
              <button type="button" onClick={dismissNote} aria-label="Dismiss" className="shrink-0 text-neutral-400 hover:text-neutral-600">
                ×
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  );
}
