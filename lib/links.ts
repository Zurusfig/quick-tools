export type LinkRecord = {
  url: string;
  createdAt: number;
  note: string;
};

export const RESERVED_SLUGS = new Set([
  "api",
  "s",
  "t",
  "_next",
  "favicon",
  "robots",
  "admin",
  "new",
]);

export const SLUG_PATTERN = /^[a-z0-9-]{3,32}$/;

export function linkKey(key: string) {
  return `link:${key}`;
}

export function clicksKey(key: string) {
  return `clicks:${key}`;
}

export const LINKS_INDEX = "links:index";

export function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
