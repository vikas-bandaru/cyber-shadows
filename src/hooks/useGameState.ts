import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameState } from '@/lib/game-logic';

export function useGameState(roomCode: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;

    // 1. Initial Fetch
    const fetchGameState = async () => {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (!error && data) {
        setGameState(data as GameState);
      }
      setLoading(false);
    };

    fetchGameState();

    // 2. Real-time Subscription
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          setGameState(payload.new as GameState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return { gameState, loading };
}
