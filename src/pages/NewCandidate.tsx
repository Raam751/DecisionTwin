import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRoles } from "@/state/roles-store";
import type { DocumentLine } from "@/types";

/**
 * Splits pasted resume text into the same numbered DocumentLine shape the
 * seeded candidates use: one line per newline, empty lines dropped, numbering
 * restarted at 1 so the citation line numbers are correct.
 */
const toDocumentLines = (text: string): DocumentLine[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => ({ lineNumber: index + 1, text: line }));

const NewCandidate = () => {
  const navigate = useNavigate();
  const { activeRole, addCandidate } = useRoles();

  const [name, setName] = useState("");
  const [resume, setResume] = useState("");

  const lines = useMemo(() => toDocumentLines(resume), [resume]);
  const canSave = name.trim().length > 0 && lines.length > 0;

  const save = () => {
    if (!canSave) return;
    addCandidate({
      id: `candidate-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      roleId: activeRole.id,
      documentTitle: "Resume",
      documentLines: lines,
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
          <h1 className="text-4xl font-bold tracking-tight">Add candidate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adding to the active role:{" "}
            <span className="font-medium text-foreground">{activeRole.title}</span>
          </p>
        </header>

        <section className="mt-10 rounded-2xl border bg-card p-5">
          <label
            htmlFor="candidate-name"
            className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Candidate name
          </label>
          <input
            id="candidate-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
          />

          <label
            htmlFor="resume-text"
            className="mt-5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Resume text
          </label>
          <textarea
            id="resume-text"
            value={resume}
            onChange={(event) => setResume(event.target.value)}
            rows={12}
            placeholder="Paste the resume text here, one line per line."
            className="mt-3 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70"
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Numbered preview
            </p>
            <p className="text-xs text-muted-foreground">
              {lines.length === 0
                ? "No lines yet, empty lines are dropped"
                : `${lines.length} line${lines.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border bg-card py-4">
            {lines.length === 0 ? (
              <p className="px-5 text-sm text-muted-foreground">
                The numbered lines will appear here as you paste the resume.
              </p>
            ) : (
              lines.map((line) => (
                <div key={line.lineNumber} className="flex items-center gap-4 px-5 py-1.5">
                  <span className="w-8 shrink-0 select-none text-right text-xs tabular-nums leading-6 text-muted-foreground">
                    {line.lineNumber}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-6 text-foreground/80">
                    {line.text}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={!canSave}>
              Save candidate
            </Button>
            <span className="text-xs text-muted-foreground">
              {canSave
                ? "Then run the evidence review for them."
                : "Add a name and at least one line of resume text."}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NewCandidate;
