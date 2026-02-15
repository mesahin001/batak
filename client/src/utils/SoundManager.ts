/**
 * Sound Manager - HTML5 Audio API wrapper
 * Handles all game sound effects with preloading and volume control
 */

export type SoundEffect =
  | 'card-shuffle'
  | 'card-play'
  | 'trick-win'
  | 'bid-placed'
  | 'round-complete'
  | 'game-complete';

class SoundManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5; // 50% default volume

  constructor() {
    // Check localStorage for saved preferences
    const savedEnabled = localStorage.getItem('batak_sounds_enabled');
    const savedVolume = localStorage.getItem('batak_sounds_volume');

    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }

    this.initSounds();
  }

  private initSounds() {
    // Try to load real audio files first, fallback to generated sounds
    import('./generateSounds').then(({
      generateCardShuffleSound,
      generateCardPlaySound,
      generateTrickWinSound,
      generateBidPlacedSound,
      generateRoundCompleteSound,
      generateGameCompleteSound
    }) => {
      const generators: Record<SoundEffect, () => HTMLAudioElement> = {
        'card-shuffle': generateCardShuffleSound,
        'card-play': generateCardPlaySound,
        'trick-win': generateTrickWinSound,
        'bid-placed': generateBidPlacedSound,
        'round-complete': generateRoundCompleteSound,
        'game-complete': generateGameCompleteSound,
      };

      for (const [effect, generator] of Object.entries(generators)) {
        try {
          const audio = generator();
          audio.volume = this.volume;
          this.sounds.set(effect as SoundEffect, audio);
        } catch (err) {
          console.warn(`[SoundManager] Failed to generate sound: ${effect}`, err);
        }
      }
    }).catch(err => {
      console.warn('[SoundManager] Failed to load sound generators', err);
    });
  }

  /**
   * Play a sound effect
   */
  play(effect: SoundEffect) {
    if (!this.enabled) return;

    const audio = this.sounds.get(effect);
    if (!audio) {
      console.warn(`[SoundManager] Sound not found: ${effect}`);
      return;
    }

    // Clone the audio node to allow overlapping sounds
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = this.volume;

    clone.play().catch(err => {
      console.warn(`[SoundManager] Failed to play ${effect}:`, err);
    });
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('batak_sounds_enabled', String(enabled));
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
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('batak_sounds_volume', String(this.volume));

    // Update volume for all loaded sounds
    for (const audio of this.sounds.values()) {
      audio.volume = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Preload all sounds (call this on app init)
   */
  preloadAll() {
    for (const audio of this.sounds.values()) {
      audio.load();
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();
