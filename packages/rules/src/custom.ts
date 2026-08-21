import {
  type Finding,
  fingerprintFor,
  type RepositoryContext,
  type RepositoryFile,
  type RuleCategory,
  type Severity,
} from "@reposentinel/core";
import type { RuleDefinition } from "./index.js";

export type CustomRuleSpec = {
  id: string;
  title?: string;
  severity: Exclude<Severity, "off">;
  profiles?: string[];
  path: string;
  contentIncludes?: string;
  match?: "absent" | "contains";
  message: string;
  remediation: string;
  docsUrl?: string;
};

const severities = new Set<Severity>(["critical", "error", "warning", "info"]);
const profiles = new Set([
  "public",
  "portfolio",
  "npm-package",
  "academic",
  "private-team",
  "mobile-app",
]);

function assertString(value: unknown, field: string, index: number): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Custom rule ${index} requires a non-empty ${field}.`);
  return value;
}

function globToRegExp(pattern: string): RegExp {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (character === "*") {
      source += "[^/]*";
    } else {
      source += character
        ? character.replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
        : "";
    }
  }
  return new RegExp(`${source}$`, "u");
}

function matches(
  file: RepositoryFile,
  spec: CustomRuleSpec,
  expression: RegExp,
  context: RepositoryContext,
): boolean {
  if (file.isIgnored || !expression.test(file.relativePath)) return false;
  if (!spec.contentIncludes) return true;
  return (
    context.textCache.get(file.relativePath)?.includes(spec.contentIncludes) ??
    false
  );
}

function createCustomRule(spec: CustomRuleSpec): RuleDefinition {
  const expression = globToRegExp(spec.path);
  const category: RuleCategory = "custom";
  return {
    id: spec.id,
    category,
    title: spec.title ?? spec.id,
    defaultSeverity: spec.severity,
    profiles: spec.profiles ?? ["public", "portfolio", "npm-package"],
    run(context) {
      const matched = context.files.filter((file) =>
        matches(file, spec, expression, context),
      );
      if (spec.match === "contains") {
        return matched.map((file) => ({
          ruleId: spec.id,
          category,
          severity: spec.severity,
          message: spec.message,
          path: file.relativePath,
          fingerprint: fingerprintFor(spec.id, file.relativePath),
          remediation: spec.remediation,
          ...(spec.docsUrl ? { docsUrl: spec.docsUrl } : {}),
        }));
      }
      if (matched.length > 0) return [];
      const finding: Finding = {
        ruleId: spec.id,
        category,
        severity: spec.severity,
        message: spec.message,
        fingerprint: fingerprintFor(spec.id),
        remediation: spec.remediation,
        ...(spec.docsUrl ? { docsUrl: spec.docsUrl } : {}),
      };
      return [finding];
    },
  };
}

export function loadCustomRules(source: string): RuleDefinition[] {
  const parsed: unknown = JSON.parse(source);
  if (!Array.isArray(parsed))
    throw new Error("Custom rule registry must be a JSON array.");
  const ids = new Set<string>();
  return parsed.map((item: unknown, index: number) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error(`Custom rule ${index} must be an object.`);
    const record = item as Record<string, unknown>;
    const id = assertString(record.id, "id", index);
    if (!/^custom\.[a-z0-9][a-z0-9._-]*$/u.test(id))
      throw new Error(
        `Custom rule ${id} must use the custom.<name> ID format.`,
      );
    if (ids.has(id)) throw new Error(`Duplicate custom rule ID: ${id}.`);
    ids.add(id);
    const severity = assertString(
      record.severity,
      "severity",
      index,
    ) as Severity;
    if (!severities.has(severity))
      throw new Error(
        `Custom rule ${id} has unsupported severity: ${severity}.`,
      );
    const path = assertString(record.path, "path", index);
    const message = assertString(record.message, "message", index);
    const remediation = assertString(record.remediation, "remediation", index);
    const selectedProfiles =
      record.profiles === undefined
        ? undefined
        : Array.isArray(record.profiles)
          ? record.profiles.map((profile) =>
              assertString(profile, "profile", index),
            )
          : (() => {
              throw new Error(`Custom rule ${id} profiles must be an array.`);
            })();
    if (selectedProfiles?.some((profile) => !profiles.has(profile)))
      throw new Error(`Custom rule ${id} references an unsupported profile.`);
    const contentIncludes =
      record.contentIncludes === undefined
        ? undefined
        : assertString(record.contentIncludes, "contentIncludes", index);
    const match =
      record.match === undefined
        ? undefined
        : assertString(record.match, "match", index);
    if (match !== undefined && match !== "absent" && match !== "contains")
      throw new Error(
        `Custom rule ${id} has unsupported match mode: ${match}.`,
      );
    if (match === "contains" && contentIncludes === undefined)
      throw new Error(
        `Custom rule ${id} requires contentIncludes when match is contains.`,
      );
    const title =
      record.title === undefined
        ? undefined
        : assertString(record.title, "title", index);
    const docsUrl =
      record.docsUrl === undefined
        ? undefined
        : assertString(record.docsUrl, "docsUrl", index);
    return createCustomRule({
      id,
      severity,
      path,
      message,
      remediation,
      ...(title ? { title } : {}),
      ...(selectedProfiles ? { profiles: selectedProfiles } : {}),
      ...(contentIncludes ? { contentIncludes } : {}),
      ...(match ? { match: match as "absent" | "contains" } : {}),
      ...(docsUrl ? { docsUrl } : {}),
    });
  });
}
