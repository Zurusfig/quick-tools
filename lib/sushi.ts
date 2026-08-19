export type Plate = {
  id: string;
  label: string;
  price: number;
  color: string;
  pattern?: string;
};

export type Preset = {
  id: string;
  name: string;
  plates: Plate[];
  builtIn: boolean;
};

export type Person = {
  id: string;
  name: string;
  counts: Record<string, number>;
};

export type ExtraLine = {
  id: string;
  label: string;
  amount: number;
};

export type TaxSettings = {
  taxIncluded: boolean;
  vat: number;
  service: number;
};

export const SUSHIRO_PRESET_ID = "sushiro";
export const KATSU_MIDORI_PRESET_ID = "katsu-midori";

const sushiroPlates: Plate[] = [
  { id: "sushiro-white", label: "White", price: 30, color: "#FFFFFF" },
  { id: "sushiro-red", label: "Red", price: 40, color: "#D32F2F" },
  { id: "sushiro-silver", label: "Silver", price: 60, color: "#C0C4C8" },
  { id: "sushiro-gold", label: "Gold", price: 80, color: "#D4AF37" },
  { id: "sushiro-black", label: "Black", price: 120, color: "#1A1A1A" },
];

const katsuMidoriPlates: Plate[] = [
  { id: "km-red", label: "Red", price: 40, color: "#D32F2F", pattern: "fan" },
  { id: "km-blue", label: "Blue", price: 50, color: "#2E6DA4", pattern: "fan" },
  { id: "km-green", label: "Green", price: 60, color: "#2E7D32", pattern: "fan" },
  { id: "km-orange", label: "Orange", price: 70, color: "#F0932B", pattern: "plain" },
  { id: "km-brown", label: "Brown", price: 80, color: "#8B5A2B", pattern: "asanoha" },
  { id: "km-peach", label: "Peach", price: 90, color: "#F3B0A0", pattern: "floral" },
  { id: "km-olive", label: "Olive", price: 100, color: "#A8A86B", pattern: "hexagon" },
  { id: "km-cream", label: "Cream", price: 120, color: "#F5EFD9", pattern: "gold swirl" },
  {
    id: "km-crimson",
    label: "Crimson",
    price: 140,
    color: "#7A1220",
    pattern: "patterned — red with floral print",
  },
  { id: "km-gold", label: "Gold", price: 150, color: "#E3C05B", pattern: "waffle" },
  { id: "km-navy-white", label: "Navy/White", price: 160, color: "#2C4A7C", pattern: "geometric" },
  { id: "km-dark-navy", label: "Dark navy", price: 180, color: "#16233A", pattern: "diamond" },
];

export const BUILT_IN_PRESETS: Preset[] = [
  { id: SUSHIRO_PRESET_ID, name: "Sushiro", plates: sushiroPlates, builtIn: true },
  { id: KATSU_MIDORI_PRESET_ID, name: "Katsu Midori", plates: katsuMidoriPlates, builtIn: true },
];

export function makeId(): string {
  return crypto.randomUUID();
}

export function createDefaultPerson(index: number): Person {
  return { id: makeId(), name: `Person ${index}`, counts: {} };
}

export type SushiState = {
  presets: Preset[];
  selectedPresetId: string;
  taxIncluded: boolean;
  vat: number;
  service: number;
  people: Person[];
  extras: ExtraLine[];
};

export function createDefaultState(): SushiState {
  return {
    presets: [],
    selectedPresetId: SUSHIRO_PRESET_ID,
    taxIncluded: true,
    vat: 10,
    service: 0,
    people: [createDefaultPerson(1)],
    extras: [],
  };
}

// --- colour helpers -------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

const SIMILAR_COLOR_THRESHOLD = 30;

export function needsSwatchBorder(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.75;
}

/** Plate ids that have at least one visually-similar sibling within the same plate list. */
export function findSimilarPlateIds(plates: Plate[]): Set<string> {
  const flagged = new Set<string>();
  for (let i = 0; i < plates.length; i++) {
    for (let j = i + 1; j < plates.length; j++) {
      if (colorDistance(plates[i].color, plates[j].color) < SIMILAR_COLOR_THRESHOLD) {
        flagged.add(plates[i].id);
        flagged.add(plates[j].id);
      }
    }
  }
  return flagged;
}

// --- input validation ------------------------------------------------------

export function parseNonNegativeInt(raw: string): { value: number; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: 0, error: "" };
  if (!/^\d+$/.test(trimmed)) return { value: 0, error: "Whole numbers only" };
  return { value: Number(trimmed), error: "" };
}

export function parseNonNegativeNumber(raw: string): { value: number; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: 0, error: "" };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { value: 0, error: "Enter a positive number" };
  return { value: Number(trimmed), error: "" };
}

// --- preset editing (pure, immutable) --------------------------------------

export function duplicatePreset(preset: Preset): Preset {
  return {
    id: makeId(),
    name: `${preset.name} copy`,
    builtIn: false,
    plates: preset.plates.map((plate) => ({ ...plate })),
  };
}

export function renamePreset(preset: Preset, name: string): Preset {
  return { ...preset, name };
}

export function addBlankPlate(preset: Preset): Preset {
  const plate: Plate = { id: makeId(), label: "New plate", price: 0, color: "#888888" };
  return { ...preset, plates: [...preset.plates, plate] };
}

export function updatePlate(preset: Preset, plateId: string, patch: Partial<Plate>): Preset {
  return {
    ...preset,
    plates: preset.plates.map((plate) => (plate.id === plateId ? { ...plate, ...patch } : plate)),
  };
}

export function removePlate(preset: Preset, plateId: string): Preset {
  return { ...preset, plates: preset.plates.filter((plate) => plate.id !== plateId) };
}

// --- formatting --------------------------------------------------------

const wholeFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatWhole(n: number): string {
  return wholeFormatter.format(Math.round(n));
}

export function formatDecimal(n: number): string {
  return decimalFormatter.format(n);
}

const DIVIDER = "─".repeat(24);

// --- calculation ------------------------------------------------------------

export type SplitInput = {
  preset: Preset;
  people: Person[];
  extras: ExtraLine[];
  tax: TaxSettings;
};

export type PlateLine = {
  label: string;
  price: number;
  qty: number;
  lineTotal: number;
};

export type PersonResult = {
  id: string;
  name: string;
  plateCount: number;
  plateSubtotal: number;
  extrasShare: number;
  preTaxSubtotal: number;
  unroundedTotal: number;
  total: number;
  adjustment: number;
  plateLines: PlateLine[];
  trace: string[];
};

export type SplitResult = {
  people: PersonResult[];
  plateCountTotal: number;
  extrasTotal: number;
  plateSubtotalTotal: number;
  unroundedGrandTotal: number;
  grandTotal: number;
  trace: string[];
};

function buildPersonTrace(params: {
  person: Person;
  plateEntries: { plate: Plate; qty: number }[];
  sharedPerPerson: number;
  extrasTotal: number;
  peopleCount: number;
  tax: TaxSettings;
  preTaxSubtotal: number;
  plateSubtotal: number;
  plateCount: number;
  unroundedTotal: number;
  baseRounded: number;
  adjustment: number;
  finalTotal: number;
}): string[] {
  const {
    person,
    plateEntries,
    sharedPerPerson,
    extrasTotal,
    peopleCount,
    tax,
    preTaxSubtotal,
    plateSubtotal,
    plateCount,
    unroundedTotal,
    baseRounded,
    adjustment,
    finalTotal,
  } = params;

  const lines: string[] = [person.name.trim() || "Person"];

  if (plateEntries.length > 0) {
    for (const { plate, qty } of plateEntries) {
      const namePrice = `${plate.label} ${formatWhole(plate.price)}`;
      lines.push(
        `  ${namePrice.padEnd(18)}× ${String(qty).padStart(2)} = ${formatWhole(plate.price * qty)}`
      );
    }
    lines.push(`  ${DIVIDER}`);
  }

  lines.push(
    `  ${"Plates".padEnd(18)}${formatWhole(plateSubtotal).padStart(6)}   (${plateCount} plate${
      plateCount === 1 ? "" : "s"
    })`
  );

  if (extrasTotal !== 0) {
    lines.push(
      `  ${"Extras".padEnd(12)}${formatWhole(extrasTotal)} ÷ ${peopleCount} = ${formatDecimal(
        sharedPerPerson
      )}`
    );
  }

  lines.push(`  ${"Subtotal".padEnd(18)}${formatDecimal(preTaxSubtotal).padStart(6)}`);

  if (tax.taxIncluded) {
    const component = preTaxSubtotal - preTaxSubtotal / (1 + tax.vat / 100);
    lines.push(`  Tax included at ${tax.vat}% → component ${formatDecimal(component)}, nothing added`);
  } else {
    const multiplier = 1 + (tax.vat + tax.service) / 100;
    lines.push(`  Tax  ${formatDecimal(preTaxSubtotal)} × ${multiplier.toFixed(2)} = ${formatDecimal(unroundedTotal)}`);
  }

  lines.push(`  ${DIVIDER}`);

  const direction = baseRounded > unroundedTotal ? "up" : baseRounded < unroundedTotal ? "down" : "exact";
  const adjustmentNote = adjustment !== 0 ? `; ${adjustment > 0 ? "+1" : "-1"} baht rounding adjustment` : "";
  lines.push(
    `  ${"Total".padEnd(18)}${formatWhole(finalTotal).padStart(6)}   (rounded ${direction} from ${formatDecimal(
      unroundedTotal
    )}${adjustmentNote})`
  );

  return lines;
}

function buildGrandTrace(params: {
  preset: Preset;
  peopleCount: number;
  plateSubtotalTotal: number;
  extrasTotal: number;
  tax: TaxSettings;
  unroundedGrandTotal: number;
  grandTotal: number;
  people: PersonResult[];
}): string[] {
  const { preset, peopleCount, plateSubtotalTotal, extrasTotal, tax, unroundedGrandTotal, grandTotal, people } =
    params;

  const lines: string[] = [`${preset.name} · ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`];
  lines.push(`  ${"Plates total".padEnd(18)}${formatWhole(plateSubtotalTotal).padStart(6)}`);
  if (extrasTotal !== 0) {
    lines.push(`  ${"Extras total".padEnd(18)}${formatWhole(extrasTotal).padStart(6)}`);
  }

  const preTaxTotal = plateSubtotalTotal + extrasTotal;
  lines.push(`  ${"Subtotal".padEnd(18)}${formatDecimal(preTaxTotal).padStart(6)}`);

  if (tax.taxIncluded) {
    const component = preTaxTotal - preTaxTotal / (1 + tax.vat / 100);
    lines.push(`  Tax included at ${tax.vat}% → component ${formatDecimal(component)}, nothing added`);
  } else {
    const multiplier = 1 + (tax.vat + tax.service) / 100;
    lines.push(`  Tax  ${formatDecimal(preTaxTotal)} × ${multiplier.toFixed(2)} = ${formatDecimal(unroundedGrandTotal)}`);
  }

  lines.push(`  ${DIVIDER}`);
  lines.push(
    `  ${"Grand total".padEnd(18)}${formatWhole(grandTotal).padStart(6)}   (unrounded ${formatDecimal(
      unroundedGrandTotal
    )})`
  );

  const sumOfPeople = people.reduce((sum, p) => sum + p.total, 0);
  const adjusted = people.filter((p) => p.adjustment !== 0);
  const reconciliation =
    adjusted.length > 0
      ? `rounding adjustments: ${adjusted.map((p) => `${p.name.trim() || "Person"} ${p.adjustment > 0 ? "+1" : "-1"}`).join(", ")}`
      : "no rounding adjustments needed";
  lines.push(
    `  ${"Per-person sum".padEnd(18)}${formatWhole(sumOfPeople).padStart(6)}   (${reconciliation}${
      sumOfPeople === grandTotal ? " — matches ✓" : ""
    })`
  );

  return lines;
}

export function computeSushiSplit(input: SplitInput): SplitResult {
  const { preset, people, extras, tax } = input;
  const peopleCount = Math.max(people.length, 1);
  const extrasTotal = extras.reduce((sum, e) => sum + e.amount, 0);
  const sharedPerPerson = extrasTotal / peopleCount;
  const multiplier = tax.taxIncluded ? 1 : 1 + (tax.vat + tax.service) / 100;

  const raw = people.map((person) => {
    const plateEntries = preset.plates
      .map((plate) => ({ plate, qty: person.counts[plate.id] ?? 0 }))
      .filter((entry) => entry.qty > 0);
    const plateCount = plateEntries.reduce((sum, e) => sum + e.qty, 0);
    const plateSubtotal = plateEntries.reduce((sum, e) => sum + e.qty * e.plate.price, 0);
    const preTaxSubtotal = plateSubtotal + sharedPerPerson;
    const unroundedTotal = preTaxSubtotal * multiplier;
    return { person, plateEntries, plateCount, plateSubtotal, preTaxSubtotal, unroundedTotal };
  });

  const baseRounded = raw.map((p) => Math.round(p.unroundedTotal));
  const unroundedGrandTotal = raw.reduce((sum, p) => sum + p.unroundedTotal, 0);
  const grandTotal = Math.round(unroundedGrandTotal);
  const sumBaseRounded = baseRounded.reduce((sum, v) => sum + v, 0);
  const diff = grandTotal - sumBaseRounded;

  const remainders = raw.map((p) => p.unroundedTotal - Math.floor(p.unroundedTotal));
  const order = raw.map((_, i) => i);
  if (diff > 0) order.sort((a, b) => remainders[b] - remainders[a]);
  else if (diff < 0) order.sort((a, b) => remainders[a] - remainders[b]);

  const adjustments = new Array(raw.length).fill(0);
  let remaining = Math.abs(diff);
  let cursor = 0;
  while (remaining > 0 && order.length > 0) {
    adjustments[order[cursor % order.length]] += diff > 0 ? 1 : -1;
    remaining--;
    cursor++;
  }

  const peopleResults: PersonResult[] = raw.map((p, i) => {
    const finalTotal = baseRounded[i] + adjustments[i];
    const trace = buildPersonTrace({
      person: p.person,
      plateEntries: p.plateEntries,
      sharedPerPerson,
      extrasTotal,
      peopleCount,
      tax,
      preTaxSubtotal: p.preTaxSubtotal,
      plateSubtotal: p.plateSubtotal,
      plateCount: p.plateCount,
      unroundedTotal: p.unroundedTotal,
      baseRounded: baseRounded[i],
      adjustment: adjustments[i],
      finalTotal,
    });
    return {
      id: p.person.id,
      name: p.person.name,
      plateCount: p.plateCount,
      plateSubtotal: p.plateSubtotal,
      extrasShare: sharedPerPerson,
      preTaxSubtotal: p.preTaxSubtotal,
      unroundedTotal: p.unroundedTotal,
      total: finalTotal,
      adjustment: adjustments[i],
      plateLines: p.plateEntries.map((e) => ({
        label: e.plate.label,
        price: e.plate.price,
        qty: e.qty,
        lineTotal: e.plate.price * e.qty,
      })),
      trace,
    };
  });

  const plateCountTotal = peopleResults.reduce((sum, p) => sum + p.plateCount, 0);
  const plateSubtotalTotal = raw.reduce((sum, p) => sum + p.plateSubtotal, 0);

  const trace = buildGrandTrace({
    preset,
    peopleCount: people.length,
    plateSubtotalTotal,
    extrasTotal,
    tax,
    unroundedGrandTotal,
    grandTotal,
    people: peopleResults,
  });

  return {
    people: peopleResults,
    plateCountTotal,
    extrasTotal,
    plateSubtotalTotal,
    unroundedGrandTotal,
    grandTotal,
    trace,
  };
}

// --- copy summary ------------------------------------------------------------

export function buildCopySummary(
  preset: Preset,
  tax: TaxSettings,
  result: SplitResult,
  includeBreakdown: boolean
): string {
  if (includeBreakdown) {
    const sections = result.people.map((p) => p.trace.join("\n"));
    sections.push(result.trace.join("\n"));
    return sections.join("\n\n");
  }

  const nameWidth = Math.max(...result.people.map((p) => (p.name.trim() || "Person").length), 5);
  const lines = [`${preset.name} · ${result.people.length} คน`];
  for (const person of result.people) {
    const name = (person.name.trim() || "Person").padEnd(nameWidth);
    const plates = `${person.plateCount} plates`.padStart(10);
    const amount = formatWhole(person.total).padStart(8);
    lines.push(`${name} ${plates} ${amount}`);
  }
  lines.push("─".repeat(nameWidth + 21));
  const taxLabel = tax.taxIncluded
    ? `Total (${tax.vat}% VAT incl.)`
    : `Total (+${tax.vat}% VAT${tax.service ? ` +${tax.service}% svc` : ""})`;
  lines.push(`${taxLabel.padEnd(nameWidth + 11)}${formatWhole(result.grandTotal).padStart(8)}`);
  return lines.join("\n");
}

// --- receipt totals ----------------------------------------------------------
// Same formulas already used by buildGrandTrace, just re-derived from the
// existing SplitResult fields for the receipt's SUBTOTAL/VAT/SERVICE/TOTAL
// layout — not a new source of truth.

export type ReceiptTotals = {
  subtotal: number;
  vat: number;
  service: number;
  total: number;
};

export function buildReceiptTotals(result: SplitResult, tax: TaxSettings): ReceiptTotals {
  const preTaxTotal = result.plateSubtotalTotal + result.extrasTotal;
  if (tax.taxIncluded) {
    const vat = preTaxTotal - preTaxTotal / (1 + tax.vat / 100);
    return { subtotal: preTaxTotal - vat, vat, service: 0, total: result.grandTotal };
  }
  const vat = preTaxTotal * (tax.vat / 100);
  const service = preTaxTotal * (tax.service / 100);
  return { subtotal: preTaxTotal, vat, service, total: result.grandTotal };
}
