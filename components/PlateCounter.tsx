import ColorSwatch from "@/components/ColorSwatch";
import NumberField from "@/components/NumberField";

export default function PlateCounter({
  color,
  label,
  value,
  onChange,
  ariaLabel,
}: {
  color: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-neutral-100 dark:border-neutral-900 p-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <ColorSwatch color={color} size="sm" />
        <span className="truncate text-xs">{label}</span>
      </div>
      <NumberField kind="int" stepper value={value} onChange={onChange} aria-label={ariaLabel} className="w-full" />
    </div>
  );
}
