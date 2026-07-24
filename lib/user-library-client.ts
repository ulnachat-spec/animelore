"use client";

import {
  addHistory,
  emptyUserLibrary,
  LEGACY_RECENT_WORKS_KEY,
  LEGACY_ROAM_PREFS_KEY,
  LibraryItemInput,
  mergeLegacyData,
  parseUserLibrary,
  USER_LIBRARY_EVENT,
  USER_LIBRARY_STORAGE_KEY,
  UserLibrary
} from "@/lib/user-library";

export function readLibrary(): UserLibrary {
  if (typeof window === "undefined") return emptyUserLibrary();
  const current = parseUserLibrary(localStorage.getItem(USER_LIBRARY_STORAGE_KEY));
  if (localStorage.getItem(USER_LIBRARY_STORAGE_KEY)) return current;
  const migrated = mergeLegacyData(
    current,
    localStorage.getItem(LEGACY_RECENT_WORKS_KEY),
    sessionStorage.getItem(LEGACY_ROAM_PREFS_KEY)
  );
  writeLibrary(migrated);
  return migrated;
}

export function writeLibrary(library: UserLibrary): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    USER_LIBRARY_STORAGE_KEY,
    JSON.stringify({ ...library, updatedAt: new Date().toISOString() })
  );
  window.dispatchEvent(new CustomEvent(USER_LIBRARY_EVENT));
}

export function recordLibraryHistory(input: LibraryItemInput): void {
  try {
    writeLibrary(addHistory(readLibrary(), input));
  } catch {
    // Local history is optional in private browsing modes.
  }
}
