import { cn } from "@/lib/utils";

interface PriorityChipProps {
  required: boolean;
  className?: string;
}

/**
 * Essential or Desirable.
 *
 * Priority is structural, not an alert, so it deliberately avoids the red,
 * amber, green and blue used by the assessment states: essential is an ink dot
 * on the deeper beige, desirable is a hollow dot with no fill. The filled
 * against hollow dot keeps the distinction readable in greyscale, and neither
 * can be mistaken for a status.
 */
export function PriorityChip({ required, className }: PriorityChipProps) {
  return (
    <span
      title={
        required
          ? "Essential: the role cannot be met without it"
          : "Desirable: useful, but the role does not depend on it"
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.1em]",
        required
          ? "border-ink/15 bg-canvas-deep text-ink"
          : "border-line bg-card text-desirable",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          required ? "bg-ink" : "border border-desirable/70",
        )}
      />
      {required ? "Essential" : "Desirable"}
    </span>
  );
}
