import type { ComponentType } from "react";
import {
  IconQrcode,
  IconBinary,
  IconKey,
  IconBraces,
  IconFingerprint,
  IconClock,
  IconHash,
  IconLink,
  type Icon,
} from "@tabler/icons-react";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  icon: Icon;
  load: () => Promise<{ default: ComponentType }>;
};

export const tools: Tool[] = [
  {
    slug: "qr",
    name: "QR Code Generator",
    description: "Generate a QR code from text or a URL, download as PNG or SVG.",
    keywords: ["qr", "code", "generator", "barcode", "png", "svg"],
    icon: IconQrcode,
    load: () => import("@/tools/qr"),
  },
  {
    slug: "base64",
    name: "Base64 Encode/Decode",
    description: "Encode or decode Base64 text, handles UTF-8 and files.",
    keywords: ["base64", "encode", "decode", "utf-8", "file"],
    icon: IconBinary,
    load: () => import("@/tools/base64"),
  },
  {
    slug: "jwt",
    name: "JWT Decoder",
    description: "Decode a JWT header and payload, check expiry.",
    keywords: ["jwt", "token", "decode", "auth", "json web token"],
    icon: IconKey,
    load: () => import("@/tools/jwt"),
  },
  {
    slug: "json",
    name: "JSON Formatter",
    description: "Format, minify, and validate JSON with error locations.",
    keywords: ["json", "format", "minify", "validate", "pretty"],
    icon: IconBraces,
    load: () => import("@/tools/json"),
  },
  {
    slug: "uuid",
    name: "UUID Generator",
    description: "Generate v4 UUIDs in bulk.",
    keywords: ["uuid", "guid", "v4", "generator", "random"],
    icon: IconFingerprint,
    load: () => import("@/tools/uuid"),
  },
  {
    slug: "timestamp",
    name: "Timestamp Converter",
    description: "Convert between Unix, ISO, and local time.",
    keywords: ["timestamp", "unix", "epoch", "iso", "date", "time"],
    icon: IconClock,
    load: () => import("@/tools/timestamp"),
  },
  {
    slug: "hash",
    name: "Hash Generator",
    description: "MD5, SHA-1, SHA-256, SHA-512 of text.",
    keywords: ["hash", "md5", "sha1", "sha256", "sha512", "checksum"],
    icon: IconHash,
    load: () => import("@/tools/hash"),
  },
  {
    slug: "url",
    name: "URL Encoder & Query Parser",
    description: "Encode/decode URI components, parse query strings.",
    keywords: ["url", "uri", "encode", "decode", "query", "params"],
    icon: IconLink,
    load: () => import("@/tools/url"),
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
