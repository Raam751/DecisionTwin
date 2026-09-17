import rawConfig from "../../i18n.config.json";

export type LanguageDirection = "ltr" | "rtl";

export type LanguageConfig = {
  code: string;
  label: string;
  detect: string[];
  dir: LanguageDirection;
};

const config = rawConfig as {
  fallbackLng: string;
  languages: LanguageConfig[];
};

/** Fallback language code. Every locale file must hold the same key set. */
export const fallbackLng = config.fallbackLng;

/** All template-supported language codes; pass to i18next.supportedLngs. */
export const supportedLngs = config.languages.map((l) => l.code);

/**
 * Dropdown options used by the language switcher. value is the language code,
 * label is the display name from the manifest.
 * Single source of truth is i18n.config.json; do not declare a second list elsewhere.
 */
export const languageOptions = config.languages.map(({ code, label }) => ({
  value: code,
  label,
}));

const dirMap = new Map(config.languages.map((l) => [l.code, l.dir]));
const codeMap = new Map(
  config.languages.map((l) => [l.code.toLowerCase(), l.code] as const),
);
const aliasMap = new Map(
  config.languages.flatMap((l) =>
    l.detect.map((alias) => [alias.toLowerCase(), l.code] as const),
  ),
);
// Prefix candidates are aliases plus codes (codes last so they win, same as in the
// exact stage), longest first so a broad candidate ("zh") can never shadow a specific
// one ("zh-hant"). Codes must be in here: nothing forces a manifest to list a code in
// its own detect array, and without it "zh-Hant-HK" falls back to the broad alias.
const prefixCandidates = [...new Map([...aliasMap, ...codeMap]).entries()].sort(
  ([left], [right]) => right.length - left.length,
);

/**
 * Normalize a language string from browser/cookie/htmlTag to a manifest-supported code.
 * Match order: exact code, then exact alias, then longest prefix — all case-insensitive.
 * What is load-bearing is that every exact match runs before any prefix match: let the
 * prefix stage go first and "zh-TW" is captured by zh-CN's broader "zh" alias, silently
 * switching the user to Simplified.
 * Returns null on miss; the caller decides whether to fall back to fallbackLng.
 */
export function normalizeLanguage(value?: string | null): string | null {
  if (!value) return null;
  const lowered = value.trim().toLowerCase();
  if (!lowered) return null;
  return (
    codeMap.get(lowered) ??
    aliasMap.get(lowered) ??
    prefixCandidates.find(([prefix]) => lowered.startsWith(`${prefix}-`))?.[1] ??
    null
  );
}

/**
 * Get the html dir attribute value for a language. Unknown languages get the fallback's direction.
 * Used to sync documentElement.dir on init and on languageChanged.
 */
export function getLanguageDirection(value?: string | null): LanguageDirection {
  return dirMap.get(normalizeLanguage(value) ?? fallbackLng) ?? "ltr";
}
