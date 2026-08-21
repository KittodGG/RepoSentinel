import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runNpm } from "./lib/npm.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "packages", "cli");
const artifactDir = join(root, "artifacts");
const staging = join(artifactDir, "package");

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp(join(source, "dist"), join(staging, "dist"), { recursive: true });
await cp(join(source, "README.md"), join(staging, "README.md"));
await cp(join(source, "LICENSE"), join(staging, "LICENSE"));

const packageJson = JSON.parse(
  await readFile(join(source, "package.json"), "utf8"),
);
packageJson.private = undefined;
packageJson.devDependencies = undefined;
packageJson.scripts = undefined;
packageJson.dependencies = Object.fromEntries(
  Object.entries(packageJson.dependencies ?? {}).filter(
    ([name]) => !name.startsWith("@reposentinel/"),
  ),
);
await writeFile(
  join(staging, "package.json"),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);

await runNpm(["pack", "--ignore-scripts", "--pack-destination", artifactDir], {
  cwd: staging,
});
console.log(`Release artifact created in ${artifactDir}`);
