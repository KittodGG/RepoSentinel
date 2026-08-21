import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { LookupAddress } from "node:dns";
import type { Finding, RepositoryContext } from "@reposentinel/core";

const LINK_PATTERN = /!?(?:\[[^\]]*\])\((https?:\/\/[^)\s]+)\)/gu;
const MAX_LINKS = 50;
const TIMEOUT_MS = 3000;
const CONCURRENCY = 4;

export type NetworkLinkCheckOptions = {
  enabled: boolean;
  timeoutMs?: number;
  maxLinks?: number;
  resolveHostname?: (hostname: string) => Promise<LookupAddress[]>;
};

function safeUrl(raw: string): URL | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    const hostname = url.hostname.replace(/^\[|\]$/gu, "").toLowerCase();
    if (hostname === "localhost" || isBlockedIp(hostname)) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function ipv4Parts(address: string): number[] | undefined {
  if (isIP(address) !== 4) return undefined;
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : undefined;
}

function isBlockedIpv4(address: string): boolean {
  const parts = ipv4Parts(address);
  if (!parts) return false;
  const [first = 0, second = 0, third = 0] = parts;
  return first === 0
    || first === 10
    || (first === 100 && second !== undefined && second >= 64 && second <= 127)
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second !== undefined && second >= 16 && second <= 31)
    || (first === 192 && second === 0 && third === 0)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 168)
    || (first === 198 && second !== undefined && second >= 18 && second <= 19)
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113)
    || first >= 224;
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%", 1)[0] ?? address.toLowerCase();
  if (isIP(normalized) !== 6) return false;
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const dottedMapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/u)?.[1];
  if (dottedMapped) return isBlockedIpv4(dottedMapped);
  if (!normalized.startsWith("::ffff:")) return false;
  const hexGroups = normalized.slice("::ffff:".length).split(":");
  if (hexGroups.length !== 2 || hexGroups.some((group) => !/^[0-9a-f]{1,4}$/u.test(group))) return false;
  const high = Number.parseInt(hexGroups[0] ?? "0", 16);
  const low = Number.parseInt(hexGroups[1] ?? "0", 16);
  const mapped = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  return isBlockedIpv4(mapped);
}

function isBlockedIp(address: string): boolean {
  return isBlockedIpv4(address) || isBlockedIpv6(address);
}

async function resolvesToBlockedAddress(url: URL, resolveHostname: (hostname: string) => Promise<LookupAddress[]>): Promise<boolean> {
  const hostname = url.hostname.replace(/^\[|\]$/gu, "");
  if (isIP(hostname)) return isBlockedIp(hostname);
  const addresses = await resolveHostname(hostname);
  return addresses.some((entry) => isBlockedIp(entry.address));
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

async function checkOne(context: RepositoryContext, path: string, url: URL, timeoutMs: number, resolveHostname: (hostname: string) => Promise<LookupAddress[]>): Promise<Finding | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (await resolvesToBlockedAddress(url, resolveHostname)) return undefined;
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
  const resolveHostname = options.resolveHostname ?? ((hostname: string) => lookup(hostname, { all: true, verbatim: true }));
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
    const results = await Promise.all(batch.map(({ path, url }) => checkOne(context, path, url, timeoutMs, resolveHostname)));
    findings.push(...results.filter((result): result is Finding => result !== undefined));
  }
  return findings;
}
