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
      if (!roles.some((role) => role.id === roleId)) return;
      setActiveRoleIdState(roleId);
    },
    [roles],
  );

  const addRole = useCallback((role: Role) => {
    setRoles((current) => [...current, role]);
    setActiveRoleIdState(role.id);
  }, []);

  const addCandidate = useCallback((candidate: Candidate) => {
    setCandidates((current) => [...current, candidate]);
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
