"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyUserLibrary,
  LibraryItemInput,
  LibraryPreferences,
  toggleInList,
  USER_LIBRARY_EVENT,
  USER_LIBRARY_STORAGE_KEY,
  UserLibrary
} from "@/lib/user-library";
import { readLibrary, writeLibrary } from "@/lib/user-library-client";

export function useUserLibrary() {
  const [library, setLibrary] = useState<UserLibrary>(emptyUserLibrary);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      setLibrary(readLibrary());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === USER_LIBRARY_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(USER_LIBRARY_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(USER_LIBRARY_EVENT, refresh);
    };
  }, [refresh]);

  const update = useCallback((next: UserLibrary) => {
    writeLibrary(next);
    setLibrary(next);
  }, []);

  const toggleFavorite = useCallback(
    (item: LibraryItemInput) => {
      const result = toggleInList(library.favorites, item);
      update({ ...library, favorites: result.list });
      return result.active;
    },
    [library, update]
  );

  const toggleReadLater = useCallback(
    (item: LibraryItemInput) => {
      const result = toggleInList(library.readLater, item);
      update({ ...library, readLater: result.list });
      return result.active;
    },
    [library, update]
  );

  const updatePreferences = useCallback(
    (preferences: Partial<LibraryPreferences>) => {
      update({
        ...library,
        preferences: { ...library.preferences, ...preferences }
      });
    },
    [library, update]
  );

  return {
    library,
    ready,
    update,
    refresh,
    toggleFavorite,
    toggleReadLater,
    updatePreferences
  };
}
