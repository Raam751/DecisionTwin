import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LoaderCircle, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PriorityToggle } from "@/components/priority-toggle";
import { generateCriteria } from "@/services/criteria-api";
import { useRoles } from "@/state/roles-store";
import { cn } from "@/lib/utils";
import type { RoleCriterion } from "@/types";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Falls back to the first line of the description when no title is given. */
const deriveTitle = (jobDescription: string): string => {
  const firstLine =
    jobDescription
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  if (!firstLine) return "Untitled role";
  return firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}...` : firstLine;
};

const NewRole = () => {
  const navigate = useNavigate();
  const { addRole } = useRoles();

  const [jobDescription, setJobDescription] = useState("");
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState<RoleCriterion[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExtract = jobDescription.trim().length > 0 && !extracting;
  const canSave = !!criteria && criteria.length >= 2;
  const essentialCount =
    criteria?.filter((criterion) => criterion.required !== false).length ?? 0;

  const extract = async () => {
    setExtracting(true);
    setError(null);
    try {
      setCriteria(await generateCriteria(jobDescription));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setExtracting(false);
    }
  };

  const updateCriterion = (index: number, patch: Partial<RoleCriterion>) => {
    setCriteria((current) =>
      current
        ? current.map((criterion, i) =>
            i === index ? { ...criterion, ...patch } : criterion,
          )
        : current,
    );
  };

  const removeCriterion = (index: number) => {
    setCriteria((current) =>
      current ? current.filter((_, i) => i !== index) : current,
    );
  };

  const save = () => {
    if (!criteria || criteria.length < 2) return;

    // The id is internal, so it is rebuilt from the final label and kept unique.
    const used = new Set<string>();
    const shaped = criteria.map((criterion, index) => {
      const base = slugify(criterion.label) || `criterion-${index + 1}`;
      let id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      return {
        id,
        label: criterion.label.trim(),
        description: criterion.description.trim(),
        // Only an explicit "desirable" makes a criterion optional.
        required: criterion.required !== false,
      };
    });

    addRole({
      id: `role-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim() || deriveTitle(jobDescription),
      jobDescription: jobDescription.trim(),
      criteria: shaped,
    });

    navigate("/");
  };

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
        <button
          onClick={() => navigate("/")}
          className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to candidates
        </button>

        <header className="mt-8">
          <h1 className="text-4xl font-bold tracking-tight">New role</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste the job description. The model drafts the criteria, you decide
            what counts as evidence.
          </p>
        </header>

        <section className="mt-10 rounded-2xl border bg-card p-5">
          <label
            htmlFor="role-title"
            className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Role title
          </label>
          <input
            id="role-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Defaults to the first line of the description"
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
          />

          <label
            htmlFor="job-description"
            className="mt-5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Job description, pasted as-is
          </label>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={12}
            placeholder="Paste the real job description for the role, exactly as it is — including the responsibilities and the requirements."
            className="mt-3 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70"
          />

          <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
            <p>
              The criteria are extracted from this wording — the more specific
              it is, the better the criteria will be.
            </p>
            <p>
              “Must have” or “required” wording tends to produce{" "}
              <span className="font-semibold text-ink">Essential</span>{" "}
              criteria, while “nice to have” or “bonus” wording tends to produce{" "}
              <span className="font-semibold">Desirable</span> ones. You can
              change any of them afterwards.
            </p>
          </div>

          <details className="group mt-4 rounded-xl border border-line bg-surface">
            <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden
                className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90"
              />
              See a well-formed example
            </summary>
            <div className="border-t border-line px-4 py-3.5 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-ink">
                Senior Backend Engineer, Payments Platform
              </p>
              <p className="mt-2">
                We are hiring a Senior Backend Engineer to own our payments API.
                Responsibilities: design and run the public REST API end to end,
                including versioning and how consumers are told about changes;
                take the on-call lead for the payments service.
              </p>
              <p className="mt-2">
                Requirements: must have five or more years building production
                services in Go or Python; must have operated Kubernetes in
                production.
              </p>
              <p className="mt-2">
                Nice to have: experience with Terraform; a track record of
                writing post-incident reviews.
              </p>
            </div>
          </details>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={extract} disabled={!canExtract}>
              {extracting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Extracting criteria
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract criteria
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Three to six criteria are returned.
            </span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                Extraction failed
              </p>
              <p className="mt-1 text-xs leading-relaxed text-rose-900">{error}</p>
            </div>
          )}
        </section>

        {criteria && (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Criteria
              </p>
              <p className="text-xs text-muted-foreground">
                {criteria.length} returned, {essentialCount} essential. Edit,
                set the priority or remove any of them.
              </p>
            </div>

            <ul className="mt-4 space-y-3">
              {criteria.map((criterion, index) => (
                <li
                  key={`${criterion.id}-${index}`}
                  className="rounded-2xl border bg-card px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <PriorityToggle
                        required={criterion.required !== false}
                        onChange={(required) =>
                          updateCriterion(index, { required })
                        }
                        label={criterion.label || `Criterion ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <input
                    value={criterion.label}
                    onChange={(event) =>
                      updateCriterion(index, { label: event.target.value })
                    }
                    aria-label={`Criterion ${index + 1} label`}
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  />
                  <textarea
                    value={criterion.description}
                    onChange={(event) =>
                      updateCriterion(index, { description: event.target.value })
                    }
                    rows={2}
                    aria-label={`Criterion ${index + 1} description`}
                    className="mt-2 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                  />
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Essential criteria are reported separately from desirable ones when
              a candidate is assessed. The model proposes a default from the
              wording of the description; the choice is yours.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={!canSave}>
                Save role
              </Button>
              <span
                className={cn(
                  "text-xs",
                  canSave ? "text-muted-foreground" : "text-amber-700",
                )}
              >
                {canSave
                  ? "This role becomes the active one."
                  : "At least two criteria are required to continue."}
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NewRole;
