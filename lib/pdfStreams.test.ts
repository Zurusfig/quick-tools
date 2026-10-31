import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { applyStream, collectStreams, recompressStream } from "./pdfStreams.ts";

const payload = Buffer.from(Array.from({ length: 3000 }, (_, i) => `${(i * 7919) % 997} ${(i * 104729) % 991} m ${i % 613} ${(i * 31) % 509} l S\n`).join(""));

async function makeDoc() {
  const doc = await PDFDocument.create();
  const plain = doc.context.register(doc.context.stream(payload));
  const weak = doc.context.register(doc.context.stream(zlib.deflateSync(payload, { level: 1 }), { Filter: "FlateDecode" }));
  const tiny = doc.context.register(doc.context.stream("hi"));
  return { doc, plain, weak, tiny };
}

test("collects plain and Flate streams, skips tiny ones", async () => {
  const { doc, plain, weak, tiny } = await makeDoc();
  const refs = collectStreams(doc).map((s) => s.ref);
  assert.ok(refs.includes(plain) && refs.includes(weak));
  assert.ok(!refs.includes(tiny));
});

test("recompressed streams decode to the original bytes", async () => {
  const { doc, plain, weak } = await makeDoc();
  for (const ref of [plain, weak]) {
    const item = collectStreams(doc).find((s) => s.ref === ref)!;
    const data = recompressStream(item);
    assert.ok(data && data.length < item.bytes);
    applyStream(doc, item, data);
    const stream = doc.context.lookup(ref) as PDFRawStream;
    assert.equal(stream.dict.lookup(PDFName.of("Filter")), PDFName.of("FlateDecode"));
    assert.deepEqual(Buffer.from(zlib.inflateSync(stream.contents)), payload);
  }
});

test("already-optimal streams are left alone", async () => {
  const doc = await PDFDocument.create();
  doc.context.register(doc.context.stream(zlib.deflateSync(payload, { level: 9 }), { Filter: "FlateDecode" }));
  assert.equal(recompressStream(collectStreams(doc)[0]), null);
});
