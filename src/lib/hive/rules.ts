// Hive game rules: placement and movement validation

import { GameState, Piece, PieceType, PlayerColor } from './types';
import { HexCoord, hexKey, hexNeighbors, hexEqual, commonNeighbors } from './hex';
import { getAllOccupiedCoords, isEmpty, getTopPiece, canPieceMove, getStack } from './board';

// ============= PLACEMENT RULES =============

export function getValidPlacements(state: GameState, color: PlayerColor): HexCoord[] {
  const occupied = getAllOccupiedCoords(state.board);
  
  // First piece: place at origin
  if (occupied.length === 0) {
    return [{ q: 0, r: 0 }];
  }
  
  // Second piece: must touch first piece
  if (occupied.length === 1) {
    return hexNeighbors(occupied[0]);
  }
  
  // Normal placement: must touch own pieces, not touch opponent pieces
  const candidates = new Set<string>();
  
  for (const coord of occupied) {
    const top = getTopPiece(state.board, coord);
    if (!top) continue;
    
    for (const neighbor of hexNeighbors(coord)) {
      if (isEmpty(state.board, neighbor)) {
        candidates.add(hexKey(neighbor));
      }
    }
  }
  
  // Filter: must touch at least one own piece, must not touch any opponent piece
  const valid: HexCoord[] = [];
  
  for (const key of candidates) {
    const [q, r] = key.split(',').map(Number);
    const coord: HexCoord = { q, r };
    const neighbors = hexNeighbors(coord);
    
    let touchesOwn = false;
    let touchesOpponent = false;
    
    for (const n of neighbors) {
      const top = getTopPiece(state.board, n);
      if (top) {
        if (top.color === color) touchesOwn = true;
        else touchesOpponent = true;
      }
    }
    
    if (touchesOwn && !touchesOpponent) {
      valid.push(coord);
    }
  }
  
  return valid;
}

// Check if queen must be placed this turn (4th turn rule)
export function mustPlaceQueen(state: GameState, color: PlayerColor): boolean {
  const player = state[color];
  // If queen is already placed, no requirement
  if (player.hand.queen === 0) return false;
  // On the 4th turn (turnCount === 3, about to be 4th), queen must be placed
  return player.turnCount >= 3;
}

// Check if player has placed their queen (needed for movement)
export function hasQueenOnBoard(state: GameState, color: PlayerColor): boolean {
  return state[color].hand.queen === 0;
}

// Get placeable piece types for current player
export function getPlaceablePieces(state: GameState, color: PlayerColor): PieceType[] {
  const player = state[color];
  const mustQueen = mustPlaceQueen(state, color);
  
  if (mustQueen) {
    return player.hand.queen > 0 ? ['queen'] : [];
  }
  
  return (Object.keys(player.hand) as PieceType[]).filter(t => player.hand[t] > 0);
}

// ============= MOVEMENT RULES =============

// Can a piece slide from A to B? (for ground-level sliding)
// Two hexes share two common neighbors. The piece can slide if at least one is empty.
export function canSlide(board: GameState['board'], from: HexCoord, to: HexCoord): boolean {
  const common = commonNeighbors(from, to);
  // At least one common neighbor must be empty for the piece to slide through
  return common.some(c => isEmpty(board, c));
}

// Get valid moves for a piece at a given position
export function getValidMoves(state: GameState, coord: HexCoord): HexCoord[] {
  const top = getTopPiece(state.board, coord);
  if (!top) return [];
  
  // Can't move if queen not yet placed
  if (!hasQueenOnBoard(state, top.color)) return [];
  
  // Can't move if it would break the hive
  if (!canPieceMove(state.board, coord)) return [];
  
  switch (top.type) {
    case 'queen': return getQueenMoves(state.board, coord);
    case 'ant': return getAntMoves(state.board, coord);
    case 'spider': return getSpiderMoves(state.board, coord);
    case 'grasshopper': return getGrasshopperMoves(state.board, coord);
    case 'beetle': return getBeetleMoves(state.board, coord);
    default: return [];
  }
}

// Queen: moves 1 space, must slide
function getQueenMoves(board: GameState['board'], coord: HexCoord): HexCoord[] {
  return getGroundSlides(board, coord, 1);
}

// Ant: slides any number of spaces along the hive edge
function getAntMoves(board: GameState['board'], coord: HexCoord): HexCoord[] {
  // BFS along slideable empty spaces adjacent to the hive
  // Temporarily remove the piece
  const tempBoard = { ...board };
  const key = hexKey(coord);
  const stack = tempBoard[key];
  tempBoard[key] = { pieces: stack.pieces.slice(0, -1) };
  if (tempBoard[key].pieces.length === 0) delete tempBoard[key];
  
  const visited = new Set<string>();
  visited.add(hexKey(coord));
  const result: HexCoord[] = [];
  const queue: HexCoord[] = [];
  
  // Start from neighbors of coord that are empty and adjacent to hive and slideable
  for (const n of hexNeighbors(coord)) {
    const nKey = hexKey(n);
    if (!isEmpty(tempBoard, n)) continue;
    if (!isAdjacentToHive(tempBoard, n)) continue;
    if (!canSlideOnTempBoard(tempBoard, coord, n)) continue;
    
    visited.add(nKey);
    queue.push(n);
    result.push(n);
  }
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const n of hexNeighbors(current)) {
      const nKey = hexKey(n);
      if (visited.has(nKey)) continue;
      if (!isEmpty(tempBoard, n)) continue;
      if (!isAdjacentToHive(tempBoard, n)) continue;
      if (!canSlideOnTempBoard(tempBoard, current, n)) continue;
      
      visited.add(nKey);
      queue.push(n);
      result.push(n);
    }
  }
  
  return result;
}

// Spider: exactly 3 slides, no backtracking
function getSpiderMoves(board: GameState['board'], coord: HexCoord): HexCoord[] {
  const tempBoard = { ...board };
  const key = hexKey(coord);
  const stack = tempBoard[key];
  tempBoard[key] = { pieces: stack.pieces.slice(0, -1) };
  if (tempBoard[key].pieces.length === 0) delete tempBoard[key];
  
  const results: HexCoord[] = [];
  
  function dfs(current: HexCoord, depth: number, path: string[]) {
    if (depth === 3) {
      // Only add if not already in results
      if (!results.some(r => hexEqual(r, current))) {
        results.push(current);
      }
      return;
    }
    
    for (const n of hexNeighbors(current)) {
      const nKey = hexKey(n);
      if (path.includes(nKey)) continue;
      if (!isEmpty(tempBoard, n)) continue;
      if (!isAdjacentToHive(tempBoard, n)) continue;
      if (!canSlideOnTempBoard(tempBoard, current, n)) continue;
      
      dfs(n, depth + 1, [...path, nKey]);
    }
  }
  
  dfs(coord, 0, [hexKey(coord)]);
  return results;
}

// Grasshopper: jumps in straight line over pieces
function getGrasshopperMoves(board: GameState['board'], coord: HexCoord): HexCoord[] {
  const results: HexCoord[] = [];
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  
  for (const dir of directions) {
    let current: HexCoord = { q: coord.q + dir.q, r: coord.r + dir.r };
    
    // Must jump over at least one piece
    if (isEmpty(board, current)) continue;
    
    // Keep going until we find an empty space
    while (!isEmpty(board, current)) {
      current = { q: current.q + dir.q, r: current.r + dir.r };
    }
    
    results.push(current);
  }
  
  return results;
}

// Beetle: moves 1 space like queen, but can climb on top of pieces
function getBeetleMoves(board: GameState['board'], coord: HexCoord): HexCoord[] {
  const results: HexCoord[] = [];
  const stack = getStack(board, coord);
  const isOnTop = stack && stack.pieces.length > 1; // beetle is on a stack
  
  for (const n of hexNeighbors(coord)) {
    const targetStack = getStack(board, n);
    const targetOccupied = targetStack && targetStack.pieces.length > 0;
    
    if (isOnTop) {
      // Beetle on top of stack can move to any neighbor (climb down or to another stack)
      results.push(n);
    } else if (targetOccupied) {
      // Climbing onto a piece - always allowed if adjacent
      results.push(n);
    } else {
      // Moving on ground - must follow sliding rule
      if (canSlide(board, coord, n) && isAdjacentToHive(board, n, coord)) {
        results.push(n);
      }
    }
  }
  
  return results;
}

// Helper: get ground-level slide moves up to maxSteps
function getGroundSlides(board: GameState['board'], coord: HexCoord, maxSteps: number): HexCoord[] {
  const results: HexCoord[] = [];
  
  // Remove piece temporarily
  const tempBoard = { ...board };
  const key = hexKey(coord);
  const stack = tempBoard[key];
  tempBoard[key] = { pieces: stack.pieces.slice(0, -1) };
  if (tempBoard[key].pieces.length === 0) delete tempBoard[key];
  
  for (const n of hexNeighbors(coord)) {
    if (!isEmpty(tempBoard, n)) continue;
    if (!isAdjacentToHive(tempBoard, n)) continue;
    if (!canSlideOnTempBoard(tempBoard, coord, n)) continue;
    results.push(n);
  }
  
  return results;
}

function isAdjacentToHive(board: GameState['board'], coord: HexCoord, excludeCoord?: HexCoord): boolean {
  return hexNeighbors(coord).some(n => {
    if (excludeCoord && hexEqual(n, excludeCoord)) return false;
    const stack = board[hexKey(n)];
    return stack && stack.pieces.length > 0;
  });
}

function canSlideOnTempBoard(board: GameState['board'], from: HexCoord, to: HexCoord): boolean {
  const common = commonNeighbors(from, to);
  const occupied = common.filter(c => {
    const stack = board[hexKey(c)];
    return stack && stack.pieces.length > 0;
  });
  // Can slide if not both common neighbors are occupied (need a gap)
  // AND at least one common neighbor is occupied (must slide along the hive)
  return occupied.length < 2 && occupied.length >= 0;
}

// Check if current player has any valid actions
export function hasValidActions(state: GameState): boolean {
  const color = state.currentTurn;
  const player = state[color];
  
  // Check placements
  const placeableTypes = getPlaceablePieces(state, color);
  if (placeableTypes.length > 0) {
    const placements = getValidPlacements(state, color);
    if (placements.length > 0) return true;
  }
  
  // Check movements (only if queen is placed)
  if (hasQueenOnBoard(state, color)) {
    const occupied = getAllOccupiedCoords(state.board);
    for (const coord of occupied) {
      const top = getTopPiece(state.board, coord);
      if (top && top.color === color) {
        const moves = getValidMoves(state, coord);
        if (moves.length > 0) return true;
      }
    }
  }
  
  return false;
}

// Pass turn if no valid moves
export function passTurn(state: GameState): GameState {
  return {
    ...state,
    currentTurn: state.currentTurn === 'white' ? 'black' : 'white',
    turnNumber: state.turnNumber + 1,
  };
}
