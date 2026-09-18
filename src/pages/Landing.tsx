import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroMechanism } from "@/components/hero-mechanism";

/**
 * The first screen a visitor sees: one line about the problem, one line about
 * what DecisionTwin does, and a single way in. The hero animation is the
 * centrepiece — it shows the actual mechanism before anyone reads a word.
 */
const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-6 py-6 md:px-10">
        <header className="flex items-baseline justify-between gap-4">
          <p className="font-serif text-2xl font-bold tracking-tight text-ink">
            DecisionTwin
          </p>
          <p className="hidden text-xs font-medium uppercase tracking-widest text-muted-foreground sm:block">
            The auditable hiring decision twin
          </p>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_1.08fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="eyebrow">The problem</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-6xl">
              Hiring is decided by what the room remembers.
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              DecisionTwin reads each candidate&apos;s own document, links its
              claims to your criteria, verifies every citation on the server,
              and records the human decision — so the reasoning survives the
              room.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => navigate("/dashboard")}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
                Your workspace already has a seeded role and three candidates to
                try.
              </p>
            </div>
          </div>

          <div className="w-full">
            <HeroMechanism />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Evidence is pulled from the document, verified against it, and
              decided by a person. Hover a criterion to replay its step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
