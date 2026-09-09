/**
 * The admin panel is not deployed on its own. It is built here and shipped
 * inside the marketing website's bundle (website/movezy-website
 * `npm run build:site`), which serves the site at "/" and this app at
 * "/admin/" on the same domain.
 *
 * Vite emits the app at dist/index.html with assets resolving to
 * /admin/assets (base "/admin/"). This moves the output to dist/admin/* so
 * the website build can copy that folder verbatim. Nothing is written for
 * the root: "/" belongs to the site.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const target = path.join(dist, "admin");

const entries = await fs.readdir(dist);
if (!entries.includes("index.html")) {
  console.error("postbuild: dist/index.html missing — run vite build first");
  process.exit(1);
}
await fs.rm(target, { recursive: true, force: true });
await fs.mkdir(target, { recursive: true });
for (const name of entries) {
  if (name === "admin") continue;
  await fs.rename(path.join(dist, name), path.join(target, name));
}
console.log("postbuild: admin panel laid out as dist/admin (served only at /admin, inside the website bundle)");
