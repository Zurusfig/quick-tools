import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILT_IN_PRESETS,
  KATSU_MIDORI_PRESET_ID,
  computeSushiSplit,
  findSimilarPlateIds,
  needsSwatchBorder,
  formatWhole,
  type Person,
  type ExtraLine,
  type TaxSettings,
} from "./sushi.ts";

const katsuMidori = BUILT_IN_PRESETS.find((p) => p.id === KATSU_MIDORI_PRESET_ID)!;

function personWith(name: string, counts: Record<string, number>): Person {
  return { id: name, name, counts };
}

function sumTotals(result: { people: { total: number }[] }): number {
  return result.people.reduce((sum, p) => sum + p.total, 0);
}

// --- (a) per-person totals always sum exactly to the grand total -----------

test("3 people, 7% VAT excluded, odd extras: per-person totals sum to the grand total", () => {
  const people: Person[] = [
    personWith("Earn", { "km-red": 3, "km-green": 2, "km-crimson": 1 }),
    personWith("Ploy", { "km-blue": 4, "km-olive": 1 }),
    personWith("Nine", { "km-gold": 2, "km-dark-navy": 1, "km-orange": 3 }),
  ];
  const extras: ExtraLine[] = [{ id: "e1", label: "green tea", amount: 47 }];
  const tax: TaxSettings = { taxIncluded: false, vat: 7, service: 0 };

  const result = computeSushiSplit({ preset: katsuMidori, people, extras, tax });

  assert.equal(sumTotals(result), result.grandTotal);
  assert.equal(result.grandTotal, Math.round(result.unroundedGrandTotal));
});

test("3 people, 7% VAT included, odd extras: per-person totals sum to the grand total", () => {
  const people: Person[] = [
    personWith("Earn", { "km-red": 3, "km-green": 2, "km-crimson": 1 }),
    personWith("Ploy", { "km-blue": 4, "km-olive": 1 }),
    personWith("Nine", { "km-gold": 2, "km-dark-navy": 1, "km-orange": 3 }),
  ];
  const extras: ExtraLine[] = [{ id: "e1", label: "green tea", amount: 47 }];
  const tax: TaxSettings = { taxIncluded: true, vat: 7, service: 0 };

  const result = computeSushiSplit({ preset: katsuMidori, people, extras, tax });

  assert.equal(sumTotals(result), result.grandTotal);
});

test("service charge added on top when tax is excluded", () => {
  const people: Person[] = [personWith("A", { "km-red": 1 }), personWith("B", { "km-blue": 1 })];
  const tax: TaxSettings = { taxIncluded: false, vat: 7, service: 10 };
  const result = computeSushiSplit({ preset: katsuMidori, people, extras: [], tax });

  // preTax = 40 + 50 = 90, multiplier = 1.17
  assert.equal(Math.round(90 * 1.17), result.grandTotal);
  assert.equal(sumTotals(result), result.grandTotal);
});

test("rounding never leaves per-person amounts failing to add up, across many awkward splits", () => {
  const scenarios: { peopleCount: number; extras: number; vat: number; service: number; taxIncluded: boolean }[] =
    [];
  for (const peopleCount of [1, 2, 3, 4, 5, 7]) {
    for (const extras of [0, 1, 13, 47, 101, 220]) {
      for (const vat of [0, 7, 10]) {
        for (const service of [0, 10]) {
          for (const taxIncluded of [true, false]) {
            scenarios.push({ peopleCount, extras, vat, service, taxIncluded });
          }
        }
      }
    }
  }

  for (const scenario of scenarios) {
    const people: Person[] = Array.from({ length: scenario.peopleCount }, (_, i) =>
      personWith(`P${i}`, { "km-red": i, "km-blue": (i + 1) % 3 })
    );
    const extras: ExtraLine[] = scenario.extras > 0 ? [{ id: "e", label: "extra", amount: scenario.extras }] : [];
    const tax: TaxSettings = { taxIncluded: scenario.taxIncluded, vat: scenario.vat, service: scenario.service };

    const result = computeSushiSplit({ preset: katsuMidori, people, extras, tax });

    assert.equal(
      sumTotals(result),
      result.grandTotal,
      `mismatch for ${JSON.stringify(scenario)}: people totals summed to ${sumTotals(result)}, grand total is ${result.grandTotal}`
    );
  }
});

test("a person with zero plates and no extras still appears with a zero total", () => {
  const people: Person[] = [personWith("", {})];
  const result = computeSushiSplit({
    preset: katsuMidori,
    people,
    extras: [],
    tax: { taxIncluded: true, vat: 10, service: 0 },
  });

  assert.equal(result.people.length, 1);
  assert.equal(result.people[0].total, 0);
});

// --- (b) every trace's stated final value equals the returned total --------

test("each person's trace states the same final total that was returned", () => {
  const people: Person[] = [
    personWith("Earn", { "km-red": 3, "km-green": 2, "km-crimson": 1 }),
    personWith("Ploy", { "km-blue": 4, "km-olive": 1 }),
    personWith("Nine", { "km-gold": 2, "km-dark-navy": 1, "km-orange": 3 }),
  ];
  const extras: ExtraLine[] = [{ id: "e1", label: "green tea", amount: 47 }];

  for (const tax of [
    { taxIncluded: true, vat: 10, service: 0 },
    { taxIncluded: false, vat: 7, service: 5 },
  ]) {
    const result = computeSushiSplit({ preset: katsuMidori, people, extras, tax });
    for (const person of result.people) {
      const totalLine = person.trace[person.trace.length - 1];
      assert.ok(
        totalLine.includes(formatWhole(person.total)),
        `trace for ${person.name} does not mention its own total ${person.total}: "${totalLine}"`
      );
    }
  }
});

test("grand total trace states the same grand total that was returned", () => {
  const people: Person[] = [personWith("A", { "km-red": 2 }), personWith("B", { "km-blue": 3 })];
  const result = computeSushiSplit({
    preset: katsuMidori,
    people,
    extras: [{ id: "e", label: "extra", amount: 33 }],
    tax: { taxIncluded: false, vat: 7, service: 0 },
  });

  const grandTotalLine = result.trace.find((line) => line.includes("Grand total"));
  assert.ok(grandTotalLine);
  assert.ok(grandTotalLine!.includes(formatWhole(result.grandTotal)));
});

// --- colour helpers ----------------------------------------------------------

test("flags the ambiguous red/crimson pair in Katsu Midori without hardcoding", () => {
  const flagged = findSimilarPlateIds(katsuMidori.plates);
  assert.ok(flagged.has("km-red"));
  assert.ok(flagged.has("km-crimson"));
  assert.ok(!flagged.has("km-blue"));
  assert.ok(!flagged.has("km-olive"));
});

test("light plates need a swatch border, dark plates don't", () => {
  assert.equal(needsSwatchBorder("#FFFFFF"), true);
  assert.equal(needsSwatchBorder("#F5EFD9"), true);
  assert.equal(needsSwatchBorder("#C0C4C8"), true);
  assert.equal(needsSwatchBorder("#1A1A1A"), false);
  assert.equal(needsSwatchBorder("#D32F2F"), false);
});
