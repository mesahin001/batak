/**
 * Oyun state makinesi.
 * LOBBY → BIDDING → PLAYING → SCORING → FINISHED geçişlerini yönetir.
 * Tüm oyun mantığının merkezi: kart dağıtma, ihale, oynama, skor hesaplama.
 */

import { GameState, GameRoom, Suit, RoundRecord, PlayerType } from '../types/game.js';
import { Deck } from './Deck.js';
import {
  createPlayer,
  dealCardsToPlayer,
  removeCardFromHand,
  addTrickWin
} from './Player.js';
import {
  calculateScores,
  calculateTrickWinner,
  checkKingWinner,
  getHighestScorer
} from './Scoring.js';
import { validateCardPlay, validateBid } from './TurnValidator.js';

/**
 * Configuration for game duration
 */
export const TOTAL_ROUNDS_OPTIONS = [5, 7, 9, 11] as const;
export const DEFAULT_TOTAL_ROUNDS = 5;

/**
 * Game state machine for managing Batak game flow
 * Supports multi-round games where lowest cumulative score wins
 */
export class GameStateMachine {
  private room: GameRoom;
  private deck: Deck;

  constructor(roomId: string, totalRounds: number = DEFAULT_TOTAL_ROUNDS, gameMode: 'koz_maca' | 'ihaleli_batak' = 'koz_maca') {
    this.deck = new Deck();
    this.room = {
      id: roomId,
      state: GameState.LOBBY,
      players: [],
      currentTrick: {
        cards: [],
        winnerId: null,
        leadSuit: Suit.NONE
      },
      tricks: [],
      trumpSuit: null,
      currentPlayerIndex: 0,
      dealerIndex: 0,
      bids: [],
      scores: [],

      // Multi-round support
      currentRound: 1,
      totalRounds: totalRounds,
      roundHistory: [],
      winner: null,

      // Game mode
      gameMode: gameMode,

      createdAt: new Date(),
      lastUpdated: new Date()
    };
  }

  /**
   * Get current room state
   */
  getRoom(): GameRoom {
    return { ...this.room };
  }

  /**
   * Debug: Print all players in room with their IDs
   */
  debugPrintPlayers(): void {
    console.log('[GameStateMachine] Current players in room:');
    this.room.players.forEach((p, i) => {
      console.log(`  [${i}] id: ${p.id.slice(0, 20)}, name: ${p.name}, type: ${p.type}, hand size: ${p.hand.length}`);
    });
  }

  /**
   * Get current round number
   */
  getCurrentRound(): number {
    return this.room.currentRound;
  }

  /**
   * Get total rounds
   */
  getTotalRounds(): number {
    return this.room.totalRounds;
  }

  /**
   * Get round history
   */
  getRoundHistory(): RoundRecord[] {
    return [...this.room.roundHistory];
  }

  /**
   * Check if game is finished
   */
  isFinished(): boolean {
    return this.room.state === GameState.FINISHED;
  }

  /**
   * Check if can start next round
   */
  canStartNextRound(): boolean {
    return this.room.state === GameState.SCORING && this.room.winner === null;
  }

  /**
   * Add player to room
   */
  addPlayer(playerId: string, playerName: string, isBot: boolean = false, publicKey?: string): void {
    if (this.room.players.length >= 4) {
      throw new Error('Room is full');
    }

    const player = createPlayer(
      playerId,
      playerName,
      isBot ? PlayerType.BOT : PlayerType.HUMAN,
      publicKey
    );

    this.room.players.push(player);
    this.room.lastUpdated = new Date();
  }

  /**
   * Remove player from room
   */
  removePlayer(playerId: string): void {
    this.room.players = this.room.players.filter(p => p.id !== playerId);
    this.room.lastUpdated = new Date();
  }

  /**
   * Start the game - deal cards and enter bidding phase
   */
  startGame(): void {
    if (this.room.players.length !== 4) {
      throw new Error('Need 4 players to start');
    }

    // Initialize and shuffle deck
    this.deck.initialize();

    // Deal cards to players
    const hands = this.deck.deal(4);
    this.room.players = this.room.players.map((player, index) =>
      dealCardsToPlayer(player, hands[index])
    );

    // Set first player to bid (left of dealer)
    this.room.currentPlayerIndex = (this.room.dealerIndex + 1) % 4;

    // Koz Maça: Spades is always trump, but still do bidding for trick count
    if (this.room.gameMode === 'koz_maca') {
      this.room.trumpSuit = Suit.SPADES;
      console.log('[startGame] Koz Maça mode - trump set to Spades, entering BIDDING');
    }

    // Enter bidding phase (both game modes have bidding)
    this.room.state = GameState.BIDDING;
    this.room.lastUpdated = new Date();
  }

  /**
   * Submit a bid
   */
  submitBid(playerId: string, suit: Suit, amount: number, type?: string): void {
    if (this.room.state !== GameState.BIDDING) {
      throw new Error('Not in bidding phase');
    }

    const player = this.room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.id !== this.room.players[this.room.currentPlayerIndex].id) {
      throw new Error('Not your turn to bid');
    }

    // Validate bid
    const validation = validateBid(
      player,
      suit,
      amount,
      this.getCurrentHighestBid(),
      this.room.gameMode
    );

    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Record bid with type
    this.room.bids.push({
      playerId,
      suit,
      amount,
      type: type as any // BidType enum
    });

    // Move to next player
    this.nextPlayer();
  }

  /**
   * Pass on bidding
   */
  passBid(playerId: string): void {
    if (this.room.state !== GameState.BIDDING) {
      throw new Error('Not in bidding phase');
    }

    const player = this.room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Record pass with amount 0 so we can track how many players have had a turn
    this.room.bids.push({
      playerId,
      suit: Suit.NONE,  // No suit when passing
      amount: 0
    });

    // Move to next player
    this.nextPlayer();

    // Check if all players have passed (everyone bid 0)
    if (this.room.bids.length === 4 && this.room.bids.every(b => b.amount === 0)) {
      // All passed - redeal
      console.log('[Bidding] All players passed, redealing...');
      this.redeal();
    }
  }

  /**
   * Start playing phase after bidding is complete
   */
  startPlaying(): void {
    if (this.room.bids.length === 0) {
      throw new Error('No bids placed');
    }

    // Get highest bidder
    const highestBid = this.getHighestBid();
    this.room.trumpSuit = highestBid.suit;

    // Highest bidder leads first trick
    const bidderIndex = this.room.players.findIndex(p => p.id === highestBid.playerId);
    this.room.currentPlayerIndex = bidderIndex;

    this.room.state = GameState.PLAYING;
    this.room.lastUpdated = new Date();
  }

  /**
   * Play a card
   */
  playCard(playerId: string, cardId: string): void {
    if (this.room.state !== GameState.PLAYING) {
      throw new Error('Not in playing phase');
    }

    const playerIndex = this.room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.room.currentPlayerIndex) {
      throw new Error('Not your turn');
    }

    const player = this.room.players[playerIndex];
    const card = player.hand.find(c => c.id === cardId);

    if (!card) {
      throw new Error('Card not in hand');
    }

    // Set lead suit if first card of trick
    if (this.room.currentTrick.cards.length === 0) {
      this.room.currentTrick.leadSuit = card.suit;
    }

    // Validate card play
    const validation = validateCardPlay(
      player,
      card,
      this.room.currentTrick.leadSuit,
      true,
      this.room.trumpSuit,
      this.room.currentTrick.cards.map(c => c.card)
    );

    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Add card to current trick
    this.room.currentTrick.cards.push({
      playerId,
      card
    });

    // Remove card from hand
    this.room.players[playerIndex] = removeCardFromHand(player, cardId);

    // Check if trick is complete
    if (this.room.currentTrick.cards.length === 4) {
      // Mark trick as complete but DON'T clear yet - let server control when to clear
      this.completeTrick();
    } else {
      // Move to next player
      this.nextPlayer();
    }

    this.room.lastUpdated = new Date();
  }

  /**
   * Complete current trick and award to winner
   */
  private completeTrick(): void {
    const winnerId = calculateTrickWinner(
      this.room.currentTrick.cards,
      this.room.currentTrick.leadSuit,
      this.room.trumpSuit
    );

    this.room.currentTrick.winnerId = winnerId;
    this.room.tricks.push({ ...this.room.currentTrick });

    // Award trick to winner
    const winnerIndex = this.room.players.findIndex(p => p.id === winnerId);
    this.room.players[winnerIndex] = addTrickWin(this.room.players[winnerIndex]);

    // Winner leads next trick
    this.room.currentPlayerIndex = winnerIndex;

    // DON'T reset current trick yet - let clearTrick() do that after delay
    // Check if all tricks have been played
    if (this.room.tricks.length === 13) {
      this.completeRound();
    }
  }

  /**
   * Clear the current trick after showing it to players
   */
  clearTrick(): void {
    // Reset current trick for next round
    this.room.currentTrick = {
      cards: [],
      winnerId: null,
      leadSuit: Suit.NONE
    };
    this.room.lastUpdated = new Date();
  }

  /**
   * Complete round and calculate scores
   */
  private completeRound(): void {
    console.log('[completeRound] Round OVER! Setting state to SCORING');
    console.log('[completeRound] Tricks played:', this.room.tricks.length);
    this.room.state = GameState.SCORING;
    console.log('[completeRound] New state:', this.room.state);

    // Calculate scores using the game mode (pass bids array for proper lookup)
    this.room.players = calculateScores(this.room.players, this.room.trumpSuit, this.room.bids, this.room.gameMode);
    this.room.scores = this.room.players.map(p => p.score);

    // Check for King winner (instant win) - optional feature
    for (const player of this.room.players) {
      if (checkKingWinner(player)) {
        console.log('[completeRound] King winner detected:', player.name);
        this.completeGame(player.id);
        return;
      }
    }

    // NO EARLY GAME END - both modes play all rounds
    // Game ends when max rounds reached, not by score threshold

    // Check if we've reached max rounds - end game with appropriate winner
    if (this.room.currentRound >= this.room.totalRounds) {
      console.log('[completeRound] Max rounds reached, ending game');
      // Both modes: HIGHEST score wins
      const winner = getHighestScorer(this.room.players);
      if (winner) {
        console.log('[completeRound] Winner:', winner.name, 'with score:', winner.totalScore, 'mode:', this.room.gameMode);
        this.completeGame(winner.id);
        return;
      }
    }

    this.room.lastUpdated = new Date();
  }

  /**
   * Start the next round (multi-round game)
   */
  startNextRound(): void {
    if (!this.canStartNextRound()) {
      throw new Error('Cannot start next round - game not in SCORING state or already finished');
    }

    console.log('[startNextRound] Starting round', this.room.currentRound + 1);

    // Check if we've reached max rounds
    if (this.room.currentRound >= this.room.totalRounds) {
      // Game over - winner depends on game mode
      // Both modes: HIGHEST score wins
      const winner = getHighestScorer(this.room.players);
      if (winner) {
        console.log('[startNextRound] Max rounds reached, winner:', winner.name, 'score:', winner.totalScore, 'mode:', this.room.gameMode);
        this.completeGame(winner.id);
      }
      return;
    }

    // Save current round to history
    this.room.roundHistory.push({
      roundNumber: this.room.currentRound,
      bids: [...this.room.bids],
      tricks: [...this.room.tricks],
      scores: this.room.players.map(p => p.score),
      winnerId: this.getTrickWinnerId()
    });

    // Increment round
    this.room.currentRound++;

    // Reset for next round
    this.room.tricks = [];
    this.room.bids = [];
    this.room.currentPlayerIndex = (this.room.dealerIndex + 1) % 4;
    this.room.dealerIndex = this.room.currentPlayerIndex;
    this.room.trumpSuit = null;
    this.room.currentTrick = {
      cards: [],
      winnerId: null,
      leadSuit: Suit.NONE
    };

    // Deal new cards
    this.deck.initialize();
    const hands = this.deck.deal(4);

    // Reset players for new round (keep cumulative scores)
    this.room.players = this.room.players.map((player, index) => {
      const resetPlayer = {
        ...player,
        hand: [...hands[index]],
        tricksWon: 0,
        score: 0,
        bid: null,
        declaredKing: false,
        isReady: true
      };
      return resetPlayer;
    });

    // Set state based on game mode
    // Koz Maça: Spades is always trump, but still do bidding for trick count
    if (this.room.gameMode === 'koz_maca') {
      this.room.trumpSuit = Suit.SPADES;
      console.log('[startNextRound] Koz Maça mode - trump set to Spades, entering BIDDING');
    }
    // Enter bidding phase (both game modes have bidding)
    this.room.state = GameState.BIDDING;

    this.room.lastUpdated = new Date();

    console.log('[startNextRound] Round', this.room.currentRound, 'started');
  }

  /**
   * Complete the game and declare winner
   */
  private completeGame(winnerId: string): void {
    console.log('[completeGame] Game complete! Winner:', winnerId);
    this.room.state = GameState.FINISHED;
    this.room.winner = winnerId;
    this.room.lastUpdated = new Date();
  }

  /**
   * Get the ID of the player who won the most tricks this round
   */
  private getTrickWinnerId(): string {
    const winner = this.room.players.reduce((a, b) =>
      a.tricksWon > b.tricksWon ? a : b
    );
    return winner.id;
  }

  /**
   * Replace a human player with a bot (disconnect scenario)
   * Preserves hand, tricks, score, but changes identity to bot
   */
  replacePlayerWithBot(humanPlayerId: string, botId: string, botName: string): boolean {
    const playerIndex = this.room.players.findIndex(p => p.id === humanPlayerId);
    if (playerIndex === -1) return false;

    const oldId = this.room.players[playerIndex].id;

    // Update player identity
    this.room.players[playerIndex].id = botId;
    this.room.players[playerIndex].name = botName;
    this.room.players[playerIndex].type = PlayerType.BOT;

    // Update references in bids
    for (const bid of this.room.bids) {
      if (bid.playerId === oldId) {
        bid.playerId = botId;
      }
    }

    // Update references in current trick
    for (const play of this.room.currentTrick.cards) {
      if (play.playerId === oldId) {
        play.playerId = botId;
      }
    }

    // Update references in past tricks
    for (const trick of this.room.tricks) {
      for (const play of trick.cards) {
        if (play.playerId === oldId) {
          play.playerId = botId;
        }
      }
      if (trick.winnerId === oldId) {
        trick.winnerId = botId;
      }
    }

    // Update winner reference
    if (this.room.winner === oldId) {
      this.room.winner = botId;
    }

    this.room.lastUpdated = new Date();
    console.log(`[GameStateMachine] Replaced player ${oldId.slice(0, 8)} with bot ${botName}`);
    return true;
  }

  /**
   * Get game winner
   */
  getWinner(): string | null {
    return this.room.winner;
  }

  /**
   * Move to next player
   */
  private nextPlayer(): void {
    this.room.currentPlayerIndex = (this.room.currentPlayerIndex + 1) % 4;
  }

  /**
   * Get current highest bid
   */
  private getCurrentHighestBid(): number {
    if (this.room.bids.length === 0) return 0;
    const realBids = this.room.bids.filter(b => b.amount > 0);
    if (realBids.length === 0) return 0;
    return Math.max(...realBids.map(b => b.amount));
  }

  /**
   * Get highest bid
   */
  private getHighestBid(): { playerId: string; suit: Suit; amount: number } {
    // Filter out pass bids (amount: 0) first
    const realBids = this.room.bids.filter(b => b.amount > 0);
    if (realBids.length === 0) {
      // Should not happen as startPlaying checks this
      return this.room.bids[0];
    }
    const highest = realBids.reduce((highest, current) =>
      current.amount > highest.amount ? current : highest
    );
    return highest;
  }

  /**
   * Redeal cards (when all players pass)
   */
  private redeal(): void {
    this.room.bids = [];
    this.room.tricks = [];
    this.room.currentTrick = {
      cards: [],
      winnerId: null,
      leadSuit: Suit.NONE
    };
    this.room.trumpSuit = null;

    // Move dealer
    this.room.dealerIndex = (this.room.dealerIndex + 1) % 4;

    // Redeal
    this.deck.initialize();
    const hands = this.deck.deal(4);
    this.room.players = this.room.players.map((player, index) =>
      dealCardsToPlayer(player, hands[index])
    );

    this.room.currentPlayerIndex = (this.room.dealerIndex + 1) % 4;
  }

  /**
   * Get game state for client (hides other players' cards)
   */
  getStateForClient(playerId: string): any {
    const playerIndex = this.room.players.findIndex(p => p.id === playerId);

    console.log('[getStateForClient] Looking for playerId:', playerId);
    console.log('[getStateForClient] Room players (first 20 chars of each id):', this.room.players.map((p: any) => ({ id: p.id.slice(0, 20), name: p.name, type: p.type })));
    console.log('[getStateForClient] playerIndex:', playerIndex, 'total players:', this.room.players.length);

    if (playerIndex >= 0) {
      console.log('[getStateForClient] Player FOUND at index', playerIndex, 'hand size:', this.room.players[playerIndex].hand.length);
    } else {
      console.log('[getStateForClient] Player NOT FOUND - all cards will be hidden!');
    }

    const state = {
      state: this.room.state,
      currentPlayerIndex: this.room.currentPlayerIndex,
      trumpSuit: this.room.trumpSuit,
      currentTrick: this.room.currentTrick,
      tricks: this.room.tricks.length,
      bids: this.room.bids,
      currentRound: this.room.currentRound,
      totalRounds: this.room.totalRounds,
      roundHistory: this.room.roundHistory,
      winner: this.room.winner,
      gameMode: this.room.gameMode,
      players: this.room.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        tricksWon: p.tricksWon,
        score: p.score,            // Current round score
        totalScore: p.totalScore,  // Cumulative score
        roundScores: p.roundScores,
        bid: p.bid,
        hand: i === playerIndex ? p.hand : p.hand.map((_c, idx) => ({ id: `hidden-${i}-${idx}` })),
        handSize: p.hand.length
      }))
    };

    console.log('[getStateForClient] State players array:', state.players.map((p: any) => ({ id: p.id.slice(0, 20), name: p.name, handType: Array.isArray(p.hand) ? (p.hand[0]?.suit || 'hidden') : 'unknown' })));

    return state;
  }
}
