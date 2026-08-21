import type { Finding, RepositoryContext } from "@reposentinel/core";

const LINK_PATTERN = /!?(?:\[[^\]]*\])\((https?:\/\/[^)\s]+)\)/gu;
const MAX_LINKS = 50;
const TIMEOUT_MS = 3000;
const CONCURRENCY = 4;

export type NetworkLinkCheckOptions = {
  enabled: boolean;
  timeoutMs?: number;
  maxLinks?: number;
};

function safeUrl(raw: string): URL | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname.toLowerCase())) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function redactedUrl(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function finding(context: RepositoryContext, path: string, url: URL, message: string, evidence: string): Finding {
  return {
    ruleId: "links.network-reachable",
    category: "links",
    severity: "warning",
    message,
    path,
    evidence: `${redactedUrl(url)} · ${evidence}`,
    remediation: "Update or remove the link, or keep network checks disabled when offline-only scanning is required.",
    metadata: { network: true }
  };
}

async function checkOne(context: RepositoryContext, path: string, url: URL, timeoutMs: number): Promise<Finding | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    }
    if (response.status >= 400) return finding(context, path, url, "A network-enabled link check returned an error status.", `HTTP ${response.status}`);
    if (response.status >= 300) return finding(context, path, url, "A network-enabled link check found a redirect that was not followed.", `HTTP ${response.status}`);
    return undefined;
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "timed out" : "could not be reached";
    return finding(context, path, url, "A network-enabled link check failed.", message);
  } finally {
    clearTimeout(timer);
  }
}

export async function runNetworkLinkChecks(context: RepositoryContext, options: NetworkLinkCheckOptions): Promise<Finding[]> {
  if (!options.enabled) return [];
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const maxLinks = options.maxLinks ?? MAX_LINKS;
  const links: Array<{ path: string; url: URL }> = [];
  const seen = new Set<string>();
  for (const [path, source] of context.textCache) {
    for (const match of source.matchAll(LINK_PATTERN)) {
      const raw = match[1];
      if (!raw) continue;
      const url = safeUrl(raw);
      if (!url) continue;
      const key = url.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ path, url });
      if (links.length >= maxLinks) break;
    }
    if (links.length >= maxLinks) break;
  }

  const findings: Finding[] = [];
  for (let index = 0; index < links.length; index += CONCURRENCY) {
    const batch = links.slice(index, index + CONCURRENCY);
    const results = await Promise.all(batch.map(({ path, url }) => checkOne(context, path, url, timeoutMs)));
    findings.push(...results.filter((result): result is Finding => result !== undefined));
  }
  return findings;
}
