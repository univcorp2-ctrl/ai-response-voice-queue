import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "web", "tests", "scripts"];
const files = [];
function walk(path) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".js") || full.endsWith(".mjs")) files.push(full);
  }
}
for (const root of roots) walk(root);
for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
console.log(`Syntax checked ${files.length} JavaScript files.`);
