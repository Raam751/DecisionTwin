import { supabase } from "@/integrations/supabase/client";

/**
 * Asks the condense-resume backend function to shorten raw extracted resume
 * text into a factual list the reviewer can confirm.
 *
 * The function returns trimmed, deduplicated lines capped at 15, but the reply
 * is shaped defensively here too so a malformed response can never reach the
 * line editor. An empty array means the model produced nothing usable.
 */
export async function condenseResume(
  resumeText: string,
): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("condense-resume", {
    body: { resumeText },
  });

  if (error) {
    throw new Error(
      error.message ||
        "Could not reach the condense service. Check the model secrets and try again.",
    );
  }

  const result = data as { lines?: unknown; error?: string } | null;
  if (!result) {
    throw new Error("The condense service returned nothing.");
  }

  if (Array.isArray(result.lines)) {
    return result.lines
      .filter((line): line is string => typeof line === "string")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  if (typeof result.error === "string") throw new Error(result.error);
  return [];
}
