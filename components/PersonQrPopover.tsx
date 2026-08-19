"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { IconX } from "@tabler/icons-react";
import { renderQrToCanvas } from "@/lib/qrRender";
import { formatId, type IdType } from "@/lib/promptpay";

export default function PersonQrPopover({
  name,
  digits,
  idType,
  amount,
  onClose,
}: {
  name: string;
  digits: string;
  idType: IdType;
  amount: number;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const payload = generatePayload(digits, { amount });
        const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
        await renderQrToCanvas(canvas, qr.modules, {
          pixelSize: 176,
          marginModules: 3,
          fg: "#000000",
          bg: "#ffffff",
          roundness: 0,
          logoScale: 0,
        });
        if (!cancelled) setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not generate this QR.");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [digits, amount]);

  return (
    <div className="animate-scale-in absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="truncate text-xs font-medium">{name.trim() || "Person"}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-neutral-400 hover:text-neutral-600">
          <IconX size={14} />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <canvas ref={canvasRef} className="mx-auto block" />
      )}
      <p className="mt-2 text-center text-[11px] text-neutral-500">{formatId(digits, idType)}</p>
    </div>
  );
}
