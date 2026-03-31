// Board state management

import { GameState, Piece, PieceStack, PieceType, PlayerColor, STARTING_HAND, Move } from './types';
import { HexCoord, hexKey, parseHexKey, hexNeighbors, hexEqual } from './hex';

export function createInitialState(whiteNickname: string, blackNickname: string): GameState {
  return {
    board: {},
    white: {
      color: 'white',
      nickname: whiteNickname,
      hand: { ...STARTING_HAND },
      turnCount: 0,
    },
    black: {
      color: 'black',
      nickname: blackNickname,
      hand: { ...STARTING_HAND },
      turnCount: 0,
    },
    currentTurn: 'white',
    turnNumber: 0,
    status: 'playing',
    moveHistory: [],
  };
}

export function getTopPiece(board: GameState['board'], coord: HexCoord): Piece | null {
  const stack = board[hexKey(coord)];
  if (!stack || stack.pieces.length === 0) return null;
  return stack.pieces[stack.pieces.length - 1];
}

export function getStack(board: GameState['board'], coord: HexCoord): PieceStack | null {
  return board[hexKey(coord)] || null;
}

export function isEmpty(board: GameState['board'], coord: HexCoord): boolean {
  return !board[hexKey(coord)] || board[hexKey(coord)].pieces.length === 0;
}

export function getAllOccupiedCoords(board: GameState['board']): HexCoord[] {
  return Object.keys(board)
    .filter(k => board[k].pieces.length > 0)
    .map(parseHexKey);
}

export function placePiece(state: GameState, piece: Piece, coord: HexCoord): GameState {
  const newBoard = { ...state.board };
  const key = hexKey(coord);
  if (!newBoard[key]) {
    newBoard[key] = { pieces: [] };
  }
  newBoard[key] = { pieces: [...newBoard[key].pieces, piece] };

  const player = state[piece.color];
  const newHand = { ...player.hand };
  newHand[piece.type]--;

  const move: Move = {
    type: 'place',
    piece,
    to: coord,
    timestamp: Date.now(),
  };

  const newState: GameState = {
    ...state,
    board: newBoard,
    [piece.color]: {
      ...player,
      hand: newHand,
      turnCount: player.turnCount + 1,
    },
    currentTurn: piece.color === 'white' ? 'black' : 'white',
    turnNumber: state.turnNumber + 1,
    moveHistory: [...state.moveHistory, move],
  };

  return checkWinCondition(newState);
}

export function movePiece(state: GameState, from: HexCoord, to: HexCoord): GameState {
  const fromKey = hexKey(from);
  const toKey = hexKey(to);
  const newBoard = { ...state.board };

  const stack = newBoard[fromKey];
  if (!stack || stack.pieces.length === 0) return state;

  const piece = stack.pieces[stack.pieces.length - 1];
  newBoard[fromKey] = { pieces: stack.pieces.slice(0, -1) };

  if (!newBoard[toKey]) {
    newBoard[toKey] = { pieces: [] };
  }
  newBoard[toKey] = { pieces: [...newBoard[toKey].pieces, piece] };

  // Clean up empty stacks
  if (newBoard[fromKey].pieces.length === 0) {
    delete newBoard[fromKey];
  }

  const player = state[piece.color];
  const move: Move = {
    type: 'move',
    piece,
    from,
    to,
    timestamp: Date.now(),
  };

  const newState: GameState = {
    ...state,
    board: newBoard,
    [piece.color]: {
      ...player,
      turnCount: player.turnCount + 1,
    },
    currentTurn: piece.color === 'white' ? 'black' : 'white',
    turnNumber: state.turnNumber + 1,
    moveHistory: [...state.moveHistory, move],
  };

  return checkWinCondition(newState);
}

export function checkWinCondition(state: GameState): GameState {
  const occupied = getAllOccupiedCoords(state.board);
  let whiteQueenSurrounded = false;
  let blackQueenSurrounded = false;

  for (const coord of occupied) {
    const stack = state.board[hexKey(coord)];
    // Check bottom piece for queen (beetle on top doesn't matter for queen position)
    const bottomPiece = stack.pieces[0];
    if (bottomPiece.type === 'queen') {
      const neighbors = hexNeighbors(coord);
      const allSurrounded = neighbors.every(n => !isEmpty(state.board, n));
      if (allSurrounded) {
        if (bottomPiece.color === 'white') whiteQueenSurrounded = true;
        if (bottomPiece.color === 'black') blackQueenSurrounded = true;
      }
    }
  }

  if (whiteQueenSurrounded && blackQueenSurrounded) {
    return { ...state, status: 'draw' };
  }
  if (whiteQueenSurrounded) {
    return { ...state, status: 'black_wins' };
  }
  if (blackQueenSurrounded) {
    return { ...state, status: 'white_wins' };
  }
  return state;
}

// Check if the hive is connected after removing a piece
export function isHiveConnected(board: GameState['board'], excludeCoord?: HexCoord): boolean {
  const coords = getAllOccupiedCoords(board).filter(
    c => !excludeCoord || !hexEqual(c, excludeCoord)
  );
  if (coords.length <= 1) return true;

  // BFS
  const visited = new Set<string>();
  const queue: HexCoord[] = [coords[0]];
  visited.add(hexKey(coords[0]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of hexNeighbors(current)) {
      const nKey = hexKey(neighbor);
      if (!visited.has(nKey) && coords.some(c => hexEqual(c, neighbor))) {
        visited.add(nKey);
        queue.push(neighbor);
      }
    }
  }

  return visited.size === coords.length;
}

// Check if removing this piece from its position keeps hive connected
// For beetles on top of stacks, they can always move (stack remains)
export function canPieceMove(board: GameState['board'], coord: HexCoord): boolean {
  const stack = board[hexKey(coord)];
  if (!stack) return false;
  
  // If there's a stack (beetle on top), the beetle can always move
  if (stack.pieces.length > 1) return true;
  
  // Check if removing this piece keeps hive connected
  return isHiveConnected(board, coord);
}
