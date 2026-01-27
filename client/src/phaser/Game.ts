/**
 * Phaser oyun başlatıcı.
 * Canvas tabanlı kart görselleştirmesi için Phaser.js konfigürasyonu.
 */

import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
export function initGame(
  container: HTMLElement,
  callbacks: {
    onCardPlay: (cardId: string) => void;
    onBid: (suit: string, amount: number) => void;
  }
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundColor: '#1a472a',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [GameScene],
    callbacks: {
      preBoot: (game) => {
        // Pass callbacks to scene
        (game.scene.getScene('GameScene') as GameScene).setCallbacks(callbacks);
      },
    },
  };

  const game = new Phaser.Game(config);
  return game;
}
