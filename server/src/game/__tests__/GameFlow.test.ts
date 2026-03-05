/**
 * Integration tests for complete game flow
 */

import { describe, it, expect } from '@jest/globals';
import { GameStateMachine } from '../GameStateMachine.js';
import { Suit } from '../../types/game.js';
import { getPlayableCards } from '../Player.js';

describe('Game Flow Integration', () => {
  it('should deal exactly 13 cards to each player at game start', () => {
    const machine = new GameStateMachine('test-room', 5, 'koz_maca');

    // Add 4 players
    machine.addPlayer('p1', 'Player 1', false);
    machine.addPlayer('p2', 'Player 2', true);
    machine.addPlayer('p3', 'Player 3', true);
    machine.addPlayer('p4', 'Player 4', true);

    // Start game
    machine.startGame();

    const state = machine.getRoom();

    // Check each player has 13 cards
    expect(state.players[0].hand.length).toBe(13);
    expect(state.players[1].hand.length).toBe(13);
    expect(state.players[2].hand.length).toBe(13);
    expect(state.players[3].hand.length).toBe(13);

    // Total cards = 52
    const totalCards = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalCards).toBe(52);
  });

  it('should maintain card count after playing tricks', () => {
    const machine = new GameStateMachine('test-room2', 5, 'koz_maca');

    // Add 4 players
    machine.addPlayer('p1', 'Player 1', false);
    machine.addPlayer('p2', 'Player 2', true);
    machine.addPlayer('p3', 'Player 3', true);
    machine.addPlayer('p4', 'Player 4', true);

    // Start game and complete bidding
    machine.startGame();

    // Bid in correct turn order
    let state = machine.getRoom();
    machine.submitBid(state.players[state.currentPlayerIndex].id, Suit.SPADES, 7);

    state = machine.getRoom();
    machine.passBid(state.players[state.currentPlayerIndex].id);

    state = machine.getRoom();
    machine.passBid(state.players[state.currentPlayerIndex].id);

    state = machine.getRoom();
    machine.passBid(state.players[state.currentPlayerIndex].id);

    machine.startPlaying();

    // Play first trick (4 cards)
    for (let i = 0; i < 4; i++) {
      state = machine.getRoom();
      const currentPlayer = state.players[state.currentPlayerIndex];
      const playableCards = getPlayableCards(currentPlayer, state.currentTrick.leadSuit, state.trumpSuit, state.currentTrick.cards.map(c => c.card));
      const card = playableCards[0];
      machine.playCard(currentPlayer.id, card.id);
    }

    state = machine.getRoom();
    // After 1 trick: total cards in hands = 52 - 4 = 48
    const totalAfterOneTrick = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalAfterOneTrick).toBe(48);

    // Each player should have 12 cards
    expect(state.players[0].hand.length).toBe(12);
    expect(state.players[1].hand.length).toBe(12);
    expect(state.players[2].hand.length).toBe(12);
    expect(state.players[3].hand.length).toBe(12);
  });

  it('should have 0 cards left after all 13 tricks', () => {
    const machine = new GameStateMachine('test-room3', 5, 'koz_maca');

    // Add 4 players
    machine.addPlayer('p1', 'Player 1', false);
    machine.addPlayer('p2', 'Player 2', true);
    machine.addPlayer('p3', 'Player 3', true);
    machine.addPlayer('p4', 'Player 4', true);

    // Start game and complete bidding
    machine.startGame();

    let gameState = machine.getRoom();
    machine.submitBid(gameState.players[gameState.currentPlayerIndex].id, Suit.SPADES, 7);

    gameState = machine.getRoom();
    machine.passBid(gameState.players[gameState.currentPlayerIndex].id);

    gameState = machine.getRoom();
    machine.passBid(gameState.players[gameState.currentPlayerIndex].id);

    gameState = machine.getRoom();
    machine.passBid(gameState.players[gameState.currentPlayerIndex].id);

    machine.startPlaying();

    // Play all 13 tricks
    for (let trickNum = 0; trickNum < 13; trickNum++) {
      // Play 4 cards (one complete trick)
      for (let cardNum = 0; cardNum < 4; cardNum++) {
        gameState = machine.getRoom();
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.hand.length === 0) {
          throw new Error(`Player ${currentPlayer.name} has no cards at trick ${trickNum + 1}, card ${cardNum + 1}`);
        }

        const playableCards = getPlayableCards(currentPlayer, gameState.currentTrick.leadSuit, gameState.trumpSuit, gameState.currentTrick.cards.map(c => c.card));
        const card = playableCards[0];
        machine.playCard(currentPlayer.id, card.id);
      }

      // Clear trick to start next one
      if (trickNum < 12) {
        machine.clearTrick();
      }
    }

    gameState = machine.getRoom();

    // After all 13 tricks, all players should have 0 cards
    expect(gameState.players[0].hand.length).toBe(0);
    expect(gameState.players[1].hand.length).toBe(0);
    expect(gameState.players[2].hand.length).toBe(0);
    expect(gameState.players[3].hand.length).toBe(0);

    // Total cards in hands = 0
    const totalCards = gameState.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalCards).toBe(0);

    // 13 tricks should be recorded
    expect(gameState.tricks.length).toBe(13);
  });
});
