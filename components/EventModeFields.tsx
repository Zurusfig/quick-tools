"use client";

import Field from "@/components/Field";
import Input from "@/components/Input";
import NumberField from "@/components/NumberField";
import Dropdown from "@/components/Dropdown";
import { getZoneInfo } from "@/lib/timezone";

const ACTION_BTN =
  "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800";

export default function EventModeFields({
  dateInput,
  timeInput,
  eventZone,
  zoneOptions,
  duration,
  dstNote,
  onDateChange,
  onTimeChange,
  onZoneChange,
  onDurationChange,
  onNow,
}: {
  dateInput: string;
  timeInput: string;
  eventZone: string;
  zoneOptions: string[];
  duration: number;
  dstNote: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onZoneChange: (zone: string) => void;
  onDurationChange: (minutes: number) => void;
  onNow: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <Field label="Date">
          <Input
            value={dateInput}
            onChange={(e) => onDateChange(e.target.value)}
            placeholder="YYYY-MM-DD or paste ISO/unix"
            className="w-44"
          />
        </Field>
        <Field label="Time">
          <Input value={timeInput} onChange={(e) => onTimeChange(e.target.value)} placeholder="HH:MM" className="w-24" />
        </Field>
        <Field label="In zone">
          <Dropdown
            value={eventZone}
            onChange={onZoneChange}
            options={zoneOptions.map((id) => ({ value: id, label: getZoneInfo(id).city }))}
            className="w-40"
          />
        </Field>
        <Field label="Duration (min)">
          <NumberField kind="int" value={duration} onChange={onDurationChange} className="w-24" />
        </Field>
        <button type="button" onClick={onNow} className={ACTION_BTN}>
          Now
        </button>
      </div>
      {dstNote && <p className="text-xs text-amber-500">{dstNote}</p>}
    </div>
  );
}
