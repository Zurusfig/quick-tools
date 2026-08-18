"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Field from "@/components/Field";
import TextArea from "@/components/TextArea";
import CopyButton from "@/components/CopyButton";
import { usePersistedState, useDebounced } from "@/lib/hooks";

// Minimal MD5 implementation (Web Crypto does not support MD5).
function md5(input: string): string {
  const rotateLeft = (n: number, c: number) => (n << c) | (n >>> (32 - c));
  const toHex = (num: number) => {
    let hex = "";
    for (let i = 0; i < 4; i++) {
      hex += ((num >> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    }
    return hex;
  };

  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;
  const withOne = new Uint8Array(((bytes.length + 8) >> 6) * 64 + 64);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  const view = new DataView(withOne.buffer);
  view.setUint32(withOne.length - 8, bitLength >>> 0, true);
  view.setUint32(withOne.length - 4, Math.floor(bitLength / 2 ** 32), true);

  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
    21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  for (let chunk = 0; chunk < withOne.length; chunk += 64) {
    const M = Array.from({ length: 16 }, (_, i) => view.getUint32(chunk + i * 4, true));
    let [a, b, c, d] = [a0, b0, c0, d0];

    for (let i = 0; i < 64; i++) {
      let f = 0;
      let g = 0;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      const sum = (a + f + K[i] + M[g]) | 0;
      b = (b + rotateLeft(sum, S[i])) | 0;
      a = temp;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  return [a0, b0, c0, d0].map(toHex).join("");
}

async function subtleHash(algorithm: "SHA-1" | "SHA-256" | "SHA-512", input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const ALGORITHMS = ["MD5", "SHA-1", "SHA-256", "SHA-512"] as const;

export default function HashTool() {
  const [input, setInput] = usePersistedState("hash:input", "");
  const debouncedInput = useDebounced(input);
  const [hashes, setHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedInput) {
        setHashes({});
        return;
      }
      const [sha1, sha256, sha512] = await Promise.all([
        subtleHash("SHA-1", debouncedInput),
        subtleHash("SHA-256", debouncedInput),
        subtleHash("SHA-512", debouncedInput),
      ]);
      if (cancelled) return;
      setHashes({
        MD5: md5(debouncedInput),
        "SHA-1": sha1,
        "SHA-256": sha256,
        "SHA-512": sha512,
      });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedInput]);

  return (
    <ToolShell title="Hash Generator" description="MD5, SHA-1, SHA-256, and SHA-512 of text.">
      <Field label="Input">
        <TextArea rows={5} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>

      {ALGORITHMS.map((algo) => (
        <Field key={algo} label={algo}>
          <div className="flex items-center gap-2">
            <TextArea rows={1} value={hashes[algo] ?? ""} readOnly className="resize-none" />
            <CopyButton value={hashes[algo] ?? ""} />
          </div>
        </Field>
      ))}
    </ToolShell>
  );
}
