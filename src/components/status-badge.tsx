import { BadgeCheck, Check, CircleAlert, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EvidenceStatus } from "@/types";

/**
 * The three assessment states, each carried by an icon, a label and a tone.
 * Colour is never the only signal: the icon and the word travel together, so
 * the row still reads correctly in greyscale or on a projector.
 */
const statusConfig: Record<
  EvidenceStatus,
  { label: string; hint: string; className: string; icon: LucideIcon }
> = {
  supported: {
    label: "Supported",
    hint: "Evidence found, and the server verified the quote against the source",
    className: "border-supported/25 bg-supported-soft text-supported",
    icon: Check,
  },
  uncertain: {
    label: "Uncertain",
    hint: "No supporting evidence found in the source document",
    className: "border-uncertain/25 bg-uncertain-soft text-uncertain",
    icon: HelpCircle,
  },
  conflicting: {
    label: "Conflicting",
    hint: "The source document contradicts itself on this criterion",
    className: "border-conflicting/25 bg-conflicting-soft text-conflicting",
    icon: CircleAlert,
  },
};

export function StatusBadge({
  status,
  verified = false,
  className,
}: {
  status: EvidenceStatus;
  verified?: boolean;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <span
        title={config.hint}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
          config.className,
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {config.label}
      </span>
      {verified && (
        <span
          title="The quoted text was found at the cited lines by the server"
          className="inline-flex items-center gap-1 rounded-full border border-supported/30 bg-supported-soft px-2.5 py-1 text-xs font-semibold text-supported"
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          Verified
        </span>
      )}
    </span>
  );
}
