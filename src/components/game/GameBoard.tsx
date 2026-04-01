import React, { useMemo, useCallback, useRef, useState } from 'react';
import { GameState, PieceType, PlayerColor, PIECE_EMOJI } from '@/lib/hive/types';
import { HexCoord, hexKey, hexToPixel, hexNeighbors, hexEqual } from '@/lib/hive/hex';
import { getAllOccupiedCoords, getTopPiece, getStack } from '@/lib/hive/board';
import { getValidMoves, getValidPlacements } from '@/lib/hive/rules';

interface GameBoardProps {
  state: GameState;
  localColor: PlayerColor;
  selectedPieceType: PieceType | null;
  selectedBoardCoord: HexCoord | null;
  validMoves: HexCoord[];
  validPlacements: HexCoord[];
  onCellClick: (coord: HexCoord) => void;
  onBoardPieceSelect: (coord: HexCoord) => void;
  onDragMove: (from: HexCoord, to: HexCoord) => void;
}

const HEX_SIZE = 36;
const SQRT3 = Math.sqrt(3);

const GameBoard: React.FC<GameBoardProps> = ({
  state,
  localColor,
  selectedPieceType,
  selectedBoardCoord,
  validMoves,
  validPlacements,
  onCellClick,
  onBoardPieceSelect,
  onDragMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [dragState, setDragState] = useState<{
    from: HexCoord;
    cursorSvg: { x: number; y: number };
    piece: { type: PieceType; color: PlayerColor };
  } | null>(null);
  const dragStartScreenRef = useRef({ x: 0, y: 0 });
  const isDragThresholdMetRef = useRef(false);

  // Gather all cells to render: occupied + valid placement/move targets
  const { cells, bounds } = useMemo(() => {
    const occupied = getAllOccupiedCoords(state.board);
    const cellMap = new Map<string, { coord: HexCoord; isOccupied: boolean; isValidTarget: boolean; isValidPlacement: boolean; isSelected: boolean }>();

    for (const coord of occupied) {
      cellMap.set(hexKey(coord), {
        coord,
        isOccupied: true,
        isValidTarget: validMoves.some(m => hexEqual(m, coord)),
        isValidPlacement: false,
        isSelected: selectedBoardCoord ? hexEqual(coord, selectedBoardCoord) : false,
      });
    }

    for (const coord of validMoves) {
      const key = hexKey(coord);
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          coord,
          isOccupied: false,
          isValidTarget: true,
          isValidPlacement: false,
          isSelected: false,
        });
      } else {
        cellMap.get(key)!.isValidTarget = true;
      }
    }

    for (const coord of validPlacements) {
      const key = hexKey(coord);
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          coord,
          isOccupied: false,
          isValidTarget: false,
          isValidPlacement: true,
          isSelected: false,
        });
      }
    }

    // Also render empty neighbors of occupied cells for context
    for (const coord of occupied) {
      for (const n of hexNeighbors(coord)) {
        const key = hexKey(n);
        if (!cellMap.has(key)) {
          cellMap.set(key, {
            coord: n,
            isOccupied: false,
            isValidTarget: false,
            isValidPlacement: false,
            isSelected: false,
          });
        }
      }
    }

    const allCells = Array.from(cellMap.values());

    // Compute bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const cell of allCells) {
      const { x, y } = hexToPixel(cell.coord, HEX_SIZE);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    return {
      cells: allCells,
      bounds: { minX, maxX, minY, maxY },
    };
  }, [state.board, validMoves, validPlacements, selectedBoardCoord]);

  const padding = HEX_SIZE * 3;
  const svgWidth = Math.max(bounds.maxX - bounds.minX + padding * 2, 400);
  const svgHeight = Math.max(bounds.maxY - bounds.minY + padding * 2, 400);
  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  // Find nearest hex cell to an SVG coordinate
  const findHexAtSvg = useCallback((svgX: number, svgY: number): HexCoord | null => {
    let closest: HexCoord | null = null;
    let closestDist = Infinity;
    for (const cell of cells) {
      const { x, y } = hexToPixel(cell.coord, HEX_SIZE);
      const px = x + offsetX;
      const py = y + offsetY;
      const dist = Math.hypot(svgX - px, svgY - py);
      if (dist < HEX_SIZE && dist < closestDist) {
        closestDist = dist;
        closest = cell.coord;
      }
    }
    return closest;
  }, [cells, offsetX, offsetY]);

  const handlePieceMouseDown = useCallback((e: React.MouseEvent, coord: HexCoord) => {
    if (e.button !== 0) return;
    const top = getTopPiece(state.board, coord);
    if (!top || top.color !== localColor || state.currentTurn !== localColor) return;
    e.stopPropagation();
    dragStartScreenRef.current = { x: e.clientX, y: e.clientY };
    isDragThresholdMetRef.current = false;
    // Select immediately for click fallback
    onBoardPieceSelect(coord);
    const svgPos = screenToSvg(e.clientX, e.clientY);
    setDragState({ from: coord, cursorSvg: svgPos, piece: { type: top.type, color: top.color } });
  }, [state.board, localColor, state.currentTurn, onBoardPieceSelect, screenToSvg]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || dragState) return;
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('board-bg')) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan, dragState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState) {
      const dx = e.clientX - dragStartScreenRef.current.x;
      const dy = e.clientY - dragStartScreenRef.current.y;
      if (!isDragThresholdMetRef.current && Math.hypot(dx, dy) > 5) {
        isDragThresholdMetRef.current = true;
      }
      if (isDragThresholdMetRef.current) {
        const svgPos = screenToSvg(e.clientX, e.clientY);
        setDragState(prev => prev ? { ...prev, cursorSvg: svgPos } : null);
      }
      return;
    }
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }, [isPanning, dragState, screenToSvg]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragState) {
      if (isDragThresholdMetRef.current) {
        const svgPos = screenToSvg(e.clientX, e.clientY);
        const targetCoord = findHexAtSvg(svgPos.x, svgPos.y);
        if (targetCoord && validMoves.some(m => hexEqual(m, targetCoord))) {
          onDragMove(dragState.from, targetCoord);
        }
      }
      // If threshold not met, it was a click - selection already happened in mousedown
      setDragState(null);
      return;
    }
    setIsPanning(false);
  }, [dragState, screenToSvg, findHexAtSvg, validMoves, onDragMove]);

  const handleMouseLeave = useCallback(() => {
    setDragState(null);
    setIsPanning(false);
  }, []);

  const hexPoints = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      pts.push(`${HEX_SIZE * Math.cos(angle)},${HEX_SIZE * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }, []);

  const isDragging = dragState && isDragThresholdMetRef.current;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-card rounded-xl border border-border relative cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="board-bg"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="drag-shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.4" />
          </filter>
        </defs>

        {cells.map(cell => {
          const { x, y } = hexToPixel(cell.coord, HEX_SIZE);
          const px = x + offsetX;
          const py = y + offsetY;
          const top = getTopPiece(state.board, cell.coord);
          const stack = getStack(state.board, cell.coord);
          const stackHeight = stack?.pieces.length || 0;
          const isBeingDragged = dragState && isDragThresholdMetRef.current && hexEqual(cell.coord, dragState.from);

          let fillColor = 'transparent';
          let strokeColor = 'hsl(var(--border))';
          let strokeWidth = 0.5;
          let opacity = 0.3;
          let cursorClass = '';

          if (cell.isOccupied && top) {
            fillColor = top.color === 'white'
              ? 'hsl(var(--honey-light))'
              : 'hsl(var(--earth))';
            strokeColor = top.color === 'white'
              ? 'hsl(var(--honey-dark))'
              : 'hsl(var(--bark))';
            strokeWidth = 2;
            opacity = isBeingDragged ? 0.3 : 1;
            cursorClass = top.color === localColor ? 'cursor-grab' : '';
          }

          if (cell.isSelected) {
            strokeColor = 'hsl(var(--honey))';
            strokeWidth = 3;
          }

          if (cell.isValidTarget) {
            fillColor = 'hsl(var(--forest-light))';
            strokeColor = 'hsl(var(--forest))';
            strokeWidth = 2;
            opacity = 0.8;
            cursorClass = 'cursor-pointer';
          }

          if (cell.isValidPlacement) {
            fillColor = 'hsl(var(--honey))';
            strokeColor = 'hsl(var(--honey-dark))';
            strokeWidth = 2;
            opacity = 0.5;
            cursorClass = 'cursor-pointer';
          }

          const isClickable = cell.isValidTarget || cell.isValidPlacement ||
            (cell.isOccupied && top?.color === localColor && state.currentTurn === localColor);
          const isDraggable = cell.isOccupied && top?.color === localColor && state.currentTurn === localColor;

          return (
            <g
              key={hexKey(cell.coord)}
              transform={`translate(${px}, ${py})`}
              onClick={() => !dragState && isClickable && onCellClick(cell.coord)}
              onMouseDown={isDraggable ? (e) => handlePieceMouseDown(e, cell.coord) : undefined}
              className={cursorClass}
              style={{ cursor: isDraggable ? 'grab' : isClickable ? 'pointer' : undefined }}
            >
              <polygon
                points={hexPoints}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="transition-all duration-150"
              />
              {cell.isOccupied && top && !isBeingDragged && (
                <>
                  {stackHeight > 1 && (
                    <text
                      x={HEX_SIZE * 0.55}
                      y={-HEX_SIZE * 0.45}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="bold"
                      fill="hsl(var(--foreground))"
                    >
                      {stackHeight}
                    </text>
                  )}
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={HEX_SIZE * 0.7}
                    style={{ pointerEvents: 'none' }}
                  >
                    {PIECE_EMOJI[top.type]}
                  </text>
                  <circle
                    cx={0}
                    cy={HEX_SIZE * 0.6}
                    r={4}
                    fill={top.color === 'white' ? 'hsl(var(--honey))' : 'hsl(var(--bark))'}
                    stroke="hsl(var(--foreground) / 0.3)"
                    strokeWidth={0.5}
                  />
                </>
              )}
              {cell.isValidTarget && !cell.isOccupied && (
                <circle r={6} fill="hsl(var(--forest))" opacity={0.6} />
              )}
              {cell.isValidPlacement && (
                <circle r={6} fill="hsl(var(--honey))" opacity={0.6} />
              )}
            </g>
          );
        })}

        {/* Drag ghost */}
        {dragState && isDragThresholdMetRef.current && (
          <g
            transform={`translate(${dragState.cursorSvg.x}, ${dragState.cursorSvg.y})`}
            style={{ pointerEvents: 'none' }}
            filter="url(#drag-shadow)"
          >
            <polygon
              points={hexPoints}
              fill={dragState.piece.color === 'white'
                ? 'hsl(var(--honey-light))'
                : 'hsl(var(--earth))'}
              stroke={dragState.piece.color === 'white'
                ? 'hsl(var(--honey-dark))'
                : 'hsl(var(--bark))'}
              strokeWidth={2}
              opacity={0.85}
            />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={HEX_SIZE * 0.7}
            >
              {PIECE_EMOJI[dragState.piece.type]}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default GameBoard;
