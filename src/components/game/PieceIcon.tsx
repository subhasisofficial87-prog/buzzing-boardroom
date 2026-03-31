import React from 'react';
import { PieceType, PlayerColor, PIECE_EMOJI } from '@/lib/hive/types';

interface PieceIconProps {
  type: PieceType;
  color: PlayerColor;
  size?: number;
  selected?: boolean;
  className?: string;
}

const PIECE_COLORS: Record<PlayerColor, { bg: string; border: string; text: string }> = {
  white: {
    bg: 'hsl(var(--honey-light))',
    border: 'hsl(var(--honey-dark))',
    text: 'hsl(var(--bark))',
  },
  black: {
    bg: 'hsl(var(--earth))',
    border: 'hsl(var(--bark))',
    text: 'hsl(var(--cream))',
  },
};

const PieceIcon: React.FC<PieceIconProps> = ({ type, color, size = 40, selected = false }) => {
  const colors = PIECE_COLORS[color];
  const emoji = PIECE_EMOJI[type];
  const fontSize = size * 0.5;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Hex shape */}
      <polygon
        points={hexPoints(size / 2, size / 2, size * 0.42)}
        fill={colors.bg}
        stroke={selected ? 'hsl(var(--honey))' : colors.border}
        strokeWidth={selected ? 3 : 1.5}
        className={selected ? 'animate-pulse-glow' : ''}
      />
      <text
        x={size / 2}
        y={size / 2 + fontSize * 0.15}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
      >
        {emoji}
      </text>
    </svg>
  );
};

function hexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

export default PieceIcon;
