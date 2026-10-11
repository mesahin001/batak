/**
 * Mobile app update manifest.
 * Read from data/app-version.json on every request so a release only needs the
 * file replaced (scripts/release-apk.sh), not a server rebuild.
 */

import fs from 'fs';

export interface AppVersionManifest {
  available: boolean;
  latestVersion?: string;
  latestVersionCode?: number;
  /** Installs below this code must update before playing. */
  minVersionCode?: number;
  apkUrl?: string;
  storeUrl?: string;
  sha256?: string;
  notes?: Record<string, string>;
}

const NONE: AppVersionManifest = { available: false };
const HTTPS = /^https:\/\/[^\s]+$/;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length <= 300 ? v : undefined);
const url = (v: unknown): string | undefined => (typeof v === 'string' && HTTPS.test(v) ? v : undefined);
const code = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 1e9 ? v : undefined;

/** Parse and sanitise the manifest; anything malformed means "no update info". */
export function loadAppVersion(filePath: string): AppVersionManifest {
  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return NONE;
  }
  const latestVersionCode = code(raw?.latestVersionCode);
  if (!latestVersionCode) return NONE;

  const notes: Record<string, string> = {};
  if (raw.notes && typeof raw.notes === 'object') {
    for (const [lang, text] of Object.entries(raw.notes)) {
      const t = str(text);
      if (/^[a-z]{2}$/.test(lang) && t) notes[lang] = t;
    }
  }

  return {
    available: true,
    latestVersion: str(raw.latestVersion),
    latestVersionCode,
    minVersionCode: code(raw.minVersionCode),
    apkUrl: url(raw.apkUrl),
    storeUrl: url(raw.storeUrl),
    sha256: typeof raw.sha256 === 'string' && /^[0-9a-f]{64}$/.test(raw.sha256) ? raw.sha256 : undefined,
    notes,
  };
}
