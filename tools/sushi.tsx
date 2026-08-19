"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import ToolShell from "@/components/ToolShell";
import Field from "@/components/Field";
import Input from "@/components/Input";
import CopyButton from "@/components/CopyButton";
import ColorSwatch from "@/components/ColorSwatch";
import NumberField from "@/components/NumberField";
import PlateCounter from "@/components/PlateCounter";
import PresetManager from "@/components/PresetManager";
import ExpandableResultRow from "@/components/ExpandableResultRow";
import PersonQrPopover from "@/components/PersonQrPopover";
import ReceiptPreview from "@/tools/sushi-receipt";
import { renderQrToCanvas } from "@/lib/qrRender";
import { captureAnimatedNodeAsPngDataUrl, captureAnimatedNodeAsPngBlob } from "@/lib/htmlCapture";
import { validateId, formatId, idTypeLabel } from "@/lib/promptpay";
import {
  BUILT_IN_PRESETS,
  SUSHIRO_PRESET_ID,
  type Preset,
  type Person,
  type ExtraLine,
  createDefaultPerson,
  createDefaultState,
  makeId,
  duplicatePreset,
  renamePreset,
  addBlankPlate,
  updatePlate,
  removePlate,
  findSimilarPlateIds,
  computeSushiSplit,
  buildCopySummary,
  buildReceiptTotals,
  formatWhole,
} from "@/lib/sushi";

const STORAGE_KEY = "sushi:v1";
const PROMPTPAY_STORAGE_KEY = "promptpay:v1";
const RECEIPT_QR_OPTIONS = { pixelSize: 420, marginModules: 3, fg: "#000000", bg: "#ffffff", roundness: 0, logoScale: 0 };
const ACTION_BTN =
  "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

type PersistedState = {
  presets: Preset[];
  selectedPresetId: string;
  taxIncluded: boolean;
  vat: number;
  service: number;
  people: Person[];
  extras: ExtraLine[];
};

function loadInitial(): PersistedState {
  const fallback = createDefaultState();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

// Read-only: the PromptPay tool owns "promptpay:v1", this tool never writes to it.
function readPromptPayDefaultId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(PROMPTPAY_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return typeof parsed.defaultId === "string" ? parsed.defaultId : "";
  } catch {
    return "";
  }
}

export default function SushiTool() {
  const [state, setState] = useState(loadInitial);
  const [includeBreakdown, setIncludeBreakdown] = useState(false);

  const [promptpayIdInput, setPromptpayIdInput] = useState(readPromptPayDefaultId);
  const [addPromptPayToReceipt, setAddPromptPayToReceipt] = useState(false);
  const [promptpayQrDataUrl, setPromptpayQrDataUrl] = useState("");
  const [openPersonQrId, setOpenPersonQrId] = useState("");
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [printKey, setPrintKey] = useState(0);
  const [exportedAt, setExportedAt] = useState(() => new Date());
  const [receiptExportMessage, setReceiptExportMessage] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);

  function generateReceipt() {
    setExportedAt(new Date());
    setShowReceiptPreview(true);
    setPrintKey((k) => k + 1);
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const allPresets = useMemo(() => [...BUILT_IN_PRESETS, ...state.presets], [state.presets]);
  const activePreset = allPresets.find((p) => p.id === state.selectedPresetId) ?? BUILT_IN_PRESETS[0];
  const similarPlateIds = useMemo(() => findSimilarPlateIds(activePreset.plates), [activePreset]);

  const tax = { taxIncluded: state.taxIncluded, vat: state.vat, service: state.service };
  const result = useMemo(
    () =>
      computeSushiSplit({
        preset: activePreset,
        people: state.people,
        extras: state.extras,
        tax: { taxIncluded: state.taxIncluded, vat: state.vat, service: state.service },
      }),
    [activePreset, state.people, state.extras, state.taxIncluded, state.vat, state.service]
  );
  const isEmpty = result.plateCountTotal === 0 && result.extrasTotal === 0;

  const { digits: promptpayDigits, type: promptpayType, error: promptpayError } = validateId(promptpayIdInput);
  const promptpayReady = addPromptPayToReceipt && !!promptpayType;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!promptpayReady || !promptpayType) {
        setPromptpayQrDataUrl("");
        return;
      }
      try {
        const payload = generatePayload(promptpayDigits, { amount: result.grandTotal });
        const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
        const canvas = document.createElement("canvas");
        await renderQrToCanvas(canvas, qr.modules, RECEIPT_QR_OPTIONS);
        if (!cancelled) setPromptpayQrDataUrl(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setPromptpayQrDataUrl("");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [promptpayReady, promptpayType, promptpayDigits, result.grandTotal]);

  function update(patch: Partial<PersistedState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function updatePresetInList(preset: Preset) {
    setState((prev) => ({ ...prev, presets: prev.presets.map((p) => (p.id === preset.id ? preset : p)) }));
  }

  function handleDuplicate() {
    const copy = duplicatePreset(activePreset);
    setState((prev) => ({ ...prev, presets: [...prev.presets, copy], selectedPresetId: copy.id }));
  }

  function handleDeletePreset() {
    setState((prev) => ({
      ...prev,
      presets: prev.presets.filter((p) => p.id !== activePreset.id),
      selectedPresetId: prev.selectedPresetId === activePreset.id ? SUSHIRO_PRESET_ID : prev.selectedPresetId,
    }));
  }

  function addPerson() {
    setState((prev) => ({ ...prev, people: [...prev.people, createDefaultPerson(prev.people.length + 1)] }));
  }

  function removePerson(id: string) {
    setState((prev) => (prev.people.length <= 1 ? prev : { ...prev, people: prev.people.filter((p) => p.id !== id) }));
  }

  function renamePerson(id: string, name: string) {
    setState((prev) => ({ ...prev, people: prev.people.map((p) => (p.id === id ? { ...p, name } : p)) }));
  }

  function setCount(personId: string, plateId: string, qty: number) {
    setState((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === personId ? { ...p, counts: { ...p.counts, [plateId]: qty } } : p)),
    }));
  }

  function addExtra() {
    setState((prev) => ({ ...prev, extras: [...prev.extras, { id: makeId(), label: "", amount: 0 }] }));
  }

  function updateExtra(id: string, patch: Partial<ExtraLine>) {
    setState((prev) => ({ ...prev, extras: prev.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function removeExtra(id: string) {
    setState((prev) => ({ ...prev, extras: prev.extras.filter((e) => e.id !== id) }));
  }

  function receiptFilename() {
    const slug = activePreset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `sushi-${slug}-${new Date().toISOString().slice(0, 10)}.png`;
  }

  const RECEIPT_CAPTURE_OPTIONS = {
    pixelRatio: 3,
    backgroundColor: "#FBFAF5",
    finalStyles: { boxShadow: "0 10px 28px rgba(26,26,26,0.28)" },
  };

  async function downloadReceipt() {
    if (!receiptRef.current) return;
    const dataUrl = await captureAnimatedNodeAsPngDataUrl(receiptRef.current, RECEIPT_CAPTURE_OPTIONS);
    const link = document.createElement("a");
    link.download = receiptFilename();
    link.href = dataUrl;
    link.click();
  }

  async function copyReceiptImage() {
    if (!receiptRef.current) return;
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setReceiptExportMessage("Copying images isn't supported in this browser — use Download receipt instead.");
      return;
    }
    const blob = await captureAnimatedNodeAsPngBlob(receiptRef.current, RECEIPT_CAPTURE_OPTIONS);
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setReceiptExportMessage("Receipt image copied.");
    } catch {
      setReceiptExportMessage("Could not copy the image — use Download receipt instead.");
    }
  }

  const copyText = buildCopySummary(activePreset, tax, result, includeBreakdown);

  return (
    <ToolShell title="Sushi Bill Splitter" description="Count plates per person, split the bill, VAT-aware.">
      <PresetManager
        key={activePreset.id}
        presets={allPresets}
        activePreset={activePreset}
        onSelect={(id) => update({ selectedPresetId: id })}
        onDuplicate={handleDuplicate}
        onRename={(name) => updatePresetInList(renamePreset(activePreset, name))}
        onDelete={handleDeletePreset}
      />

      <div className="flex flex-wrap gap-3 rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        {activePreset.plates.map((plate) => (
          <ColorSwatch
            key={plate.id}
            color={plate.color}
            label={plate.label}
            price={`฿${plate.price}`}
            caption={plate.pattern}
            warning={similarPlateIds.has(plate.id)}
          />
        ))}
      </div>

      {!activePreset.builtIn && (
        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              <tr>
                <th className="px-2 py-2 font-medium">Colour</th>
                <th className="px-2 py-2 font-medium">Label</th>
                <th className="px-2 py-2 font-medium">Price</th>
                <th className="px-2 py-2 font-medium">Pattern</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {activePreset.plates.map((plate) => (
                <tr key={plate.id} className="border-b border-neutral-100 dark:border-neutral-900 last:border-0">
                  <td className="p-2">
                    <input
                      type="color"
                      value={plate.color}
                      onChange={(e) => updatePresetInList(updatePlate(activePreset, plate.id, { color: e.target.value }))}
                      className="h-8 w-8 rounded border border-neutral-300 dark:border-neutral-700"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={plate.label}
                      onChange={(e) => updatePresetInList(updatePlate(activePreset, plate.id, { label: e.target.value }))}
                      className="min-w-24"
                    />
                  </td>
                  <td className="p-2">
                    <NumberField
                      kind="decimal"
                      value={plate.price}
                      onChange={(value) => updatePresetInList(updatePlate(activePreset, plate.id, { price: value }))}
                      className="w-24"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={plate.pattern ?? ""}
                      onChange={(e) => updatePresetInList(updatePlate(activePreset, plate.id, { pattern: e.target.value }))}
                      className="min-w-24"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => updatePresetInList(removePlate(activePreset, plate.id))}
                      aria-label="Remove plate"
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => updatePresetInList(addBlankPlate(activePreset))} className={clsx(ACTION_BTN, "m-2")}>
            <IconPlus size={14} className="-mt-0.5 inline" /> Add plate
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.taxIncluded}
            onChange={(e) => update({ taxIncluded: e.target.checked })}
            className="h-4 w-4 accent-neutral-600 dark:accent-neutral-400"
          />
          Tax included in plate prices
        </label>
        <Field label="VAT %">
          <NumberField kind="decimal" value={state.vat} onChange={(vat) => update({ vat })} className="w-20" />
        </Field>
        <Field label="Service charge %">
          <NumberField kind="decimal" value={state.service} onChange={(service) => update({ service })} className="w-20" />
        </Field>
      </div>
      <p
        className={clsx(
          "text-xs text-neutral-500 transition-opacity",
          state.taxIncluded ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!state.taxIncluded}
      >
        Service charge is ignored while tax is included — turn the toggle off to add VAT and service on top instead.
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-neutral-500">Shared extras</span>
        {state.extras.map((extra) => (
          <div key={extra.id} className="flex items-center gap-2">
            <Input
              value={extra.label}
              onChange={(e) => updateExtra(extra.id, { label: e.target.value })}
              placeholder="Drinks, dessert…"
              className="flex-1"
            />
            <NumberField kind="decimal" value={extra.amount} onChange={(amount) => updateExtra(extra.id, { amount })} className="w-24" />
            <button type="button" onClick={() => removeExtra(extra.id)} aria-label="Remove extra" className="text-neutral-400 hover:text-red-500">
              <IconTrash size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addExtra} className={clsx(ACTION_BTN, "self-start")}>
          <IconPlus size={14} className="-mt-0.5 inline" /> Add extra
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">People</span>
          <button type="button" onClick={addPerson} className={ACTION_BTN}>
            <IconPlus size={14} className="-mt-0.5 inline" /> Add person
          </button>
        </div>
        {state.people.map((person) => (
          <div key={person.id} className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Input value={person.name} onChange={(e) => renamePerson(person.id, e.target.value)} className="max-w-40" />
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                disabled={state.people.length <= 1}
                aria-label="Remove person"
                className="text-neutral-400 hover:text-red-500 disabled:opacity-30"
              >
                <IconTrash size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activePreset.plates.map((plate) => (
                <PlateCounter
                  key={plate.id}
                  color={plate.color}
                  label={plate.label}
                  value={person.counts[plate.id] ?? 0}
                  onChange={(qty) => setCount(person.id, plate.id, qty)}
                  ariaLabel={`${plate.label} count for ${person.name}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <span className="text-xs font-medium text-neutral-500">Results</span>
        {result.people.map((person) => (
          <ExpandableResultRow
            key={person.id}
            title={person.name.trim() || "Person"}
            badge={person.adjustment !== 0 ? "±1 rounding" : undefined}
            meta={`${person.plateCount} plates`}
            amount={`฿${formatWhole(person.total)}`}
            trace={person.trace}
            extra={
              promptpayType ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenPersonQrId((prev) => (prev === person.id ? "" : person.id))}
                    className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    QR
                  </button>
                  {openPersonQrId === person.id && (
                    <PersonQrPopover
                      name={person.name}
                      digits={promptpayDigits}
                      idType={promptpayType}
                      amount={person.total}
                      onClose={() => setOpenPersonQrId("")}
                    />
                  )}
                </>
              ) : undefined
            }
          />
        ))}
        <ExpandableResultRow
          title="Grand total"
          meta={`${result.plateCountTotal} plates`}
          amount={`฿${formatWhole(result.grandTotal)}`}
          trace={result.trace}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={addPromptPayToReceipt}
            onChange={(e) => setAddPromptPayToReceipt(e.target.checked)}
            disabled={!promptpayType}
            className="h-4 w-4 accent-neutral-600 dark:accent-neutral-400"
          />
          Add PromptPay QR to receipt
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={promptpayIdInput}
            onChange={(e) => setPromptpayIdInput(e.target.value)}
            placeholder="PromptPay ID (mobile, national ID, or e-Wallet)"
            className="max-w-64"
          />
          {promptpayType && (
            <span className="shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-[11px] text-neutral-500">
              {idTypeLabel(promptpayType)}
            </span>
          )}
        </div>
        {promptpayIdInput.trim() ? (
          promptpayError && <p className="text-xs text-red-500">{promptpayError}</p>
        ) : (
          <p className="text-xs text-neutral-500">
            Enter a PromptPay ID to include a QR for the grand total on the receipt, or use the per-person QR
            buttons above.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={generateReceipt} disabled={isEmpty} className={ACTION_BTN}>
            Generate receipt
          </button>
          {showReceiptPreview && (
            <button type="button" onClick={() => setShowReceiptPreview(false)} className={ACTION_BTN}>
              Hide receipt
            </button>
          )}
        </div>

        {showReceiptPreview && (
          <div className="flex justify-center overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 p-4 dark:bg-neutral-950">
            <ReceiptPreview
              key={printKey}
              ref={receiptRef}
              exportedAt={exportedAt}
              result={result}
              tax={tax}
              totals={buildReceiptTotals(result, tax)}
              promptpayQr={
                promptpayReady && promptpayQrDataUrl && promptpayType
                  ? { dataUrl: promptpayQrDataUrl, recipientLabel: formatId(promptpayDigits, promptpayType) }
                  : undefined
              }
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={downloadReceipt} disabled={!showReceiptPreview} className={ACTION_BTN}>
            Download receipt
          </button>
          <button type="button" onClick={copyReceiptImage} disabled={!showReceiptPreview} className={ACTION_BTN}>
            Copy receipt image
          </button>
        </div>
        {receiptExportMessage && <p className="text-xs text-neutral-500">{receiptExportMessage}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={includeBreakdown}
            onChange={(e) => setIncludeBreakdown(e.target.checked)}
            className="h-4 w-4 accent-neutral-600 dark:accent-neutral-400"
          />
          Include full breakdown
        </label>
        <CopyButton value={copyText} />
        <button type="button" onClick={() => update({ people: [createDefaultPerson(1)] })} className={clsx(ACTION_BTN, "ml-auto")}>
          Reset people
        </button>
      </div>
    </ToolShell>
  );
}
