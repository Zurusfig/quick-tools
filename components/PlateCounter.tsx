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
    <div className="flex items-center gap-2 rounded-md border border-neutral-100 dark:border-neutral-900 p-1.5">
      <ColorSwatch color={color} size="sm" />
      <span className="w-14 shrink-0 truncate text-xs">{label}</span>
      <NumberField kind="int" stepper value={value} onChange={onChange} aria-label={ariaLabel} className="flex-1" />
    </div>
  );
}
