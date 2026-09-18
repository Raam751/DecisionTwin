import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  FileUp,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LineEditor } from "@/components/line-editor";
import { suggestCandidateName } from "@/services/candidate-name-api";
import { condenseResume } from "@/services/condense-api";
import {
  extractPdfText,
  isPdfFile,
  isTextFile,
  readTextFile,
  toDocumentLines,
} from "@/services/pdf-extract";
import { useRoles } from "@/state/roles-store";
import { cn } from "@/lib/utils";
import type { DocumentLine } from "@/types";

type IntakeStatus = "queued" | "reading" | "ready" | "saved" | "empty" | "failed";

interface IntakeFile {
  id: string;
  file: File;
  status: IntakeStatus;
  progressLabel: string;
  error: string | null;
  lines: DocumentLine[];
  /** Set when the model could not condense and the raw lines are shown. */
  condenseNote: string | null;
  /** True when the shown lines are the model's condensed summary. */
  condensed: boolean;
}

/** The "no text" warning is deliberately plain so a scanned PDF is not hidden. */
const NO_TEXT_MESSAGE =
  "This file has no readable text. It may be a scanned image with no text layer. Paste the text instead.";

const statusTone: Record<IntakeStatus, string> = {
  queued: "text-muted-foreground",
  reading: "text-brand-deep",
  ready: "text-brand-deep",
  saved: "text-supported",
  empty: "text-conflicting",
  failed: "text-conflicting",
};

const NewCandidate = () => {
  const navigate = useNavigate();
  const { activeRole, addCandidate } = useRoles();

  const [name, setName] = useState("");
  const [resume, setResume] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [files, setFiles] = useState<IntakeFile[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [savingFile, setSavingFile] = useState(false);
  const [saveFileError, setSaveFileError] = useState<string | null>(null);

  const pasteLines = useMemo(() => toDocumentLines(resume), [resume]);
  const canSavePaste = name.trim().length > 0 && pasteLines.length > 0;

  const patchFile = useCallback((index: number, patch: Partial<IntakeFile>) => {
    setFiles((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  }, []);

  /** The index of the next queued file after a given position, if any. */
  const nextQueuedAfter = useCallback(
    (from: number): number | null => {
      const next = files.findIndex(
        (entry, i) => i > from && entry.status === "queued",
      );
      return next === -1 ? null : next;
    },
    [files],
  );

  // Processes the file at the cursor, one at a time. Status guards keep the
  // effect from re-running while a file is already being read.
  useEffect(() => {
    if (cursor === null) return;
    const entry = files[cursor];
    if (!entry || entry.status !== "queued") return;
    const index = cursor;

    const run = async () => {
      patchFile(index, { status: "reading", progressLabel: "Preparing" });
      try {
        let raw: string;
        if (isPdfFile(entry.file)) {
          raw = await extractPdfText(entry.file, (label) =>
            patchFile(index, { progressLabel: label }),
          );
        } else {
          patchFile(index, { progressLabel: "Reading text file" });
          raw = await readTextFile(entry.file);
        }
        const rawLines = toDocumentLines(raw);
        if (rawLines.length === 0) {
          patchFile(index, {
            status: "empty",
            progressLabel: "No text found",
            error: NO_TEXT_MESSAGE,
          });
          return;
        }

        // Short lists have nothing to condense. Long lists go through the
        // model once; on any failure the raw lines are kept, never lost.
        let lines = rawLines;
        let condenseNote: string | null = null;
        let condensed = false;
        if (rawLines.length > 15) {
          patchFile(index, { progressLabel: "Condensing with AI" });
          try {
            const condensedLines = await condenseResume(
              rawLines.map((line) => line.text).join("\n"),
            );
            if (condensedLines.length > 0) {
              lines = condensedLines.map((text, i) => ({
                lineNumber: i + 1,
                text,
              }));
              condensed = true;
            } else {
              condenseNote =
                "Could not condense this file. The raw lines are shown; edit them before saving.";
            }
          } catch {
            condenseNote =
              "Could not condense this file. The raw lines are shown; edit them before saving.";
          }
        }

        patchFile(index, {
          status: "ready",
          progressLabel: "Ready for review",
          lines,
          error: null,
          condenseNote,
          condensed,
        });
      } catch (error) {
        patchFile(index, {
          status: "failed",
          progressLabel: "Failed",
          error: (error as Error).message,
        });
      }
    };

    void run();
  }, [cursor, files, patchFile]);

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";

    const entries: IntakeFile[] = picked.map((file) => {
      const supported = isPdfFile(file) || isTextFile(file);
      return {
        id: `intake-${crypto.randomUUID().slice(0, 8)}`,
        file,
        status: supported ? "queued" : "failed",
        progressLabel: supported ? "Queued" : "Unsupported",
        error: supported
          ? null
          : "Only PDF and plain text files are supported.",
        lines: [],
        condenseNote: null,
        condensed: false,
      };
    });

    const firstQueued = entries.findIndex((entry) => entry.status === "queued");
    setFiles((current) => [...current, ...entries]);
    if (firstQueued !== -1 && cursor === null) {
      setCursor(files.length + firstQueued);
    }
  };

  const activeTextForName = (): string => {
    if (cursor !== null) {
      const entry = files[cursor];
      if (entry && entry.status === "ready") {
        return entry.lines.map((line) => line.text).join("\n");
      }
    }
    return resume;
  };

  const suggestName = async () => {
    const text = activeTextForName();
    if (!text.trim() || suggesting) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const suggested = await suggestCandidateName(text);
      if (suggested) {
        setName(suggested);
      } else {
        setSuggestError("No name could be read from this text.");
      }
    } catch (cause) {
      setSuggestError((cause as Error).message);
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    if (!canSavePaste || saving) return;

    setSaving(true);
    setSaveError(null);
    try {
      await addCandidate({
        id: `candidate-${crypto.randomUUID().slice(0, 8)}`,
        name: name.trim(),
        roleId: activeRole.id,
        documentTitle: "Resume",
        documentLines: pasteLines,
      });
      navigate("/dashboard");
    } catch (cause) {
      // Nothing was stored. Keep the form as it is so the save can be retried.
      setSaveError((cause as Error).message);
      setSaving(false);
    }
  };

  const skipCurrent = () => {
    if (cursor === null) return;
    setCursor(nextQueuedAfter(cursor));
  };

  const saveCurrentFile = async () => {
    if (cursor === null || savingFile) return;
    const entry = files[cursor];
    if (!entry) return;

    const cleanLines = entry.lines
      .map((line) => ({ text: line.text.trim() }))
      .filter((line) => line.text.length > 0)
      .map((line, index) => ({ lineNumber: index + 1, text: line.text }));

    if (!name.trim() || cleanLines.length === 0) return;

    setSavingFile(true);
    setSaveFileError(null);
    try {
      await addCandidate({
        id: `candidate-${crypto.randomUUID().slice(0, 8)}`,
        name: name.trim(),
        roleId: activeRole.id,
        documentTitle: "Resume",
        documentLines: cleanLines,
      });
      patchFile(cursor, { status: "saved", progressLabel: "Saved" });
      setName("");
      setCursor(nextQueuedAfter(cursor));
    } catch (cause) {
      // Nothing was stored. Keep the lines so the save can be retried.
      setSaveFileError((cause as Error).message);
    } finally {
      setSavingFile(false);
    }
  };

  const current = cursor !== null ? files[cursor] : null;
  const readyLines = current?.lines ?? [];
  const nonEmptyLineCount = readyLines.filter(
    (line) => line.text.trim().length > 0,
  ).length;
  const fewLines = readyLines.length > 0 && nonEmptyLineCount < 3;
  const fragmented =
    readyLines.length > 0 &&
    readyLines.filter(
      (line) =>
        line.text.trim().split(/\s+/).filter(Boolean).length <= 2,
    ).length / readyLines.length >= 0.5;
  const canSaveFile =
    !!current &&
    current.status === "ready" &&
    name.trim().length > 0 &&
    nonEmptyLineCount > 0;

  return (
    <div className="min-h-full bg-background">
      <div className="workspace-container workspace-container-form">
        <button
          onClick={() => navigate("/dashboard")}
          className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to candidates
        </button>

        <header className="mt-8">
          <h1 className="workspace-title">Add candidate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adding to the active role:{" "}
            <span className="font-medium text-foreground">{activeRole.title}</span>
          </p>
        </header>

        <section className="card-surface workspace-form-panel mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label
              htmlFor="candidate-name"
              className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Candidate name
            </label>
            <button
              type="button"
              onClick={() => void suggestName()}
              disabled={!activeTextForName().trim() || suggesting}
              className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-brand-deep transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              {suggesting ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {suggesting ? "Reading the resume" : "Suggest name from resume"}
            </button>
          </div>
          <input
            id="candidate-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
          />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            The suggestion is a draft. The reviewer can always correct the name.
          </p>
          {suggestError && (
            <p className="mt-2 rounded-lg border border-conflicting/30 bg-conflicting-soft px-3 py-2 text-xs leading-relaxed text-conflicting">
              {suggestError}
            </p>
          )}
        </section>

        <section className="card-surface workspace-form-panel mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Upload resumes
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Upload one or more PDF or plain text files. Each file becomes one
            candidate, processed one at a time. Extracted lines are never saved
            until you confirm them below.
          </p>

          <label
            htmlFor="resume-files"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface/60 px-6 py-8 text-center transition-colors hover:border-brand/40 hover:bg-surface"
          >
            <FileUp className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">
              Choose PDF or text files
            </span>
            <span className="text-xs text-muted-foreground">
              Multiple files allowed. One candidate per file.
            </span>
          </label>
          <input
            id="resume-files"
            type="file"
            multiple
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={onFilesSelected}
            className="sr-only"
          />

          {files.length > 0 && (
            <ol className="mt-5 divide-y divide-line border-t border-line" aria-label="Uploaded files">
              {files.map((entry, index) => (
                <li
                  key={entry.id}
                  className={cn(
                    "flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 text-sm",
                    cursor === index && "bg-surface/70",
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-ink">
                      {entry.file.name}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 text-xs",
                      statusTone[entry.status],
                    )}
                  >
                    {entry.status === "reading" && (
                      <LoaderCircle
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {entry.status === "saved" && (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {(entry.status === "empty" || entry.status === "failed") && (
                      <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {entry.status === "queued" && (
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {entry.progressLabel}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {current?.status === "ready" && (
            <div className="mt-5 rounded-xl border border-line bg-background/50">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  Confirm lines for {current.file.name}
                </p>
                <p className="font-mono text-2xs text-muted-foreground">
                  {nonEmptyLineCount}{" "}
                  {nonEmptyLineCount === 1 ? "line" : "lines"}
                </p>
                {current.condensed && (
                  <span className="rounded-full border border-brand/25 bg-peach px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-[0.08em] text-peach-foreground">
                    Condensed
                  </span>
                )}
              </div>

              {current.condenseNote && (
                <div className="flex gap-2.5 border-b border-line bg-uncertain-soft/60 px-4 py-3">
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0 text-uncertain"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-relaxed text-ink">
                    {current.condenseNote}
                  </p>
                </div>
              )}

              {(fewLines || fragmented) && (
                <div className="flex gap-2.5 border-b border-line bg-uncertain-soft/60 px-4 py-3">
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0 text-uncertain"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-relaxed text-ink">
                    {fewLines && "Very little text was extracted. "}
                    {fragmented &&
                      "Lines look fragmented. Merge them into full sentences so citations can point at real lines. "}
                    Edit, merge, split or delete lines, then confirm.
                  </p>
                </div>
              )}

              <LineEditor
                lines={readyLines}
                onChange={(next) => {
                  if (cursor !== null) patchFile(cursor, { lines: next });
                }}
                labelPrefix={current.file.name}
              />

              <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3.5">
                <Button
                  onClick={() => void saveCurrentFile()}
                  disabled={!canSaveFile || savingFile}
                >
                  {savingFile ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Saving candidate
                    </>
                  ) : (
                    "Save this candidate"
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {canSaveFile
                    ? "Nothing is saved until you confirm the lines."
                    : "Add a name and keep at least one line of text."}
                </span>
              </div>

              {saveFileError && (
                <p className="mx-4 mb-4 rounded-lg border border-conflicting/30 bg-conflicting-soft px-3 py-2 text-xs leading-relaxed text-conflicting">
                  {saveFileError}
                </p>
              )}
            </div>
          )}

          {(current?.status === "empty" || current?.status === "failed") && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-conflicting/30 bg-conflicting-soft px-4 py-3.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-conflicting"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-conflicting">
                  {current.error}
                  {current.status === "empty" && " Use the paste path below instead."}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={skipCurrent}>
                Skip this file
              </Button>
            </div>
          )}
        </section>

        <section className="card-surface workspace-form-panel mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resume text
          </p>
          <textarea
            id="resume-text"
            value={resume}
            onChange={(event) => setResume(event.target.value)}
            rows={12}
            placeholder="Paste the resume text here, one line per line. Use this path when a file has no readable text."
            className="mt-3 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70"
          />
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Numbered preview
            </p>
            <p className="text-xs text-muted-foreground">
              {pasteLines.length === 0
                ? "No lines yet, empty lines are dropped"
                : `${pasteLines.length} line${pasteLines.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border bg-card py-4">
            {pasteLines.length === 0 ? (
              <p className="px-5 text-sm text-muted-foreground">
                The numbered lines will appear here as you paste the resume.
              </p>
            ) : (
              pasteLines.map((line) => (
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
            <Button onClick={save} disabled={!canSavePaste || saving}>
              {saving ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving candidate
                </>
              ) : (
                "Save candidate"
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {canSavePaste
                ? "Then run the evidence review for them."
                : "Add a name and at least one line of resume text."}
            </span>
          </div>

          {saveError && (
            <div className="mt-4 rounded-xl border border-conflicting/30 bg-conflicting-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-conflicting">
                Save failed
              </p>
              <p className="mt-1 text-xs leading-relaxed text-conflicting">
                {saveError}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default NewCandidate;
