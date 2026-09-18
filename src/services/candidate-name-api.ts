import { supabase } from "@/integrations/supabase/client";

/**
 * Asks the extract-candidate-name backend function to read the candidate name
 * from resume text.
 *
 * The function returns a trimmed string and never invents a name, but the reply
 * is shaped defensively here too so a malformed response can never fill the
 * name field with garbage. An empty string means the model found no name.
 */
export async function suggestCandidateName(
  resumeText: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "extract-candidate-name",
    { body: { resumeText } },
  );

  if (error) {
    throw new Error(
      error.message ||
        "Could not reach the name service. Check the model secrets and try again.",
    );
  }

  const result = data as { name?: unknown; error?: string } | null;
  if (!result) {
    throw new Error("The name service returned nothing.");
  }

  if (typeof result.name === "string") return result.name.trim();
  if (typeof result.error === "string") throw new Error(result.error);
  return "";
}
