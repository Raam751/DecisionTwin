import { useEffect } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, RotateCw } from "lucide-react";

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
        "fixed bottom-6 right-6 z-50 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border bg-card p-4 shadow-lg",
        failed ? "border-rose-200" : "border-border",
      )}
    >
      <div className="flex items-start gap-2.5">
        {state === "saving" ? (
          <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : failed ? (
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        )}

        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              failed ? "text-rose-800" : "text-muted-foreground",
            )}
          >
            {state === "saving" ? "Saving" : failed ? "Not saved" : "Saved"}
          </p>
          <p
            className={cn(
              "mt-1 text-xs leading-relaxed",
              failed ? "text-rose-900" : "text-foreground/80",
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
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
