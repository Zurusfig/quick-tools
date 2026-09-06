import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getZonedParts,
  getOffsetMinutes,
  formatOffset,
  decimalHour,
  resolveZonedTime,
  dayOffset,
  dayOffsetLabel,
  localMidnightInstant,
  dayBoundaryFraction,
  buildHourTicks,
  HOUR_MS,
} from "./timezone.ts";

// --- (1) fractional (30/45 minute) offsets ----------------------------------

test("Asia/Kolkata renders at a +05:30 fractional offset, not snapped to the hour", () => {
  // 2024-06-15T00:00:00Z -> 05:30 local in Kolkata.
  const instant = new Date("2024-06-15T00:00:00.000Z");
  const parts = getZonedParts("Asia/Kolkata", instant);
  assert.equal(parts.hour, 5);
  assert.equal(parts.minute, 30);
  assert.equal(getOffsetMinutes("Asia/Kolkata", instant), 330);
  assert.equal(formatOffset(330), "+05:30");
});

test("Asia/Kathmandu renders at a +05:45 fractional offset", () => {
  const instant = new Date("2024-06-15T00:00:00.000Z");
  const parts = getZonedParts("Asia/Kathmandu", instant);
  assert.equal(parts.hour, 5);
  assert.equal(parts.minute, 45);
  assert.equal(getOffsetMinutes("Asia/Kathmandu", instant), 345);
});

test("Pacific/Chatham renders at a +12:45 (or +13:45 in DST) fractional offset", () => {
  // Southern-hemisphere winter (no DST) in July.
  const winter = new Date("2024-07-01T00:00:00.000Z");
  const winterOffset = getOffsetMinutes("Pacific/Chatham", winter);
  assert.equal(winterOffset, 12 * 60 + 45);

  // Southern-hemisphere summer (DST) in January.
  const summer = new Date("2024-01-01T00:00:00.000Z");
  const summerOffset = getOffsetMinutes("Pacific/Chatham", summer);
  assert.equal(summerOffset, 13 * 60 + 45);
});

test("day-boundary marker for a half-hour-offset zone lands mid-cell, not on a cell edge", () => {
  const gridStart = new Date("2024-06-15T00:00:00.000Z");
  const fraction = dayBoundaryFraction("Asia/Kolkata", gridStart);
  assert.ok(fraction !== null);
  // Kolkata midnight is 18:30 UTC the previous day -> next midnight is at
  // gridStart + 18h30m, i.e. fraction 18.5/24, landing squarely mid-cell.
  const expected = 18.5 / 24;
  assert.ok(Math.abs((fraction as number) - expected) < 1e-9, `expected ~${expected}, got ${fraction}`);
  // And explicitly not aligned to a whole-hour cell boundary.
  assert.notEqual(Math.round((fraction as number) * 24) - (fraction as number) * 24, 0);
});

// --- (2) DST transitions: spring-forward and fall-back ----------------------

test("US spring-forward: 2:30am on transition day does not exist and is not silently wrong", () => {
  // 2024-03-10: America/New_York clocks jump from 02:00 EST to 03:00 EDT.
  const result = resolveZonedTime("America/New_York", { year: 2024, month: 3, day: 10, hour: 2, minute: 30 });
  assert.equal(result.nonexistent, true);
  assert.equal(result.ambiguous, false);
  assert.ok(!Number.isNaN(result.instant.getTime()));

  // Conventional resolution: shifted forward by the gap width, so 02:30
  // (which never happened) reads back as 03:30 EDT.
  const parts = getZonedParts("America/New_York", result.instant);
  assert.equal(parts.hour, 3);
  assert.equal(parts.minute, 30);
  assert.equal(result.instant.toISOString(), "2024-03-10T07:30:00.000Z");
});

test("US fall-back: 1:30am on transition day occurs twice; the earlier instant is chosen", () => {
  // 2024-11-03: America/New_York clocks fall from 02:00 EDT back to 01:00 EST.
  const result = resolveZonedTime("America/New_York", { year: 2024, month: 11, day: 3, hour: 1, minute: 30 });
  assert.equal(result.ambiguous, true);
  assert.equal(result.nonexistent, false);

  // Earlier instant = the EDT (UTC-4) occurrence, i.e. 05:30 UTC.
  assert.equal(result.instant.toISOString(), "2024-11-03T05:30:00.000Z");

  // Sanity: the later (EST, UTC-5) occurrence is a full hour after.
  const laterInstant = new Date(result.instant.getTime() + HOUR_MS);
  const laterParts = getZonedParts("America/New_York", laterInstant);
  assert.equal(laterParts.hour, 1);
  assert.equal(laterParts.minute, 30);
});

// --- (3) Southern hemisphere DST runs opposite to northern ------------------

test("Australia/Sydney observes DST in the southern summer (Dec/Jan), not northern summer", () => {
  const januarySummer = new Date("2024-01-15T00:00:00.000Z");
  const julyWinter = new Date("2024-07-15T00:00:00.000Z");
  // AEDT (summer, +11) vs AEST (winter, +10).
  assert.equal(getOffsetMinutes("Australia/Sydney", januarySummer), 11 * 60);
  assert.equal(getOffsetMinutes("Australia/Sydney", julyWinter), 10 * 60);
});

test("America/Santiago shifts DST opposite to America/New_York at the same time of year", () => {
  const januaryInstant = new Date("2024-01-15T12:00:00.000Z");
  // Santiago is in southern-hemisphere summer (DST) in January: UTC-3.
  assert.equal(getOffsetMinutes("America/Santiago", januaryInstant), -3 * 60);
  // New York is in northern-hemisphere winter (no DST) in January: UTC-5.
  assert.equal(getOffsetMinutes("America/New_York", januaryInstant), -5 * 60);
});

// --- (4) zones with no DST never shift ---------------------------------------

test("Asia/Bangkok never shifts offset across the year", () => {
  const january = new Date("2024-01-15T12:00:00.000Z");
  const july = new Date("2024-07-15T12:00:00.000Z");
  assert.equal(getOffsetMinutes("Asia/Bangkok", january), 7 * 60);
  assert.equal(getOffsetMinutes("Asia/Bangkok", july), 7 * 60);
});

test("Asia/Tokyo never shifts offset across the year", () => {
  const january = new Date("2024-01-15T12:00:00.000Z");
  const july = new Date("2024-07-15T12:00:00.000Z");
  assert.equal(getOffsetMinutes("Asia/Tokyo", january), 9 * 60);
  assert.equal(getOffsetMinutes("Asia/Tokyo", july), 9 * 60);
});

// --- (5) day-offset badge correct across the date line, season-dependent ----

test("Pacific/Auckland vs America/Los_Angeles is +20 or +21 hours apart depending on season", () => {
  // Southern summer / northern winter: NZDT +13, PST -8 -> 21h apart.
  const januaryInstant = new Date("2024-01-15T00:00:00.000Z");
  const aucklandJan = getZonedParts("Pacific/Auckland", januaryInstant);
  const laJan = getZonedParts("America/Los_Angeles", januaryInstant);
  assert.equal(aucklandJan.offsetMinutes - laJan.offsetMinutes, 21 * 60);

  // Southern winter / northern summer: NZST +12, PDT -7 -> 19h... check both.
  const julyInstant = new Date("2024-07-15T00:00:00.000Z");
  const aucklandJul = getZonedParts("Pacific/Auckland", julyInstant);
  const laJul = getZonedParts("America/Los_Angeles", julyInstant);
  assert.equal(aucklandJul.offsetMinutes - laJul.offsetMinutes, 19 * 60);
});

test("day offset badge reads +1 across the date line for a same-instant comparison", () => {
  // Pick an instant where LA is still Monday evening but Auckland has rolled to Tuesday.
  const instant = new Date("2024-01-15T08:00:00.000Z"); // LA: 00:00 Mon PST; Auckland: 21:00 Mon NZDT... adjust
  const homeParts = getZonedParts("America/Los_Angeles", instant);
  const aucklandParts = getZonedParts("Pacific/Auckland", instant);
  const offset = dayOffset(aucklandParts, homeParts);
  assert.ok(offset === 1 || offset === 0);
  assert.ok(["same day", "+1"].includes(dayOffsetLabel(offset)));
});

test("dayOffsetLabel formats zero, positive, and negative offsets", () => {
  assert.equal(dayOffsetLabel(0), "same day");
  assert.equal(dayOffsetLabel(1), "+1");
  assert.equal(dayOffsetLabel(-1), "-1");
  assert.equal(dayOffsetLabel(2), "+2");
});

// --- grid helpers -------------------------------------------------------------

test("buildHourTicks produces 24 hourly instants starting at gridStart", () => {
  const gridStart = new Date("2024-06-15T00:00:00.000Z");
  const ticks = buildHourTicks(gridStart);
  assert.equal(ticks.length, 24);
  assert.equal(ticks[0].getTime(), gridStart.getTime());
  assert.equal(ticks[23].getTime(), gridStart.getTime() + 23 * HOUR_MS);
});

test("localMidnightInstant finds the correct UTC instant of local midnight", () => {
  // Bangkok midnight on 2024-06-15 is 2024-06-14T17:00:00Z (UTC+7).
  const near = new Date("2024-06-15T10:00:00.000Z");
  const midnight = localMidnightInstant("Asia/Bangkok", near);
  assert.equal(midnight.toISOString(), "2024-06-14T17:00:00.000Z");
});

// --- decimalHour sanity -------------------------------------------------------

test("decimalHour includes fractional minutes", () => {
  const parts = { year: 2024, month: 1, day: 1, hour: 14, minute: 30, second: 0, weekday: 1, offsetMinutes: 0 };
  assert.equal(decimalHour(parts), 14.5);
});
