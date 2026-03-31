// Hex coordinate utilities using axial coordinates (q, r)

import { HexCoord } from './types';

// The 6 neighbor directions in axial coordinates
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
];

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// Convert axial to pixel (pointy-top hexagons)
export function hexToPixel(coord: HexCoord, size: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = size * (3 / 2) * coord.r;
  return { x, y };
}

// Get the 6 corners of a pointy-top hexagon centered at origin
export function hexCorners(size: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: size * Math.cos(angle),
      y: size * Math.sin(angle),
    });
  }
  return corners;
}

// Get hex polygon points string for SVG
export function hexPolygonPoints(size: number): string {
  return hexCorners(size).map(c => `${c.x},${c.y}`).join(' ');
}

// Common neighbors of two adjacent hexes (the two cells that share edges with both)
export function commonNeighbors(a: HexCoord, b: HexCoord): HexCoord[] {
  const aN = hexNeighbors(a);
  const bN = hexNeighbors(b);
  return aN.filter(an => bN.some(bn => hexEqual(an, bn)));
}
