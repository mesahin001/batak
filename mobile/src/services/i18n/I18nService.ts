import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import { AsyncStorageService } from '../storage/AsyncStorageService';

// Import translation files
import enTranslations from './translations/en.json';
import trTranslations from './translations/tr.json';

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  tr: 'Türkçe',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Get device language
 */

/**
 * Get device language
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
 * Should be called when app starts
 */
export const initI18n = async (): Promise<void> => {
  // Get saved language or use device language
  const savedLanguage = await AsyncStorageService.getLanguage();
  const language = (savedLanguage || getDeviceLanguage()) as SupportedLanguage;

  // Load resources dynamically based on language
  const resources = {
    en: { translation: enTranslations },
    tr: { translation: trTranslations },
  };

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    compatibilityJSON: 'v4', // Use v4 format for latest i18next
    interpolation: {
      escapeValue: false, // React already escapes values
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

/**
 * Check if language is supported
 */
export const isLanguageSupported = (language: string): language is SupportedLanguage => {
  return language in SUPPORTED_LANGUAGES;
};

export default i18n;
