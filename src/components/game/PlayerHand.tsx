import React from 'react';
import { PieceType, PlayerColor, PlayerState, PIECE_EMOJI, PIECE_NAMES } from '@/lib/hive/types';
import PieceIcon from './PieceIcon';

interface PlayerHandProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  selectedPiece: PieceType | null;
  placeableTypes: PieceType[];
  onSelectPiece: (type: PieceType) => void;
  isLocalPlayer: boolean;
}

const ALL_PIECES: PieceType[] = ['queen', 'ant', 'grasshopper', 'spider', 'beetle'];

const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  isCurrentTurn,
  selectedPiece,
  placeableTypes,
  onSelectPiece,
  isLocalPlayer,
}) => {
  return (
    <div className={`rounded-lg border p-3 transition-all ${
      isCurrentTurn
        ? 'border-primary bg-card shadow-lg'
        : 'border-border bg-muted/50 opacity-70'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${
          player.color === 'white' ? 'bg-honey-light' : 'bg-earth'
        }`} />
        <span className="font-semibold text-sm text-foreground">{player.nickname}</span>
        {isCurrentTurn && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
            Your turn
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {ALL_PIECES.map(type => {
          const count = player.hand[type];
          if (count === 0) return null;
          const canPlace = isLocalPlayer && isCurrentTurn && placeableTypes.includes(type);
          const isSelected = selectedPiece === type;

          return (
            <button
              key={type}
              onClick={() => canPlace && onSelectPiece(type)}
              disabled={!canPlace}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground ring-2 ring-ring'
                  : canPlace
                    ? 'bg-card hover:bg-accent hover:text-accent-foreground cursor-pointer border border-border'
                    : 'bg-muted/30 text-muted-foreground cursor-default'
              }`}
              title={PIECE_NAMES[type]}
            >
              <span className="text-base">{PIECE_EMOJI[type]}</span>
              <span>×{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerHand;
