import { Check, CircleAlert, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EvidenceStatus } from "@/types";

const statusConfig: Record<
  EvidenceStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  supported: {
    label: "Supported",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: Check,
  },
  uncertain: {
    label: "Uncertain",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: HelpCircle,
  },
  conflicting: {
    label: "Conflicting",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: CircleAlert,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: EvidenceStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
