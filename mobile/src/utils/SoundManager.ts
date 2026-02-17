/**
 * Mobile Sound Manager - Haptic Feedback (Vibration)
 * Handles all game sound effects using built-in Vibration API
 */

import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundEffect =
  | 'card-shuffle'
  | 'card-play'
  | 'trick-win'
  | 'bid-placed'
  | 'round-complete'
  | 'game-complete';

class MobileSoundManager {
  private enabled: boolean = true;

  async init() {
    // Load saved preferences
    try {
      const savedEnabled = await AsyncStorage.getItem('batak_sounds_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
    } catch (err) {
      console.warn('[SoundManager] Failed to load preferences:', err);
    }
  }


  /**
   * Play a sound effect using haptic feedback
   */
  play(effect: SoundEffect) {
    if (!this.enabled) return;

    switch (effect) {
      case 'card-play':
        Vibration.vibrate(30); // Short tap
        break;
      case 'trick-win':
        Vibration.vibrate([0, 50, 50, 50]); // Three short bursts
        break;
      case 'bid-placed':
        Vibration.vibrate(50); // Medium tap
        break;
      case 'round-complete':
        Vibration.vibrate([0, 100, 100, 100, 100, 100]); // Success pattern
        break;
      case 'game-complete':
        Vibration.vibrate([0, 100, 50, 100, 50, 200]); // Fanfare pattern
        break;
      case 'card-shuffle':
        Vibration.vibrate([0, 30, 30, 30, 30, 30]); // Shuffle pattern
        break;
    }
  }

  /**
   * Enable/disable all sounds
   */
  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      await AsyncStorage.setItem('batak_sounds_enabled', String(enabled));
    } catch (err) {
      console.warn('[SoundManager] Failed to save enabled state:', err);
    }
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

}

// Singleton instance
export const soundManager = new MobileSoundManager();
