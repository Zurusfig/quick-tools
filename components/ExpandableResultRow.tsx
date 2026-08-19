import { IconChevronDown } from "@tabler/icons-react";

export default function ExpandableResultRow({
  title,
  badge,
  meta,
  amount,
  trace,
  extra,
}: {
  title: string;
  badge?: string;
  meta: string;
  amount: string;
  trace: string[];
  extra?: React.ReactNode;
}) {
  return (
    <details className="group rounded-md border border-neutral-100 dark:border-neutral-900">
      <summary className="flex flex-wrap cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <IconChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
          <span className="truncate">{title}</span>
          {badge && <span className="shrink-0 text-[10px] text-amber-500">{badge}</span>}
        </span>
        <span className="flex items-center gap-3 text-neutral-500">
          <span className="whitespace-nowrap">{meta}</span>
          <span className="whitespace-nowrap font-mono font-medium text-neutral-900 dark:text-neutral-100">
            {amount}
          </span>
          {extra && (
            <span
              className="relative shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {extra}
            </span>
          )}
        </span>
      </summary>
      <pre className="animate-fade-in-fast overflow-x-auto whitespace-pre px-3 pb-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
        {trace.join("\n")}
      </pre>
    </details>
  );
}
