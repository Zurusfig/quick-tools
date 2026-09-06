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
  IconScissors,
  IconBowlChopsticks,
  IconCurrencyBaht,
  IconWorld,
  type Icon,
} from "@tabler/icons-react";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  category: string;
  icon: Icon;
  load: () => Promise<{ default: ComponentType }>;
};

export const tools: Tool[] = [
  {
    slug: "qr",
    name: "QR Code Generator",
    description: "Generate a QR code from text or a URL, download as PNG or SVG.",
    keywords: ["qr", "code", "generator", "barcode", "png", "svg"],
    category: "Generators",
    icon: IconQrcode,
    load: () => import("@/tools/qr"),
  },
  {
    slug: "base64",
    name: "Base64 Encode/Decode",
    description: "Encode or decode Base64 text, handles UTF-8 and files.",
    keywords: ["base64", "encode", "decode", "utf-8", "file"],
    category: "Encoding",
    icon: IconBinary,
    load: () => import("@/tools/base64"),
  },
  {
    slug: "jwt",
    name: "JWT Decoder",
    description: "Decode a JWT header and payload, check expiry.",
    keywords: ["jwt", "token", "decode", "auth", "json web token"],
    category: "Encoding",
    icon: IconKey,
    load: () => import("@/tools/jwt"),
  },
  {
    slug: "json",
    name: "JSON Formatter",
    description: "Format, minify, and validate JSON with error locations.",
    keywords: ["json", "format", "minify", "validate", "pretty"],
    category: "Formatting",
    icon: IconBraces,
    load: () => import("@/tools/json"),
  },
  {
    slug: "uuid",
    name: "UUID Generator",
    description: "Generate v4 UUIDs in bulk.",
    keywords: ["uuid", "guid", "v4", "generator", "random"],
    category: "Generators",
    icon: IconFingerprint,
    load: () => import("@/tools/uuid"),
  },
  {
    slug: "timestamp",
    name: "Timestamp Converter",
    description: "Convert between Unix, ISO, and local time.",
    keywords: ["timestamp", "unix", "epoch", "iso", "date", "time"],
    category: "Time",
    icon: IconClock,
    load: () => import("@/tools/timestamp"),
  },
  {
    slug: "hash",
    name: "Hash Generator",
    description: "MD5, SHA-1, SHA-256, SHA-512 of text.",
    keywords: ["hash", "md5", "sha1", "sha256", "sha512", "checksum"],
    category: "Encoding",
    icon: IconHash,
    load: () => import("@/tools/hash"),
  },
  {
    slug: "url",
    name: "URL Encoder & Query Parser",
    description: "Encode/decode URI components, parse query strings.",
    keywords: ["url", "uri", "encode", "decode", "query", "params"],
    category: "Encoding",
    icon: IconLink,
    load: () => import("@/tools/url"),
  },
  {
    slug: "shorten",
    name: "Link Shortener",
    description: "Create and manage short links backed by Redis.",
    keywords: ["short", "link", "url", "redirect", "shortener"],
    category: "Web",
    icon: IconScissors,
    load: () => import("@/tools/shorten"),
  },
  {
    slug: "sushi",
    name: "Sushi Bill Splitter",
    description: "Split a conveyor-belt sushi bill by plate colour and count.",
    keywords: ["sushi", "bill", "split", "plates", "vat", "conveyor", "thailand"],
    category: "Fun",
    icon: IconBowlChopsticks,
    load: () => import("@/tools/sushi"),
  },
  {
    slug: "timezone",
    name: "Time Zone Converter",
    description: "Convert an instant across zones and see the hour overlap at a glance.",
    keywords: ["timezone", "time zone", "convert", "utc", "dst", "world clock", "meeting"],
    category: "Time",
    icon: IconWorld,
    load: () => import("@/tools/timezone"),
  },
  {
    slug: "promptpay",
    name: "PromptPay QR Generator",
    description: "Generate a Thai PromptPay QR from a phone number, ID, or e-Wallet ID.",
    keywords: ["promptpay", "thailand", "qr", "payment", "bank", "transfer", "thai"],
    category: "Finance",
    icon: IconCurrencyBaht,
    load: () => import("@/tools/promptpay"),
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getCategories(): string[] {
  return Array.from(new Set(tools.map((t) => t.category))).sort((a, b) => a.localeCompare(b));
}
