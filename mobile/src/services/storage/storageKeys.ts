/**
 * AsyncStorage keys for Batak Mobile app
 * All keys are prefixed with @batak_ to avoid conflicts
 */
export enum StorageKeys {
  // Auth
  AUTH_TOKEN = '@batak_auth_token', // JWT for email/password auth

  // Wallet
  WALLET_TOKEN = '@batak_wallet_token', // Seeker auth token for reauthorization
  WALLET_PUBLIC_KEY = '@batak_wallet_public_key', // User's wallet public key

  // User Preferences
  USERNAME = '@batak_username', // Display username
  LANGUAGE = '@batak_language', // Preferred language (en, tr)
  GAME_PREFS = '@batak_game_prefs', // Game preferences JSON

  // Session
  LAST_GAME_ID = '@batak_last_game_id', // For rejoining games
  SESSION_DATA = '@batak_session_data', // Session state
}
