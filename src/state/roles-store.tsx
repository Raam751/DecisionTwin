import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  candidates as seedCandidates,
  platformEngineerRole,
} from "@/data/seed";
import {
  fetchWorkspaceCandidates,
  fetchWorkspaceRoles,
  saveWorkspace,
} from "@/services/workspace-api";
import type { Candidate, Role } from "@/types";

const cloneRole = (role: Role): Role => ({
  ...role,
  criteria: role.criteria.map((criterion) => ({ ...criterion })),
});

const cloneCandidate = (candidate: Candidate): Candidate => ({
  ...candidate,
  documentLines: candidate.documentLines.map((line) => ({ ...line })),
});

const ACTIVE_ROLE_KEY = "decisiontwin.activeRoleId";

/** The role selected last time this browser used the app, when still known. */
const rememberedActiveRoleId = (): string => {
  try {
    return localStorage.getItem(ACTIVE_ROLE_KEY) || platformEngineerRole.id;
  } catch {
    return platformEngineerRole.id;
  }
};

const rememberActiveRole = (roleId: string) => {
  try {
    localStorage.setItem(ACTIVE_ROLE_KEY, roleId);
  } catch {
    // Storage unavailable; the choice just won't survive a reload.
  }
};

interface RolesContextValue {
  /** Every role for this workspace, the seeded one first. */
  roles: Role[];
  activeRole: Role;
  /** Candidates that belong to the active role. */
  activeCandidates: Candidate[];
  setActiveRoleId: (roleId: string) => void;
  /**
   * Persists the role to this workspace's store, then adds it locally and
   * makes it active. Rejects on failure so the caller can keep the input.
   */
  addRole: (role: Role) => Promise<void>;
  /** Persists the candidate, then adds it locally. Rejects on failure. */
  addCandidate: (candidate: Candidate) => Promise<void>;
}

const RolesContext = createContext<RolesContextValue | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  // Seeded state is the default on every load, with this workspace's own
  // entries merged in underneath it as soon as they arrive.
  const [roles, setRoles] = useState<Role[]>(() => [cloneRole(platformEngineerRole)]);
  const [activeRoleId, setActiveRoleIdState] = useState<string>(
    rememberedActiveRoleId,
  );
  const [candidates, setCandidates] = useState<Candidate[]>(() =>
    seedCandidates.map(cloneCandidate),
  );

  // Load this workspace's persisted roles and candidates once. A failure is
  // silent on purpose: the seeded defaults still show, and nothing the user
  // creates later is affected.
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchWorkspaceRoles(), fetchWorkspaceCandidates()])
      .then(([persistedRoles, persistedCandidates]) => {
        if (cancelled) return;

        const seedRoleIds = new Set([platformEngineerRole.id]);
        const seedCandidateIds = new Set(seedCandidates.map((c) => c.id));

        const extraRoles = persistedRoles.filter(
          (role) => !seedRoleIds.has(role.id),
        );
        const extraCandidates = persistedCandidates.filter(
          (candidate) => !seedCandidateIds.has(candidate.id),
        );

        // The provider can mount more than once without its state being
        // cleared (a hot reload, for example). A role or candidate that is
        // already in state must never be appended again, or React sees
        // duplicate keys and drops the role switcher from the page.
        setRoles((current) => {
          const known = new Set(current.map((role) => role.id));
          const fresh = extraRoles.filter((role) => !known.has(role.id));
          return fresh.length > 0 ? [...current, ...fresh] : current;
        });
        setCandidates((current) => {
          const known = new Set(current.map((candidate) => candidate.id));
          const fresh = extraCandidates.filter(
            (candidate) => !known.has(candidate.id),
          );
          return fresh.length > 0 ? [...current, ...fresh] : current;
        });
      })
      .catch(() => {
        // Keep the seeded defaults only.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeRole = useMemo(
    () => roles.find((role) => role.id === activeRoleId) ?? roles[0],
    [roles, activeRoleId],
  );

  const activeCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.roleId === activeRole.id),
    [candidates, activeRole.id],
  );

  const setActiveRoleId = useCallback(
    (roleId: string) => {
      if (!roles.some((role) => role.id === roleId)) return;
      setActiveRoleIdState(roleId);
      rememberActiveRole(roleId);
    },
    [roles],
  );

  const addRole = useCallback(async (role: Role) => {
    await saveWorkspace("role", {
      id: role.id,
      title: role.title,
      jobDescription: role.jobDescription,
      criteria: role.criteria,
    });
    setRoles((current) =>
      current.some((existing) => existing.id === role.id)
        ? current
        : [...current, role],
    );
    setActiveRoleIdState(role.id);
    rememberActiveRole(role.id);
  }, []);

  const addCandidate = useCallback(async (candidate: Candidate) => {
    await saveWorkspace("candidate", {
      id: candidate.id,
      name: candidate.name,
      roleId: candidate.roleId,
      documentTitle: candidate.documentTitle,
      documentLines: candidate.documentLines,
    });
    setCandidates((current) =>
      current.some((existing) => existing.id === candidate.id)
        ? current
        : [...current, candidate],
    );
  }, []);

  const value = useMemo<RolesContextValue>(
    () => ({
      roles,
      activeRole,
      activeCandidates,
      setActiveRoleId,
      addRole,
      addCandidate,
    }),
    [
      roles,
      activeRole,
      activeCandidates,
      setActiveRoleId,
      addRole,
      addCandidate,
    ],
  );

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoles() {
  const context = useContext(RolesContext);
  if (!context) {
    throw new Error("useRoles must be used inside a RolesProvider");
  }
  return context;
}
