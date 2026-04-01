import { describe, it, expect } from 'vitest';
import { createInitialState, placePiece, movePiece } from '@/lib/hive/board';
import { getValidPlacements, getValidMoves, getPlaceablePieces, mustPlaceQueen } from '@/lib/hive/rules';
import { hexKey } from '@/lib/hive/hex';

describe('Hive gameplay flow', () => {
  it('should create initial state correctly', () => {
    const state = createInitialState('Alice', 'Bob');
    expect(state.currentTurn).toBe('white');
    expect(state.turnNumber).toBe(0);
    expect(state.white.hand.queen).toBe(1);
    expect(state.white.hand.ant).toBe(3);
    expect(state.status).toBe('playing');
  });

  it('should allow first piece placement at origin', () => {
    const state = createInitialState('Alice', 'Bob');
    const placements = getValidPlacements(state, 'white');
    expect(placements).toHaveLength(1);
    expect(placements[0]).toEqual({ q: 0, r: 0 });
  });

  it('should place first piece and switch turns', () => {
    let state = createInitialState('Alice', 'Bob');
    const piece = { type: 'ant' as const, color: 'white' as const, id: 'w-ant-1' };
    state = placePiece(state, piece, { q: 0, r: 0 });
    
    expect(state.currentTurn).toBe('black');
    expect(state.turnNumber).toBe(1);
    expect(state.white.hand.ant).toBe(2);
    expect(state.board[hexKey({ q: 0, r: 0 })].pieces).toHaveLength(1);
  });

  it('should allow second piece adjacent to first', () => {
    let state = createInitialState('Alice', 'Bob');
    state = placePiece(state, { type: 'ant', color: 'white', id: 'w-ant-1' }, { q: 0, r: 0 });
    
    const placements = getValidPlacements(state, 'black');
    expect(placements.length).toBe(6); // all 6 neighbors of origin
  });

  it('should play multiple turns and enforce placement rules', () => {
    let state = createInitialState('Alice', 'Bob');
    
    // Turn 1: White places ant at origin
    state = placePiece(state, { type: 'ant', color: 'white', id: 'w-ant-1' }, { q: 0, r: 0 });
    expect(state.currentTurn).toBe('black');
    
    // Turn 2: Black places ant adjacent
    state = placePiece(state, { type: 'ant', color: 'black', id: 'b-ant-1' }, { q: 1, r: 0 });
    expect(state.currentTurn).toBe('white');
    
    // Turn 3: White places - must touch own pieces, not opponent
    const placements = getValidPlacements(state, 'white');
    // Should only be hexes touching white's ant but not black's ant
    for (const p of placements) {
      // Verify not adjacent to black piece at (1,0)
      const key = hexKey(p);
      expect(key).not.toBe('1,0');
    }
    expect(placements.length).toBeGreaterThan(0);
  });

  it('should enforce queen placement by turn 4', () => {
    let state = createInitialState('Alice', 'Bob');
    
    // White turn 1
    state = placePiece(state, { type: 'ant', color: 'white', id: 'w-ant-1' }, { q: 0, r: 0 });
    // Black turn 1
    state = placePiece(state, { type: 'ant', color: 'black', id: 'b-ant-1' }, { q: 1, r: 0 });
    // White turn 2
    state = placePiece(state, { type: 'spider', color: 'white', id: 'w-spider-1' }, { q: -1, r: 0 });
    // Black turn 2
    state = placePiece(state, { type: 'spider', color: 'black', id: 'b-spider-1' }, { q: 2, r: 0 });
    // White turn 3
    state = placePiece(state, { type: 'grasshopper', color: 'white', id: 'w-gh-1' }, { q: -1, r: 1 });
    // Black turn 3
    state = placePiece(state, { type: 'grasshopper', color: 'black', id: 'b-gh-1' }, { q: 2, r: -1 });
    
    // White turn 4 - must place queen
    expect(mustPlaceQueen(state, 'white')).toBe(true);
    const placeableTypes = getPlaceablePieces(state, 'white');
    expect(placeableTypes).toEqual(['queen']);
  });

  it('should allow piece movement after queen is placed', () => {
    let state = createInitialState('Alice', 'Bob');
    
    // Place queens and some pieces in a line
    state = placePiece(state, { type: 'queen', color: 'white', id: 'w-queen' }, { q: 0, r: 0 });
    state = placePiece(state, { type: 'queen', color: 'black', id: 'b-queen' }, { q: 1, r: 0 });
    
    // White should be able to move queen now
    const moves = getValidMoves(state, { q: 0, r: 0 });
    expect(moves.length).toBeGreaterThan(0);
  });

  it('should detect win when queen is surrounded', () => {
    let state = createInitialState('Alice', 'Bob');
    
    // Set up a position where black queen is surrounded
    // Place black queen at origin, surround with pieces
    state = placePiece(state, { type: 'queen', color: 'black', id: 'b-queen' }, { q: 0, r: 0 });
    state = placePiece(state, { type: 'ant', color: 'white', id: 'w-ant-1' }, { q: 1, r: -1 });
    state = placePiece(state, { type: 'ant', color: 'black', id: 'b-ant-1' }, { q: 1, r: 0 });
    state = placePiece(state, { type: 'ant', color: 'white', id: 'w-ant-2' }, { q: 0, r: 1 });
    state = placePiece(state, { type: 'spider', color: 'black', id: 'b-spider-1' }, { q: -1, r: 1 });
    state = placePiece(state, { type: 'spider', color: 'white', id: 'w-spider-1' }, { q: -1, r: 0 });
    // Last neighbor: (0, -1)
    state = placePiece(state, { type: 'grasshopper', color: 'black', id: 'b-gh-1' }, { q: 0, r: -1 });
    
    expect(state.status).toBe('white_wins');
  });

  it('should handle grasshopper jumping correctly', () => {
    let state = createInitialState('Alice', 'Bob');
    
    // Place pieces in a line: queen-ant-empty
    state = placePiece(state, { type: 'queen', color: 'white', id: 'w-queen' }, { q: 0, r: 0 });
    state = placePiece(state, { type: 'queen', color: 'black', id: 'b-queen' }, { q: 1, r: 0 });
    state = placePiece(state, { type: 'grasshopper', color: 'white', id: 'w-gh-1' }, { q: -1, r: 0 });
    
    // Grasshopper at (-1,0) should jump over queen at (0,0) and land past black queen
    const moves = getValidMoves(state, { q: -1, r: 0 });
    // Should jump in direction (1,0) over (0,0) and (1,0) to land at (2,0)
    expect(moves.some(m => m.q === 2 && m.r === 0)).toBe(true);
  });
});
