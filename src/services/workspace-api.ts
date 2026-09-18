import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceId } from "@/lib/workspace";
import type { Candidate, DocumentLine, Role, RoleCriterion } from "@/types";

/**
 * The generated Database type predates the roles and candidates tables, so
 * they are reached through a narrow structural type rather than a blanket any
 * cast — the same pattern evidence-api uses for evidence_records.
 */
type MinimalTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => {
      returns: () => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

const table = (name: string): MinimalTable =>
  (supabase as unknown as { from: (n: string) => MinimalTable }).from(name);

/** A persisted role plus the time its row was created in the store. */
export interface StoredRole extends Role {
  createdAt?: string;
}

interface RoleRow {
  id: string;
  title: string;
  job_description: string | null;
  criteria: RoleCriterion[] | null;
  created_at: string | null;
}

interface CandidateRow {
  id: string;
  role_id: string;
  name: string;
  document_title: string | null;
  document_lines: DocumentLine[] | null;
}

/** Rows this workspace created, most recent first. */
export async function fetchWorkspaceRoles(): Promise<StoredRole[]> {
  try {
    const { data, error } = await table("roles")
      .select("*")
      .eq("workspace_id", getWorkspaceId())
      .returns();

    if (error || !Array.isArray(data)) return [];
    return (data as RoleRow[])
      .filter((row) => row?.id && row?.title && Array.isArray(row.criteria))
      .map((row) => ({
        id: row.id,
        title: row.title,
        jobDescription: row.job_description ?? "",
        criteria: row.criteria ?? [],
        createdAt: row.created_at ?? undefined,
      }));
  } catch {
    // A read failure must never break the page; the seeded defaults still show.
    return [];
  }
}

export async function fetchWorkspaceCandidates(): Promise<Candidate[]> {
  try {
    const { data, error } = await table("candidates")
      .select("*")
      .eq("workspace_id", getWorkspaceId())
      .returns();

    if (error || !Array.isArray(data)) return [];
    return (data as CandidateRow[])
      .filter((row) => row?.id && row?.name && row?.role_id)
      .map((row) => ({
        id: row.id,
        name: row.name,
        roleId: row.role_id,
        documentTitle: row.document_title ?? "Resume",
        documentLines: Array.isArray(row.document_lines) ? row.document_lines : [],
      }));
  } catch {
    return [];
  }
}

/**
 * Persists a role or candidate through the save-workspace backend function.
 *
 * Rejects on failure so the caller can surface the error and keep the user's
 * input; local state is only updated after the store confirms the write.
 */
export async function saveWorkspace(
  kind: "role" | "candidate",
  payload: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("save-workspace", {
    body: { kind, workspaceId: getWorkspaceId(), payload },
  });

  if (error) {
    throw new Error(
      error.message ||
        `Could not save the ${kind === "role" ? "role" : "candidate"}. Nothing was stored.`,
    );
  }

  const result = data as { saved?: boolean; error?: string };
  if (!result?.saved) {
    throw new Error(
      result?.error ??
        `The ${kind === "role" ? "role" : "candidate"} was not saved by the store.`,
    );
  }
}
