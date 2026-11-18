// Per-user client data that must not survive a user switch (logout / login under another user)

const cacheCleaners = new Set<() => void>();

/** Register an in-memory cache to be dropped by clearSession */
export function registerSessionCache(clear: () => void) {
  cacheCleaners.add(clear);
}

// localStorage keys holding user data. Defined here (not in the lazy-loaded owning modules)
// so clearSession can drop them even if those modules have not run in this page load.
/** Last run inputs per agent: `${RUN_INPUTS_STORAGE_KEY}-${agentId}` */
export const RUN_INPUTS_STORAGE_KEY = 'agent-editor-run-inputs';
/** Assistant chat session per agent */
export const ASSISTANT_SESSION_STORAGE_PREFIX = 'agent-editor-assistant-session:';

/** Run inputs panel expanded - a UI preference, kept on clear despite sharing the prefix */
export const RUN_INPUTS_OPEN_STORAGE_KEY = `${RUN_INPUTS_STORAGE_KEY}-open`;

const USER_STORAGE_PREFIXES = [`${RUN_INPUTS_STORAGE_KEY}-`, ASSISTANT_SESSION_STORAGE_PREFIX];
const KEPT_STORAGE_KEYS = new Set([RUN_INPUTS_OPEN_STORAGE_KEY]);

/** Drop all cached user data */
export function clearSession() {
  cacheCleaners.forEach((clear) => clear());
  try {
    Object.keys(localStorage)
      .filter((key) => !KEPT_STORAGE_KEYS.has(key) && USER_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable
  }
}
