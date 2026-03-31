import React from 'react';
import { PIECE_EMOJI, PIECE_NAMES, PieceType } from '@/lib/hive/types';

const PIECE_DESCRIPTIONS: Record<PieceType, string> = {
  queen: 'Moves 1 space. Must be placed by turn 4. Surround the opponent\'s Queen to win!',
  beetle: 'Moves 1 space. Can climb on top of other pieces, pinning them.',
  spider: 'Must move exactly 3 spaces along the hive edge.',
  grasshopper: 'Jumps in a straight line over pieces to the first empty space.',
  ant: 'Moves any number of spaces along the hive edge. Very powerful!',
};

const RulesTooltip: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 text-sm space-y-3">
      <h3 className="font-bold text-foreground text-base">How to Play Hive</h3>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>• Surround your opponent's Queen Bee to win</p>
        <p>• Place pieces touching your own, not the opponent's</p>
        <p>• Queen must be placed by your 4th turn</p>
        <p>• The hive must stay connected at all times</p>
      </div>
      <h4 className="font-semibold text-foreground text-sm mt-3">Pieces</h4>
      <div className="space-y-2">
        {(Object.keys(PIECE_DESCRIPTIONS) as PieceType[]).map(type => (
          <div key={type} className="flex items-start gap-2">
            <span className="text-lg">{PIECE_EMOJI[type]}</span>
            <div>
              <span className="font-medium text-foreground text-xs">{PIECE_NAMES[type]}</span>
              <p className="text-xs text-muted-foreground">{PIECE_DESCRIPTIONS[type]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RulesTooltip;
