// All local-time computation goes through getZonedParts(), which formats an
// absolute instant into a IANA zone via Intl.DateTimeFormat. Nothing here ever
// stores or reasons about a fixed UTC offset — offsets are derived fresh from
// (zoneId, instant) every time, so DST transitions are always correct.

export type ZoneInfo = {
  id: string;
  city: string;
  country: string;
  abbrs: string[];
};

// A static, offline-searchable list of IANA zones. Not exhaustive — picked for
// population/coverage plus every offset shape that actually breaks naive
// implementations (30/45-minute offsets, both DST directions, no-DST zones).
export const ZONES: ZoneInfo[] = [
  { id: "Pacific/Midway", city: "Midway", country: "US Minor Outlying Islands", abbrs: ["SST"] },
  { id: "Pacific/Honolulu", city: "Honolulu", country: "United States", abbrs: ["HST"] },
  { id: "America/Anchorage", city: "Anchorage", country: "United States", abbrs: ["AKST", "AKDT"] },
  { id: "America/Los_Angeles", city: "Los Angeles", country: "United States", abbrs: ["PST", "PDT"] },
  { id: "America/Tijuana", city: "Tijuana", country: "Mexico", abbrs: ["PST", "PDT"] },
  { id: "America/Denver", city: "Denver", country: "United States", abbrs: ["MST", "MDT"] },
  { id: "America/Phoenix", city: "Phoenix", country: "United States", abbrs: ["MST"] },
  { id: "America/Chicago", city: "Chicago", country: "United States", abbrs: ["CST", "CDT"] },
  { id: "America/Mexico_City", city: "Mexico City", country: "Mexico", abbrs: ["CST", "CDT"] },
  { id: "America/New_York", city: "New York", country: "United States", abbrs: ["EST", "EDT"] },
  { id: "America/Toronto", city: "Toronto", country: "Canada", abbrs: ["EST", "EDT"] },
  { id: "America/Halifax", city: "Halifax", country: "Canada", abbrs: ["AST", "ADT"] },
  { id: "America/St_Johns", city: "St. John's", country: "Canada", abbrs: ["NST", "NDT"] },
  { id: "America/Sao_Paulo", city: "São Paulo", country: "Brazil", abbrs: ["BRT"] },
  { id: "America/Argentina/Buenos_Aires", city: "Buenos Aires", country: "Argentina", abbrs: ["ART"] },
  { id: "America/Santiago", city: "Santiago", country: "Chile", abbrs: ["CLT", "CLST"] },
  { id: "America/Bogota", city: "Bogotá", country: "Colombia", abbrs: ["COT"] },
  { id: "America/Lima", city: "Lima", country: "Peru", abbrs: ["PET"] },
  { id: "Atlantic/Azores", city: "Azores", country: "Portugal", abbrs: ["AZOT", "AZOST"] },
  { id: "Europe/London", city: "London", country: "United Kingdom", abbrs: ["GMT", "BST"] },
  { id: "Europe/Lisbon", city: "Lisbon", country: "Portugal", abbrs: ["WET", "WEST"] },
  { id: "Europe/Dublin", city: "Dublin", country: "Ireland", abbrs: ["GMT", "IST"] },
  { id: "Europe/Paris", city: "Paris", country: "France", abbrs: ["CET", "CEST"] },
  { id: "Europe/Berlin", city: "Berlin", country: "Germany", abbrs: ["CET", "CEST"] },
  { id: "Europe/Madrid", city: "Madrid", country: "Spain", abbrs: ["CET", "CEST"] },
  { id: "Europe/Rome", city: "Rome", country: "Italy", abbrs: ["CET", "CEST"] },
  { id: "Europe/Amsterdam", city: "Amsterdam", country: "Netherlands", abbrs: ["CET", "CEST"] },
  { id: "Europe/Warsaw", city: "Warsaw", country: "Poland", abbrs: ["CET", "CEST"] },
  { id: "Europe/Athens", city: "Athens", country: "Greece", abbrs: ["EET", "EEST"] },
  { id: "Europe/Helsinki", city: "Helsinki", country: "Finland", abbrs: ["EET", "EEST"] },
  { id: "Europe/Bucharest", city: "Bucharest", country: "Romania", abbrs: ["EET", "EEST"] },
  { id: "Europe/Istanbul", city: "Istanbul", country: "Turkey", abbrs: ["TRT"] },
  { id: "Europe/Moscow", city: "Moscow", country: "Russia", abbrs: ["MSK"] },
  { id: "Africa/Casablanca", city: "Casablanca", country: "Morocco", abbrs: ["WET", "WEST"] },
  { id: "Africa/Lagos", city: "Lagos", country: "Nigeria", abbrs: ["WAT"] },
  { id: "Africa/Cairo", city: "Cairo", country: "Egypt", abbrs: ["EET"] },
  { id: "Africa/Johannesburg", city: "Johannesburg", country: "South Africa", abbrs: ["SAST"] },
  { id: "Africa/Nairobi", city: "Nairobi", country: "Kenya", abbrs: ["EAT"] },
  { id: "Asia/Jerusalem", city: "Jerusalem", country: "Israel", abbrs: ["IST", "IDT"] },
  { id: "Asia/Dubai", city: "Dubai", country: "United Arab Emirates", abbrs: ["GST"] },
  { id: "Asia/Tehran", city: "Tehran", country: "Iran", abbrs: ["IRST", "IRDT"] },
  { id: "Asia/Kabul", city: "Kabul", country: "Afghanistan", abbrs: ["AFT"] },
  { id: "Asia/Karachi", city: "Karachi", country: "Pakistan", abbrs: ["PKT"] },
  { id: "Asia/Kolkata", city: "Mumbai", country: "India", abbrs: ["IST"] },
  { id: "Asia/Kathmandu", city: "Kathmandu", country: "Nepal", abbrs: ["NPT"] },
  { id: "Asia/Dhaka", city: "Dhaka", country: "Bangladesh", abbrs: ["BST"] },
  { id: "Asia/Yangon", city: "Yangon", country: "Myanmar", abbrs: ["MMT"] },
  { id: "Asia/Bangkok", city: "Bangkok", country: "Thailand", abbrs: ["ICT"] },
  { id: "Asia/Jakarta", city: "Jakarta", country: "Indonesia", abbrs: ["WIB"] },
  { id: "Asia/Ho_Chi_Minh", city: "Ho Chi Minh City", country: "Vietnam", abbrs: ["ICT"] },
  { id: "Asia/Singapore", city: "Singapore", country: "Singapore", abbrs: ["SGT"] },
  { id: "Asia/Kuala_Lumpur", city: "Kuala Lumpur", country: "Malaysia", abbrs: ["MYT"] },
  { id: "Asia/Shanghai", city: "Shanghai", country: "China", abbrs: ["CST"] },
  { id: "Asia/Hong_Kong", city: "Hong Kong", country: "Hong Kong", abbrs: ["HKT"] },
  { id: "Asia/Taipei", city: "Taipei", country: "Taiwan", abbrs: ["CST"] },
  { id: "Asia/Manila", city: "Manila", country: "Philippines", abbrs: ["PST"] },
  { id: "Asia/Seoul", city: "Seoul", country: "South Korea", abbrs: ["KST"] },
  { id: "Asia/Tokyo", city: "Tokyo", country: "Japan", abbrs: ["JST"] },
  { id: "Australia/Perth", city: "Perth", country: "Australia", abbrs: ["AWST"] },
  { id: "Australia/Adelaide", city: "Adelaide", country: "Australia", abbrs: ["ACST", "ACDT"] },
  { id: "Australia/Sydney", city: "Sydney", country: "Australia", abbrs: ["AEST", "AEDT"] },
  { id: "Australia/Brisbane", city: "Brisbane", country: "Australia", abbrs: ["AEST"] },
  { id: "Pacific/Guam", city: "Guam", country: "Guam", abbrs: ["ChST"] },
  { id: "Pacific/Auckland", city: "Auckland", country: "New Zealand", abbrs: ["NZST", "NZDT"] },
  { id: "Pacific/Chatham", city: "Chatham Islands", country: "New Zealand", abbrs: ["CHAST", "CHADT"] },
  { id: "Pacific/Fiji", city: "Suva", country: "Fiji", abbrs: ["FJT"] },
  { id: "Pacific/Tongatapu", city: "Nuku'alofa", country: "Tonga", abbrs: ["TOT"] },
  { id: "UTC", city: "UTC", country: "—", abbrs: ["UTC"] },
];

const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));

export function getZoneInfo(id: string): ZoneInfo {
  return ZONE_BY_ID.get(id) ?? { id, city: id.split("/").pop()?.replace(/_/g, " ") ?? id, country: "", abbrs: [] };
}

export function searchZones(query: string): ZoneInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return ZONES;
  return ZONES.filter((z) =>
    [z.id, z.city, z.country, ...z.abbrs].some((field) => field.toLowerCase().includes(q))
  );
}

export const FALLBACK_ZONE = "Asia/Bangkok";

export function detectHomeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || FALLBACK_ZONE;
  } catch {
    return FALLBACK_ZONE;
  }
}

// --- The single instant -> local-parts code path ----------------------------

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday .. 6 = Saturday
  offsetMinutes: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(zoneId: string): Intl.DateTimeFormat {
  let fmt = partsFormatterCache.get(zoneId);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zoneId,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(zoneId, fmt);
  }
  return fmt;
}

/**
 * The one function every timeline cell and every text readout calls.
 * Derives local wall-clock fields AND the zone's current offset (in minutes
 * east of UTC) purely from formatToParts — no offset table, no hand math.
 */
export function getZonedParts(zoneId: string, instant: Date): ZonedParts {
  const parts = getPartsFormatter(zoneId).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);
  const second = Number(map.second);
  const weekday = WEEKDAY_INDEX[map.weekday] ?? 0;

  const asUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = Math.round((asUtcMs - instant.getTime()) / 60000);

  return { year, month, day, hour, minute, second, weekday, offsetMinutes };
}

export function getOffsetMinutes(zoneId: string, instant: Date): number {
  return getZonedParts(zoneId, instant).offsetMinutes;
}

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function decimalHour(parts: ZonedParts): number {
  return parts.hour + parts.minute / 60 + parts.second / 3600;
}

export type Band = "night" | "fringe" | "working";

// Working hours are configurable; the night/fringe/working bands used for the
// timeline strip are a fixed 09-18 / 06-09+18-22 / 22-06 read, independent of
// the user's configurable working-hours setting (which drives the separate
// overlap-hint sentence instead).
export function band(hourDecimal: number): Band {
  if (hourDecimal >= 9 && hourDecimal < 18) return "working";
  if ((hourDecimal >= 6 && hourDecimal < 9) || (hourDecimal >= 18 && hourDecimal < 22)) return "fringe";
  return "night";
}

export function isWorkingHour(hourDecimal: number, workStart: number, workEnd: number): boolean {
  return hourDecimal >= workStart && hourDecimal < workEnd;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function weekdayLabel(parts: ZonedParts): string {
  return WEEKDAY_LABELS[parts.weekday];
}

export function formatClock(parts: ZonedParts, opts: { hour12: boolean; showSeconds?: boolean }): string {
  const h24 = parts.hour;
  const mm = String(parts.minute).padStart(2, "0");
  const ss = opts.showSeconds ? `:${String(parts.second).padStart(2, "0")}` : "";
  if (!opts.hour12) return `${String(h24).padStart(2, "0")}:${mm}${ss}`;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm}${ss} ${period}`;
}

export function formatDateLabel(parts: ZonedParts): string {
  return `${weekdayLabel(parts)} ${parts.day} ${MONTH_LABELS[parts.month - 1]}`;
}

/** Calendar date as a day-count, purely for comparing "which day is it" across zones. */
export function dateSerial(parts: ZonedParts): number {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000);
}

/** +1 / -1 / 0 (etc.) relative to the home zone's calendar date at the same instant. */
export function dayOffset(zoneParts: ZonedParts, homeParts: ZonedParts): number {
  return dateSerial(zoneParts) - dateSerial(homeParts);
}

export function dayOffsetLabel(offset: number): string {
  if (offset === 0) return "same day";
  return offset > 0 ? `+${offset}` : `${offset}`;
}

// --- Wall-clock (event mode input) -> instant, with DST edge handling -------

export type WallTime = { year: number; month: number; day: number; hour: number; minute: number; second?: number };

export type ZonedTimeResolution = {
  instant: Date;
  /** Fall-back: this wall-clock time occurred twice; the earlier instant was chosen. */
  ambiguous: boolean;
  /** Spring-forward: this wall-clock time was skipped and never occurred. */
  nonexistent: boolean;
};

function wallKey(w: WallTime): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second ?? 0);
}

function partsToWallTime(p: ZonedParts): WallTime {
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/**
 * Resolves a local wall-clock time in `zoneId` to an absolute instant.
 * Handles both DST edge cases explicitly rather than letting them silently
 * produce a wrong-by-an-hour instant:
 *  - spring-forward gap (e.g. 2:30am doesn't exist): reports nonexistent,
 *    resolves using the post-transition offset (clock "jumps" to what it
 *    would read after the skip).
 *  - fall-back fold (e.g. 1:30am happens twice): reports ambiguous, prefers
 *    the earlier of the two instants.
 */
export function resolveZonedTime(zoneId: string, wall: WallTime): ZonedTimeResolution {
  const targetKey = wallKey(wall);
  const guessUtcMs = targetKey;

  // Sample the offset a full day on either side of the guess — far enough
  // from the transition itself to safely capture the "regime" in effect
  // immediately before and immediately after it.
  const offsetBefore = getOffsetMinutes(zoneId, new Date(guessUtcMs - DAY_MS));
  const offsetAfter = getOffsetMinutes(zoneId, new Date(guessUtcMs + DAY_MS));

  const candidateBefore = guessUtcMs - offsetBefore * 60000;

  if (offsetBefore === offsetAfter) {
    return { instant: new Date(candidateBefore), ambiguous: false, nonexistent: false };
  }

  const candidateAfter = guessUtcMs - offsetAfter * 60000;
  const matchBefore = wallKey(partsToWallTime(getZonedParts(zoneId, new Date(candidateBefore)))) === targetKey;
  const matchAfter = wallKey(partsToWallTime(getZonedParts(zoneId, new Date(candidateAfter)))) === targetKey;

  if (matchBefore && matchAfter) {
    // Fall-back fold: this wall-clock time occurs twice. Prefer the earlier instant.
    const earliest = Math.min(candidateBefore, candidateAfter);
    return { instant: new Date(earliest), ambiguous: true, nonexistent: false };
  }
  if (matchBefore) return { instant: new Date(candidateBefore), ambiguous: false, nonexistent: false };
  if (matchAfter) return { instant: new Date(candidateAfter), ambiguous: false, nonexistent: false };

  // Spring-forward gap: neither candidate round-trips because this wall-clock
  // time was skipped entirely. Resolving with the pre-transition offset lands
  // the instant just after the real transition point — i.e. the wall time
  // reads as shifted forward by the gap width, the conventional resolution.
  return { instant: new Date(candidateBefore), ambiguous: false, nonexistent: true };
}

/** Accepts a pasted ISO 8601 string or a Unix timestamp (seconds or ms). */
export function parseFlexibleInstant(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    const ms = Math.abs(n) > 1e12 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildIsoUtc(instant: Date): string {
  return instant.toISOString();
}

// --- Timeline grid helpers ---------------------------------------------------

export const HOUR_MS = 3600000;
export const DAY_MS = 24 * HOUR_MS;

/** Instant of local midnight for the calendar day (in `zoneId`) containing `near`. */
export function localMidnightInstant(zoneId: string, near: Date): Date {
  const parts = getZonedParts(zoneId, near);
  return resolveZonedTime(zoneId, { year: parts.year, month: parts.month, day: parts.day, hour: 0, minute: 0, second: 0 }).instant;
}

/** 24 hourly tick instants starting at `gridStart`. */
export function buildHourTicks(gridStart: Date): Date[] {
  const ticks: Date[] = [];
  for (let i = 0; i < 24; i++) ticks.push(new Date(gridStart.getTime() + i * HOUR_MS));
  return ticks;
}

/**
 * Fractional x-position (0-1) within [gridStart, gridStart+24h) of the next
 * local midnight for `zoneId` at or after gridStart. Returns null if none
 * falls inside the window (shouldn't happen for a 24h window on a <=25h day,
 * but DST can very rarely produce a 25h local day that straddles it twice).
 */
export function dayBoundaryFraction(zoneId: string, gridStart: Date): number | null {
  const startParts = getZonedParts(zoneId, gridStart);
  const todayMidnight = resolveZonedTime(zoneId, {
    year: startParts.year,
    month: startParts.month,
    day: startParts.day,
    hour: 0,
    minute: 0,
    second: 0,
  }).instant;

  let boundary = todayMidnight;
  if (boundary.getTime() <= gridStart.getTime()) {
    // Midnight already passed at gridStart; find tomorrow's.
    const next = new Date(gridStart.getTime() + DAY_MS);
    const nextParts = getZonedParts(zoneId, next);
    boundary = resolveZonedTime(zoneId, {
      year: nextParts.year,
      month: nextParts.month,
      day: nextParts.day,
      hour: 0,
      minute: 0,
      second: 0,
    }).instant;
    // If that's still before/at gridStart something is very wrong; bail out.
    if (boundary.getTime() <= gridStart.getTime()) return null;
  }

  const fraction = (boundary.getTime() - gridStart.getTime()) / DAY_MS;
  return fraction >= 0 && fraction < 1 ? fraction : null;
}

export type CellView = { label: string; band: Band };

export type TimelineRow = {
  id: string;
  info: ZoneInfo;
  cells: CellView[];
  boundaryFraction: number | null;
  boundaryDateLabel: string;
  offsetLabel: string;
  readoutTime: string;
  readoutDate: string;
  dayOffsetText: string;
  isSameDay: boolean;
  parts: ZonedParts;
};

/**
 * Builds every per-zone row view-model from a single (zones, homeZone,
 * referenceInstant) input. Timeline cells and text readouts both come out of
 * this one function — there's no second, divergent code path.
 */
export function buildTimelineRows(
  zones: string[],
  homeZone: string,
  referenceInstant: Date,
  settings: { hour12: boolean; showSeconds: boolean }
): TimelineRow[] {
  const gridStart = localMidnightInstant(homeZone, referenceInstant);
  const ticks = buildHourTicks(gridStart);
  const homeParts = getZonedParts(homeZone, referenceInstant);

  return zones.map((id) => {
    const info = getZoneInfo(id);
    const cells: CellView[] = ticks.map((tick) => {
      const p = getZonedParts(id, tick);
      const label = p.minute === 0 ? String(p.hour).padStart(2, "0") : `${p.hour}:${String(p.minute).padStart(2, "0")}`;
      return { label, band: band(decimalHour(p)) };
    });
    const boundaryFraction = dayBoundaryFraction(id, gridStart);
    const boundaryDateLabel =
      boundaryFraction !== null
        ? formatDateLabel(getZonedParts(id, new Date(gridStart.getTime() + boundaryFraction * DAY_MS)))
        : "";
    const parts = getZonedParts(id, referenceInstant);
    const offset = dayOffset(parts, homeParts);
    return {
      id,
      info,
      cells,
      boundaryFraction,
      boundaryDateLabel,
      offsetLabel: `${info.abbrs[0] ?? ""} ${formatOffset(getOffsetMinutes(id, referenceInstant))}`.trim(),
      readoutTime: formatClock(parts, { hour12: settings.hour12, showSeconds: settings.showSeconds }),
      readoutDate: formatDateLabel(parts),
      dayOffsetText: dayOffsetLabel(offset),
      isSameDay: offset === 0,
      parts,
    };
  });
}

// --- Settings persistence ----------------------------------------------------

export type TimezoneSettings = {
  zones: string[];
  homeZone: string;
  hour12: boolean;
  workStart: number;
  workEnd: number;
  showSeconds: boolean;
};

export const SETTINGS_STORAGE_KEY = "timezone:v1";

export function defaultSettings(homeZone: string): TimezoneSettings {
  const zones = Array.from(new Set([homeZone, "America/Los_Angeles", "Europe/London"]));
  return { zones, homeZone, hour12: false, workStart: 9, workEnd: 18, showSeconds: false };
}

export function loadSettings(): TimezoneSettings {
  const home = detectHomeZone();
  const fallback = defaultSettings(home);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      zones: Array.isArray(parsed.zones) && parsed.zones.length > 0 ? parsed.zones : fallback.zones,
      homeZone: typeof parsed.homeZone === "string" ? parsed.homeZone : fallback.homeZone,
      hour12: typeof parsed.hour12 === "boolean" ? parsed.hour12 : fallback.hour12,
      workStart: typeof parsed.workStart === "number" ? parsed.workStart : fallback.workStart,
      workEnd: typeof parsed.workEnd === "number" ? parsed.workEnd : fallback.workEnd,
      showSeconds: typeof parsed.showSeconds === "boolean" ? parsed.showSeconds : fallback.showSeconds,
    };
  } catch {
    return fallback;
  }
}

// --- Copy summary -------------------------------------------------------------

export type SummaryRow = { label: string; parts: ZonedParts };

export function buildCopySummary(title: string, dateLabel: string, rows: SummaryRow[], hour12: boolean): string {
  const labelWidth = Math.max(...rows.map((r) => r.label.length), 0);
  const lines = [`${title} · ${dateLabel}`];
  for (const row of rows) {
    const time = `${formatClock(row.parts, { hour12 })} ${weekdayLabel(row.parts)}`;
    lines.push(`${row.label.padEnd(labelWidth)}   ${time}`);
  }
  return lines.join("\n");
}

export function overlapHintSentence(
  homeLabel: string,
  homeParts: ZonedParts,
  rows: { label: string; parts: ZonedParts }[],
  workStart: number,
  workEnd: number
): string {
  const segments = [`${formatClock(homeParts, { hour12: false })} ${weekdayLabel(homeParts)} in ${homeLabel}`];
  for (const row of rows) {
    segments.push(`${formatClock(row.parts, { hour12: false })} ${weekdayLabel(row.parts)} in ${row.label}`);
  }
  const all = [{ label: homeLabel, parts: homeParts }, ...rows];
  const outside = all.filter((r) => !isWorkingHour(decimalHour(r.parts), workStart, workEnd)).length;
  return `${segments.join(" · ")} · outside working hours for ${outside} of ${all.length} zones`;
}
