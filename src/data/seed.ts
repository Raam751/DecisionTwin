import type { Candidate, EvidenceRecord, Role } from "@/types";

export const platformEngineerRole: Role = {
  id: "role-platform-engineer",
  title: "Platform Engineer",
  jobDescription: [
    "We are hiring a Platform Engineer to look after the systems our product teams build on.",
    "You will own at least one service boundary that other teams depend on, which means you decide how its interface changes, how it is versioned, and how consumers are told about it.",
    "You will share the on-call rotation for that boundary, take the lead during a serious outage, and write the review afterwards so the same failure does not repeat.",
    "You will operate our container platform in production, including cluster upgrades, capacity planning, and the scaling behaviour that carries seasonal traffic peaks.",
    "You will design the schemas behind new services, so we expect you to reason about normalisation, event tables, and how a model will be queried later.",
    "Our stack is Go and Python on PostgreSQL, deployed through Kubernetes and Terraform.",
    "We care more about evidence of ownership than years of experience.",
  ].join(" "),
  criteria: [
    {
      id: "api-ownership",
      label: "API ownership",
      description:
        "Owned a service interface end to end, including versioning, deprecation and how consumers were informed.",
    },
    {
      id: "incident-response",
      label: "Incident response",
      description:
        "Took the lead during production incidents and closed the loop with a written review.",
    },
    {
      id: "production-kubernetes",
      label: "Production Kubernetes",
      description:
        "Operated Kubernetes in production, including upgrades, capacity planning and scaling behaviour.",
    },
    {
      id: "data-modelling",
      label: "Data modelling",
      description:
        "Designed schemas for new services and reasoned about how the model would be queried.",
    },
  ],
};

export const candidates: Candidate[] = [
  {
    id: "candidate-a",
    name: "Priya Menon",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: [
      { lineNumber: 1, text: "Priya Menon, Platform Engineer, Bengaluru" },
      {
        lineNumber: 2,
        text: "Seven years building internal developer platforms for payments and logistics teams.",
      },
      {
        lineNumber: 3,
        text: "Senior Platform Engineer, Northwind Payments, 2021 to present",
      },
      {
        lineNumber: 4,
        text: "Owned the partner-facing REST API end to end, including versioning, deprecation policy and the public changelog.",
      },
      {
        lineNumber: 5,
        text: "Introduced a contract review gate before every release, which cut breaking changes for integrators.",
      },
      {
        lineNumber: 6,
        text: "Served as on-call lead for the payments gateway and ran incident response for two Sev-1 outages.",
      },
      {
        lineNumber: 7,
        text: "Wrote both post-incident reviews and tracked every follow-up action to closure.",
      },
      {
        lineNumber: 8,
        text: "Platform Engineer, Meridian Logistics, 2018 to 2021",
      },
      {
        lineNumber: 9,
        text: "Designed the normalised Postgres schema for the shipment tracking service, covering carriers, routes and events.",
      },
      {
        lineNumber: 10,
        text: "Modelled the event tables behind the analytics reports, reducing median query time by 40 percent.",
      },
      {
        lineNumber: 11,
        text: "Ran the zero downtime migration from the legacy MySQL store for all read traffic.",
      },
      {
        lineNumber: 12,
        text: "Mentored four engineers on API design and reliability practice.",
      },
      {
        lineNumber: 13,
        text: "Skills: Go, Python, PostgreSQL, REST API design, Terraform, CI pipelines, observability tooling.",
      },
      {
        lineNumber: 14,
        text: "Education: B.E. Computer Science, BITS Pilani, 2018.",
      },
    ],
  },
  {
    id: "candidate-b",
    name: "Arjun Rao",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: [
      { lineNumber: 1, text: "Arjun Rao, Site Reliability Engineer, Pune" },
      {
        lineNumber: 2,
        text: "Six years operating container platforms for high traffic consumer products.",
      },
      {
        lineNumber: 3,
        text: "Senior Site Reliability Engineer, Kestrel Commerce, 2020 to present",
      },
      {
        lineNumber: 4,
        text: "Operated a 40 node production Kubernetes cluster running 300 services across three regions.",
      },
      {
        lineNumber: 5,
        text: "Authored the cluster upgrade runbook and led six zero downtime upgrades.",
      },
      {
        lineNumber: 6,
        text: "Built the autoscaling and pod disruption policies that carried three festive traffic peaks.",
      },
      {
        lineNumber: 7,
        text: "On-call lead for the checkout platform and incident commander for four Sev-1 outages.",
      },
      {
        lineNumber: 8,
        text: "Reduced mean time to recovery from 95 minutes to 22 minutes over two quarters.",
      },
      {
        lineNumber: 9,
        text: "Site Reliability Engineer, Halcyon Media, 2018 to 2020",
      },
      {
        lineNumber: 10,
        text: "Maintained the internal deployment API used by twelve product teams.",
      },
      {
        lineNumber: 11,
        text: "Ran the migration from virtual machines to containers for all customer facing services.",
      },
      {
        lineNumber: 12,
        text: "Skills: Kubernetes, Helm, Terraform, Go, Prometheus, Grafana, Argo CD.",
      },
      {
        lineNumber: 13,
        text: "Education: B.Tech Information Technology, COEP Pune, 2018.",
      },
    ],
  },
  {
    id: "candidate-c",
    name: "Nila Shah",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: [
      { lineNumber: 1, text: "Nila Shah, Platform Engineer, Hyderabad" },
      {
        lineNumber: 2,
        text: "Five years across backend services and internal tooling for logistics software.",
      },
      {
        lineNumber: 3,
        text: "Platform Engineer, Vantage Freight, 2021 to present",
      },
      {
        lineNumber: 4,
        text: "Led the platform team's Kubernetes migration and operated the production cluster for all shipping services.",
      },
      {
        lineNumber: 5,
        text: "Owned the carrier integration API, including its versioning policy and partner documentation.",
      },
      {
        lineNumber: 6,
        text: "Designed the normalised Postgres schema for the rate quoting service, covering carriers, lanes and surcharges.",
      },
      {
        lineNumber: 7,
        text: "Joined the on-call rotation and contributed to two post-incident reviews.",
      },
      { lineNumber: 8, text: "Engineer, Loomcraft Systems, 2019 to 2021" },
      {
        lineNumber: 9,
        text: "Built internal tooling for release tracking and environment provisioning.",
      },
      {
        lineNumber: 10,
        text: "Kubernetes exposure has been limited to staging environments so far, with the production rollout planned for next quarter.",
      },
      {
        lineNumber: 11,
        text: "Skills: Python, Django, PostgreSQL, REST API design, Docker, GitHub Actions.",
      },
      {
        lineNumber: 12,
        text: "Education: B.Tech Computer Science, IIIT Hyderabad, 2019.",
      },
    ],
  },
];

const replay = (id: string) => ({
  modelName: "seeded-example",
  promptVersion: "v1",
  schemaVersion: "v1",
  inputHash: `seed-${id}`,
  runTimestamp: "2026-09-17T00:00:00Z",
});

/** Priya Menon: strong on three criteria, genuinely silent on Kubernetes. */
export const priyaEvidenceRecord: EvidenceRecord = {
  id: "evidence-candidate-a",
  candidateId: "candidate-a",
  roleId: platformEngineerRole.id,
  evidence: [
    {
      criterionId: "api-ownership",
      status: "supported",
      quotedText:
        "Owned the partner-facing REST API end to end, including versioning, deprecation policy and the public changelog. Introduced a contract review gate before every release, which cut breaking changes for integrators.",
      sourceStartLine: 4,
      sourceEndLine: 5,
      explanation:
        "States end to end ownership of an external API, including versioning and deprecation, plus a release gate she introduced.",
      citationVerified: true,
    },
    {
      criterionId: "incident-response",
      status: "supported",
      quotedText:
        "Served as on-call lead for the payments gateway and ran incident response for two Sev-1 outages. Wrote both post-incident reviews and tracked every follow-up action to closure.",
      sourceStartLine: 6,
      sourceEndLine: 7,
      explanation:
        "Led on-call for a named service, ran two severe incidents, and closed the loop with written reviews.",
      citationVerified: true,
    },
    {
      criterionId: "data-modelling",
      status: "supported",
      quotedText:
        "Designed the normalised Postgres schema for the shipment tracking service, covering carriers, routes and events. Modelled the event tables behind the analytics reports, reducing median query time by 40 percent.",
      sourceStartLine: 9,
      sourceEndLine: 10,
      explanation:
        "Designed a normalised schema for a named service and modelled event tables with a stated query impact.",
      citationVerified: true,
    },
    {
      criterionId: "production-kubernetes",
      status: "uncertain",
      quotedText: "",
      sourceStartLine: 0,
      sourceEndLine: 0,
      explanation: "No supporting evidence found in the source document.",
      citationVerified: false,
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
  replayMetadata: replay("candidate-a"),
};

/** Arjun Rao: the mirror image. Strong on Kubernetes, silent on data modelling. */
export const arjunEvidenceRecord: EvidenceRecord = {
  id: "evidence-candidate-b",
  candidateId: "candidate-b",
  roleId: platformEngineerRole.id,
  evidence: [
    {
      criterionId: "production-kubernetes",
      status: "supported",
      quotedText:
        "Operated a 40 node production Kubernetes cluster running 300 services across three regions. Authored the cluster upgrade runbook and led six zero downtime upgrades.",
      sourceStartLine: 4,
      sourceEndLine: 5,
      explanation:
        "Names cluster size, service count, regions, and describes upgrades he personally led.",
      citationVerified: true,
    },
    {
      criterionId: "incident-response",
      status: "supported",
      quotedText:
        "On-call lead for the checkout platform and incident commander for four Sev-1 outages. Reduced mean time to recovery from 95 minutes to 22 minutes over two quarters.",
      sourceStartLine: 7,
      sourceEndLine: 8,
      explanation:
        "Acted as incident commander on four severe outages with a stated recovery time improvement.",
      citationVerified: true,
    },
    {
      criterionId: "api-ownership",
      status: "supported",
      quotedText:
        "Maintained the internal deployment API used by twelve product teams.",
      sourceStartLine: 10,
      sourceEndLine: 10,
      explanation:
        "Maintained an internal API with real consumers. Weaker than the role asks for, since versioning and deprecation are not mentioned.",
      citationVerified: true,
    },
    {
      criterionId: "data-modelling",
      status: "uncertain",
      quotedText: "",
      sourceStartLine: 0,
      sourceEndLine: 0,
      explanation: "No supporting evidence found in the source document.",
      citationVerified: false,
    },
  ],
  interviewQuestions: [
    {
      criterionId: "data-modelling",
      question:
        "Walk me through a schema you designed from scratch. What did you normalise, and what did you deliberately denormalise?",
    },
  ],
  reviewerEdits: [],
  humanDecision: null,
  replayMetadata: replay("candidate-b"),
};

/**
 * Nila Shah: the resume contradicts itself on production Kubernetes.
 * Line 4 claims she operated the production cluster. Line 10 says her
 * Kubernetes exposure has been limited to staging. Both are in the source.
 */
export const nilaEvidenceRecord: EvidenceRecord = {
  id: "evidence-candidate-c",
  candidateId: "candidate-c",
  roleId: platformEngineerRole.id,
  evidence: [
    {
      criterionId: "api-ownership",
      status: "supported",
      quotedText:
        "Owned the carrier integration API, including its versioning policy and partner documentation.",
      sourceStartLine: 5,
      sourceEndLine: 5,
      explanation:
        "Claims ownership of a named integration API together with its versioning policy.",
      citationVerified: true,
    },
    {
      criterionId: "data-modelling",
      status: "supported",
      quotedText:
        "Designed the normalised Postgres schema for the rate quoting service, covering carriers, lanes and surcharges.",
      sourceStartLine: 6,
      sourceEndLine: 6,
      explanation:
        "Designed a normalised schema for a named service with the entities listed.",
      citationVerified: true,
    },
    {
      criterionId: "incident-response",
      status: "supported",
      quotedText:
        "Joined the on-call rotation and contributed to two post-incident reviews.",
      sourceStartLine: 7,
      sourceEndLine: 7,
      explanation:
        "Participated in on-call and contributed to reviews, though the resume does not claim she led an incident.",
      citationVerified: true,
    },
    {
      criterionId: "production-kubernetes",
      status: "conflicting",
      quotedText:
        "Kubernetes exposure has been limited to staging environments so far, with the production rollout planned for next quarter.",
      sourceStartLine: 10,
      sourceEndLine: 10,
      explanation:
        "This contradicts line 4, which claims she operated the production cluster for all shipping services. The same document makes both claims, so production experience cannot be established from it.",
      citationVerified: true,
    },
  ],
  interviewQuestions: [
    {
      criterionId: "production-kubernetes",
      question:
        "Your resume says you operated the production cluster and also that Kubernetes has been limited to staging. Which is accurate, and what was your role in each environment?",
    },
  ],
  reviewerEdits: [],
  humanDecision: null,
  replayMetadata: replay("candidate-c"),
};

export const evidenceRecords: EvidenceRecord[] = [
  priyaEvidenceRecord,
  arjunEvidenceRecord,
  nilaEvidenceRecord,
];
