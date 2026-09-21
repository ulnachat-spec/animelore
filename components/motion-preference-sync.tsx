"use client";

import { useEffect } from "react";
import { useUserLibrary } from "@/lib/use-user-library";

export function MotionPreferenceSync() {
  const { library, ready } = useUserLibrary();

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.motion = library.preferences.motion;
  }, [library.preferences.motion, ready]);

  return null;
}
