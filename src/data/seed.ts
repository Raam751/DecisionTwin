import type { Candidate, EvidenceRecord, Role } from "@/types";

export const platformEngineerRole: Role = {
  id: "role-platform-engineer",
  title: "Platform Engineer",
  criteria: [
    {
      id: "api-ownership",
      label: "API ownership",
      description:
        "Ownership of API design, lifecycle, versioning, and governance.",
    },
    {
      id: "incident-response",
      label: "Incident response",
      description:
        "Experience detecting, responding to, and learning from production incidents.",
    },
    {
      id: "production-kubernetes",
      label: "Production Kubernetes",
      description:
        "Running and operating Kubernetes clusters in production environments.",
    },
    {
      id: "data-modelling",
      label: "Data modelling",
      description:
        "Designing schemas and data models that serve application and analytics needs.",
    },
  ],
};

const placeholderLines = Array.from({ length: 12 }, (_, i) => ({
  lineNumber: i + 1,
  text: "",
}));

export const candidates: Candidate[] = [
  {
    id: "candidate-a",
    name: "Priya Menon",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: [
      {
        lineNumber: 1,
        text: "Senior Platform Engineer, Acme Corp, 2019 to 2025",
      },
      {
        lineNumber: 2,
        text: "Owned the public REST API serving 40+ internal and external clients.",
      },
      {
        lineNumber: 3,
        text: "Designed the v2 API contract, versioning policy, and deprecation process.",
      },
      {
        lineNumber: 4,
        text: "On-call lead for the payments platform and drove post-incident reviews.",
      },
      {
        lineNumber: 5,
        text: "Cut mean time to recovery from 90 to 25 minutes across production incidents.",
      },
      {
        lineNumber: 6,
        text: "Built incident runbooks and automated the first-response alerting pipeline.",
      },
      {
        lineNumber: 7,
        text: "Maintained the Terraform modules for shared networking and secrets.",
      },
      {
        lineNumber: 8,
        text: "Authored the release runbook and capacity-planning standards for the platform.",
      },
      {
        lineNumber: 9,
        text: "Migrated the data warehouse to a star schema serving analytics dashboards.",
      },
      {
        lineNumber: 10,
        text: "Modelled event tables for the analytics team, cutting query time 40%.",
      },
      {
        lineNumber: 11,
        text: "Mentored four engineers on API design and reliability engineering.",
      },
      {
        lineNumber: 12,
        text: "Tech stack: Go, Terraform, Postgres, Redshift.",
      },
    ],
  },
  {
    id: "candidate-b",
    name: "Candidate B",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: placeholderLines.map((line) => ({ ...line })),
  },
  {
    id: "candidate-c",
    name: "Candidate C",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: placeholderLines.map((line) => ({ ...line })),
  },
];

export const candidateAEvidenceRecord: EvidenceRecord = {
  id: "evidence-candidate-a",
  candidateId: "candidate-a",
  roleId: platformEngineerRole.id,
  evidence: [
    {
      criterionId: "api-ownership",
      status: "supported",
      quotedText:
        "Owned the public REST API serving 40+ internal and external clients. Designed the v2 API contract, versioning policy, and deprecation process.",
      sourceStartLine: 2,
      sourceEndLine: 3,
      citationVerified: true,
      explanation:
        "Two consecutive lines describe direct ownership of the API and design of its contract, versioning, and deprecation lifecycle.",
    },
    {
      criterionId: "incident-response",
      status: "supported",
      quotedText:
        "On-call lead for the payments platform and drove post-incident reviews. Cut mean time to recovery from 90 to 25 minutes across production incidents. Built incident runbooks and automated the first-response alerting pipeline.",
      sourceStartLine: 4,
      sourceEndLine: 6,
      citationVerified: true,
      explanation:
        "Shows on-call ownership, measurable incident impact, and runbook/automation work.",
    },
    {
      criterionId: "data-modelling",
      status: "supported",
      quotedText:
        "Migrated the data warehouse to a star schema serving analytics dashboards. Modelled event tables for the analytics team, cutting query time 40%.",
      sourceStartLine: 9,
      sourceEndLine: 10,
      citationVerified: true,
      explanation:
        "Concrete schema design and modelling work with measurable performance impact.",
    },
    {
      criterionId: "production-kubernetes",
      status: "uncertain",
      quotedText: "",
      sourceStartLine: 0,
      sourceEndLine: 0,
      citationVerified: false,
      explanation: "No supporting evidence found in the source document.",
    },
  ],
  interviewQuestions: [
    {
      criterionId: "production-kubernetes",
      question:
        "Which production Kubernetes workloads have you operated, and what changed after your last incident with one?",
    },
  ],
  reviewerEdits: [],
  humanDecision: null,
  replayMetadata: {
    modelName: "resume-evidence-v1",
    promptVersion: "1.0.0",
    schemaVersion: "1.0.0",
    inputHash: "sha256:placeholder-input-hash",
    runTimestamp: "2026-09-16T00:00:00Z",
  },
};
