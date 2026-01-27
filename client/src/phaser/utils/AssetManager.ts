/**
 * Asset yöneticisi.
 * Kart görselleri ve diğer oyun asset'lerini yükler ve cache'ler.
 */

import Phaser from 'phaser';
export class AssetManager {
  private scene: Phaser.Scene;
  private loadedAssets: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Load card assets
   */
  loadCardAssets(): void {
    // For MVP, using procedural generation
    // In production, would load actual card images
    console.log('Card assets ready (procedural)');
  }

  /**
   * Load UI assets
   */
  loadUIAssets(): void {
    // Button styles, backgrounds, etc.
    console.log('UI assets ready (procedural)');
  }

  /**
   * Load sound effects
   */
  loadSoundEffects(): void {
    // Card flip, deal, win sounds
    console.log('Sound effects ready');
  }

  /**
   * Preload all assets
   */
  async preloadAll(): Promise<void> {
    return new Promise((resolve) => {
      this.loadCardAssets();
      this.loadUIAssets();
      this.loadSoundEffects();
      resolve();
    });
  }

  /**
   * Get card texture (procedural)
   */
  getCardTexture(suit: string, rank: number): Phaser.Textures.Texture {
    const key = `card_${suit}_${rank}`;
    return this.scene.textures.get(key);
  }

  /**
   * Create card texture procedurally
   */
  createCardTexture(suit: string, rank: number): void {
    const key = `card_${suit}_${rank}`;
    if (this.loadedAssets.has(key)) return;

    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    const width = 60;
    const height = 84;

    // Draw card
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, width, height, 6);

    // Add rank and suit
    graphics.generateTexture(key, width, height);
    graphics.destroy();

    this.loadedAssets.add(key);
  }
}
