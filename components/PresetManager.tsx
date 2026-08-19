"use client";

import { useState } from "react";
import Field from "@/components/Field";
import Input from "@/components/Input";
import Dropdown from "@/components/Dropdown";
import type { Preset } from "@/lib/sushi";

const ACTION_BTN =
  "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800";

export default function PresetManager({
  presets,
  activePreset,
  onSelect,
  onDuplicate,
  onRename,
  onDelete,
}: {
  presets: Preset[];
  activePreset: Preset;
  onSelect: (id: string) => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function saveRename() {
    onRename(renameDraft.trim() || activePreset.name);
    setRenaming(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Preset">
          <Dropdown
            value={activePreset.id}
            options={presets.map((preset) => ({ value: preset.id, label: preset.name }))}
            onChange={onSelect}
            aria-label="Preset"
            className="w-full min-w-44 sm:w-auto"
          />
        </Field>
        <button type="button" onClick={onDuplicate} className={ACTION_BTN}>
          Duplicate &amp; edit
        </button>
        {!activePreset.builtIn && !renaming && (
          <button
            type="button"
            onClick={() => {
              setRenameDraft(activePreset.name);
              setRenaming(true);
            }}
            className={ACTION_BTN}
          >
            Rename
          </button>
        )}
        {!activePreset.builtIn && !confirmingDelete && (
          <button type="button" onClick={() => setConfirmingDelete(true)} className={ACTION_BTN}>
            Delete
          </button>
        )}
        {confirmingDelete && (
          <>
            <button
              type="button"
              onClick={() => {
                onDelete();
                setConfirmingDelete(false);
              }}
              className="rounded-md border border-red-400/50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10"
            >
              Confirm delete
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className={ACTION_BTN}>
              Cancel
            </button>
          </>
        )}
      </div>
      {renaming && (
        <div className="flex items-center gap-2">
          <Input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} className="max-w-xs" />
          <button type="button" onClick={saveRename} className={ACTION_BTN}>
            Save
          </button>
          <button type="button" onClick={() => setRenaming(false)} className={ACTION_BTN}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
