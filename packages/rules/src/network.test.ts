import type { RepositoryContext, ResolvedConfig } from "@reposentinel/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runNetworkLinkChecks } from "./network.js";

const config: ResolvedConfig = {
  profile: "public",
  ignore: [],
  rules: {},
  ciFailOn: "error",
  security: { network: false, scanHistory: false, redactFindings: true },
};

function context(source: string): RepositoryContext {
  return {
    root: "/fixture",
    profile: "public",
    files: [
      {
        relativePath: "README.md",
        absolutePath: "/fixture/README.md",
        kind: "text",
        sizeBytes: source.length,
        isIgnored: false,
      },
    ],
    textCache: new Map([["README.md", source]]),
    config,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("network link checks", () => {
  it("does not call fetch when network checks are disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await runNetworkLinkChecks(context("[safe](https://example.com)"), {
        enabled: false,
      }),
    ).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports HTTP errors while redacting query strings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404 }));
    const findings = await runNetworkLinkChecks(
      context("[broken](https://example.com/docs?token=do-not-leak)"),
      { enabled: true },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence).toContain("https://example.com/docs");
    expect(JSON.stringify(findings)).not.toContain("token=do-not-leak");
  });

  it("blocks private, metadata, expanded IPv6, and mapped addresses before fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const resolveHostname = vi
      .fn()
      .mockResolvedValue([{ address: "10.0.0.7", family: 4 }]);
    const findings = await runNetworkLinkChecks(
      context(
        "[metadata](http://169.254.169.254/latest)\n[private](https://internal.example)\n[mapped](http://[::ffff:127.0.0.1]/health)\n[expanded-loopback](http://[0:0:0:0:0:0:0:1]/health)\n[expanded-metadata](http://[0:0:0:0:0:ffff:a9fe:a9fe]/latest/meta-data/)",
      ),
      { enabled: true, resolveHostname },
    );
    expect(findings).toHaveLength(5);
    expect(findings.every((finding) => finding.severity === "info")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resolveHostname).toHaveBeenCalledWith("internal.example");
  });

  it("skips localhost targets and caps the number of checked links", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const source = [
      "http://localhost:3000",
      ...Array.from(
        { length: 4 },
        (_, index) => `https://example.com/${index}`,
      ),
    ]
      .map((url) => `[link](${url})`)
      .join("\n");
    const findings = await runNetworkLinkChecks(context(source), {
      enabled: true,
      maxLinks: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      findings.some((finding) => finding.evidence?.includes("localhost:3000")),
    ).toBe(true);
  });
});
