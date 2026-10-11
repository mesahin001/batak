/**
 * App update check.
 * Asks the server for the latest published build (GET /api/app-version) and, if
 * this install is older, prompts the player. Never blocks the app on network errors.
 *
 * Channel: sideloaded APK builds open the APK link; dApp Store builds
 * (EXPO_PUBLIC_UPDATE_CHANNEL=store) send the player to the store listing instead,
 * because the store owns updates for apps it distributes.
 */

import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage } from './i18n/I18nService';

const SNOOZE_KEY = '@batak/update_snoozed';
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const CHANNEL = process.env.EXPO_PUBLIC_UPDATE_CHANNEL === 'store' ? 'store' : 'apk';

interface Manifest {
  available: boolean;
  latestVersion?: string;
  latestVersionCode?: number;
  minVersionCode?: number;
  apkUrl?: string;
  storeUrl?: string;
  notes?: Record<string, string>;
}

const TEXT = {
  en: { title: 'Update available', required: 'This version is no longer supported.', later: 'Later', update: 'Update' },
  tr: { title: 'Güncelleme var', required: 'Bu sürüm artık desteklenmiyor.', later: 'Sonra', update: 'Güncelle' },
} as const;

export function installedVersionCode(): number {
  return Number(Constants.expoConfig?.android?.versionCode ?? 0);
}

/** socket URL (wss://host) → http(s) base for REST calls */
export function httpBase(socketUrl: string): string {
  return socketUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
}

/** True when the manifest describes a newer build than the installed one. */
export function isUpdateAvailable(m: Manifest, installed: number): boolean {
  return m.available && !!m.latestVersionCode && m.latestVersionCode > installed;
}

export function isUpdateRequired(m: Manifest, installed: number): boolean {
  return m.available && !!m.minVersionCode && installed < m.minVersionCode;
}

export async function checkForUpdate(socketUrl: string): Promise<void> {
  try {
    const installed = installedVersionCode();
    if (!installed) return;

    const res = await fetch(`${httpBase(socketUrl)}/api/app-version`);
    if (!res.ok) return;
    const m: Manifest = await res.json();
    if (!isUpdateAvailable(m, installed)) return;

    const required = isUpdateRequired(m, installed);
    if (!required) {
      const snoozed = Number((await AsyncStorage.getItem(SNOOZE_KEY)) || 0);
      if (Date.now() - snoozed < SNOOZE_MS) return;
    }

    const target = CHANNEL === 'store' ? m.storeUrl : m.apkUrl;
    if (!target) return;

    const lang = getCurrentLanguage() === 'tr' ? 'tr' : 'en';
    const t = TEXT[lang];
    const note = m.notes?.[lang] ?? m.notes?.en;
    const message = [required ? t.required : null, note].filter(Boolean).join('\n\n') || `v${m.latestVersion ?? ''}`;

    const buttons = [{ text: t.update, onPress: () => Linking.openURL(target).catch(() => {}) }];
    if (!required) {
      buttons.unshift({
        text: t.later,
        onPress: () => {
          AsyncStorage.setItem(SNOOZE_KEY, String(Date.now())).catch(() => {});
        },
      });
    }
    Alert.alert(`${t.title}${m.latestVersion ? ` (v${m.latestVersion})` : ''}`, message, buttons, { cancelable: !required });
  } catch {
    // offline or server unavailable: updates are best-effort
  }
}
