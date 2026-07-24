import { describe, expect, it } from "vitest";
import {
  addHistory,
  emptyUserLibrary,
  exportLibrary,
  importLibrary,
  mergeLegacyData,
  parseUserLibrary,
  toggleInList
} from "@/lib/user-library";

const work = {
  id: "work:Frieren",
  kind: "work" as const,
  title: "葬送的芙莉莲",
  href: "/work/Frieren"
};

describe("user library", () => {
  it("toggles saved items without duplicates", () => {
    const first = toggleInList([], work);
    expect(first.active).toBe(true);
    expect(toggleInList(first.list, work)).toMatchObject({ active: false, list: [] });
  });

  it("deduplicates history and keeps the newest entry first", () => {
    const once = addHistory(emptyUserLibrary(), work);
    const twice = addHistory(once, { ...work, title: "Frieren" });
    expect(twice.history).toHaveLength(1);
    expect(twice.history[0].title).toBe("Frieren");
  });

  it("migrates legacy recent works and roam preferences", () => {
    const migrated = mergeLegacyData(
      emptyUserLibrary(),
      JSON.stringify([{ title: "Cowboy Bebop", at: "2026-01-01T00:00:00.000Z" }]),
      JSON.stringify({ likedTags: ["幕后"], likedSeeds: ["作画"] })
    );
    expect(migrated.history[0].title).toBe("Cowboy Bebop");
    expect(migrated.preferences.likedTags).toEqual(["幕后"]);
  });

  it("round-trips exports and ignores malformed collections", () => {
    const library = addHistory(emptyUserLibrary(), work);
    expect(importLibrary(exportLibrary(library)).history[0].id).toBe(work.id);
    expect(parseUserLibrary('{"favorites":[null,{"id":1}]}').favorites).toEqual([]);
  });
});
