"use client";

import Field from "@/components/Field";
import NumberField from "@/components/NumberField";
import type { TimezoneSettings } from "@/lib/timezone";

export default function TimezoneSettingsRow({
  settings,
  onChange,
}: {
  settings: TimezoneSettings;
  onChange: (patch: Partial<TimezoneSettings>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-md border border-neutral-200 dark:border-neutral-800 p-3 text-xs">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.hour12}
          onChange={(e) => onChange({ hour12: e.target.checked })}
          className="h-4 w-4 accent-neutral-600 dark:accent-neutral-400"
        />
        12-hour clock
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.showSeconds}
          onChange={(e) => onChange({ showSeconds: e.target.checked })}
          className="h-4 w-4 accent-neutral-600 dark:accent-neutral-400"
        />
        Show seconds
      </label>
      <Field label="Working hours start">
        <NumberField kind="int" value={settings.workStart} onChange={(v) => onChange({ workStart: v })} className="w-16" />
      </Field>
      <Field label="Working hours end">
        <NumberField kind="int" value={settings.workEnd} onChange={(v) => onChange({ workEnd: v })} className="w-16" />
      </Field>
    </div>
  );
}
