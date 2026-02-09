import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storageKeys';

/**
 * AsyncStorage service for persistent data storage
 * Provides type-safe methods for all storage operations
 */
export class AsyncStorageService {
  /**
   * Auth Token (JWT) methods
   */
  static async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.AUTH_TOKEN, token);
  }

  static async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(StorageKeys.AUTH_TOKEN);
  }

  static async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.AUTH_TOKEN);
  }

  /**
   * Wallet Token (Seeker auth token) methods
   */
  static async setWalletToken(token: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.WALLET_TOKEN, token);
  }

  static async getWalletToken(): Promise<string | null> {
    return await AsyncStorage.getItem(StorageKeys.WALLET_TOKEN);
  }

  static async removeWalletToken(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.WALLET_TOKEN);
  }

  /**
   * Wallet Public Key methods
   */
  static async setWalletPublicKey(publicKey: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.WALLET_PUBLIC_KEY, publicKey);
  }

  static async getWalletPublicKey(): Promise<string | null> {
    return await AsyncStorage.getItem(StorageKeys.WALLET_PUBLIC_KEY);
  }

  static async removeWalletPublicKey(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.WALLET_PUBLIC_KEY);
  }

  /**
   * Username methods
   */
  static async setUsername(username: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.USERNAME, username);
  }

  static async getUsername(): Promise<string | null> {
    return await AsyncStorage.getItem(StorageKeys.USERNAME);
  }

  static async removeUsername(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.USERNAME);
  }

  /**
   * Language preference methods
   */
  static async setLanguage(lang: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.LANGUAGE, lang);
  }

  static async getLanguage(): Promise<string | null> {
    return await AsyncStorage.getItem(StorageKeys.LANGUAGE);
  }

  /**
   * Game preferences methods
   */
  static async setGamePrefs(prefs: Record<string, any>): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.GAME_PREFS, JSON.stringify(prefs));
  }

  static async getGamePrefs(): Promise<Record<string, any> | null> {
    const prefs = await AsyncStorage.getItem(StorageKeys.GAME_PREFS);
    return prefs ? JSON.parse(prefs) : null;
  }

  /**
   * Last Game ID for rejoining
   */
  static async setLastGameId(gameId: string): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.LAST_GAME_ID, gameId);
  }

  static async getLastGameId(): Promise<string | null> {
    return await AsyncStorage.getItem(StorageKeys.LAST_GAME_ID);
  }

  static async removeLastGameId(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.LAST_GAME_ID);
  }

  /**
   * Session data methods
   */
  static async setSessionData(data: Record<string, any>): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.SESSION_DATA, JSON.stringify(data));
  }

  static async getSessionData(): Promise<Record<string, any> | null> {
    const data = await AsyncStorage.getItem(StorageKeys.SESSION_DATA);
    return data ? JSON.parse(data) : null;
  }

  static async removeSessionData(): Promise<void> {
    await AsyncStorage.removeItem(StorageKeys.SESSION_DATA);
  }

  /**
   * Clear all auth-related data (logout)
   */
  static async clearAuthData(): Promise<void> {
    await Promise.all([
      this.removeAuthToken(),
      this.removeWalletToken(),
      this.removeWalletPublicKey(),
      this.removeUsername(),
      this.removeSessionData(),
    ]);
  }

  /**
   * Clear all data (reset app)
   */
  static async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  }

  /**
   * Get multiple keys at once
   */
  static async getMultipleKeys(keys: StorageKeys[]): Promise<Record<string, string | null>> {
    const pairs = await AsyncStorage.multiGet(keys);
    return Object.fromEntries(pairs);
  }

  /**
   * Set multiple keys at once
   */
  static async setMultipleKeys(keyValuePairs: Record<string, string>): Promise<void> {
    const pairs = Object.entries(keyValuePairs);
    await AsyncStorage.multiSet(pairs);
  }

  /**
   * Remove multiple keys at once
   */
  static async removeMultipleKeys(keys: StorageKeys[]): Promise<void> {
    await AsyncStorage.multiRemove(keys);
  }
}
