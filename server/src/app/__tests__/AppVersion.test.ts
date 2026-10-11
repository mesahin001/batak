import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadAppVersion } from '../AppVersion';

function manifest(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appver-'));
  const file = path.join(dir, 'app-version.json');
  fs.writeFileSync(file, content);
  return file;
}

describe('app update manifest', () => {
  it('reports no update info when the file is missing', () => {
    expect(loadAppVersion('/nonexistent/app-version.json')).toEqual({ available: false });
  });

  it('reports no update info for malformed JSON or a missing version code', () => {
    expect(loadAppVersion(manifest('{not json')).available).toBe(false);
    expect(loadAppVersion(manifest('{"latestVersion":"1.0.7"}')).available).toBe(false);
    expect(loadAppVersion(manifest('{"latestVersionCode":"8"}')).available).toBe(false);
  });

  it('returns a valid manifest', () => {
    const sha = 'a'.repeat(64);
    const m = loadAppVersion(
      manifest(
        JSON.stringify({
          latestVersion: '1.0.7',
          latestVersionCode: 8,
          minVersionCode: 7,
          apkUrl: 'https://batakci.xyz/downloads/batak.apk',
          sha256: sha,
          notes: { en: 'Fixes wallet address', tr: 'Cüzdan adresi düzeltildi' },
        })
      )
    );
    expect(m).toMatchObject({ available: true, latestVersionCode: 8, minVersionCode: 7, sha256: sha });
    expect(m.notes).toEqual({ en: 'Fixes wallet address', tr: 'Cüzdan adresi düzeltildi' });
  });

  it('drops non-https links and malformed fields instead of passing them to clients', () => {
    const m = loadAppVersion(
      manifest(
        JSON.stringify({
          latestVersionCode: 8,
          apkUrl: 'javascript:alert(1)',
          storeUrl: 'http://example.com/app',
          sha256: 'xyz',
          minVersionCode: -3,
          notes: { english: 'x', en: 5 },
        })
      )
    );
    expect(m.apkUrl).toBeUndefined();
    expect(m.storeUrl).toBeUndefined();
    expect(m.sha256).toBeUndefined();
    expect(m.minVersionCode).toBeUndefined();
    expect(m.notes).toEqual({});
  });
});
