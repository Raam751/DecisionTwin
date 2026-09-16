import type { Candidate, Role } from "@/types";

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
    name: "Candidate A",
    roleId: platformEngineerRole.id,
    documentTitle: "Resume",
    documentLines: placeholderLines.map((line) => ({ ...line })),
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
