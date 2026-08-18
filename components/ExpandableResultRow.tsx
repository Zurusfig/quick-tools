import { IconChevronDown } from "@tabler/icons-react";

export default function ExpandableResultRow({
  title,
  badge,
  meta,
  amount,
  trace,
}: {
  title: string;
  badge?: string;
  meta: string;
  amount: string;
  trace: string[];
}) {
  return (
    <details className="rounded-md border border-neutral-100 dark:border-neutral-900">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <IconChevronDown size={14} />
          {title}
          {badge && <span className="text-[10px] text-amber-500">{badge}</span>}
        </span>
        <span className="flex items-center gap-3 text-neutral-500">
          <span>{meta}</span>
          <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{amount}</span>
        </span>
      </summary>
      <pre className="overflow-x-auto whitespace-pre px-3 pb-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
        {trace.join("\n")}
      </pre>
    </details>
  );
}
