import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RulesTooltip from '@/components/game/RulesTooltip';

const Index: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }
    setCreating(true);
    try {
      // Generate a random game ID
      const gameId = Math.random().toString(36).substring(2, 8);
      
      const { error } = await supabase.from('games').insert({
        id: gameId,
        white_player: nickname.trim(),
        status: 'waiting',
        game_state: null,
      });

      if (error) throw error;

      navigate(`/game/${gameId}?color=white&nickname=${encodeURIComponent(nickname.trim())}`);
    } catch (err) {
      toast.error('Failed to create game');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }
    if (!joinCode.trim()) {
      toast.error('Please enter a game code');
      return;
    }
    navigate(`/game/${joinCode.trim()}?color=black&nickname=${encodeURIComponent(nickname.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🐝</div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Hive</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          The boardless strategy game. Place your insects, surround the Queen, win the hive.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-6">
        {/* Nickname */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Your nickname</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
          />
        </div>

        {/* Create */}
        <div className="space-y-2">
          <Button onClick={handleCreate} disabled={creating} className="w-full" size="lg">
            {creating ? 'Creating...' : '🎮 Create New Game'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Get a link to share with your friend
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Join */}
        <div className="space-y-2">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter game code..."
          />
          <Button onClick={handleJoin} variant="outline" className="w-full" size="lg">
            🔗 Join Game
          </Button>
        </div>

        {/* Rules toggle */}
        <Button variant="ghost" onClick={() => setShowRules(!showRules)} className="w-full text-xs">
          {showRules ? 'Hide Rules' : '📖 How to Play'}
        </Button>
        {showRules && <RulesTooltip />}
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        No account needed • Play with a friend • Real-time multiplayer
      </p>
    </div>
  );
};

export default Index;
