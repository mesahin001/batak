/**
 * Kart game object.
 * Tek bir kartın görsel temsili: yüz/arka, animasyonlar, tıklama.
 */

import Phaser from 'phaser';
import { Card as CardType, Suit, Rank } from '../../types/game';
export class Card extends Phaser.GameObjects.Container {
  private cardData: CardType;
  private faceUp: boolean;
  private cardWidth: number;
  private cardHeight: number;
  private background: Phaser.GameObjects.Graphics;
  private rankText: Phaser.GameObjects.Text;
  private suitText: Phaser.GameObjects.Text;
  private cornerSuit: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cardData: CardType,
    faceUp: boolean = true
  ) {
    super(scene, x, y);
    this.cardData = cardData;
    this.faceUp = faceUp;
    this.cardWidth = 60;
    this.cardHeight = 84;

    // Create card visuals
    this.createCard();
    scene.add.existing(this);

    // Set size for interaction
    this.setSize(this.cardWidth, this.cardHeight);
  }

  private createCard(): void {
    // Background
    this.background = this.scene.add.graphics();

    if (this.faceUp) {
      this.drawFaceUp();
    } else {
      this.drawFaceDown();
    }

    this.add(this.background);

    if (this.faceUp) {
      // Rank (top left)
      this.rankText = this.scene.add.text(
        -this.cardWidth / 2 + 6,
        -this.cardHeight / 2 + 6,
        this.getRankSymbol(),
        {
          fontSize: '14px',
          color: this.getSuitColor(),
          fontStyle: 'bold',
        }
      );
      this.add(this.rankText);

      // Suit (center)
      this.suitText = this.scene.add.text(
        0,
        0,
        this.getSuitSymbol(),
        {
          fontSize: '28px',
          color: this.getSuitColor(),
        }
      ).setOrigin(0.5);
      this.add(this.suitText);

      // Suit (bottom right, rotated)
      this.cornerSuit = this.scene.add.text(
        this.cardWidth / 2 - 6,
        this.cardHeight / 2 - 6,
        this.getSuitSymbol(),
        {
          fontSize: '14px',
          color: this.getSuitColor(),
        }
      ).setOrigin(1, 1).setRotation(Math.PI);
      this.add(this.cornerSuit);
    }
  }

  private drawFaceUp(): void {
    const bg = this.background;
    bg.clear();

    // White card body
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(
      -this.cardWidth / 2,
      -this.cardHeight / 2,
      this.cardWidth,
      this.cardHeight,
      6
    );

    // Border
    bg.lineStyle(2, 0xcccccc, 1);
    bg.strokeRoundedRect(
      -this.cardWidth / 2,
      -this.cardHeight / 2,
      this.cardWidth,
      this.cardHeight,
      6
    );
  }

  private drawFaceDown(): void {
    const bg = this.background;
    bg.clear();

    // Card back pattern
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(
      -this.cardWidth / 2,
      -this.cardHeight / 2,
      this.cardWidth,
      this.cardHeight,
      6
    );

    // Decorative border
    bg.lineStyle(3, 0xe94560, 1);
    bg.strokeRoundedRect(
      -this.cardWidth / 2 + 4,
      -this.cardHeight / 2 + 4,
      this.cardWidth - 8,
      this.cardHeight - 8,
      4
    );

    // Center pattern
    bg.fillStyle(0xe94560, 0.3);
    bg.fillCircle(0, 0, 15);
  }

  private getSuitSymbol(): string {
    const symbols = {
      [Suit.SPADES]: '♠',
      [Suit.HEARTS]: '♥',
      [Suit.DIAMONDS]: '♦',
      [Suit.CLUBS]: '♣',
      [Suit.NONE]: '',
    };
    return symbols[this.cardData.suit] || '';
  }

  private getSuitColor(): string {
    const colors = {
      [Suit.SPADES]: '#3b82f6',
      [Suit.HEARTS]: '#ef4444',
      [Suit.DIAMONDS]: '#eab308',
      [Suit.CLUBS]: '#22c55e',
      [Suit.NONE]: '#ffffff',
    };
    return colors[this.cardData.suit] || '#ffffff';
  }

  private getRankSymbol(): string {
    const symbols = {
      [Rank.SEVEN]: '7',
      [Rank.EIGHT]: '8',
      [Rank.NINE]: '9',
      [Rank.TEN]: '10',
      [Rank.JACK]: 'J',
      [Rank.QUEEN]: 'Q',
      [Rank.KING]: 'K',
      [Rank.ACE]: 'A',
    };
    return symbols[this.cardData.rank] || '';
  }

  /**
   * Flip the card
   */
  flip(faceUp?: boolean): void {
    this.faceUp = faceUp !== undefined ? faceUp : !this.faceUp;
    this.background.clear();

    if (this.faceUp) {
      this.drawFaceUp();
      this.rankText.setVisible(true);
      this.suitText.setVisible(true);
      this.cornerSuit.setVisible(true);
    } else {
      this.drawFaceDown();
      this.rankText.setVisible(false);
      this.suitText.setVisible(false);
      this.cornerSuit.setVisible(false);
    }
  }

  /**
   * Get card data
   */
  getCardData(): CardType {
    return this.cardData;
  }

  /**
   * Check if card is face up
   */
  isFaceUp(): boolean {
    return this.faceUp;
  }

  /**
   * Highlight card
   */
  highlight(highlight: boolean = true): void {
    if (highlight) {
      this.setY(this.y - 15);
    } else {
      this.setY(this.y + 15);
    }
  }

  /**
   * Animate card to position
   */
  async animateTo(x: number, y: number, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: x,
        y: y,
        duration: duration,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Play card with animation
   */
  async play(centerX: number, centerY: number): Promise<void> {
    await this.animateTo(centerX, centerY, 400);
  }
}
