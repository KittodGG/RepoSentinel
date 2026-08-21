import { readFile } from "node:fs/promises";
import { parse } from "yaml";

const workflow = parse(
  await readFile(
    new URL("../.github/workflows/quality.yml", import.meta.url),
    "utf8",
  ),
);
const action = parse(
  await readFile(new URL("../action.yml", import.meta.url), "utf8"),
);

if (!workflow.name || !workflow.jobs?.quality)
  throw new Error("quality workflow is incomplete");
if (workflow.permissions?.contents !== "read")
  throw new Error("quality workflow must use read-only contents permission");
const qualitySteps = workflow.jobs.quality.steps ?? [];
const qualityStepNames = new Set(qualitySteps.map((step) => step.name));
for (const required of ["Lint", "Coverage", "Validate smoke report"]) {
  if (!qualityStepNames.has(required))
    throw new Error(`quality workflow missing step: ${required}`);
}
const matrixOs = workflow.jobs.quality.strategy?.matrix?.os ?? [];
if (!matrixOs.includes("macos-latest"))
  throw new Error("quality workflow must include macOS coverage");
if (!action.name || action.runs?.using !== "composite")
  throw new Error("composite action metadata is incomplete");
for (const key of ["profile", "lang", "fail-on", "format", "output"]) {
  if (!action.inputs?.[key]) throw new Error(`missing action input: ${key}`);
}
console.log("github_config_validation=passed");
