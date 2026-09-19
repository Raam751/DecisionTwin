import { supabase } from "@/integrations/supabase/client";
import type { Candidate, EvidenceRecord, Role } from "@/types";

export interface SearchFinding {
  candidateId: string;
  criterionId: string;
  note: string;
}

export interface SearchResult {
  answer: string;
  findings: SearchFinding[];
  /** How many verified evidence items the question was answered from. */
  searched: number;
}

export interface CorpusItem {
  candidateId: string;
  candidateName: string;
  criterionId: string;
  criterionLabel: string;
  quotedText: string;
  sourceStartLine: number;
  sourceEndLine: number;
}

/**
 * Builds the searchable corpus.
 *
 * Only document-sourced evidence whose citation passed server-side verification
 * is included. Interview answers are excluded on purpose: they were never
 * checkable against a document, so letting them into a search result would
 * quietly undo the distinction the whole product rests on.
 */
export function buildVerifiedCorpus(
  role: Role,
  candidates: Candidate[],
  records: Record<string, EvidenceRecord | null>,
): CorpusItem[] {
  const labelOf = (criterionId: string) =>
    role.criteria.find((criterion) => criterion.id === criterionId)?.label ??
    criterionId;

  const corpus: CorpusItem[] = [];

  for (const candidate of candidates) {
    const record = records[candidate.id];
    if (!record) continue;

    for (const item of record.evidence) {
      if (item.recordedAtInterview) continue;
      if (!item.citationVerified) continue;
      if (!item.quotedText.trim()) continue;

      corpus.push({
        candidateId: candidate.id,
        candidateName: candidate.name,
        criterionId: item.criterionId,
        criterionLabel: labelOf(item.criterionId),
        quotedText: item.quotedText,
        sourceStartLine: item.sourceStartLine,
        sourceEndLine: item.sourceEndLine,
      });
    }
  }

  return corpus;
}

/** Asks the question, answered only from the supplied verified corpus. */
export async function searchEvidence(
  question: string,
  roleTitle: string,
  corpus: CorpusItem[],
): Promise<SearchResult> {
  const { data, error } = await supabase.functions.invoke("search-evidence", {
    body: { question, roleTitle, evidence: corpus },
  });

  if (error) {
    throw new Error(
      error.message ||
        "Could not reach the search service. Check the model secrets and try again.",
    );
  }

  const result = data as
    | {
        answer?: string;
        findings?: SearchFinding[];
        searched?: number;
        error?: string;
      }
    | null;

  if (!result || typeof result.answer !== "string") {
    throw new Error(result?.error ?? "The search service returned nothing.");
  }

  return {
    answer: result.answer,
    findings: Array.isArray(result.findings) ? result.findings : [],
    searched: result.searched ?? corpus.length,
  };
}
