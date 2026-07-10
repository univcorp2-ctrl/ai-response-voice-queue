import { cp, mkdir, rm } from "node:fs/promises";

const target = process.argv.includes("--web") ? "web-dist" : "dist";
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
if (target === "web-dist") {
  await cp("web", target, { recursive: true });
} else {
  await cp("manifest.json", `${target}/manifest.json`);
  await cp("src", `${target}/src`, { recursive: true });
}
console.log(`Built ${target}`);
