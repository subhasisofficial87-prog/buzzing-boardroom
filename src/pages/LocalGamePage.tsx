import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GameState } from '@/lib/hive/types';
import { createInitialState } from '@/lib/hive/board';
import { getAIMove } from '@/lib/hive/ai';
import GamePageLocal from '@/components/game/GamePageLocal';

const LocalGamePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'local'; // 'local' or 'ai'
  const nickname = searchParams.get('nickname') || 'Player 1';

  const opponentName = mode === 'ai' ? '🤖 AI' : 'Player 2';

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(nickname, opponentName)
  );

  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  // AI auto-move
  useEffect(() => {
    if (mode !== 'ai') return;
    if (gameState.currentTurn !== 'black' || gameState.status !== 'playing') return;

    const timer = setTimeout(() => {
      const aiState = getAIMove(gameState, 'black');
      setGameState(aiState);
    }, 600 + Math.random() * 400);

    return () => clearTimeout(timer);
  }, [gameState, mode]);

  const handleResign = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'black_wins' }));
  }, []);

  const handleSendChat = useCallback(() => {}, []);

  return (
    <GamePageLocal
      gameState={gameState}
      localColor="white"
      nickname={nickname}
      opponentNickname={opponentName}
      onStateChange={handleStateChange}
      onSendChat={handleSendChat}
      chatMessages={[]}
      onResign={handleResign}
    />
  );
};

export default LocalGamePage;
