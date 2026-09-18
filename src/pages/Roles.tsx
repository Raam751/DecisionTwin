import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CircleDashed, Plus, Table2, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoleRecords } from "@/hooks/use-role-records";
import { useRoles } from "@/state/roles-store";
import { cn } from "@/lib/utils";
import type { Candidate, EvidenceRecord, Role } from "@/types";

const formatCreated = (iso?: string): string => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

interface RoleCoverage {
  essentialCovered: number;
  essentialTotal: number;
  desirableCovered: number;
  desirableTotal: number;
  withRecord: number;
}

/**
 * States which criteria have cited evidence in at least one candidate. Facts
 * only: no scores, no rankings, no shortlisting.
 */
function coverageFor(
  role: Role,
  roleCandidates: Candidate[],
  records: Record<string, EvidenceRecord | null>,
): RoleCoverage {
  const withRecord = roleCandidates.filter(
    (candidate) => (records[candidate.id]?.evidence.length ?? 0) > 0,
  );
  const supportedByAnyone = (criterionId: string) =>
    withRecord.some((candidate) =>
      records[candidate.id]!.evidence.some(
        (item) =>
          item.criterionId === criterionId && item.status === "supported",
      ),
    );

  const essential = role.criteria.filter((criterion) => criterion.required);
  const desirable = role.criteria.filter((criterion) => !criterion.required);

  return {
    essentialCovered: essential.filter((criterion) =>
      supportedByAnyone(criterion.id),
    ).length,
    essentialTotal: essential.length,
    desirableCovered: desirable.filter((criterion) =>
      supportedByAnyone(criterion.id),
    ).length,
    desirableTotal: desirable.length,
    withRecord: withRecord.length,
  };
}

const Roles = () => {
  const navigate = useNavigate();
  const {
    roles,
    activeRole,
    candidatesForRole,
    roleCreatedAt,
    setActiveRoleId,
  } = useRoles();

  // Load the evidence record for every candidate of every role once, so each
  // row can state coverage across its own candidates.
  const allCandidates = useMemo(
    () => roles.flatMap((role) => candidatesForRole(role.id)),
    [roles, candidatesForRole],
  );
  const { records, loading } = useRoleRecords(allCandidates);

  const freshWorkspace = roles.length === 1;

  const openRoleCandidates = (roleId: string) => {
    setActiveRoleId(roleId);
    navigate("/dashboard");
  };

  const openRoleCompare = (roleId: string) => {
    setActiveRoleId(roleId);
    navigate("/compare");
  };

  return (
    <div className="min-h-full bg-background">
      <div className="workspace-container">
        <header className="workspace-page-heading flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">Your workspace</p>
            <h1 className="workspace-title">Roles</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every role in this workspace. The active role drives the candidate
              list, the compare matrix and the review screens.
            </p>
          </div>
          <Button onClick={() => navigate("/roles/new")} size="lg">
            <Plus className="h-4 w-4" />
            New role
          </Button>
        </header>

        {freshWorkspace && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface p-6">
            <div className="max-w-xl">
              <p className="eyebrow">Fresh workspace</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The seeded Platform Engineer example is here to get you going.
                Paste a real job description to add your first role — it will be
                kept for this workspace from then on.
              </p>
            </div>
            <Button onClick={() => navigate("/roles/new")}>
              <Plus className="h-4 w-4" />
              Create your first role
            </Button>
          </div>
        )}

        <section className="mt-8 space-y-4" aria-label="Roles in this workspace">
          {roles.map((role) => {
            const isActive = role.id === activeRole.id;
            const roleCandidates = candidatesForRole(role.id);
            const coverage = coverageFor(role, roleCandidates, records);
            const essentialCount = role.criteria.filter(
              (criterion) => criterion.required,
            ).length;
            const desirableCount = role.criteria.length - essentialCount;
            const created = roleCreatedAt[role.id];

            return (
              <article
                key={role.id}
                className={cn(
                  "rounded-2xl border bg-card p-6 md:p-7",
                  isActive && "border-brand/40 shadow-card",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                  <div className="min-w-0 max-w-xl">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
                        {role.title}
                      </h2>
                      {isActive && <Badge>Active role</Badge>}
                    </div>

                    <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {essentialCount} Essential · {desirableCount} Desirable ·{" "}
                      {roleCandidates.length}{" "}
                      {roleCandidates.length === 1 ? "candidate" : "candidates"}
                    </p>

                    <div className="mt-4 space-y-1.5 text-sm leading-relaxed">
                      {roleCandidates.length === 0 ? (
                        <p className="text-muted-foreground">
                          No candidates for this role yet.
                        </p>
                      ) : loading ? (
                        <p className="text-muted-foreground">
                          Gathering coverage across these candidates…
                        </p>
                      ) : coverage.withRecord === 0 ? (
                        <p className="flex items-start gap-2 text-muted-foreground">
                          <CircleDashed
                            aria-hidden
                            className="mt-0.5 h-4 w-4 shrink-0"
                          />
                          No evidence records generated for these candidates yet.
                        </p>
                      ) : (
                        <>
                          {coverage.essentialTotal > 0 && (
                            <p
                              className={cn(
                                "flex items-start gap-2",
                                coverage.essentialCovered <
                                  coverage.essentialTotal
                                  ? "text-ink"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Check
                                aria-hidden
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  coverage.essentialCovered <
                                    coverage.essentialTotal
                                    ? "text-essential"
                                    : "text-supported",
                                )}
                              />
                              Across the candidate pool,{" "}
                              {coverage.essentialCovered} of{" "}
                              {coverage.essentialTotal} essential criteria
                              are supported by at least one candidate —
                              not necessarily the same candidate.
                            </p>
                          )}
                          {coverage.desirableTotal > 0 && (
                            <p className="flex items-start gap-2 text-muted-foreground">
                              <Check
                                aria-hidden
                                className="mt-0.5 h-4 w-4 shrink-0 text-supported"
                              />
                              Across the candidate pool,{" "}
                              {coverage.desirableCovered} of{" "}
                              {coverage.desirableTotal} desirable criteria
                              are supported by at least one candidate — not
                              necessarily the same candidate.
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground">
                      {created
                        ? `Created ${formatCreated(created)}`
                        : "Seeded example"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveRoleId(role.id)}
                      >
                        Make active
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRoleCandidates(role.id)}
                    >
                      <UsersRound className="h-4 w-4" />
                      Candidates
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRoleCompare(role.id)}
                    >
                      <Table2 className="h-4 w-4" />
                      Compare
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Coverage states which criteria have supporting evidence across each
          role's candidates. Nothing here scores, ranks or shortlists anyone:
          the reviewer decides what the evidence means.
        </p>
      </div>
    </div>
  );
};

export default Roles;
