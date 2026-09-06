"use client";

import { useRef } from "react";
import clsx from "clsx";
import { IconGripVertical } from "@tabler/icons-react";

const MINUTES_PER_DAY = 1440;

function clampMinutes(m: number) {
  return Math.min(MINUTES_PER_DAY - 1, Math.max(0, m));
}

export default function TimelineScrubber({
  gridStart,
  referenceInstant,
  now,
  isLive,
  animateReset,
  onScrub,
  containerRef,
  leftOffsetPx,
  widthPx,
}: {
  gridStart: Date;
  referenceInstant: Date;
  now: Date;
  isLive: boolean;
  animateReset: boolean;
  onScrub: (instant: Date) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  leftOffsetPx: number;
  widthPx: number;
}) {
  const draggingRef = useRef(false);

  const minutesOfDay = clampMinutes(Math.round((referenceInstant.getTime() - gridStart.getTime()) / 60000));
  const fraction = minutesOfDay / MINUTES_PER_DAY;
  const nowFraction = clampMinutes(Math.round((now.getTime() - gridStart.getTime()) / 60000)) / MINUTES_PER_DAY;

  function minutesFromClientX(clientX: number, shiftKey: boolean): number {
    const el = containerRef.current;
    if (!el) return minutesOfDay;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft - leftOffsetPx;
    const raw = (x / widthPx) * MINUTES_PER_DAY;
    const snap = shiftKey ? 1 : 15;
    return clampMinutes(Math.round(raw / snap) * snap);
  }

  function scrubTo(minutes: number) {
    onScrub(new Date(gridStart.getTime() + minutes * 60000));
  }

  function handlePointerDown(event: React.PointerEvent) {
    event.preventDefault();
    draggingRef.current = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    scrubTo(minutesFromClientX(event.clientX, event.shiftKey));
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!draggingRef.current) return;
    scrubTo(minutesFromClientX(event.clientX, event.shiftKey));
  }

  function handlePointerUp(event: React.PointerEvent) {
    draggingRef.current = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.shiftKey ? 60 : 15;
      const delta = event.key === "ArrowLeft" ? -step : step;
      scrubTo(clampMinutes(minutesOfDay + delta));
    }
  }

  return (
    <div
      className="pointer-events-none absolute top-0 z-[2] h-full"
      style={{
        left: leftOffsetPx,
        width: widthPx,
      }}
    >
      {!isLive && nowFraction >= 0 && nowFraction <= 1 && (
        <div
          className="absolute top-0 h-full w-px bg-neutral-400/50 dark:bg-neutral-500/50"
          style={{ left: `${nowFraction * 100}%` }}
        />
      )}
      <div
        className={clsx(
          "pointer-events-auto absolute top-0 flex h-full -translate-x-1/2 flex-col items-center",
          animateReset && "transition-[left] duration-300 ease-out"
        )}
        style={{ left: `${fraction * 100}%` }}
      >
        <button
          type="button"
          role="slider"
          aria-label="Scrub reference time"
          aria-valuemin={0}
          aria-valuemax={MINUTES_PER_DAY - 1}
          aria-valuenow={minutesOfDay}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="-mt-4 flex h-4 w-4 shrink-0 cursor-ew-resize items-center justify-center rounded-full border border-neutral-400 bg-white text-neutral-500 shadow-sm outline-none focus-visible:border-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 dark:focus-visible:border-neutral-100"
        >
          <IconGripVertical size={10} />
        </button>
        <div className="w-px flex-1 bg-neutral-900 dark:bg-neutral-100" />
      </div>
    </div>
  );
}
