import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search as SearchIcon, ShieldCheck } from "lucide-react";

import { MainNav } from "@/components/main-nav";
import { Button } from "@/components/ui/button";
import { useRoleRecords } from "@/hooks/use-role-records";
import {
  buildVerifiedCorpus,
  searchEvidence,
  type SearchResult,
} from "@/services/search-api";
import { useRoles } from "@/state/roles-store";

const EXAMPLES = [
  "Who has run production Kubernetes?",
  "Which candidates have led an incident and written the review?",
  "Has anyone designed a schema from scratch?",
];

/**
 * Asks a question of the role's evidence.
 *
 * The corpus is built client side and contains ONLY document-sourced evidence
 * whose citation passed server-side verification. Interview answers are left out
 * on purpose: they were never checkable against a document, so letting them into
 * a search result would undo the distinction the product rests on.
 */
const Search = () => {
  const navigate = useNavigate();
  const { activeRole, activeCandidates } = useRoles();
  const { records, loading } = useRoleRecords(activeCandidates);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const corpus = useMemo(
    () => buildVerifiedCorpus(activeRole, activeCandidates, records),
    [activeRole, activeCandidates, records],
  );

  const candidateName = (candidateId: string) =>
    activeCandidates.find((candidate) => candidate.id === candidateId)?.name ??
    candidateId;

  const criterionLabel = (criterionId: string) =>
    activeRole.criteria.find((criterion) => criterion.id === criterionId)
      ?.label ?? criterionId;

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setAsking(true);
    setError(null);
    setResult(null);
    try {
      setResult(await searchEvidence(trimmed, activeRole.title, corpus));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="workspace-container">
        <MainNav />

        <header className="mt-8">
          <p className="eyebrow">Verified evidence · {activeRole.title}</p>
          <h1 className="workspace-title mt-3">Ask the evidence</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Questions are answered only from citations that passed server-side
            verification. Interview answers are excluded, because they were never
            checkable against a document.
          </p>
        </header>

        <div className="mt-8 card-surface p-5 md:p-6">
          <label htmlFor="question" className="text-xs font-semibold text-ink">
            Your question
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void ask(question);
                }}
                placeholder="Who has run production Kubernetes?"
                className="focus-ring min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm font-normal text-ink placeholder:text-muted-foreground/70"
              />
              <Button
                type="button"
                disabled={asking || !question.trim() || corpus.length === 0}
                onClick={() => void ask(question)}
              >
                <SearchIcon className="h-4 w-4" aria-hidden />
                {asking ? "Searching" : "Ask"}
              </Button>
            </div>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={asking || corpus.length === 0}
                onClick={() => {
                  setQuestion(example);
                  void ask(example);
                }}
                className="focus-ring rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-ink disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>

          <p className="mt-4 inline-flex items-center gap-2 font-mono text-2xs text-muted-foreground">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-supported" />
            {loading
              ? "loading the verified evidence"
              : `${corpus.length} verified citation${corpus.length === 1 ? "" : "s"} across ${activeCandidates.length} candidate${activeCandidates.length === 1 ? "" : "s"}`}
          </p>

          {!loading && corpus.length === 0 && (
            <p className="mt-3 rounded-xl border border-uncertain/25 bg-uncertain-soft px-3.5 py-3 text-xs leading-relaxed text-ink">
              There is no verified evidence for this role yet. Generate evidence
              for the candidates first, then come back.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-5 card-surface border-conflicting/30 p-5">
            <p className="eyebrow text-conflicting">Search failed</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-5 space-y-4">
            <div className="card-surface p-5 md:p-6">
              <p className="eyebrow">Answer</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                {result.answer}
              </p>
              <p className="mt-4 font-mono text-2xs text-muted-foreground">
                drawn from {result.searched} verified citation
                {result.searched === 1 ? "" : "s"}, interview answers excluded
              </p>
            </div>

            {result.findings.length > 0 && (
              <div>
                <p className="eyebrow">Where that comes from</p>
                <ul className="mt-3 space-y-2.5">
                  {result.findings.map((finding, index) => (
                    <li
                      key={`${finding.candidateId}-${finding.criterionId}-${index}`}
                      className="card-surface p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="text-sm font-semibold text-ink">
                          {candidateName(finding.candidateId)}
                        </p>
                        <span className="font-mono text-2xs text-muted-foreground">
                          {criterionLabel(finding.criterionId)}
                        </span>
                      </div>
                      {finding.note && (
                        <p className="mt-2 text-xs leading-relaxed text-ink/85">
                          {finding.note}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/review/${finding.candidateId}?criterion=${finding.criterionId}`,
                          )
                        }
                        className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-brand transition-colors hover:text-brand-strong"
                      >
                        Open the evidence
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
