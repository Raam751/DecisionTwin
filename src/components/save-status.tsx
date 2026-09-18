import { useEffect } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  RotateCw,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveStatusProps {
  state: SaveState;
  /** What happened, in one sentence. Used for the saved and failed states. */
  message?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Small, always-visible report of whether the reviewer's last action reached
 * the store. Failures stay on screen with a retry, because silently losing a
 * reviewer's override is worse than an ugly corner of the page.
 */
export function SaveStatus({
  state,
  message,
  onRetry,
  onDismiss,
}: SaveStatusProps) {
  // A success message does not need to sit there forever; a failure does.
  useEffect(() => {
    if (state !== "saved" || !onDismiss) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [state, onDismiss]);

  if (state === "idle") return null;

  const failed = state === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pop-in fixed bottom-6 right-6 z-50 w-[min(23rem,calc(100vw-3rem))] rounded-2xl border border-line bg-card p-4 shadow-pop",
        failed && "border-conflicting/30",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            failed
              ? "bg-conflicting-soft text-conflicting"
              : "bg-supported-soft text-supported",
          )}
        >
          {state === "saving" ? (
            <LoaderCircle
              aria-hidden
              className="h-3.5 w-3.5 animate-spin"
            />
          ) : failed ? (
            <CircleAlert aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
          )}
        </span>

        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.12em]",
              failed ? "text-conflicting" : "text-muted-foreground",
            )}
          >
            {state === "saving" ? "Saving" : failed ? "Not saved" : "Saved"}
          </p>
          <p
            className={cn(
              "mt-1 text-xs leading-relaxed",
              failed ? "text-ink" : "text-muted-foreground",
            )}
          >
            {state === "saving"
              ? "Writing the reviewer's changes to the record."
              : message || "Your overrides and the decision are on the record."}
          </p>

          {failed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-brand-deep hover:underline"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
