"use client";

import { forwardRef, useEffect, useRef, useState, type Ref } from "react";
import JsBarcode from "jsbarcode";
import type { SplitResult, TaxSettings, ReceiptTotals } from "@/lib/sushi";
import { formatDecimal } from "@/lib/sushi";

// Hardcoded — a receipt is black-on-paper regardless of the app's theme.
const PAPER = "#FFFFFF";
const NOTCH = "#E7E7E7";
const INK = "#1A1A1A";
const RECEIPT_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, "Noto Sans Thai", "Leelawadee UI", Tahoma, monospace';
const WIDTH = 380;
const TOOTH_COUNT = 28;
const TOOTH_HEIGHT = 6;

/**
 * html-to-image's serialization chokes on a clip-path polygon() that mixes
 * percentages with calc() (needed for the bottom edge, since the receipt's
 * height is dynamic) — it silently produces a blank capture. So instead of
 * clipping the paper itself, two small SVG zigzag strips are layered over
 * the top/bottom edges, painted in a slightly darker "torn away" colour —
 * the spec's own suggested fallback, generated rather than hand-listed.
 */
function buildTornEdgePoints(edge: "top" | "bottom"): string {
  const step = WIDTH / TOOTH_COUNT;
  const points: string[] = [];
  for (let i = 0; i <= TOOTH_COUNT; i++) {
    const x = i * step;
    const atEdge = edge === "top" ? 0 : TOOTH_HEIGHT;
    const recessed = edge === "top" ? TOOTH_HEIGHT : 0;
    const y = i % 2 === 0 ? atEdge : recessed;
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function formatReceiptDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()} ${hh}:${min}`;
}

function money(n: number): string {
  return formatDecimal(n);
}

function setRef<T>(ref: Ref<T> | undefined, node: T) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/** A little tactile "poke" when the receipt is clicked — a one-off Web Animation so it never touches the print-in CSS animation or leaks into an export. */
function nudge(node: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  node.animate(
    [
      { transform: "rotate(0deg) scale(1)" },
      { transform: "rotate(-0.6deg) scale(0.994)", offset: 0.35 },
      { transform: "rotate(0.35deg) scale(1.001)", offset: 0.7 },
      { transform: "rotate(0deg) scale(1)" },
    ],
    { duration: 340, easing: "cubic-bezier(0.33, 1, 0.68, 1)" }
  );
}

function Barcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      displayValue: false,
      width: 2,
      height: 60,
      margin: 0,
      background: "transparent",
      lineColor: INK,
    });
  }, [value]);
  return <svg ref={svgRef} style={{ display: "block", width: 300, height: 60, margin: "10px auto" }} />;
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, fontWeight: bold ? 700 : 400 }}>
      <span style={{ width: 128, textAlign: "right" }}>{label}</span>
      <span>:</span>
      <span style={{ width: 76, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export type ReceiptPromptPayQr = {
  dataUrl: string;
  recipientLabel: string;
};

export default forwardRef<
  HTMLDivElement,
  {
    exportedAt: Date;
    result: SplitResult;
    tax: TaxSettings;
    totals: ReceiptTotals;
    promptpayQr?: ReceiptPromptPayQr;
  }
>(function ReceiptPreview({ exportedAt, result, tax, totals, promptpayQr }, forwardedRef) {
  const [splitNo] = useState(() => randomDigits(8));
  const [transNo] = useState(() => randomDigits(8));
  const paperRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <style>{`
        @keyframes sushi-receipt-print {
          0%   { transform: translateY(-100%) rotate(0deg); }
          65%  { transform: translateY(4%) rotate(0.12deg); }
          82%  { transform: translateY(-1%) rotate(-0.06deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        .sushi-receipt-print-in {
          animation: sushi-receipt-print 1.3s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .sushi-receipt-print-in {
            animation: none !important;
            transform: translateY(0) rotate(0deg) !important;
          }
        }
      `}</style>

      <div
        style={{
          width: WIDTH,
          height: 10,
          background: "#2b2a27",
          borderBottom: "1px solid #47453f",
          margin: "0 auto",
        }}
      />
      <div style={{ width: WIDTH, overflow: "hidden", margin: "0 auto", paddingTop: 16 }}>
        <div
          ref={(node) => {
            paperRef.current = node;
            setRef(forwardedRef, node);
          }}
          onClick={() => paperRef.current && nudge(paperRef.current)}
          className="sushi-receipt-print-in"
          style={{
            position: "relative",
            width: WIDTH,
            padding: "22px 18px 26px",
            background: PAPER,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, transparent 1px, transparent 3px)",
            color: INK,
            fontFamily: RECEIPT_FONT,
            fontSize: 12,
            lineHeight: 1.45,
            letterSpacing: "0.04em",
            textShadow: "0 0 0.4px currentColor",
            cursor: "pointer",
          }}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${TOOTH_HEIGHT}`}
            style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: TOOTH_HEIGHT, display: "block" }}
          >
            <polygon points={buildTornEdgePoints("top")} fill={NOTCH} />
          </svg>
          <svg
            viewBox={`0 0 ${WIDTH} ${TOOTH_HEIGHT}`}
            style={{ position: "absolute", bottom: 0, left: 0, width: WIDTH, height: TOOTH_HEIGHT, display: "block" }}
          >
            <polygon points={buildTornEdgePoints("bottom")} fill={NOTCH} />
          </svg>

          {/* header */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "0.18em" }}>SUSHI SPLITTER</div>
            <div style={{ marginTop: 2, textTransform: "uppercase" }}>Bill Split Summary</div>
            <div style={{ marginTop: 2 }}>{formatReceiptDate(exportedAt)}</div>
            <div style={{ marginTop: 8 }}>- &nbsp;S P L I T&nbsp; -</div>
            <div style={{ marginTop: 4, fontSize: 10 }}>
              SPLIT#: {splitNo} &nbsp; TRANS#: {transNo}
            </div>
          </div>

          <div style={{ borderTop: `1px dashed ${INK}`, margin: "14px 0" }} />

          {/* per-person items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.people.map((person) => (
              <div key={person.id}>
                <div style={{ textAlign: "center", fontWeight: 700, overflowWrap: "anywhere" }}>
                  - {person.name.trim() || "Person"} -
                </div>
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                  {person.plateLines.map((line, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textTransform: "uppercase",
                          }}
                        >
                          {line.label} {line.price}
                        </span>
                        <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                          {money(line.lineTotal)}
                        </span>
                      </div>
                      <div style={{ paddingLeft: 12, color: "#4a4944", fontVariantNumeric: "tabular-nums" }}>
                        {line.qty} @ {money(line.price)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                  <TotalRow label="PLATES" value={money(person.plateSubtotal)} />
                  {person.extrasShare > 0 && <TotalRow label="EXTRAS SHARE" value={money(person.extrasShare)} />}
                  {person.adjustment !== 0 && (
                    <TotalRow
                      label="ROUNDING"
                      value={`${person.adjustment > 0 ? "+" : ""}${money(person.adjustment)}`}
                    />
                  )}
                  <TotalRow label="PERSON TOTAL" value={money(person.total)} bold />
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px dashed ${INK}`, margin: "14px 0" }} />

          {/* grand totals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TotalRow label="SUBTOTAL" value={money(totals.subtotal)} />
            {tax.taxIncluded ? (
              <TotalRow label={`VAT ${tax.vat}% INCL`} value={money(totals.vat)} />
            ) : (
              <>
                <TotalRow label={`VAT ${tax.vat}%`} value={money(totals.vat)} />
                {tax.service > 0 && <TotalRow label={`SERVICE ${tax.service}%`} value={money(totals.service)} />}
              </>
            )}
            <TotalRow label="TOTAL" value={money(totals.total)} bold />
          </div>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            # OF PLATES PURCHASED : {result.plateCountTotal}
          </div>
          <div style={{ textAlign: "center", marginTop: 4, fontSize: 10, color: "#4a4944" }}>
            PEOPLE: {result.people.length} &nbsp;&nbsp; METHOD: EVEN SPLIT ON EXTRAS
          </div>

          {promptpayQr && (
            <>
              <div style={{ borderTop: `1px dashed ${INK}`, margin: "14px 0" }} />
              <div style={{ textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, not served by Next */}
                <img
                  src={promptpayQr.dataUrl}
                  alt="PromptPay QR"
                  width={140}
                  height={140}
                  style={{ margin: "0 auto", display: "block" }}
                />
                <div style={{ marginTop: 6, fontSize: 11, overflowWrap: "anywhere" }}>
                  {promptpayQr.recipientLabel}
                </div>
              </div>
            </>
          )}

          <div style={{ borderTop: `1px dashed ${INK}`, margin: "14px 0" }} />
          <Barcode value={splitNo} />

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 10.5 }}>
            <div>THANK YOU FOR SPLITTING FAIRLY</div>
            <div style={{ marginTop: 2 }}>NO REFUNDS ON SUSHI ALREADY EATEN</div>
            <div style={{ marginTop: 2, color: "#4a4944" }}>GENERATED AT TOOLS.ZAGIF.COM</div>
          </div>
        </div>
      </div>
    </div>
  );
});
