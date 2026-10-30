import { test } from "node:test";
import assert from "node:assert/strict";
import { fitDimensions, formatBytes, getPreset, percentSaved, renamedFile } from "./compress.ts";

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
  assert.equal(getPreset("nope").id, "balanced");
});
