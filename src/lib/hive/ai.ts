// Simple AI opponent for Hive

import { GameState, Piece, PieceType, PlayerColor } from './types';
import { HexCoord, hexKey } from './hex';
import { getAllOccupiedCoords, getTopPiece, placePiece, movePiece } from './board';
import { getValidPlacements, getValidMoves, getPlaceablePieces, mustPlaceQueen, hasValidActions, passTurn } from './rules';

interface ScoredAction {
  score: number;
  apply: () => GameState;
}

export function getAIMove(state: GameState, aiColor: PlayerColor): GameState {
  if (state.currentTurn !== aiColor || state.status !== 'playing') return state;
  if (!hasValidActions(state)) return passTurn(state);

  const actions: ScoredAction[] = [];

  // Placement actions
  const placeableTypes = getPlaceablePieces(state, aiColor);
  const placements = getValidPlacements(state, aiColor);

  for (const type of placeableTypes) {
    for (const coord of placements) {
      const score = scorePlacement(state, type, coord, aiColor);
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

  // Movement actions
  const occupied = getAllOccupiedCoords(state.board);
  for (const coord of occupied) {
    const top = getTopPiece(state.board, coord);
    if (!top || top.color !== aiColor) continue;
    const moves = getValidMoves(state, coord);
    for (const to of moves) {
      const score = scoreMove(state, top, coord, to, aiColor);
      actions.push({
        score,
        apply: () => movePiece(state, coord, to),
      });
    }
  }

  if (actions.length === 0) return passTurn(state);

  // Pick best action with some randomness among top choices
  actions.sort((a, b) => b.score - a.score);
  const topScore = actions[0].score;
  const topActions = actions.filter(a => a.score >= topScore - 2);
  const pick = topActions[Math.floor(Math.random() * topActions.length)];

  return pick.apply();
}

function scorePlacement(state: GameState, type: PieceType, _coord: HexCoord, _color: PlayerColor): number {
  // Prioritize queen on turn 4, then ants/beetles, then others
  if (mustPlaceQueen(state, _color)) {
    return type === 'queen' ? 100 : -100;
  }
  const priorities: Record<PieceType, number> = {
    ant: 15,
    beetle: 12,
    grasshopper: 10,
    spider: 8,
    queen: 5, // don't rush queen unless forced
  };
  return priorities[type] + Math.random() * 4;
}

function scoreMove(_state: GameState, piece: Piece, _from: HexCoord, _to: HexCoord, aiColor: PlayerColor): number {
  // Prefer moving pieces near opponent queen
  const opponentColor: PlayerColor = aiColor === 'white' ? 'black' : 'white';
  let score = 5 + Math.random() * 4;

  // Bonus for ants and beetles (most powerful movers)
  if (piece.type === 'ant') score += 5;
  if (piece.type === 'beetle') score += 4;
  // Avoid moving queen unless necessary
  if (piece.type === 'queen') score -= 3;

  return score;
}
