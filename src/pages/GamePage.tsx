import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GameState, PlayerColor } from '@/lib/hive/types';
import { createInitialState } from '@/lib/hive/board';
import GamePageLocal from '@/components/game/GamePageLocal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const color = (searchParams.get('color') || 'white') as PlayerColor;
  const nickname = searchParams.get('nickname') || 'Player';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [opponentNickname, setOpponentNickname] = useState('Waiting...');
  const [joined, setJoined] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load or join game
  useEffect(() => {
    if (!gameId) return;

    const loadGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error || !data) {
        toast.error('Game not found');
        setLoading(false);
        return;
      }

      if (color === 'black' && !data.black_player) {
        // Join as black player
        const initialState = createInitialState(data.white_player, nickname);
        const { error: updateError } = await supabase
          .from('games')
          .update({
            black_player: nickname,
            status: 'playing',
            game_state: initialState as any,
          })
          .eq('id', gameId);

        if (updateError) {
          toast.error('Failed to join game');
          console.error(updateError);
        } else {
          setGameState(initialState);
          setOpponentNickname(data.white_player);
          setJoined(true);
        }
      } else if (color === 'white') {
        if (data.game_state) {
          setGameState(data.game_state as unknown as GameState);
          setOpponentNickname(data.black_player || 'Waiting...');
          setJoined(!!data.black_player);
        } else {
          setOpponentNickname('Waiting...');
          setJoined(false);
        }
      } else {
        // Reconnecting as black
        if (data.game_state) {
          setGameState(data.game_state as unknown as GameState);
          setOpponentNickname(data.white_player);
          setJoined(true);
        }
      }
      setLoading(false);
    };

    loadGame();
  }, [gameId, color, nickname]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const data = payload.new as any;
          if (data.game_state) {
            setGameState(data.game_state as unknown as GameState);
          }
          if (data.black_player && color === 'white') {
            setOpponentNickname(data.black_player);
            setJoined(true);
          }
          if (data.status === 'resigned') {
            toast.info('Your opponent resigned!');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const msg = payload.new as any;
          setChatMessages(prev => [...prev, {
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            timestamp: new Date(msg.created_at).getTime(),
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, color]);

  // Load chat messages
  useEffect(() => {
    if (!gameId) return;
    supabase
      .from('messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setChatMessages(data.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: new Date(m.created_at).getTime(),
          })));
        }
      });
  }, [gameId]);

  const handleStateChange = useCallback(async (newState: GameState) => {
    setGameState(newState);
    if (!gameId) return;

    await supabase
      .from('games')
      .update({
        game_state: newState as any,
        status: newState.status === 'playing' ? 'playing' : newState.status,
      })
      .eq('id', gameId);
  }, [gameId]);

  const handleSendChat = useCallback(async (text: string) => {
    if (!gameId) return;
    await supabase.from('messages').insert({
      game_id: gameId,
      sender: nickname,
      text,
    });
  }, [gameId, nickname]);

  const handleResign = useCallback(async () => {
    if (!gameId || !gameState) return;
    const winStatus = color === 'white' ? 'black_wins' : 'white_wins';
    const newState = { ...gameState, status: winStatus as GameState['status'] };
    setGameState(newState);
    await supabase
      .from('games')
      .update({ game_state: newState as any, status: 'resigned' })
      .eq('id', gameId);
  }, [gameId, gameState, color]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/game/${gameId}?color=black&nickname=`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied! Share it with your friend.');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🐝</div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  // Waiting for opponent
  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl mb-4 animate-pulse">🐝</div>
          <h2 className="text-xl font-bold text-foreground">Waiting for opponent...</h2>
          <p className="text-sm text-muted-foreground">
            Share the link below with your friend to start playing.
          </p>
          <div className="bg-card border border-border rounded-lg p-3">
            <code className="text-xs text-foreground break-all font-mono">
              {`${window.location.origin}/game/${gameId}?color=black&nickname=`}
            </code>
          </div>
          <Button onClick={handleCopyLink} className="w-full">
            {copied ? '✅ Copied!' : '📋 Copy Invite Link'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Your friend just needs to add their nickname to the URL and open it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GamePageLocal
      gameState={gameState}
      localColor={color}
      nickname={nickname}
      opponentNickname={opponentNickname}
      onStateChange={handleStateChange}
      onSendChat={handleSendChat}
      chatMessages={chatMessages}
      onResign={handleResign}
    />
  );
};

export default GamePage;
