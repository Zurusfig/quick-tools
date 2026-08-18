import clsx from "clsx";
import { IconAlertTriangle } from "@tabler/icons-react";
import { needsSwatchBorder } from "@/lib/sushi";

export default function ColorSwatch({
  color,
  label,
  caption,
  price,
  warning,
  size = "md",
}: {
  color: string;
  label?: string;
  caption?: string;
  price?: string;
  warning?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span
        className={clsx(
          "inline-block rounded-full",
          size === "md" ? "h-8 w-8" : "h-5 w-5",
          needsSwatchBorder(color) && "ring-1 ring-inset ring-neutral-400 dark:ring-neutral-600"
        )}
        style={{ backgroundColor: color }}
      />
      {label && <span className="text-[11px] font-medium leading-tight">{label}</span>}
      {price && <span className="text-[11px] text-neutral-500 leading-tight">{price}</span>}
      {caption && (
        <span className="max-w-20 text-[10px] leading-tight text-neutral-500 dark:text-neutral-400">
          {caption}
        </span>
      )}
      {warning && (
        <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
          <IconAlertTriangle size={11} /> same colour — check the print
        </span>
      )}
    </div>
  );
}
