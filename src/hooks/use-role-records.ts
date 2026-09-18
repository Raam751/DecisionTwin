import { useEffect, useState } from "react";

import { evidenceRecords } from "@/data/seed";
import { fetchStoredRecord } from "@/services/evidence-api";
import type { Candidate, EvidenceRecord } from "@/types";

/**
 * Loads the evidence record for every candidate in the active role.
 *
 * The store is the source of truth; the seeded reference records are only used
 * when nothing is stored, so the matrix says the same thing as the review
 * screen for the same candidate. A failed read leaves that candidate without a
 * record rather than breaking the page.
 */
export function useRoleRecords(candidates: Candidate[]) {
  const [records, setRecords] = useState<
    Record<string, EvidenceRecord | null>
  >({});
  const [loading, setLoading] = useState(true);

  const candidateIds = candidates.map((candidate) => candidate.id).join("|");

  useEffect(() => {
    let cancelled = false;
    const ids = candidateIds ? candidateIds.split("|") : [];
    setLoading(true);

    Promise.all(ids.map((id) => fetchStoredRecord(id))).then((stored) => {
      if (cancelled) return;

      const next: Record<string, EvidenceRecord | null> = {};
      ids.forEach((id, index) => {
        const record = stored[index];
        next[id] =
          record && record.evidence.length > 0
            ? record
            : (evidenceRecords.find((seed) => seed.candidateId === id) ?? null);
      });

      setRecords(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [candidateIds]);

  return { records, loading };
}
