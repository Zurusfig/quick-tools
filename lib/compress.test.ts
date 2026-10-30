import { test } from "node:test";
import assert from "node:assert/strict";
import { estimatePdfBytes, extrapolateSize, samplePageNumbers, fitDimensions, formatBytes, getPreset, percentSaved, renamedFile } from "./compress.ts";

test("formatBytes", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.00 MB");
});

test("percentSaved", () => {
  assert.equal(percentSaved(1000, 250), 75);
  assert.equal(percentSaved(1000, 1200), -20);
  assert.equal(percentSaved(0, 10), 0);
});

test("fitDimensions never upscales and keeps aspect ratio", () => {
  assert.deepEqual(fitDimensions(800, 600, 1920, 1e9), { width: 800, height: 600 });
  assert.deepEqual(fitDimensions(4000, 2000, 1000, 1e9), { width: 1000, height: 500 });
  assert.deepEqual(fitDimensions(2000, 4000, null, 1e9), { width: 2000, height: 4000 });
});

test("fitDimensions respects pixel cap", () => {
  const { width, height } = fitDimensions(8000, 8000, null, 16_000_000);
  assert.ok(width * height <= 16_000_000);
  assert.equal(width, height);
});

test("renamedFile", () => {
  assert.equal(renamedFile("photo.final.PNG", "-compressed", "image/webp"), "photo.final-compressed.webp");
  assert.equal(renamedFile("scan", "-compressed", "application/pdf"), "scan-compressed.pdf");
});

test("getPreset falls back to balanced", () => {
  assert.equal(getPreset("nope").id, "medium");
});

test("extrapolateSize scales by pixel ratio", () => {
  assert.equal(extrapolateSize(1000, 100, 1000), 10000);
  assert.equal(extrapolateSize(1000, 0, 1000), 0);
});

test("estimatePdfBytes averages samples and adds overhead", () => {
  assert.equal(estimatePdfBytes([1000, 3000], 10), 2000 * 10 + 1500 + 3000);
  assert.equal(estimatePdfBytes([], 10), 0);
});

test("samplePageNumbers spreads across pages", () => {
  assert.deepEqual(samplePageNumbers(2), [1, 2]);
  assert.deepEqual(samplePageNumbers(10), [1, 6, 10]);
  assert.deepEqual(samplePageNumbers(1), [1]);
});
