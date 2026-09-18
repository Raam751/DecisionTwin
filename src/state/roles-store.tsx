import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  candidates as seedCandidates,
  platformEngineerRole,
} from "@/data/seed";
import type { Candidate, Role } from "@/types";

const cloneRole = (role: Role): Role => ({
  ...role,
  criteria: role.criteria.map((criterion) => ({ ...criterion })),
});

const cloneCandidate = (candidate: Candidate): Candidate => ({
  ...candidate,
  documentLines: candidate.documentLines.map((line) => ({ ...line })),
});

/**
 * The review screen resolves its role and candidate straight from the seed
 * module's live objects, and it must keep working for roles and candidates
 * created in this session. So the active role and that role's candidates are
 * mirrored onto those same objects here.
 *
 * The seed file itself is never written to: nothing is added to it, and the
 * seeded role and its three candidates remain the starting state. Only the
 * in-memory objects the app already renders from are projected onto the active
 * role, and the seeded values come back when the seeded role is active again.
 */
function publishActiveRole(role: Role, roleCandidates: Candidate[]) {
  platformEngineerRole.id = role.id;
  platformEngineerRole.title = role.title;
  platformEngineerRole.jobDescription = role.jobDescription;
  platformEngineerRole.criteria = role.criteria;

  seedCandidates.length = 0;
  seedCandidates.push(...roleCandidates);
}

interface RolesContextValue {
  /** Every role in this session, the seeded one first. */
  roles: Role[];
  activeRole: Role;
  /** Candidates that belong to the active role. */
  activeCandidates: Candidate[];
  setActiveRoleId: (roleId: string) => void;
  addRole: (role: Role) => void;
  addCandidate: (candidate: Candidate) => void;
}

const RolesContext = createContext<RolesContextValue | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  // Seeded state is the default on every load.
  const [roles, setRoles] = useState<Role[]>(() => [cloneRole(platformEngineerRole)]);
  const [activeRoleId, setActiveRoleIdState] = useState<string>(
    () => platformEngineerRole.id,
  );
  const [candidates, setCandidates] = useState<Candidate[]>(() =>
    seedCandidates.map(cloneCandidate),
  );

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
      const next = roles.find((role) => role.id === roleId);
      if (!next) return;
      setActiveRoleIdState(roleId);
      publishActiveRole(
        next,
        candidates.filter((candidate) => candidate.roleId === roleId),
      );
    },
    [roles, candidates],
  );

  const addRole = useCallback((role: Role) => {
    setRoles((current) => [...current, role]);
    setActiveRoleIdState(role.id);
    // A brand new role starts with no candidates.
    publishActiveRole(role, []);
  }, []);

  const addCandidate = useCallback(
    (candidate: Candidate) => {
      const next = [...candidates, candidate];
      setCandidates(next);
      publishActiveRole(
        activeRole,
        next.filter((entry) => entry.roleId === activeRole.id),
      );
    },
    [candidates, activeRole],
  );

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
