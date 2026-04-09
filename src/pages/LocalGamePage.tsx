import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GameState } from '@/lib/hive/types';
import { createInitialState } from '@/lib/hive/board';
import { getAIMove, AIDifficulty } from '@/lib/hive/ai';
import GamePageLocal from '@/components/game/GamePageLocal';

const LocalGamePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'local';
  const nickname = searchParams.get('nickname') || 'Player 1';
  const difficulty = (searchParams.get('difficulty') || 'medium') as AIDifficulty;

  const diffLabel = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' };
  const opponentName = mode === 'ai' ? `🤖 AI (${diffLabel[difficulty] || 'Medium'})` : 'Player 2';

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

    const delay = difficulty === 'hard' ? 800 : difficulty === 'medium' ? 600 : 400;
    const timer = setTimeout(() => {
      const aiState = getAIMove(gameState, 'black', difficulty);
      setGameState(aiState);
    }, delay + Math.random() * 300);

    return () => clearTimeout(timer);
  }, [gameState, mode, difficulty]);

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
