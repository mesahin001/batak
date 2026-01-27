/**
 * Ana oyun sahnesi.
 * Kart masası, oyuncu alanları ve trik görselleştirmesini yönetir.
 */

import Phaser from 'phaser';
import { Card, Suit, Rank } from '../../types/game';

interface GameCallbacks {
  onCardPlay: (cardId: string) => void;
  onBid: (suit: string, amount: number) => void;
}
 */
export default class GameScene extends Phaser.Scene {
  private callbacks?: GameCallbacks;
  private cards: Phaser.GameObjects.Container[] = [];
  private playerHand: Card[] = [];
  private selectedCard: Phaser.GameObjects.Container | null = null;
  private cardWidth = 60;
  private cardHeight = 84;

  constructor() {
    super({ key: 'GameScene' });
  }

  setCallbacks(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
  }

  create() {
    console.log('GameScene created');

    // Create green felt background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a472a, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Add table pattern
    this.createTablePattern();

    // Create player areas
    this.createPlayerAreas();

    // Create center play area
    this.createPlayArea();

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createTablePattern() {
    const pattern = this.add.graphics();
    pattern.lineStyle(2, 0x2d5a3d, 0.3);

    // Draw subtle card table pattern
    for (let x = 0; x < this.scale.width; x += 50) {
      pattern.lineBetween(x, 0, x, this.scale.height);
    }
    for (let y = 0; y < this.scale.height; y += 50) {
      pattern.lineBetween(0, y, this.scale.width, y);
    }
  }

  private createPlayerAreas() {
    // Bottom (current player)
    this.createPlayerArea('bottom', this.scale.width / 2, this.scale.height - 100);

    // Left
    this.createPlayerArea('left', 60, this.scale.height / 2);

    // Top
    this.createPlayerArea('top', this.scale.width / 2, 60);

    // Right
    this.createPlayerArea('right', this.scale.width - 60, this.scale.height / 2);
  }

  private createPlayerArea(position: string, x: number, y: number) {
    const container = this.add.container(x, y);

    // Player info background
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x16213e, 0.8);
    infoBg.fillRoundedRect(-50, -15, 100, 30, 8);

    // Player name
    const nameText = this.add.text(0, 0, position, {
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([infoBg, nameText]);

    // Position based on location
    if (position === 'left') container.setRotation(-Math.PI / 2);
    if (position === 'right') container.setRotation(Math.PI / 2);
  }

  private createPlayArea() {
    // Center play area for tricks
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const playArea = this.add.graphics();
    playArea.lineStyle(2, 0x0f3460, 0.5);
    playArea.strokeRect(centerX - 100, centerY - 100, 200, 200);
  }

  /**
   * Update player's hand
   */
  updateHand(cards: Card[]) {
    this.playerHand = cards;

    // Clear existing cards
    this.cards.forEach(card => card.destroy());
    this.cards = [];

    // Create card sprites
    const startX = (this.scale.width - (cards.length * 50)) / 2;
    const y = this.scale.height - 150;

    cards.forEach((card, index) => {
      const cardContainer = this.createCard(card, startX + index * 50, y);
      this.cards.push(cardContainer);
    });
  }

  /**
   * Create a card sprite
   */
  private createCard(card: Card, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);

    // Card border
    bg.lineStyle(2, 0xcccccc, 1);
    bg.strokeRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);

    // Get suit color
    const suitColor = this.getSuitColor(card.suit);

    // Card rank
    const rankText = this.getRankSymbol(card.rank);
    const rank = this.add.text(-this.cardWidth / 2 + 8, -this.cardHeight / 2 + 10, rankText, {
      fontSize: '16px',
      color: suitColor,
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    // Suit symbol
    const suitSymbol = this.getSuitSymbol(card.suit);
    const suit = this.add.text(0, 0, suitSymbol, {
      fontSize: '24px',
      color: suitColor,
    }).setOrigin(0.5);

    container.add([bg, rank, suit]);
    container.setData('cardId', card.id);

    // Make interactive
    container.setSize(this.cardWidth, this.cardHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      container.setY(y - 10);
    });

    container.on('pointerout', () => {
      if (this.selectedCard !== container) {
        container.setY(y);
      }
    });

    container.on('pointerdown', () => {
      this.selectCard(container, y);
    });

    return container;
  }

  /**
   * Handle card selection
   */
  private selectCard(container: Phaser.GameObjects.Container, originalY: number) {
    // Deselect previous
    if (this.selectedCard) {
      this.selectedCard.setY(originalY);
    }

    // Select new
    this.selectedCard = container;
    container.setY(originalY - 20);

    // Emit card play event
    const cardId = container.getData('cardId');
    this.callbacks?.onCardPlay(cardId);
  }

  /**
   * Get suit color
   */
  private getSuitColor(suit: Suit): string {
    const colors = {
      [Suit.SPADES]: '#3b82f6',
      [Suit.HEARTS]: '#ef4444',
      [Suit.DIAMONDS]: '#eab308',
      [Suit.CLUBS]: '#22c55e',
      [Suit.NONE]: '#ffffff',
    };
    return colors[suit] || '#ffffff';
  }

  /**
   * Get suit symbol
   */
  private getSuitSymbol(suit: Suit): string {
    const symbols = {
      [Suit.SPADES]: '♠',
      [Suit.HEARTS]: '♥',
      [Suit.DIAMONDS]: '♦',
      [Suit.CLUBS]: '♣',
      [Suit.NONE]: '',
    };
    return symbols[suit] || '';
  }

  /**
   * Get rank symbol
   */
  private getRankSymbol(rank: Rank): string {
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
    return symbols[rank] || '';
  }

  /**
   * Show card played in center
   */
  showCardPlayed(playerIndex: number, card: Card) {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Position based on player
    const positions = [
      { x: centerX, y: centerY + 50 },     // bottom
      { x: centerX - 50, y: centerY },     // left
      { x: centerX, y: centerY - 50 },     // top
      { x: centerX + 50, y: centerY },     // right
    ];

    const pos = positions[playerIndex];
    const cardContainer = this.createCard(card, pos.x, pos.y);
    cardContainer.setScale(0.8);
  }

  /**
   * Handle window resize
   */
  private handleResize(gameSize: Phaser.Structs.Size) {
    // Update layout
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.cameras.main.centerToBounds();
  }

  /**
   * Clear the scene
   */
  clearScene() {
    this.cards.forEach(card => card.destroy());
    this.cards = [];
    this.selectedCard = null;
  }
}
