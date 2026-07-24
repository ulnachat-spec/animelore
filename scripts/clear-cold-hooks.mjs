/**
 * 清空 data/cold-hooks.json。若 dev server 在跑，请再 POST /api/hook/clear 以重置进程内 store。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storePath = path.join(root, "data", "cold-hooks.json");

const dir = path.dirname(storePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(storePath, "[]\n", "utf8");
console.log("[cold:clear] Wrote empty", storePath);

const port = process.env.PORT || "3000";
const url = `http://127.0.0.1:${port}/api/hook/clear`;
try {
  const res = await fetch(url, { method: "POST" });
  if (res.ok) {
    const body = await res.json();
    console.log("[cold:clear] In-memory store cleared via API:", body);
  } else {
    console.log(
      "[cold:clear] Dev server not reachable at",
      url,
      "- restart `npm run dev` after clear, or run POST manually."
    );
  }
} catch {
  console.log(
    "[cold:clear] Dev server not running. Disk cleared; restart dev server to reset in-memory store."
  );
}
