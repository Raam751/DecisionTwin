import { useNavigate } from "react-router-dom";
import { Plus, Table2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRoles } from "@/state/roles-store";

const Index = () => {
  const navigate = useNavigate();
  const { roles, activeRole, activeCandidates, setActiveRoleId } = useRoles();

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight">DecisionTwin</h1>
          <p className="text-sm text-muted-foreground">
            The auditable hiring decision twin
          </p>
        </header>

        <section className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Role
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/roles/new")}
            >
              <Plus className="h-4 w-4" />
              New role
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h2 className="text-4xl font-bold tracking-tight">
              {activeRole.title}
            </h2>
            {roles.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Active role
                <select
                  value={activeRole.id}
                  onChange={(event) => setActiveRoleId(event.target.value)}
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {activeRole.criteria.map((criterion) => (
              <span
                key={criterion.id}
                className="rounded-full bg-peach px-3.5 py-1.5 text-xs font-medium text-peach-foreground"
              >
                {criterion.label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Candidates
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/compare")}
              >
                <Table2 className="h-4 w-4" />
                Compare candidates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/candidates/new")}
              >
                <UserPlus className="h-4 w-4" />
                Add candidate
              </Button>
            </div>
          </div>

          {activeCandidates.length === 0 ? (
            <div className="mt-5 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              No candidates for this role yet. Add one by pasting resume text.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {activeCandidates.map((candidate) => (
                <Card key={candidate.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-bold">{candidate.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {candidate.documentTitle}
                    </p>
                    <div className="flex-1" />
                    <Button
                      className="mt-6 w-full"
                      onClick={() => navigate(`/review/${candidate.id}`)}
                    >
                      Start evidence review
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Index;
