import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const extensions = new Set([".md", ".yml", ".yaml"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "artifacts"]);
const missing = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!extensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) continue;
    const content = await readFile(absolute, "utf8");
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
      const target = match[1].split("#", 1)[0].trim();
      if (!target || target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:") || target.startsWith("<")) continue;
      const candidate = resolve(dirname(absolute), target);
      try {
        await stat(candidate);
      } catch {
        missing.push(`${absolute.replace(`${root}/`, "")}: ${target}`);
      }
    }
  }
}

await walk(root);
if (missing.length > 0) {
  console.error("Missing local documentation links:");
  for (const item of missing) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  console.log("documentation_links=passed");
}
