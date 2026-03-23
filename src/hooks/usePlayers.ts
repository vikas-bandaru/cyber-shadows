import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/lib/game-logic';

export function usePlayers(roomId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    // 1. Initial Fetch
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);

      if (!error && data) {
        setPlayers(data as Player[]);
      }
      setLoading(false);
    };

    fetchPlayers();

    // 2. Real-time Subscription
    const channel = supabase
      .channel(`players:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { players, loading };
}
