import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { candidates, platformEngineerRole } from "@/data/seed";

const Index = () => {
  const navigate = useNavigate();

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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Role
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            {platformEngineerRole.title}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {platformEngineerRole.criteria.map((criterion) => (
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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Candidates
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {candidates.map((candidate) => (
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
        </section>
      </div>
    </div>
  );
};

export default Index;
