// AI opponent for Hive with difficulty levels

import { GameState, Piece, PieceType, PlayerColor } from './types';
import { HexCoord, hexKey, hexNeighbors } from './hex';
import { getAllOccupiedCoords, getTopPiece, placePiece, movePiece, isEmpty } from './board';
import { getValidPlacements, getValidMoves, getPlaceablePieces, mustPlaceQueen, hasValidActions, passTurn } from './rules';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface ScoredAction {
  score: number;
  apply: () => GameState;
}

export function getAIMove(state: GameState, aiColor: PlayerColor, difficulty: AIDifficulty = 'medium'): GameState {
  if (state.currentTurn !== aiColor || state.status !== 'playing') return state;
  if (!hasValidActions(state)) return passTurn(state);

  const actions: ScoredAction[] = [];
  const placeableTypes = getPlaceablePieces(state, aiColor);
  const placements = getValidPlacements(state, aiColor);

  for (const type of placeableTypes) {
    for (const coord of placements) {
      const score = scorePlacement(state, type, coord, aiColor, difficulty);
      actions.push({
        score,
        apply: () => {
          const id = `${aiColor}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const piece: Piece = { type, color: aiColor, id };
          return placePiece(state, piece, coord);
        },
      });
    }
  }

  const occupied = getAllOccupiedCoords(state.board);
  for (const coord of occupied) {
    const top = getTopPiece(state.board, coord);
    if (!top || top.color !== aiColor) continue;
    const moves = getValidMoves(state, coord);
    for (const to of moves) {
      const score = scoreMove(state, top, coord, to, aiColor, difficulty);
      actions.push({
        score,
        apply: () => movePiece(state, coord, to),
      });
    }
  }

  if (actions.length === 0) return passTurn(state);

  actions.sort((a, b) => b.score - a.score);

  if (difficulty === 'easy') {
    // Pick randomly from all actions
    const pick = actions[Math.floor(Math.random() * actions.length)];
    return pick.apply();
  }

  if (difficulty === 'medium') {
    // Pick from top 40%
    const cutoff = Math.max(1, Math.ceil(actions.length * 0.4));
    const pick = actions[Math.floor(Math.random() * cutoff)];
    return pick.apply();
  }

  // Hard: pick best with tiny randomness among top 2
  const topScore = actions[0].score;
  const topActions = actions.filter(a => a.score >= topScore - 1);
  const pick = topActions[Math.floor(Math.random() * Math.min(topActions.length, 2))];
  return pick.apply();
}

function findOpponentQueen(state: GameState, aiColor: PlayerColor): HexCoord | null {
  const opColor = aiColor === 'white' ? 'black' : 'white';
  for (const coord of getAllOccupiedCoords(state.board)) {
    const stack = state.board[hexKey(coord)];
    if (stack.pieces.some(p => p.type === 'queen' && p.color === opColor)) {
      return coord;
    }
  }
  return null;
}

function countQueenNeighbors(state: GameState, aiColor: PlayerColor): number {
  const qCoord = findOpponentQueen(state, aiColor);
  if (!qCoord) return 0;
  return hexNeighbors(qCoord).filter(n => !isEmpty(state.board, n)).length;
}

function hexDist(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

function scorePlacement(state: GameState, type: PieceType, coord: HexCoord, color: PlayerColor, difficulty: AIDifficulty): number {
  if (mustPlaceQueen(state, color)) {
    return type === 'queen' ? 100 : -100;
  }

  const basePriorities: Record<PieceType, number> = {
    ant: 15, beetle: 12, grasshopper: 10, spider: 8, queen: 5,
  };
  let score = basePriorities[type];

  if (difficulty === 'easy') {
    return score + Math.random() * 20; // lots of randomness
  }

  // Medium & Hard: prefer placing near opponent queen
  const oppQueen = findOpponentQueen(state, color);
  if (oppQueen && difficulty === 'hard') {
    const dist = hexDist(coord, oppQueen);
    score += Math.max(0, 10 - dist * 2);
  }

  score += Math.random() * (difficulty === 'hard' ? 2 : 6);
  return score;
}

function scoreMove(state: GameState, piece: Piece, _from: HexCoord, to: HexCoord, aiColor: PlayerColor, difficulty: AIDifficulty): number {
  let score = 5;

  if (difficulty === 'easy') {
    return score + Math.random() * 20;
  }

  // Bonus for ants and beetles
  if (piece.type === 'ant') score += 5;
  if (piece.type === 'beetle') score += 4;
  if (piece.type === 'queen') score -= 3;

  const oppQueen = findOpponentQueen(state, aiColor);
  if (oppQueen) {
    const dist = hexDist(to, oppQueen);
    // Moving adjacent to opponent queen is great
    if (dist === 1) score += difficulty === 'hard' ? 20 : 10;
    else if (dist === 2) score += difficulty === 'hard' ? 8 : 4;
  }

  // Hard: check if this move increases neighbor count around opponent queen
  if (difficulty === 'hard' && oppQueen) {
    const neighbors = hexNeighbors(oppQueen);
    const isAdjacentMove = neighbors.some(n => n.q === to.q && n.r === to.r);
    if (isAdjacentMove) score += 15;
  }

  score += Math.random() * (difficulty === 'hard' ? 2 : 6);
  return score;
}
