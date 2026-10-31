import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, type PDFDocument, type PDFObject } from "pdf-lib";
import pako from "pako";

const MIN_STREAM_BYTES = 1024;
// Only swap a stream in when it gets at least this much smaller.
const MIN_GAIN = 0.97;

export type StreamItem = {
  ref: PDFRef;
  stream: PDFRawStream;
  /** true when the stream already uses FlateDecode, false when it has no filter at all */
  deflated: boolean;
  bytes: number;
};

const name = (n: string) => PDFName.of(n);

const SKIP_TYPES = ["XRef", "ObjStm", "Metadata"].map(name);

function singleFilter(dict: PDFDict): PDFObject | undefined {
  const filter = dict.lookup(name("Filter"));
  return filter instanceof PDFArray && filter.size() === 1 ? filter.lookup(0) : filter;
}

/** Streams that can be re-deflated losslessly: Flate ones, and ones stored uncompressed. */
export function collectStreams(doc: PDFDocument, exclude: Set<PDFRef> = new Set()): StreamItem[] {
  const items: StreamItem[] = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || exclude.has(ref)) continue;
    const dict = obj.dict;
    if (obj.contents.length < MIN_STREAM_BYTES || dict.has(name("F")) || dict.has(name("DL"))) continue;
    const type = dict.lookup(name("Type"));
    if (type && SKIP_TYPES.includes(type as PDFName)) continue;
    const filter = singleFilter(dict);
    if (filter === name("FlateDecode")) items.push({ ref, stream: obj, deflated: true, bytes: obj.contents.length });
    else if (!filter) items.push({ ref, stream: obj, deflated: false, bytes: obj.contents.length });
  }
  return items;
}

/** Re-deflate at maximum level. Returns null if the result isn't meaningfully smaller. */
export function recompressStream(item: StreamItem): Uint8Array | null {
  try {
    const raw = item.deflated ? pako.inflate(item.stream.contents) : item.stream.contents;
    const out = pako.deflate(raw, { level: 9 });
    return out.length < item.bytes * MIN_GAIN ? out : null;
  } catch {
    return null; // corrupt or non-standard stream: leave as is
  }
}

export function applyStream(doc: PDFDocument, item: StreamItem, data: Uint8Array): void {
  const dict = item.stream.dict.clone();
  if (!item.deflated) dict.set(name("Filter"), name("FlateDecode"));
  dict.set(name("Length"), PDFNumber.of(data.length));
  doc.context.assign(item.ref, PDFRawStream.of(dict, data));
}
