import React, { useState, useCallback, useMemo } from 'react';
import { GameState, PieceType, PlayerColor, Piece } from '@/lib/hive/types';
import { HexCoord, hexEqual, hexKey } from '@/lib/hive/hex';
import { createInitialState, placePiece, movePiece, getTopPiece } from '@/lib/hive/board';
import { getValidMoves, getValidPlacements, getPlaceablePieces, mustPlaceQueen, hasValidActions, passTurn } from '@/lib/hive/rules';
import GameBoard from '@/components/game/GameBoard';
import PlayerHand from '@/components/game/PlayerHand';
import ChatBox from '@/components/game/ChatBox';
import RulesTooltip from '@/components/game/RulesTooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GamePageLocalProps {
  gameState: GameState;
  localColor: PlayerColor;
  nickname: string;
  opponentNickname: string;
  onStateChange: (state: GameState) => void;
  onSendChat: (text: string) => void;
  chatMessages: { id: string; sender: string; text: string; timestamp: number }[];
  onResign: () => void;
}

const GamePageLocal: React.FC<GamePageLocalProps> = ({
  gameState,
  localColor,
  nickname,
  opponentNickname,
  onStateChange,
  onSendChat,
  chatMessages,
  onResign,
}) => {
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const [selectedBoardCoord, setSelectedBoardCoord] = useState<HexCoord | null>(null);
  const [showRules, setShowRules] = useState(false);

  const isMyTurn = gameState.currentTurn === localColor;
  const currentPlayer = gameState[localColor];
  const opponentPlayer = gameState[localColor === 'white' ? 'black' : 'white'];

  const placeableTypes = useMemo(() =>
    isMyTurn ? getPlaceablePieces(gameState, localColor) : [],
    [gameState, localColor, isMyTurn]
  );

  const validPlacements = useMemo(() => {
    if (!isMyTurn || !selectedPieceType) return [];
    return getValidPlacements(gameState, localColor);
  }, [gameState, localColor, selectedPieceType, isMyTurn]);

  const validMoves = useMemo(() => {
    if (!isMyTurn || !selectedBoardCoord) return [];
    return getValidMoves(gameState, selectedBoardCoord);
  }, [gameState, selectedBoardCoord, isMyTurn]);

  const handleSelectPiece = useCallback((type: PieceType) => {
    setSelectedBoardCoord(null);
    setSelectedPieceType(prev => prev === type ? null : type);
  }, []);

  const handleBoardPieceSelect = useCallback((coord: HexCoord) => {
    setSelectedPieceType(null);
    setSelectedBoardCoord(prev => prev && hexEqual(prev, coord) ? null : coord);
  }, []);

  const handleDragMove = useCallback((from: HexCoord, to: HexCoord) => {
    const moves = getValidMoves(gameState, from);
    if (moves.some(m => hexEqual(m, to))) {
      const newState = movePiece(gameState, from, to);
      onStateChange(newState);
    }
    setSelectedBoardCoord(null);
    setSelectedPieceType(null);
  }, [gameState, onStateChange]);

  const handleCellClick = useCallback((coord: HexCoord) => {
    if (!isMyTurn) return;

    // If placing a piece from hand
    if (selectedPieceType && validPlacements.some(p => hexEqual(p, coord))) {
      const pieceId = `${localColor}-${selectedPieceType}-${Date.now()}`;
      const piece: Piece = { type: selectedPieceType, color: localColor, id: pieceId };
      const newState = placePiece(gameState, piece, coord);
      onStateChange(newState);
      setSelectedPieceType(null);
      setSelectedBoardCoord(null);

      if (mustPlaceQueen(newState, newState.currentTurn)) {
        toast.info('Queen Bee must be placed by the 4th turn!');
      }
      return;
    }

    // If moving a piece on the board
    if (selectedBoardCoord && validMoves.some(m => hexEqual(m, coord))) {
      const newState = movePiece(gameState, selectedBoardCoord, coord);
      onStateChange(newState);
      setSelectedBoardCoord(null);
      setSelectedPieceType(null);
      return;
    }

    // Selecting a piece on the board
    const top = getTopPiece(gameState.board, coord);
    if (top && top.color === localColor) {
      setSelectedPieceType(null);
      setSelectedBoardCoord(prev => prev && hexEqual(prev, coord) ? null : coord);
      return;
    }

    // Deselect
    setSelectedPieceType(null);
    setSelectedBoardCoord(null);
  }, [isMyTurn, selectedPieceType, selectedBoardCoord, validPlacements, validMoves, gameState, localColor, onStateChange]);

  const handlePassTurn = useCallback(() => {
    if (!isMyTurn) return;
    if (hasValidActions(gameState)) {
      toast.error('You have valid moves available!');
      return;
    }
    onStateChange(passTurn(gameState));
  }, [isMyTurn, gameState, onStateChange]);

  const gameOver = gameState.status !== 'playing' && gameState.status !== 'waiting';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐝</span>
          <h1 className="text-lg font-bold text-foreground">Hive</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            Turn {Math.floor(gameState.turnNumber / 2) + 1}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} className="text-xs">
            {showRules ? 'Hide Rules' : '📖 Rules'}
          </Button>
          <Button variant="destructive" size="sm" onClick={onResign} className="text-xs">
            Resign
          </Button>
        </div>
      </div>

      {/* Game Over Banner */}
      {gameOver && (
        <div className="px-4 py-3 bg-primary text-primary-foreground text-center font-bold">
          {gameState.status === 'white_wins' && '⬜ White wins!'}
          {gameState.status === 'black_wins' && '⬛ Black wins!'}
          {gameState.status === 'draw' && '🤝 Draw!'}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main game area */}
        <div className="flex-1 flex flex-col p-2 gap-2">
          {/* Opponent hand */}
          <PlayerHand
            player={opponentPlayer}
            isCurrentTurn={gameState.currentTurn !== localColor}
            selectedPiece={null}
            placeableTypes={[]}
            onSelectPiece={() => {}}
            isLocalPlayer={false}
          />

          {/* Board */}
          <GameBoard
            state={gameState}
            localColor={localColor}
            selectedPieceType={selectedPieceType}
            selectedBoardCoord={selectedBoardCoord}
            validMoves={validMoves}
            validPlacements={validPlacements}
            onCellClick={handleCellClick}
            onBoardPieceSelect={handleBoardPieceSelect}
            onDragMove={handleDragMove}
          />

          {/* Player hand */}
          <PlayerHand
            player={currentPlayer}
            isCurrentTurn={isMyTurn}
            selectedPiece={selectedPieceType}
            placeableTypes={placeableTypes}
            onSelectPiece={handleSelectPiece}
            isLocalPlayer={true}
          />

          {/* Pass turn */}
          {isMyTurn && !hasValidActions(gameState) && (
            <Button onClick={handlePassTurn} className="mx-auto" size="sm">
              Pass Turn (no valid moves)
            </Button>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-border p-2 flex flex-col gap-2 hidden md:flex">
          {showRules && <RulesTooltip />}
          <ChatBox messages={chatMessages} onSend={onSendChat} nickname={nickname} />
        </div>
      </div>
    </div>
  );
};

export default GamePageLocal;
