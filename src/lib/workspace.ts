const STORAGE_KEY = "decisiontwin.workspaceId";

/**
 * The id of this browser's workspace. Generated once and kept in localStorage,
 * so everything this browser creates belongs to the same isolated slice of the
 * store: roles, candidates and the evidence records generated for them are
 * scoped by it, and never leak into another browser's view.
 */
export function getWorkspaceId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

/** A short, URL-safe form of the workspace id, used inside stored row ids. */
export function workspaceShort(workspaceId = getWorkspaceId()): string {
  return workspaceId.slice(0, 8);
}
