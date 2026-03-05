import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import { AsyncStorageService } from '../storage/AsyncStorageService';

// Import translation files
import enTranslations from './translations/en.json';
import trTranslations from './translations/tr.json';
import deTranslations from './translations/de.json';
import esTranslations from './translations/es.json';
import frTranslations from './translations/fr.json';
import itTranslations from './translations/it.json';
import ptTranslations from './translations/pt.json';
import ruTranslations from './translations/ru.json';
import arTranslations from './translations/ar.json';
import jaTranslations from './translations/ja.json';
import zhTranslations from './translations/zh.json';

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Get device language - auto-detect on first launch
 */
const getDeviceLanguage = (): SupportedLanguage => {
  const deviceLocales = getLocales();
  const deviceLanguage = deviceLocales[0]?.languageCode || 'en';

  // Check if device language is supported
  if (deviceLanguage in SUPPORTED_LANGUAGES) {
    return deviceLanguage as SupportedLanguage;
  }

  // Default to English
  return 'en';
};

/**
 * Initialize i18n
 */
export const initI18n = async (): Promise<void> => {
  const savedLanguage = await AsyncStorageService.getLanguage();
  const language = (savedLanguage || getDeviceLanguage()) as SupportedLanguage;

  const resources = {
    en: { translation: enTranslations },
    tr: { translation: trTranslations },
    de: { translation: deTranslations },
    es: { translation: esTranslations },
    fr: { translation: frTranslations },
    it: { translation: itTranslations },
    pt: { translation: ptTranslations },
    ru: { translation: ruTranslations },
    ar: { translation: arTranslations },
    ja: { translation: jaTranslations },
    zh: { translation: zhTranslations },
  };

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
  });
};

/**
 * Change language
 */
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);
  await AsyncStorageService.setLanguage(language);
};

/**
 * Get current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage;
};

/**
 * Get supported languages list
 */
export const getSupportedLanguages = () => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
    code: code as SupportedLanguage,
    name,
  }));
};

export default i18n;
