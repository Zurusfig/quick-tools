import type { SplitResult, TaxSettings, ReceiptTotals } from "@/lib/sushi";
import { formatWhole } from "@/lib/sushi";

// Hardcoded — a receipt is black-on-paper regardless of the app's theme.
const PAPER = "#f7f3ea";
const INK = "#2b2a27";
const FAINT_INK = "#4a4944";
const MUTED_INK = "#8a8478";
const RECEIPT_FONT =
  'ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, Consolas, "Liberation Mono", monospace, "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';

const dashedRule: React.CSSProperties = { borderTop: `1px dashed ${MUTED_INK}`, margin: "14px 0" };

function DotRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4, fontWeight: bold ? 700 : 400 }}>
      <span style={{ overflowWrap: "anywhere" }}>{label}</span>
      <span style={{ flex: 1, minWidth: 8, marginBottom: 3, borderBottom: `1px dotted ${MUTED_INK}` }} />
      <span style={{ whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

export type ReceiptPromptPayQr = {
  dataUrl: string;
  recipientLabel: string;
};

export default function ReceiptPreview({
  presetName,
  exportedAt,
  result,
  tax,
  totals,
  promptpayQr,
}: {
  presetName: string;
  exportedAt: Date;
  result: SplitResult;
  tax: TaxSettings;
  totals: ReceiptTotals;
  promptpayQr?: ReceiptPromptPayQr;
}) {
  const dateLabel = exportedAt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div
      style={{
        width: 380,
        padding: "24px 20px",
        background: PAPER,
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.035) 1px, transparent 0)",
        backgroundSize: "6px 6px",
        color: INK,
        fontFamily: RECEIPT_FONT,
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {presetName}
        </div>
        <div style={{ fontSize: 11, color: MUTED_INK, marginTop: 4 }}>{dateLabel}</div>
        <div style={{ fontSize: 11, color: MUTED_INK }}>
          {result.people.length} {result.people.length === 1 ? "person" : "people"} · {result.plateCountTotal} plates
        </div>
      </div>

      <div style={dashedRule} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {result.people.map((person) => (
          <div key={person.id}>
            <DotRow label={(person.name.trim() || "Person").toUpperCase()} value={formatWhole(person.total)} bold />
            <div style={{ marginTop: 2, paddingLeft: 10, fontSize: 11, color: FAINT_INK }}>
              {person.plateLines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <span style={{ flex: 1, overflowWrap: "anywhere" }}>
                    {line.label.toLowerCase()} {line.price}
                  </span>
                  <span style={{ flexShrink: 0 }}>×{line.qty}</span>
                  <span style={{ flexShrink: 0, width: 40, textAlign: "right" }}>{formatWhole(line.lineTotal)}</span>
                </div>
              ))}
              {person.extrasShare > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ flex: 1 }}>extras share</span>
                  <span style={{ flexShrink: 0 }}>{formatWhole(person.extrasShare)}</span>
                </div>
              )}
              {person.adjustment !== 0 && (
                <div style={{ fontStyle: "italic" }}>{person.adjustment > 0 ? "+1" : "-1"} baht rounding</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={dashedRule} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <DotRow label="SUBTOTAL" value={formatWhole(totals.subtotal)} />
        {tax.taxIncluded ? (
          <DotRow label={`VAT ${tax.vat}% (included)`} value={formatWhole(totals.vat)} />
        ) : (
          <>
            <DotRow label={`VAT ${tax.vat}%`} value={formatWhole(totals.vat)} />
            {tax.service > 0 && <DotRow label={`SERVICE ${tax.service}%`} value={formatWhole(totals.service)} />}
          </>
        )}
        <DotRow label="TOTAL" value={formatWhole(totals.total)} bold />
      </div>

      {promptpayQr && (
        <>
          <div style={dashedRule} />
          <div style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, not served by Next */}
            <img
              src={promptpayQr.dataUrl}
              alt="PromptPay QR"
              width={140}
              height={140}
              style={{ margin: "0 auto", display: "block" }}
            />
            <div style={{ fontSize: 11, marginTop: 6, overflowWrap: "anywhere" }}>{promptpayQr.recipientLabel}</div>
          </div>
        </>
      )}

      <div style={dashedRule} />
      <div style={{ textAlign: "center", fontSize: 10, color: MUTED_INK }}>generated at tools.zagif.com</div>
    </div>
  );
}
