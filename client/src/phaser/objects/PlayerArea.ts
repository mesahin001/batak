/**
 * Oyuncu alanı gösterimi.
 * İsim, skor, trik sayısı ve aktif oyuncu göstergesi.
 */

import Phaser from 'phaser';
import { PlayerState } from '../../types/game';
export class PlayerArea extends Phaser.GameObjects.Container {
  private playerName: Phaser.GameObjects.Text;
  private playerInfo: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;
  private avatar: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: PlayerState,
    isCurrentPlayer: boolean = false
  ) {
    super(scene, x, y);
    this.createPlayerArea(player, isCurrentPlayer);
    scene.add.existing(this);
  }

  private createPlayerArea(player: PlayerState, isCurrentPlayer: boolean): void {
    // Background
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0x16213e, 0.9);
    this.background.fillRoundedRect(-60, -40, 120, 80, 12);

    if (isCurrentPlayer) {
      this.background.lineStyle(2, 0xe94560, 1);
      this.background.strokeRoundedRect(-60, -40, 120, 80, 12);
    }

    this.add(this.background);

    // Avatar
    this.avatar = this.createAvatar(player);
    this.add(this.avatar);

    // Player name
    this.playerName = this.scene.add.text(0, -15, player.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(this.playerName);

    // Player info (tricks, score)
    this.playerInfo = this.scene.add.text(0, 10, `${player.tricksWon} tricks | ${player.score} pts`, {
      fontSize: '11px',
      color: '#a0a0a0',
    }).setOrigin(0.5);
    this.add(this.playerInfo);
  }

  private createAvatar(player: PlayerState): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, -55);

    // Background circle
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f3460, 1);
    bg.fillCircle(0, 0, 20);

    if (player.type === 'bot') {
      // Bot icon
      const icon = this.scene.add.text(0, 0, '🤖', {
        fontSize: '20px',
      }).setOrigin(0.5);
      container.add([bg, icon]);
    } else {
      // Human icon
      const icon = this.scene.add.text(0, 0, '👤', {
        fontSize: '20px',
      }).setOrigin(0.5);
      container.add([bg, icon]);
    }

    return container;
  }

  /**
   * Update player info
   */
  updateInfo(tricks: number, score: number): void {
    this.playerInfo.setText(`${tricks} tricks | ${score} pts`);
  }

  /**
   * Set as current player (highlight)
   */
  setCurrent(isCurrent: boolean): void {
    this.background.clear();
    this.background.fillStyle(0x16213e, 0.9);
    this.background.fillRoundedRect(-60, -40, 120, 80, 12);

    if (isCurrent) {
      this.background.lineStyle(3, 0xe94560, 1);
      this.background.strokeRoundedRect(-60, -40, 120, 80, 12);
    }

    // Pulse animation
    if (isCurrent) {
      this.scene.tweens.add({
        targets: this,
        scale: 1.05,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.killTweensOf(this);
      this.setScale(1);
    }
  }
}
