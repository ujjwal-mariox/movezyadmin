/**
 * Second half of `npm run build`: build the marketing site (./site) and put
 * it at the ROOT of dist, next to the admin panel that postbuild.mjs has
 * already placed under dist/admin.
 *
 *   dist/index.html, dist/about/…   the public website  →  "/"
 *   dist/admin/…                    the admin panel     →  "/admin/"
 *
 * One publish directory (`dist`), one deploy, one domain. Runs on Render's
 * build (`npm run build`) and on the AWS script in deploy/.
 */
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
const dist = path.join(root, "dist");

if (!(await fs.stat(path.join(dist, "admin", "index.html")).catch(() => null))) {
  console.error("build-site: dist/admin/index.html missing — postbuild.mjs must run first");
  process.exit(1);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args) => {
  const r = spawnSync(npm, args, {
    cwd: site,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || "https://movezybackend.onrender.com/v1/api" },
  });
  if (r.status !== 0) {
    console.error(`build-site: npm ${args.join(" ")} failed`);
    process.exit(r.status || 1);
  }
};

if (!(await fs.stat(path.join(site, "node_modules")).catch(() => null))) run(["ci"]);
run(["run", "build"]);

// Everything the site produced goes to the root of dist; the admin folder is
// untouched. A stale "admin" folder inside the site's own dist is ignored.
const siteDist = path.join(site, "dist");
for (const name of await fs.readdir(siteDist)) {
  if (name === "admin") continue;
  await fs.cp(path.join(siteDist, name), path.join(dist, name), { recursive: true, force: true });
}
console.log("build-site: public site placed at dist/ (admin panel stays at dist/admin)");
