# Batak Tournament - Mobile App (React Native)

React Native mobile app for Batak Tournament card game with Seeker wallet integration.

## Tech Stack

- **Framework:** React Native 0.81.5 with Expo 54
- **Navigation:** React Navigation v7 (Bottom Tabs + Native Stack)
- **State Management:** React Context API
- **Storage:** AsyncStorage for persistent data
- **Socket:** Socket.IO Client for real-time communication
- **i18n:** i18next + react-i18next + react-native-localize
- **Wallet:** @solana-mobile/mobile-wallet-adapter-protocol-web3js (Seeker)

## Project Structure

```
/mobile/
├── App.tsx                          # Main entry point
├── package.json
├── .env                             # Environment variables
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Main navigation wrapper
│   │   ├── AuthNavigator.tsx        # Auth stack (Login, Register)
│   │   ├── MainNavigator.tsx        # Bottom tabs (Lobby, Profile, Settings)
│   │   └── GameNavigator.tsx        # Game stack (GameRoom, Results)
│   ├── contexts/
│   │   ├── AuthContext.tsx          # Auth state management
│   │   ├── WalletContext.tsx        # Seeker wallet integration
│   │   └── SocketContext.tsx        # Socket.IO connection
│   ├── services/
│   │   ├── storage/
│   │   │   ├── AsyncStorageService.ts
│   │   │   └── storageKeys.ts
│   │   ├── wallet/
│   │   │   └── SeekerWalletService.ts
│   │   └── i18n/
│   │       ├── I18nService.ts
│   │       └── translations/
│   │           ├── en.json
│   │           └── tr.json
│   ├── screens/
│   │   ├── auth/
│   │   ├── lobby/
│   │   ├── game/
│   │   ├── results/
│   │   └── settings/
│   ├── components/
│   │   ├── cards/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   ├── types/
│   │   └── game.ts                  # Game type definitions
│   └── styles/
```

## Getting Started

### Prerequisites

- Node.js 20.18.0+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Seeker wallet app (for testing wallet connection)

### Installation

```bash
cd mobile
npm install
```

### Environment Variables

Create a `.env` file in the mobile directory:

```env
EXPO_PUBLIC_SOCKET_URL=ws://localhost:3001
EXPO_PUBLIC_SOLANA_NETWORK=devnet
EXPO_PUBLIC_DEFAULT_BOT_DIFFICULTY=normal
EXPO_PUBLIC_DEFAULT_BOT_COUNT=3
```

### Running the App

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run in web browser
npm run web
```

## Seeker Wallet Integration

### How It Works

1. **Authorization Flow:**
   - User taps "Connect with Seeker"
   - `transact()` opens Seeker app
   - User grants authorization
   - Auth token and public key are returned
   - Token stored in AsyncStorage for silent reconnect

2. **Silent Reconnect:**
   - On app startup, check for stored auth token
   - If found, call `wallet.reauthorize()`
   - If fails, prompt user to re-authorize

3. **Signing:**
   - Use `signTransaction()` for transaction signing
   - Use `signMessage()` for message signing

### Testing Seeker Integration

1. Install Seeker wallet on your device
2. Run the app: `npm run android` or `npm run ios`
3. Navigate to Login screen
4. Tap "Connect with Seeker"
5. Approve the authorization in Seeker

## Socket.IO Integration

The app connects to the game server via WebSocket:

- **Auto-connect** on app start
- **Auto-reconnect** with exponential backoff
- **Silent re-authentication** using stored JWT token
- **Graceful disconnect** on app background

## i18n (Internationalization)

The app supports multiple languages:

- **Auto-detection** of device language on first launch
- **Manual language selection** in Settings
- **Persistent** language preference
- **Supported languages:** English (en), Turkish (tr)

### Adding Translations

Edit the translation files in `src/services/i18n/translations/`:

```json
{
  "yourKey": {
    "translation": "Your text here"
  }
}
```

## Key Features

- ✅ Seeker wallet integration (in-app wallet connection)
- ✅ AsyncStorage for persistent preferences
- ✅ i18n with auto language detection
- ✅ React Navigation v7
- ✅ Socket.IO with silent reconnect
- ✅ Email/password authentication
- ✅ Auto-login with stored tokens

## TODO (Remaining Implementation)

- [ ] Complete LoginScreen implementation
- [ ] Complete RegisterScreen implementation
- [ ] Complete WalletAuthScreen implementation
- [ ] Migrate LobbyScreen from web
- [ ] Migrate GameRoomScreen from web (605 lines)
- [ ] Create card components (PlayingCard, CardHand)
- [ ] Complete LeaderboardScreen
- [ ] Complete ProfileScreen
- [ ] Complete SettingsScreen
- [ ] Add card images/assets
- [ ] Implement landscape orientation for game
- [ ] Add vibration feedback
- [ ] Add sound effects
- [ ] Test on real devices

## Development Notes

- Player identification uses `playerId` (wallet publicKey or email UUID), NOT socketId
- Game state is server-authoritative
- All game logic runs on the server
- Client only renders UI and sends actions

## Troubleshooting

### Metro bundler issues
```bash
npx expo start --clear
```

### iOS build issues
```bash
cd ios && pod install && cd ..
```

### Seeker not connecting
- Make sure Seeker app is installed
- Check that `solana-wallet://` scheme is registered in app.json
- Try clearing app data and reconnecting

## License

See LICENSE file in root directory.
