export type IdType = "mobile" | "national_id" | "ewallet";

export type SavedId = {
  id: string;
  label: string;
  type: IdType;
};

export type PromptPayState = {
  savedIds: SavedId[];
  defaultId: string;
};

export function createDefaultState(): PromptPayState {
  return { savedIds: [], defaultId: "" };
}

export function normalizeId(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function detectIdType(digits: string): IdType | null {
  if (digits.length === 10 && digits.startsWith("0")) return "mobile";
  if (digits.length === 13) return "national_id";
  if (digits.length === 15) return "ewallet";
  return null;
}

export function idTypeLabel(type: IdType): string {
  if (type === "mobile") return "Mobile number";
  if (type === "national_id") return "National ID / Tax ID";
  return "e-Wallet ID";
}

/** Formats a validated id for display so a typo is easy to spot at a glance. */
export function formatId(digits: string, type: IdType): string {
  if (type === "mobile") {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  if (type === "national_id") {
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12, 13)}`;
  }
  return digits.replace(/(\d{3})(?=\d)/g, "$1-");
}

const ID_LENGTH_ERROR = "ID must be 10, 13, or 15 digits.";

export function validateId(raw: string): { digits: string; type: IdType | null; error: string } {
  const digits = normalizeId(raw);
  if (!digits) return { digits, type: null, error: "" };
  if (!/^\d+$/.test(digits)) return { digits, type: null, error: ID_LENGTH_ERROR };
  const type = detectIdType(digits);
  if (!type) return { digits, type: null, error: ID_LENGTH_ERROR };
  return { digits, type, error: "" };
}

export function parseAmount(raw: string): { value: number | null; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, error: "" };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { value: null, error: "Enter a valid amount, up to 2 decimal places." };
  }
  const value = Number(trimmed);
  if (value <= 0) {
    return { value: null, error: "Amount must be greater than zero." };
  }
  return { value, error: "" };
}

const thbFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatThb(amount: number): string {
  return `฿${thbFormatter.format(amount)}`;
}

// --- EMVCo TLV payload parsing, for the "raw payload" trace --------------
// Parsed from the actual generated payload string, never reconstructed from
// the id/amount inputs, so the display can never drift from what's encoded.

export type TlvNode = {
  tag: string;
  length: number;
  value: string;
  children?: TlvNode[];
};

const NESTED_TAGS = new Set(["29"]);

export function parseTlv(payload: string): TlvNode[] {
  const nodes: TlvNode[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    if (!Number.isFinite(length) || i + 4 + length > payload.length) break;
    const value = payload.slice(i + 4, i + 4 + length);
    const node: TlvNode = { tag, length, value };
    if (NESTED_TAGS.has(tag)) node.children = parseTlv(value);
    nodes.push(node);
    i += 4 + length;
  }
  return nodes;
}

const SUBTAG_LABELS: Record<string, string> = {
  "00": "AID",
  "01": "Mobile",
  "02": "National ID",
  "03": "e-Wallet ID",
};

export function buildPayloadTrace(payload: string): string[] {
  const lines: string[] = [];
  for (const node of parseTlv(payload)) {
    switch (node.tag) {
      case "00":
        lines.push(`00  Payload format indicator   ${node.value}`);
        break;
      case "01":
        lines.push(
          `01  Point of initiation         ${node.value} (${node.value === "12" ? "dynamic" : "static"})`
        );
        break;
      case "29":
        lines.push("29  Merchant account info");
        for (const child of node.children ?? []) {
          const label = (SUBTAG_LABELS[child.tag] ?? child.tag).padEnd(12);
          lines.push(`      ${child.tag}  ${label} ${child.value}`);
        }
        break;
      case "53":
        lines.push(`53  Currency                    ${node.value}${node.value === "764" ? " (THB)" : ""}`);
        break;
      case "54":
        lines.push(`54  Amount                      ${node.value}`);
        break;
      case "58":
        lines.push(`58  Country                     ${node.value}`);
        break;
      case "63":
        lines.push(`63  CRC                          ${node.value}`);
        break;
      default:
        lines.push(`${node.tag}  ${node.value}`);
    }
  }
  return lines;
}
