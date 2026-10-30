import { test } from "node:test";
import assert from "node:assert/strict";
import { unpredictPng } from "./pdfImages.ts";

// 2 columns, 3 rows, gray (colors=1). Expected pixels:
// [10, 20]
// [15, 30]
// [40, 25]
const expected = [10, 20, 15, 30, 40, 25];

test("unpredictPng handles None, Sub, Up, Average and Paeth rows", () => {
  const encoded = new Uint8Array([
    0, 10, 20, // None
    1, 15, 15, // Sub: 15, 15+15=30
    4, 25, 241, // Paeth: px0 predicts up (15) -> 40; px1 predicts left (40) -> 241+40 = 25 (mod 256)
  ]);
  const out = unpredictPng(encoded, 2, 1);
  assert.deepEqual(Array.from(out!), expected);
});

test("unpredictPng Up and Average", () => {
  const out = unpredictPng(new Uint8Array([0, 100, 50, 2, 5, 5, 3, 10, 10]), 2, 1);
  // row2 Up: 105, 55. row3 Avg: x0: (0+105)>>1=52 +10=62; x1: (62+55)>>1=58 +10=68
  assert.deepEqual(Array.from(out!), [100, 50, 105, 55, 62, 68]);
});

test("unpredictPng rejects malformed data", () => {
  assert.equal(unpredictPng(new Uint8Array([0, 1, 2, 3]), 2, 1), null);
  assert.equal(unpredictPng(new Uint8Array([9, 1, 2]), 2, 1), null);
});
