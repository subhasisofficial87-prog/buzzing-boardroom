// Hive game types

export type PieceType = 'queen' | 'beetle' | 'spider' | 'grasshopper' | 'ant';
export type PlayerColor = 'white' | 'black';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Piece {
  type: PieceType;
  color: PlayerColor;
  id: string; // unique per piece
}

export interface PieceStack {
  pieces: Piece[]; // bottom to top (beetle can stack)
}

export interface PlayerState {
  color: PlayerColor;
  nickname: string;
  hand: Record<PieceType, number>;
  turnCount: number; // how many turns this player has taken
}

export interface Move {
  type: 'place' | 'move';
  piece: Piece;
  from?: HexCoord; // only for 'move'
  to: HexCoord;
  timestamp: number;
}

export type GameStatus = 'waiting' | 'playing' | 'white_wins' | 'black_wins' | 'draw';

export interface GameState {
  board: Record<string, PieceStack>; // key: "q,r"
  white: PlayerState;
  black: PlayerState;
  currentTurn: PlayerColor;
  turnNumber: number;
  status: GameStatus;
  moveHistory: Move[];
}

export const STARTING_HAND: Record<PieceType, number> = {
  queen: 1,
  beetle: 2,
  spider: 2,
  grasshopper: 3,
  ant: 3,
};

export const PIECE_EMOJI: Record<PieceType, string> = {
  queen: '🐝',
  beetle: '🪲',
  spider: '🕷️',
  grasshopper: '🦗',
  ant: '🐜',
};

export const PIECE_NAMES: Record<PieceType, string> = {
  queen: 'Queen Bee',
  beetle: 'Beetle',
  spider: 'Spider',
  grasshopper: 'Grasshopper',
  ant: 'Ant',
};
