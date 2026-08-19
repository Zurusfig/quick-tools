"use client";

import { useState } from "react";
import { IconStar, IconStarFilled, IconTrash } from "@tabler/icons-react";
import type { SavedId } from "@/lib/promptpay";

export default function SavedIdChips({
  savedIds,
  defaultId,
  onSelect,
  onToggleDefault,
  onDelete,
}: {
  savedIds: SavedId[];
  defaultId: string;
  onSelect: (id: string) => void;
  onToggleDefault: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState("");

  if (savedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {savedIds.map((saved) => (
        <div
          key={saved.id}
          className="flex items-center gap-1 rounded-full border border-neutral-300 dark:border-neutral-700 py-1 pl-1.5 pr-2 text-xs"
        >
          <button
            type="button"
            onClick={() => onToggleDefault(saved.id)}
            aria-label={saved.id === defaultId ? "Unset default" : "Set as default"}
            className="text-amber-500"
          >
            {saved.id === defaultId ? <IconStarFilled size={12} /> : <IconStar size={12} />}
          </button>
          <button type="button" onClick={() => onSelect(saved.id)} className="font-medium">
            {saved.label}
          </button>
          {confirmId === saved.id ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onDelete(saved.id);
                  setConfirmId("");
                }}
                className="font-medium text-red-500"
              >
                Confirm
              </button>
              <button type="button" onClick={() => setConfirmId("")} className="text-neutral-400">
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmId(saved.id)}
              aria-label={`Delete ${saved.label}`}
              className="text-neutral-400 hover:text-red-500"
            >
              <IconTrash size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
