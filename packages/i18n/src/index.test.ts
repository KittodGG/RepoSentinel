import { describe, expect, it } from "vitest";
import {
  createTranslator,
  getCatalog,
  isSupportedLocale,
  resolveLocale,
  supportedLocales
} from "./index.js";

describe("localization", () => {
  it("exposes the initial English and Indonesian locales", () => {
    expect(supportedLocales).toEqual(["en", "id"]);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("id")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  it("prefers explicit locale and normalizes regional values", () => {
    expect(resolveLocale("id-ID", { LANG: "en_US.UTF-8" })).toBe("id");
    expect(resolveLocale(undefined, { REPOSENTINEL_LANG: "en-US" })).toBe("en");
  });

  it("falls back deterministically to English", () => {
    expect(resolveLocale(undefined, { LANG: "fr_FR.UTF-8" })).toBe("en");
    expect(resolveLocale(undefined, {})).toBe("en");
  });

  it("translates and interpolates messages", () => {
    expect(createTranslator("en").t("scan.completed")).toBe("Scan completed");
    expect(createTranslator("id").t("scan.completed")).toBe("Scan selesai");
    expect(createTranslator("id").t("error.invalidLocale", { locale: "fr" })).toContain("fr");
  });

  it("keeps every catalog key aligned", () => {
    const englishKeys = Object.keys(getCatalog("en")).sort();
    const indonesianKeys = Object.keys(getCatalog("id")).sort();
    expect(indonesianKeys).toEqual(englishKeys);
  });
});
