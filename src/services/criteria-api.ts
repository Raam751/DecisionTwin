import { supabase } from "@/integrations/supabase/client";
import type { RoleCriterion } from "@/types";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Asks the generate-criteria backend function to turn a pasted job description
 * into 3 to 6 criteria.
 *
 * The function derives each id from its label and returns only usable rows, but
 * the reply is shaped defensively here too so a malformed response can never
 * reach the editable list.
 */
export async function generateCriteria(
  jobDescription: string,
): Promise<RoleCriterion[]> {
  const { data, error } = await supabase.functions.invoke("generate-criteria", {
    body: { jobDescription },
  });

  if (error) {
    throw new Error(
      error.message ||
        "Could not reach the criteria service. Check the model secrets and try again.",
    );
  }

  const result = data as { criteria?: unknown; error?: string } | null;
  if (!result || !Array.isArray(result.criteria)) {
    throw new Error(result?.error ?? "The criteria service returned nothing.");
  }

  const used = new Set<string>();
  const criteria: RoleCriterion[] = [];

  for (const entry of result.criteria) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as {
      id?: unknown;
      label?: unknown;
      description?: unknown;
      required?: unknown;
    };
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const description =
      typeof item.description === "string" ? item.description.trim() : "";
    if (!label) continue;

    // Essential unless the model says otherwise. Treating an unknown as
    // desirable would quietly downgrade a real requirement; the reviewer can
    // always toggle it down, and that choice is theirs to make.
    const required = typeof item.required === "boolean" ? item.required : true;

    const base = slugify(label) || `criterion-${criteria.length + 1}`;
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);

    criteria.push({ id, label, description, required });
  }

  if (criteria.length === 0) {
    throw new Error("The criteria service returned no usable criteria.");
  }

  return criteria;
}
