import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Finding, RepositoryContext } from "@reposentinel/core";

function* markdownLinkTargets(source: string): Generator<string> {
  let cursor = 0;
  while (cursor < source.length) {
    const marker = source.indexOf("](", cursor);
    if (marker < 0) return;
    const closing = source.indexOf(")", marker + 2);
    if (closing < 0) return;
    const target = source.slice(marker + 2, closing).trim();
    const whitespace = target.search(/\s/u);
    const raw = whitespace < 0 ? target : target.slice(0, whitespace);
    if (raw.startsWith("http://") || raw.startsWith("https://")) yield raw;
    cursor = closing + 1;
  }
}

const MAX_LINKS = 50;
const TIMEOUT_MS = 3000;
const CONCURRENCY = 4;

export type NetworkLinkCheckOptions = {
  enabled: boolean;
  timeoutMs?: number;
  maxLinks?: number;
  resolveHostname?: (hostname: string) => Promise<LookupAddress[]>;
};

function normalizedHostname(raw: string): string {
  return (
    raw
      .replace(/^\[|\]$/gu, "")
      .split("%", 1)[0]
      ?.toLowerCase() ?? raw.toLowerCase()
  );
}

function safeUrl(raw: string): URL | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function ipv4Parts(address: string): number[] | undefined {
  if (isIP(address) !== 4) return undefined;
  const parts = address.split(".").map(Number);
  return parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : undefined;
}

function isBlockedIpv4(address: string): boolean {
  const parts = ipv4Parts(address);
  if (!parts) return false;
  const [first = 0, second = 0, third = 0] = parts;
  return (
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && second >= 18 && second <= 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function parseIpv6(address: string): Uint8Array | undefined {
  const normalized = normalizedHostname(address);
  if (isIP(normalized) !== 6) return undefined;
  const sections = normalized.split("::");
  if (sections.length > 2) return undefined;
  const head = sections[0] ? sections[0].split(":").filter(Boolean) : [];
  const tail =
    sections.length === 2 && sections[1]
      ? sections[1].split(":").filter(Boolean)
      : [];
  const groups: number[] = [];
  const appendGroup = (group: string): boolean => {
    if (group.includes(".")) {
      const parts = ipv4Parts(group);
      if (!parts) return false;
      groups.push(
        (parts[0] ?? 0) * 256 + (parts[1] ?? 0),
        (parts[2] ?? 0) * 256 + (parts[3] ?? 0),
      );
      return true;
    }
    if (!/^[0-9a-f]{1,4}$/u.test(group)) return false;
    groups.push(Number.parseInt(group, 16));
    return true;
  };
  if (!head.every(appendGroup)) return undefined;
  const headLength = groups.length;
  const tailGroups: number[] = [];
  for (const group of tail) {
    if (group.includes(".")) {
      const parts = ipv4Parts(group);
      if (!parts) return undefined;
      tailGroups.push(
        (parts[0] ?? 0) * 256 + (parts[1] ?? 0),
        (parts[2] ?? 0) * 256 + (parts[3] ?? 0),
      );
    } else if (/^[0-9a-f]{1,4}$/u.test(group)) {
      tailGroups.push(Number.parseInt(group, 16));
    } else {
      return undefined;
    }
  }
  const zeroGroups =
    sections.length === 2 ? 8 - headLength - tailGroups.length : 0;
  if (zeroGroups < 0 || (sections.length === 1 && headLength !== 8))
    return undefined;
  const allGroups = [
    ...groups,
    ...Array.from({ length: zeroGroups }, () => 0),
    ...tailGroups,
  ];
  if (allGroups.length !== 8) return undefined;
  const bytes = new Uint8Array(16);
  allGroups.forEach((group, index) => {
    bytes[index * 2] = group >> 8;
    bytes[index * 2 + 1] = group & 255;
  });
  return bytes;
}

function isBlockedIpv6(address: string): boolean {
  const bytes = parseIpv6(address);
  if (!bytes) return false;
  const allZero = bytes.every((value) => value === 0);
  const loopback =
    allZero ||
    (bytes.slice(0, 15).every((value) => value === 0) && bytes[15] === 1);
  const uniqueLocal = ((bytes[0] ?? 0) & 0xfe) === 0xfc;
  const linkLocal = bytes[0] === 0xfe && ((bytes[1] ?? 0) & 0xc0) === 0x80;
  const multicast = (bytes[0] ?? 0) >= 0xff;
  const documentation =
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x0d &&
    bytes[3] === 0xb8;
  const mapped =
    bytes.slice(0, 10).every((value) => value === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;
  if (mapped)
    return isBlockedIpv4(`${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`);
  return loopback || uniqueLocal || linkLocal || multicast || documentation;
}

function isBlockedIp(address: string): boolean {
  return isBlockedIpv4(address) || isBlockedIpv6(address);
}

async function resolvesToBlockedAddress(
  url: URL,
  resolveHostname: (hostname: string) => Promise<LookupAddress[]>,
): Promise<boolean> {
  const hostname = normalizedHostname(url.hostname);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (isIP(hostname)) return isBlockedIp(hostname);
  const addresses = await resolveHostname(hostname);
  return addresses.some((entry) => isBlockedIp(entry.address));
}

function redactedUrl(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function finding(
  _context: RepositoryContext,
  path: string,
  url: URL,
  message: string,
  evidence: string,
  severity: Finding["severity"] = "warning",
): Finding {
  return {
    ruleId: "links.network-reachable",
    category: "links",
    severity,
    message,
    path,
    evidence: `${redactedUrl(url)} · ${evidence}`,
    remediation:
      "Update or remove the link, or keep network checks disabled when offline-only scanning is required.",
    metadata: { network: true },
  };
}

async function checkOne(
  context: RepositoryContext,
  path: string,
  url: URL,
  timeoutMs: number,
  resolveHostname: (hostname: string) => Promise<LookupAddress[]>,
): Promise<Finding | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (await resolvesToBlockedAddress(url, resolveHostname)) {
      return finding(
        context,
        path,
        url,
        "A network-enabled link check was skipped because the target resolved to an internal or reserved address.",
        "target blocked by SSRF policy",
        "info",
      );
    }
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
      });
    }
    if (response.status >= 400)
      return finding(
        context,
        path,
        url,
        "A network-enabled link check returned an error status.",
        `HTTP ${response.status}`,
      );
    if (response.status >= 300)
      return finding(
        context,
        path,
        url,
        "A network-enabled link check found a redirect that was not followed.",
        `HTTP ${response.status}`,
      );
    return undefined;
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "timed out"
        : "could not be reached";
    return finding(
      context,
      path,
      url,
      "A network-enabled link check failed.",
      message,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function runNetworkLinkChecks(
  context: RepositoryContext,
  options: NetworkLinkCheckOptions,
): Promise<Finding[]> {
  if (!options.enabled) return [];
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const maxLinks = options.maxLinks ?? MAX_LINKS;
  const resolveHostname =
    options.resolveHostname ??
    ((hostname: string) => lookup(hostname, { all: true, verbatim: true }));
  const links: Array<{ path: string; url: URL }> = [];
  const seen = new Set<string>();
  for (const [path, source] of context.textCache) {
    for (const raw of markdownLinkTargets(source)) {
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
    const results = await Promise.all(
      batch.map(({ path, url }) =>
        checkOne(context, path, url, timeoutMs, resolveHostname),
      ),
    );
    findings.push(
      ...results.filter((result): result is Finding => result !== undefined),
    );
  }
  return findings;
}
