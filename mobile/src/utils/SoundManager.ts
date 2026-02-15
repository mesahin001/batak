/**
 * Mobile Sound Manager - Expo AV wrapper
 * Handles all game sound effects with preloading and volume control
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundEffect =
  | 'card-shuffle'
  | 'card-play'
  | 'trick-win'
  | 'bid-placed'
  | 'round-complete'
  | 'game-complete';

class MobileSoundManager {
  private sounds: Map<SoundEffect, Audio.Sound> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5; // 50% default volume
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;

    // Load saved preferences
    try {
      const savedEnabled = await AsyncStorage.getItem('batak_sounds_enabled');
      const savedVolume = await AsyncStorage.getItem('batak_sounds_volume');

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
    } catch (err) {
      console.warn('[SoundManager] Failed to load preferences:', err);
    }

    // Set audio mode
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (err) {
      console.warn('[SoundManager] Failed to set audio mode:', err);
    }

    this.initialized = true;
  }

  /**
   * Generate simple sound effects using oscillator patterns
   * These are synthesized sounds - replace with real audio files later if needed
   */
  private async loadSound(effect: SoundEffect): Promise<Audio.Sound | null> {
    try {
      // For now, we'll use a simple beep sound
      // In production, load from assets:
      // const { sound } = await Audio.Sound.createAsync(
      //   require(`../../assets/sounds/${effect}.mp3`)
      // );

      // Placeholder: Create silence (replace with actual audio files)
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Dummy URL
        { shouldPlay: false, volume: this.volume }
      );

      return sound;
    } catch (err) {
      console.warn(`[SoundManager] Failed to load ${effect}:`, err);
      return null;
    }
  }

  /**
   * Play a sound effect
   */
  async play(effect: SoundEffect) {
    if (!this.enabled) return;
    if (!this.initialized) {
      await this.init();
    }

    try {
      // Generate synthetic sound based on effect type
      // This is a simple implementation - can be enhanced with actual audio files
      await this.playSyntheticSound(effect);
    } catch (err) {
      console.warn(`[SoundManager] Failed to play ${effect}:`, err);
    }
  }

  /**
   * Play synthetic sound (temporary solution until we have audio files)
   */
  private async playSyntheticSound(effect: SoundEffect) {
    // For mobile, we'll use haptic feedback as a placeholder
    // since generating audio programmatically is more complex
    const { Vibration } = await import('react-native');

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

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    try {
      await AsyncStorage.setItem('batak_sounds_volume', String(this.volume));

      // Update volume for all loaded sounds
      for (const sound of this.sounds.values()) {
        await sound.setVolumeAsync(this.volume);
      }
    } catch (err) {
      console.warn('[SoundManager] Failed to set volume:', err);
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Cleanup sounds
   */
  async cleanup() {
    for (const sound of this.sounds.values()) {
      try {
        await sound.unloadAsync();
      } catch (err) {
        console.warn('[SoundManager] Failed to unload sound:', err);
      }
    }
    this.sounds.clear();
  }
}

// Singleton instance
export const soundManager = new MobileSoundManager();
