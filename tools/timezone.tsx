"use client";

import { useEffect, useRef, useState } from "react";
import ToolShell from "@/components/ToolShell";
import Input from "@/components/Input";
import CopyButton from "@/components/CopyButton";
import ZoneCombobox from "@/components/ZoneCombobox";
import TimezoneRow from "@/components/TimezoneRow";
import TimelineScrubber from "@/components/TimelineScrubber";
import EventModeFields from "@/components/EventModeFields";
import TimezoneSettingsRow from "@/components/TimezoneSettingsRow";
import {
  loadSettings,
  SETTINGS_STORAGE_KEY,
  type TimezoneSettings,
  getZoneInfo,
  getZonedParts,
  formatDateLabel,
  buildTimelineRows,
  localMidnightInstant,
  resolveZonedTime,
  parseFlexibleInstant,
  buildCopySummary,
  buildIsoUtc,
  overlapHintSentence,
  DAY_MS,
} from "@/lib/timezone";

const LABEL_PX = 128;
const GAP_PX = 12;
const CELL_PX = 36;
const TIMELINE_WIDTH = 24 * CELL_PX;
const LEFT_OFFSET = LABEL_PX + GAP_PX;

export default function TimezoneTool() {
  const [settings, setSettings] = useState<TimezoneSettings>(() => loadSettings());
  const [now, setNow] = useState(() => new Date());
  const [override, setOverride] = useState<Date | null>(null);
  const [eventZone, setEventZone] = useState(settings.homeZone);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("Meeting");
  const [dstNote, setDstNote] = useState("");
  const [animateReset, setAnimateReset] = useState(false);
  const [exitingZones, setExitingZones] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldEditRef = useRef(false);

  const referenceInstant = override ?? now;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (fieldEditRef.current) {
      fieldEditRef.current = false;
      return;
    }
    const parts = getZonedParts(eventZone, referenceInstant);
    setDateInput(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`);
    setTimeInput(`${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceInstant.getTime(), eventZone]);

  function applyEventFields(nextDate: string, nextTime: string) {
    const pasted = parseFlexibleInstant(nextDate);
    if (pasted && /[T:]|^-?\d{9,}$/.test(nextDate.trim())) {
      fieldEditRef.current = true;
      setDstNote("");
      setOverride(pasted);
      return;
    }
    const dateMatch = nextDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = nextTime.match(/^(\d{2}):(\d{2})$/);
    if (!dateMatch || !timeMatch) return;
    const resolved = resolveZonedTime(eventZone, {
      year: Number(dateMatch[1]),
      month: Number(dateMatch[2]),
      day: Number(dateMatch[3]),
      hour: Number(timeMatch[1]),
      minute: Number(timeMatch[2]),
    });
    fieldEditRef.current = true;
    setOverride(resolved.instant);
    setDstNote(
      resolved.ambiguous
        ? "This local time occurs twice (fall-back) — using the earlier instant."
        : resolved.nonexistent
          ? "This local time doesn't exist here (spring-forward) — shifted forward to the next valid instant."
          : ""
    );
  }

  function handleNow() {
    setOverride(null);
    setDstNote("");
    setAnimateReset(true);
    setTimeout(() => setAnimateReset(false), 320);
  }

  function addZone(id: string) {
    setSettings((s) => (s.zones.includes(id) ? s : { ...s, zones: [...s.zones, id] }));
  }

  function removeZone(id: string) {
    if (settings.zones.length <= 1) return;
    setExitingZones((s) => new Set(s).add(id));
    setTimeout(() => {
      setSettings((s) => ({ ...s, zones: s.zones.filter((z) => z !== id) }));
      setExitingZones((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }, 300);
  }

  function moveZone(id: string, dir: -1 | 1) {
    setSettings((s) => {
      const i = s.zones.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= s.zones.length) return s;
      const zones = [...s.zones];
      [zones[i], zones[j]] = [zones[j], zones[i]];
      return { ...s, zones };
    });
  }

  const rows = buildTimelineRows(settings.zones, settings.homeZone, referenceInstant, settings);
  const gridStart = localMidnightInstant(settings.homeZone, referenceInstant);
  const homeParts = getZonedParts(settings.homeZone, referenceInstant);

  const summaryText = buildCopySummary(
    title || "Meeting",
    formatDateLabel(homeParts),
    rows.map((r) => ({ label: r.info.city, parts: r.parts })),
    settings.hour12
  );
  const overlapHint = overlapHintSentence(
    getZoneInfo(settings.homeZone).city,
    homeParts,
    rows.filter((r) => r.id !== settings.homeZone).map((r) => ({ label: r.info.city, parts: r.parts })),
    settings.workStart,
    settings.workEnd
  );

  return (
    <ToolShell title="Time Zone Converter" description="Convert an instant across zones and see the overlap at a glance.">
      <EventModeFields
        dateInput={dateInput}
        timeInput={timeInput}
        eventZone={eventZone}
        zoneOptions={settings.zones}
        duration={duration}
        dstNote={dstNote}
        onDateChange={(v) => {
          setDateInput(v);
          applyEventFields(v, timeInput);
        }}
        onTimeChange={(v) => {
          setTimeInput(v);
          applyEventFields(dateInput, v);
        }}
        onZoneChange={setEventZone}
        onDurationChange={setDuration}
        onNow={handleNow}
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-neutral-500">Zones</span>
        <ZoneCombobox existing={settings.zones} onAdd={addZone} />
      </div>

      <div ref={containerRef} className="relative overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <TimezoneRow
              key={row.id}
              cityLabel={row.info.city}
              countryLabel={row.info.country}
              offsetLabel={row.offsetLabel}
              isHome={row.id === settings.homeZone}
              cells={row.cells}
              boundaryFraction={row.boundaryFraction}
              boundaryDateLabel={row.boundaryDateLabel}
              readoutTime={row.readoutTime}
              readoutDate={row.readoutDate}
              dayOffsetText={row.dayOffsetText}
              isSameDay={row.isSameDay}
              visible={!exitingZones.has(row.id)}
              onRemove={() => removeZone(row.id)}
              onMoveUp={() => moveZone(row.id, -1)}
              onMoveDown={() => moveZone(row.id, 1)}
              onSetHome={() => setSettings((s) => ({ ...s, homeZone: row.id }))}
              canMoveUp={i > 0}
              canMoveDown={i < rows.length - 1}
              canRemove={settings.zones.length > 1}
            />
          ))}
        </div>
        {duration > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-[1] h-full border-x border-neutral-400/60 bg-neutral-900/[0.06] dark:border-neutral-500/60 dark:bg-white/[0.06]"
            style={{
              left: LEFT_OFFSET + ((referenceInstant.getTime() - gridStart.getTime()) / DAY_MS) * TIMELINE_WIDTH,
              width: ((duration * 60000) / DAY_MS) * TIMELINE_WIDTH,
            }}
          />
        )}
        <TimelineScrubber
          gridStart={gridStart}
          referenceInstant={referenceInstant}
          now={now}
          isLive={override === null}
          animateReset={animateReset}
          onScrub={(instant) => {
            setOverride(instant);
            setDstNote("");
          }}
          containerRef={containerRef}
          leftOffsetPx={LEFT_OFFSET}
          widthPx={TIMELINE_WIDTH}
        />
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">{overlapHint}</p>

      <TimezoneSettingsRow settings={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />

      <div className="flex flex-wrap items-center gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" className="max-w-48" />
        <CopyButton value={summaryText} />
        <CopyButton value={buildIsoUtc(referenceInstant)} />
      </div>
    </ToolShell>
  );
}
