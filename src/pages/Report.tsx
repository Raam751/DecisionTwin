import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRoleRecords } from "@/hooks/use-role-records";
import {
  buildAuditReport,
  downloadReportJson,
  type ReportCandidate,
} from "@/lib/audit-report";
import { getWorkspaceId } from "@/lib/workspace";
import { useRoles } from "@/state/roles-store";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function CandidateSection({ entry }: { entry: ReportCandidate }) {
  return (
    <section className="report-candidate">
      <h2>
        {entry.name}
        <span className="report-stage">stage: {entry.currentStage}</span>
      </h2>

      {!entry.hasRecord ? (
        <p className="report-note">
          No evidence record exists for this candidate, so nothing has been
          assessed and no decision has been recorded.
        </p>
      ) : (
        <>
          <p className="report-note">
            Source: {entry.documentTitle}, {entry.documentLineCount} numbered
            lines. Essential criteria supported: {entry.essentialCovered} of{" "}
            {entry.essentialTotal}. Desirable: {entry.desirableCovered} of{" "}
            {entry.desirableTotal}.
            {entry.unmetEssential.length > 0
              ? ` Essential criteria not supported: ${entry.unmetEssential.join(", ")}.`
              : ""}
          </p>

          <h3>Evidence</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Status</th>
                <th>Source</th>
                <th>Cited at</th>
              </tr>
            </thead>
            <tbody>
              {entry.evidence.map((item, index) => (
                <tr key={`${item.criterion}-${item.source}-${index}`}>
                  <td>
                    {item.criterion}
                    <span className="report-tag">
                      {item.essential ? "essential" : "desirable"}
                    </span>
                    {item.quote && (
                      <span className="report-quote">"{item.quote}"</span>
                    )}
                    {item.explanation && (
                      <span className="report-explain">{item.explanation}</span>
                    )}
                  </td>
                  <td>{item.status}</td>
                  <td>
                    {item.source}
                    {item.source === "interview" && item.recordedBy
                      ? `, ${item.recordedBy}${item.stage ? `, ${item.stage}` : ""}`
                      : ""}
                  </td>
                  <td>
                    {item.citedLines}
                    {item.source === "source document" && (
                      <span className="report-explain">
                        {item.citationVerified
                          ? "verified by the server"
                          : "not verified"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {entry.interviewQuestions.length > 0 && (
            <>
              <h3>Questions raised by unresolved evidence</h3>
              <ul className="report-list">
                {entry.interviewQuestions.map((item, index) => (
                  <li key={index}>
                    <strong>{item.criterion}:</strong> {item.question}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3>Decisions</h3>
          {entry.decisions.length === 0 ? (
            <p className="report-note">No decision has been recorded.</p>
          ) : (
            <ul className="report-list">
              {entry.decisions.map((decision) => (
                <li key={`${decision.stage}-${decision.timestamp}`}>
                  <strong>
                    {decision.stage}: {decision.disposition}
                  </strong>
                  <br />
                  {decision.reason}
                  <br />
                  <span className="report-explain">
                    Recorded by {decision.reviewerName} on{" "}
                    {formatWhen(decision.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {entry.overrides.length > 0 && (
            <>
              <h3>Human changes to the record</h3>
              <ul className="report-list">
                {entry.overrides.map((override, index) => (
                  <li key={index}>
                    <strong>{override.criterion}:</strong>{" "}
                    {override.previousValue} to {override.newValue}
                    {override.stage ? `, in ${override.stage}` : ""}
                    <br />
                    {override.reason}
                    <br />
                    <span className="report-explain">
                      {override.reviewer}, {formatWhen(override.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {entry.sensitivity && (
            <>
              <h3>Identity sensitivity check</h3>
              <p className="report-note">
                Run {formatWhen(entry.sensitivity.runTimestamp)}. Masked:{" "}
                {entry.sensitivity.maskedFields}.{" "}
                {entry.sensitivity.changedCount === 0
                  ? "No criterion changed when identity was masked."
                  : `Changed when masked: ${entry.sensitivity.changed.join(", ")}. These were flagged for human review.`}
              </p>
            </>
          )}

          {entry.replay && (
            <>
              <h3>Reproducibility</h3>
              <p className="report-note">
                Record {entry.replay.recordId}. Model{" "}
                {entry.replay.modelName}, prompt {entry.replay.promptVersion},
                schema {entry.replay.schemaVersion}, input fingerprint{" "}
                {entry.replay.inputHash}, run{" "}
                {formatWhen(entry.replay.runTimestamp)}.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The auditable hiring report for the active role.
 *
 * Purely a projection of the stored record. Print to PDF for a compliance file,
 * or download the JSON for a system of record.
 */
const Report = () => {
  const navigate = useNavigate();
  const { activeRole, activeCandidates } = useRoles();
  const { records, loading } = useRoleRecords(activeCandidates);

  const report = useMemo(
    () =>
      buildAuditReport(activeRole, activeCandidates, records, getWorkspaceId()),
    [activeRole, activeCandidates, records],
  );

  return (
    <div className="report-page">
      <div className="print-hide workspace-container pb-0">
        <button
          type="button"
          onClick={() => navigate("/decisions")}
          className="focus-ring group inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to decisions
        </button>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => window.print()} disabled={loading}>
            <Printer className="h-4 w-4" aria-hidden />
            Export as PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => downloadReportJson(report)}
          >
            <Download className="h-4 w-4" aria-hidden />
            Download JSON
          </Button>
          <span className="font-mono text-2xs text-muted-foreground">
            {loading
              ? "loading the records"
              : "PDF export uses your browser's print dialog, choose Save as PDF"}
          </span>
        </div>
      </div>

      <article className="report-sheet">
        <header className="report-header">
          <h1>Auditable hiring report</h1>
          <p className="report-note">
            Role: {report.role.title}. Generated{" "}
            {formatWhen(report.generatedAt)}. Workspace reference{" "}
            {report.workspaceRef}. Produced by DecisionTwin.
          </p>
          <p className="report-note">
            Essential criteria: {report.role.essentialCriteria.join(", ") || "none"}.
            Desirable: {report.role.desirableCriteria.join(", ") || "none"}.
          </p>
        </header>

        <section>
          <h3>How to read this report</h3>
          <ol className="report-list">
            {report.statements.map((statement, index) => (
              <li key={index}>{statement}</li>
            ))}
          </ol>
        </section>

        {report.candidates.map((entry) => (
          <CandidateSection key={entry.candidateId} entry={entry} />
        ))}

        <footer className="report-footer">
          <p>
            End of report. {report.candidates.length} candidate
            {report.candidates.length === 1 ? "" : "s"} for {report.role.title}.
            Generated {formatWhen(report.generatedAt)}.
          </p>
        </footer>
      </article>
    </div>
  );
};

export default Report;
