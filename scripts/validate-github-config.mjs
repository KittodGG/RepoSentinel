import { readFile } from "node:fs/promises";
import { parse } from "yaml";

const workflow = parse(await readFile(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8"));
const action = parse(await readFile(new URL("../action.yml", import.meta.url), "utf8"));

if (!workflow.name || !workflow.jobs?.quality) throw new Error("quality workflow is incomplete");
if (!workflow.permissions || workflow.permissions.contents !== "read") throw new Error("quality workflow must use read-only contents permission");
if (!action.name || action.runs?.using !== "composite") throw new Error("composite action metadata is incomplete");
for (const key of ["profile", "lang", "fail-on", "format", "output"]) {
  if (!action.inputs?.[key]) throw new Error(`missing action input: ${key}`);
}
console.log("github_config_validation=passed");
