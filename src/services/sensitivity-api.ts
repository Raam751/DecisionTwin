import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceId } from "@/lib/workspace";
import type { Candidate, Role, SensitivityDiagnostic } from "@/types";

export interface MaskedRerunResult {
  diagnostic: SensitivityDiagnostic;
  persisted: boolean;
}

/**
 * Runs the same extraction against a version of the document with the
 * candidate's name and pronouns removed, then compares it per criterion with the
 * record already stored.
 *
 * The backend writes only the diagnostic. It never touches the evidence, the
 * questions, the reviewer's edits, the decisions or the stage. A changed status
 * is a signal to look, not a finding about fairness.
 */
export async function runMaskedRerun(
  role: Role,
  candidate: Candidate,
): Promise<MaskedRerunResult> {
  const { data, error } = await supabase.functions.invoke("masked-rerun", {
    body: {
      workspaceId: getWorkspaceId(),
      candidateId: candidate.id,
      roleId: role.id,
      candidateName: candidate.name,
      criteria: role.criteria,
      documentLines: candidate.documentLines,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) throw new Error(payload.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw new Error(
      error.message ||
        "Could not reach the masked rerun service. Nothing was changed.",
    );
  }

  const result = data as
    | { diagnostic?: SensitivityDiagnostic; persisted?: boolean; error?: string }
    | null;

  if (!result?.diagnostic) {
    throw new Error(result?.error ?? "The masked rerun returned no result.");
  }

  return { diagnostic: result.diagnostic, persisted: !!result.persisted };
}
