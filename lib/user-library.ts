export const USER_LIBRARY_STORAGE_KEY = "animelore.library.v1";
export const LEGACY_RECENT_WORKS_KEY = "animelore.recent-works.v1";
export const LEGACY_ROAM_PREFS_KEY = "animelore.roam.prefs.v1";
export const USER_LIBRARY_EVENT = "animelore:library-change";

export type LibraryItemKind = "work" | "cold" | "card";
export type MotionPreference = "system" | "full" | "reduced";

export interface LibraryItem {
  id: string;
  kind: LibraryItemKind;
  title: string;
  href: string;
  subtitle?: string;
  image?: string;
  tags?: string[];
  savedAt: string;
}

export interface HistoryItem extends LibraryItem {
  visitedAt: string;
}

export interface LibraryPreferences {
  likedTags: string[];
  skippedTags: string[];
  likedSeeds: string[];
  motion: MotionPreference;
}

export interface UserLibrary {
  version: 1;
  favorites: LibraryItem[];
  readLater: LibraryItem[];
  history: HistoryItem[];
  preferences: LibraryPreferences;
  updatedAt: string;
}

export type LibraryItemInput = Omit<LibraryItem, "savedAt"> & {
  savedAt?: string;
};

export const emptyUserLibrary = (): UserLibrary => ({
  version: 1,
  favorites: [],
  readLater: [],
  history: [],
  preferences: {
    likedTags: [],
    skippedTags: [],
    likedSeeds: [],
    motion: "system"
  },
  updatedAt: new Date(0).toISOString()
});

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 50)
    : [];
}

function validKind(value: unknown): LibraryItemKind {
  return value === "cold" || value === "card" ? value : "work";
}

function parseItem(value: unknown): LibraryItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<LibraryItem>;
  if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.href !== "string") {
    return null;
  }
  return {
    id: item.id,
    kind: validKind(item.kind),
    title: item.title,
    href: item.href,
    subtitle: typeof item.subtitle === "string" ? item.subtitle : undefined,
    image: typeof item.image === "string" ? item.image : undefined,
    tags: strings(item.tags),
    savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString()
  };
}

export function parseUserLibrary(raw: string | null): UserLibrary {
  if (!raw) return emptyUserLibrary();
  try {
    const value = JSON.parse(raw) as Partial<UserLibrary>;
    const favorites = Array.isArray(value.favorites)
      ? value.favorites.map(parseItem).filter((item): item is LibraryItem => Boolean(item)).slice(0, 500)
      : [];
    const readLater = Array.isArray(value.readLater)
      ? value.readLater.map(parseItem).filter((item): item is LibraryItem => Boolean(item)).slice(0, 500)
      : [];
    const history = Array.isArray(value.history)
      ? value.history
          .map((entry) => {
            const item = parseItem(entry);
            if (!item) return null;
            const visitedAt =
              typeof (entry as Partial<HistoryItem>).visitedAt === "string"
                ? (entry as HistoryItem).visitedAt
                : item.savedAt;
            return { ...item, visitedAt };
          })
          .filter((item): item is HistoryItem => Boolean(item))
          .slice(0, 200)
      : [];
    const preferences = value.preferences ?? emptyUserLibrary().preferences;
    const motion =
      preferences.motion === "full" || preferences.motion === "reduced"
        ? preferences.motion
        : "system";
    return {
      version: 1,
      favorites,
      readLater,
      history,
      preferences: {
        likedTags: strings(preferences.likedTags),
        skippedTags: strings(preferences.skippedTags),
        likedSeeds: strings(preferences.likedSeeds),
        motion
      },
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
    };
  } catch {
    return emptyUserLibrary();
  }
}

export function toggleInList(
  list: LibraryItem[],
  input: LibraryItemInput
): { list: LibraryItem[]; active: boolean } {
  const exists = list.some((item) => item.id === input.id);
  if (exists) return { list: list.filter((item) => item.id !== input.id), active: false };
  const item: LibraryItem = { ...input, savedAt: input.savedAt ?? new Date().toISOString() };
  return { list: [item, ...list].slice(0, 500), active: true };
}

export function addHistory(library: UserLibrary, input: LibraryItemInput): UserLibrary {
  const now = new Date().toISOString();
  const item: HistoryItem = {
    ...input,
    savedAt: input.savedAt ?? now,
    visitedAt: now
  };
  return {
    ...library,
    history: [item, ...library.history.filter((entry) => entry.id !== input.id)].slice(0, 200),
    updatedAt: now
  };
}

export function mergeLegacyData(
  library: UserLibrary,
  recentRaw: string | null,
  roamRaw: string | null
): UserLibrary {
  let next = library;
  try {
    const recent = recentRaw ? (JSON.parse(recentRaw) as Array<{ title?: string; at?: string }>) : [];
    for (const entry of [...recent].reverse()) {
      if (!entry.title) continue;
      next = addHistory(next, {
        id: `work:${entry.title}`,
        kind: "work",
        title: entry.title,
        href: `/work/${encodeURIComponent(entry.title)}`,
        savedAt: entry.at
      });
    }
  } catch {
    // Invalid legacy data should never block the new library.
  }
  try {
    const roam = roamRaw ? (JSON.parse(roamRaw) as Record<string, unknown>) : {};
    next = {
      ...next,
      preferences: {
        ...next.preferences,
        likedTags: strings(roam.likedTags),
        skippedTags: strings(roam.skippedTags),
        likedSeeds: strings(roam.likedSeeds)
      }
    };
  } catch {
    // Ignore invalid session preferences.
  }
  return next;
}

export function exportLibrary(library: UserLibrary): string {
  return JSON.stringify(
    {
      app: "AnimeLore",
      exportedAt: new Date().toISOString(),
      library
    },
    null,
    2
  );
}

export function importLibrary(raw: string): UserLibrary {
  const parsed = JSON.parse(raw) as { library?: unknown } | UserLibrary;
  const payload = "library" in parsed ? parsed.library : parsed;
  return parseUserLibrary(JSON.stringify(payload));
}
