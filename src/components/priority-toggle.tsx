import { cn } from "@/lib/utils";

interface PriorityToggleProps {
  required: boolean;
  onChange: (required: boolean) => void;
  /** Distinguishes the two options for assistive technology when repeated. */
  label: string;
}

/**
 * Says how much the role needs one criterion. Essential criteria are reported
 * separately from desirable ones when a candidate is assessed, so the choice
 * made here changes how a gap in the evidence reads later.
 */
export function PriorityToggle({
  required,
  onChange,
  label,
}: PriorityToggleProps) {
  const options = [
    { value: true, text: "Essential" },
    { value: false, text: "Desirable" },
  ];

  return (
    <div
      role="group"
      aria-label={`${label} priority`}
      className="inline-flex rounded-full border bg-background p-0.5"
    >
      {options.map((option) => {
        const active = option.value === required;
        return (
          <button
            key={option.text}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !active && "text-muted-foreground hover:text-foreground",
              active && option.value && "bg-primary text-primary-foreground",
              active && !option.value && "bg-peach text-peach-foreground",
            )}
          >
            {option.text}
          </button>
        );
      })}
    </div>
  );
}
