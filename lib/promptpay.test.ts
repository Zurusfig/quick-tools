import { test } from "node:test";
import assert from "node:assert/strict";
import generatePayload from "promptpay-qr";
import {
  detectIdType,
  validateId,
  normalizeId,
  formatId,
  parseAmount,
  buildPayloadTrace,
  parseTlv,
} from "./promptpay.ts";

// --- ID type detection across all three lengths -----------------------------

test("detects a 10-digit number starting with 0 as mobile", () => {
  assert.equal(detectIdType("0812345678"), "mobile");
});

test("detects a 13-digit number as national id / tax id", () => {
  assert.equal(detectIdType("1234567890123"), "national_id");
});

test("detects a 15-digit number as e-Wallet id", () => {
  assert.equal(detectIdType("123456789012345"), "ewallet");
});

// --- rejection of bad lengths ------------------------------------------------

test("rejects lengths that aren't 10, 13, or 15", () => {
  for (const bad of ["123", "12345678901", "1234567890123456", ""]) {
    assert.equal(detectIdType(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("a 10-digit number NOT starting with 0 is rejected (not a valid mobile)", () => {
  assert.equal(detectIdType("1812345678"), null);
});

test("validateId surfaces the length error message for bad input", () => {
  const result = validateId("12345");
  assert.equal(result.type, null);
  assert.match(result.error, /10, 13, or 15 digits/);
});

test("validateId accepts a valid id with no error", () => {
  const result = validateId("0812345678");
  assert.equal(result.type, "mobile");
  assert.equal(result.error, "");
});

// --- dash/space stripping ----------------------------------------------------

test("normalizeId strips spaces and dashes", () => {
  assert.equal(normalizeId("081-234-5678"), "0812345678");
  assert.equal(normalizeId("081 234 5678"), "0812345678");
  assert.equal(normalizeId(" 0-8 1-2 3-4-5678 "), "0812345678");
});

test("validateId strips spaces and dashes before validating", () => {
  const result = validateId("081-234-5678");
  assert.equal(result.digits, "0812345678");
  assert.equal(result.type, "mobile");
});

test("formatId renders a mobile number and a national id readably", () => {
  assert.equal(formatId("0812345678", "mobile"), "081-234-5678");
  assert.equal(formatId("1234567890123", "national_id"), "1-2345-67890-12-3");
});

// --- amount validation --------------------------------------------------------

test("parseAmount treats blank as valid (payer enters amount)", () => {
  assert.deepEqual(parseAmount(""), { value: null, error: "" });
});

test("parseAmount rejects negative and zero amounts", () => {
  assert.notEqual(parseAmount("-5").error, "");
  assert.notEqual(parseAmount("0").error, "");
  assert.notEqual(parseAmount("0.00").error, "");
});

test("parseAmount rejects more than 2 decimal places", () => {
  assert.notEqual(parseAmount("10.123").error, "");
});

test("parseAmount accepts a valid positive amount", () => {
  assert.deepEqual(parseAmount("453.50"), { value: 453.5, error: "" });
});

// --- payload parsing producing the labelled tag list -------------------------

test("parseTlv reconstructs the exact tag/length/value structure of a real payload", () => {
  const payload = generatePayload("0812345678", {});
  const nodes = parseTlv(payload);
  const tags = nodes.map((n) => n.tag);
  assert.deepEqual(tags, ["00", "01", "29", "58", "53", "63"]);

  const merchantInfo = nodes.find((n) => n.tag === "29")!;
  assert.ok(merchantInfo.children);
  assert.equal(merchantInfo.children![1].tag, "01");
  assert.equal(merchantInfo.children![1].value, "0066812345678");
});

test("parseTlv includes the amount tag only when an amount was set", () => {
  const withoutAmount = parseTlv(generatePayload("0812345678", {}));
  assert.ok(!withoutAmount.some((n) => n.tag === "54"));

  const withAmount = parseTlv(generatePayload("0812345678", { amount: 453.5 }));
  const amountNode = withAmount.find((n) => n.tag === "54");
  assert.ok(amountNode);
  assert.equal(amountNode!.value, "453.50");
});

test("buildPayloadTrace labels every tag, including nested merchant account info", () => {
  const payload = generatePayload("0812345678", { amount: 453.5 });
  const lines = buildPayloadTrace(payload);

  assert.ok(lines.some((l) => l.startsWith("00  Payload format indicator")));
  assert.ok(lines.some((l) => l.includes("Point of initiation") && l.includes("dynamic")));
  assert.ok(lines.some((l) => l.startsWith("29  Merchant account info")));
  assert.ok(lines.some((l) => l.includes("AID")));
  assert.ok(lines.some((l) => l.includes("Mobile") && l.includes("0066812345678")));
  assert.ok(lines.some((l) => l.includes("Currency") && l.includes("764") && l.includes("THB")));
  assert.ok(lines.some((l) => l.includes("Amount") && l.includes("453.50")));
  assert.ok(lines.some((l) => l.includes("Country") && l.includes("TH")));
  assert.ok(lines.some((l) => l.startsWith("63  CRC")));
});

test("buildPayloadTrace marks static point of initiation when no amount is set", () => {
  const payload = generatePayload("1234567890123", {});
  const lines = buildPayloadTrace(payload);
  assert.ok(lines.some((l) => l.includes("Point of initiation") && l.includes("static")));
  assert.ok(!lines.some((l) => l.startsWith("54  Amount")));
});
