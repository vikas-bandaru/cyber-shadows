'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { usePlayers } from '@/hooks/usePlayers';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Mission } from '@/lib/game-logic';
import { Shield, Zap, Terminal, Cpu } from 'lucide-react';

export default function PlayerClient() {
  const { roomCode } = useParams() as { roomCode: string };
  const { gameState, loading: gameLoading, setGameState } = useGameState(roomCode);
  const roomId = gameState?.id;
  const { players, loading: playersLoading } = usePlayers(roomId || '');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [showRole, setShowRole] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && roomId && gameState) {
        if (gameState.current_round === 1 && (gameState.current_phase === 'lobby' || gameState.current_phase === 'reveal')) {
            localStorage.removeItem(`cyber_shadows_role_revealed_${roomId}`);
            setShowRole(false);
        }

        const revealed = localStorage.getItem(`cyber_shadows_role_revealed_${roomId}`);
        if (revealed === 'true') {
            setShowRole(true);
        }
    }
  }, [roomId, gameState?.current_round, gameState?.current_phase]);

  const handleReveal = () => {
    setShowRole(true);
    if (typeof window !== 'undefined' && roomId) {
        localStorage.setItem(`cyber_shadows_role_revealed_${roomId}`, 'true');
    }
  };
  const [votedId, setVotedId] = useState<string | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [nightVotes, setNightVotes] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [isSignaling, setIsSignaling] = useState(false);

  useEffect(() => {
    setPlayerId(localStorage.getItem('playerId'));
  }, []);

  useEffect(() => {
    if (gameState?.current_mission_id) {
      const fetchMission = async () => {
        const { data } = await supabase
          .from('missions')
          .select('*')
          .eq('id', gameState.current_mission_id)
          .single();
        if (data) setActiveMission(data);
      };
      fetchMission();
      // Reset local sabotage signaling state when a new mission starts
      setIsSignaling(false);
    } else {
      setActiveMission(null);
    }
  }, [gameState?.current_mission_id]);

  useEffect(() => {
    if (roomId && playerId && gameState?.current_phase === 'majlis') {
        const checkVote = async () => {
            const { data } = await supabase
                .from('votes')
                .select('*')
                .eq('room_id', roomId)
                .eq('voter_id', playerId)
                .maybeSingle();
            
            if (!data) {
                setVotedId(null);
            } else {
                setVotedId(data.target_id);
            }
        };
        checkVote();

        const channel = supabase.channel(`user-votes:${playerId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'votes', 
                filter: `voter_id=eq.${playerId}` 
            }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setVotedId(null);
                } else if (payload.new) {
                    setVotedId((payload.new as any).target_id);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }
  }, [roomId, playerId, gameState?.current_phase, gameState?.tie_protocol]);

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!gameState?.mission_timer_end || gameState.current_phase !== 'mission') {
        setTimeLeft(0);
        return;
    }
    
    const target = new Date(gameState.mission_timer_end).getTime();
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((target - now) / 1000));
        setTimeLeft(diff);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState?.mission_timer_end, gameState?.current_phase]);

  const [displayPhase, setDisplayPhase] = useState(gameState?.current_phase);

  useEffect(() => {
    if (!gameState) return;
    
    // Guard: Only switch to mission phase if the timer has also been initialized
    if (gameState.current_phase === 'mission' && !gameState.mission_timer_end) {
        return; 
    }
    
    setDisplayPhase(gameState.current_phase);
  }, [gameState?.current_phase, gameState?.mission_timer_end]);

  const me = players.find(p => p.id === playerId);
  const isTraitor = me?.role === 'naqal_baaz';
  const roleName = isTraitor ? 'System-Spy' : 'Glitch-Runner';
  const isAlive = me?.status === 'alive' || me?.status === 'silenced';

  useEffect(() => {
    if ((gameState?.current_phase === 'night' || gameState?.current_phase === 'mission' || gameState?.current_phase === 'majlis') && roomId) {
        const fetchVotes = async () => {
            const { data } = await supabase.from('votes').select('*').eq('room_id', roomId);
            if (data) setVotes(data);
        };
        fetchVotes();

        const channel = supabase.channel('votes-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, () => {
                fetchVotes();
            })
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }
  }, [gameState?.current_phase, roomId]);

  useEffect(() => {
    if (gameState?.current_phase === 'night' && isTraitor && roomId) {
        const fetchNightVotes = async () => {
            const { data } = await supabase.from('night_votes').select('*').eq('room_id', roomId);
            if (data) setNightVotes(data);
        };
        fetchNightVotes();

        const channel = supabase.channel('night-votes-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'night_votes', filter: `room_id=eq.${roomId}` }, () => {
                fetchNightVotes();
            })
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }
  }, [gameState?.current_phase, isTraitor, roomId]);

  if (gameLoading || playersLoading || !playerId) {
    return (
      <div className="h-screen w-full bg-obsidian flex flex-col items-center justify-center text-white overflow-hidden">
        <div className="w-16 h-16 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin mb-4"></div>
        <p className="text-neon-cyan/60 text-[10px] uppercase font-black tracking-widest animate-pulse font-mono">Accessing the Mainframe...</p>
      </div>
    );
  }

  if (!me) return (
    <div className="h-screen w-full bg-obsidian text-white p-10 flex flex-col items-center justify-center text-center overflow-hidden">
        <h1 className="text-4xl font-black font-mono text-neon-cyan mb-4 uppercase tracking-tighter shadow-neon-cyan/10">Runner not found.</h1>
        <p className="text-white/40 mb-8 font-mono">Your connection to this node seems to have vanished.</p>
        <button 
            onClick={() => window.location.href = '/'}
            className="btn-premium bg-neon-cyan text-black py-4 px-8 rounded-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
        >
            Return to Entrance
        </button>
    </div>
  );

  if (!gameState) return (
    <div className="h-screen w-full bg-obsidian text-white p-10 flex flex-col items-center justify-center text-center overflow-hidden">
        <h1 className="text-4xl font-black font-mono text-neon-cyan mb-4 uppercase tracking-tighter shadow-neon-cyan/10">Connection Lost</h1>
        <p className="text-white/40 mb-8 font-mono">The Overlord has terminated the session or the network node is offline.</p>
        <button 
            onClick={() => window.location.href = '/'}
            className="btn-premium bg-neon-cyan text-black py-4 px-8 rounded-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
        >
            Return to ENTRANCE
        </button>
    </div>
  );

  const isBlindfoldPhase = timeLeft > 90;

  const handleVote = async (targetId: string, roundType: 'majlis' | 'night' = 'majlis') => {
    if (votedId || !roomId || me.status !== 'alive') return;
    setVotedId(targetId);
    
    await supabase.from('votes').insert([{
        room_id: roomId,
        round_id: roundType === 'night' ? 99 : (gameState?.current_round || 1), 
        voter_id: playerId,
        target_id: targetId
    }]);
  };

  const handleSabotageTrigger = async () => {
    if (!roomId || !playerId || gameState?.sabotage_used || isSignaling) return;
    
    const alreadySignaled = votes.some(v => v.voter_id === playerId && v.round_id === 0);
    if (alreadySignaled) return;

    setIsSignaling(true);
    
    // Server-side check before insert for extra safety
    const { data: existingSignal } = await supabase
        .from('votes')
        .select('id')
        .eq('room_id', roomId)
        .eq('voter_id', playerId)
        .eq('round_id', 0)
        .maybeSingle();

    if (existingSignal) {
        setIsSignaling(false);
        return;
    }

    const { error: voteError } = await supabase.from('votes').insert([{
        room_id: roomId,
        voter_id: playerId,
        target_id: playerId, 
        round_id: 0
    }]);

    if (voteError) {
        console.error("Sabotage Signal Failed:", voteError.message, voteError.code, voteError.details);
        setIsSignaling(false);
        return;
    }

    // Also update individual player state for unanimous tracking
    const { error: playerError } = await supabase
        .from('players')
        .update({ has_signaled: true })
        .eq('id', playerId);

    if (playerError) {
        console.error("Player Signal Sync Failed:", playerError.message);
    }
  };

  const handleNightVote = async (targetId: string) => {
    if (!roomId || !playerId || votedId === targetId) return;
    setVotedId(targetId);
    
    const { error } = await supabase.from('night_votes').upsert([{
        room_id: roomId,
        voter_id: playerId,
        target_id: targetId
    }]);
    if (error) console.error("Night vote error:", error);
  };

  const alivePoetsCount = players.filter(p => p.role === 'sukhan_war' && p.status === 'alive').length;
  const potentialShare = alivePoetsCount > 0 ? Math.floor((gameState?.eidi_pot || 0) / alivePoetsCount) : 0;

  const RoleBadge = () => {
    if (!showRole) return null;
    return (
      <div className={`fixed top-4 left-4 z-50 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg animate-fade-enter-active flex items-center gap-2 ${
          isTraitor ? 'bg-purple-950/40 border-neon-purple/30' : 'bg-cyan-950/40 border-neon-cyan/30'
      }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isTraitor ? 'bg-neon-purple' : 'bg-neon-cyan'}`} />
          <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/80 font-mono">
              {isTraitor ? 'System-Spy' : 'Glitch-Runner'}
          </span>
      </div>
    );
  };

  const GoldBadge = () => (
    <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-black/60 border border-neon-cyan/20 backdrop-blur-md shadow-xl animate-fade-enter-active flex flex-col items-end font-mono">
        <div className="flex items-center gap-2">
            <span className="text-neon-cyan font-black font-mono">#{me.private_gold}</span>
            <span className="text-[8px] uppercase font-black text-white/40 tracking-widest">Personal Credits</span>
        </div>
        {!isTraitor && isAlive && gameState?.current_phase !== 'end' && (
            <div className="text-[8px] text-neon-purple font-bold uppercase tracking-tighter mt-0.5">
                Potential Share: #{potentialShare}
            </div>
        )}
    </div>
  );

  const isNight = gameState?.current_phase === 'night';
  const isRevealing = gameState?.is_revealing;

  if (me.status === 'silenced' && (!isNight || isRevealing)) {
    return (
      <div className="fixed inset-0 z-[100] bg-black bg-[radial-gradient(circle_at_center,_rgba(188,19,254,0.15)_0%,_transparent_70%)] flex flex-col items-center justify-center p-8 text-center animate-fade-enter-active overflow-hidden touch-none h-screen w-full scanline">
          <div className="w-32 h-32 rounded-lg bg-neon-purple/10 border-2 border-neon-purple flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(188,19,254,0.3)] animate-pulse mb-10">
              <Shield className="w-16 h-16 text-neon-purple" />
          </div>
          <h1 className="text-5xl font-black font-mono text-white uppercase tracking-tighter mb-4 shadow-neon-purple/20">Signal Jammed</h1>
          <p className="text-neon-purple/80 text-lg font-mono mb-10 leading-relaxed uppercase tracking-tight">
              "The System-Spies have breached your link.<br/>Your decryption module is offline."
          </p>
          <div className="glass p-8 rounded-xl border border-neon-purple/20 max-w-xs mx-auto">
              <p className="text-[10px] uppercase font-black text-neon-purple tracking-[0.2em] mb-4">RESTRICTED MODE ACTIVE</p>
              <ul className="text-[10px] text-white/50 space-y-3 text-left font-mono uppercase tracking-widest">
                  <li>• Voice signals disabled</li>
                  <li>• Deactivation auth restricted</li>
                  <li>• Observe only: READ_ONLY_SYNC</li>
              </ul>
          </div>
      </div>
    );
  }

  if (me.status === 'banished') {
    return (
      <div className="fixed inset-0 z-[100] bg-obsidian flex flex-col items-center justify-center p-8 text-center animate-fade-enter-active overflow-hidden touch-none h-screen w-full scanline">
          <div className="w-32 h-32 rounded-xl bg-zinc-900/50 border-2 border-zinc-700 flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(255,255,255,0.02)] mb-10 opacity-40">
              <Zap className="w-16 h-16 text-zinc-500" />
          </div>
          <h1 className="text-5xl font-black font-mono text-zinc-600 uppercase tracking-tighter mb-4">DEACTIVATED</h1>
          <p className="text-zinc-500 text-sm font-mono mb-10 leading-relaxed max-w-sm uppercase tracking-widest">
              "You have been disconnected from the Shadow-Network.<br/>Ghosting mode enabled."
          </p>
          <div className="p-6 rounded-lg border border-white/5 bg-white/5 max-w-xs mx-auto">
               <p className="text-[10px] uppercase font-black text-zinc-700 tracking-[0.3em]">ID_DEACTIVATED // NODE_OFFLINE</p>
          </div>
      </div>
    );
  }

  if (gameState?.current_phase === 'lobby') {
    return (
      <main className="h-screen w-full overflow-hidden flex flex-col items-center justify-center text-center bg-background text-white p-6 animate-fade-enter-active touch-none scanline">
        <div className="glass p-12 rounded-xl w-48 h-48 flex items-center justify-center text-6xl mb-8 animate-pulse border-neon-cyan/20">
            <Terminal className="w-20 h-20 text-neon-cyan drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]" />
        </div>
        < GoldBadge />
        <h1 className="text-4xl font-black text-neon-cyan mb-2 font-mono uppercase tracking-tighter">NODE_ACCESS: {me.name}</h1>
        <p className="text-white/40 italic max-w-xs text-[10px] uppercase font-black tracking-widest animate-shimmer">
            Waiting for Overlord AI sync... ({players.length}/{gameState.min_players_required || 8})
        </p>
      </main>
    );
  }

  if (displayPhase === 'reveal') {
    return (
      <main 
        onClick={handleReveal}
        className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-1000 scanline ${
            showRole ? (isTraitor ? 'bg-obsidian' : 'bg-background') : 'bg-black'
        }`}
      >
        <RoleBadge />
        <GoldBadge />
        {!showRole ? (
          <div className="animate-scale-up space-y-8">
            <h1 className="text-4xl font-black text-neon-cyan font-mono uppercase tracking-tighter">Neural Identity</h1>
            <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Handshake protocol from Overlord AI complete.</p>
            <button 
              onClick={handleReveal}
              className="w-44 h-44 rounded-xl border-2 border-neon-cyan shadow-[0_0_40px_rgba(0,243,255,0.3)] flex flex-col items-center justify-center group active:scale-90 transition-all bg-background/80 backdrop-blur-md mx-auto animate-pulse-gold"
            >
              <span className="text-7xl group-hover:scale-110 transition-transform duration-500 text-neon-cyan font-mono font-black italic">?</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-cyan/80 mt-4">Execute Sync</span>
            </button>
          </div>
        ) : (
          <div className="animate-scale-up">
            <h2 className="text-neon-cyan text-sm uppercase tracking-[0.3em] mb-4 font-black">Authentication: Success</h2>
            <h1 className={`text-6xl font-black mb-6 font-mono uppercase tracking-tighter ${isTraitor ? 'text-neon-purple shadow-[0_0_20px_rgba(188,19,254,0.4)]' : 'text-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.4)]'}`}>
                {isTraitor ? 'System-Spy' : 'Glitch-Runner'}
            </h1>
            <p className="text-white/60 mb-8 max-w-xs mx-auto text-[10px] font-mono leading-relaxed uppercase tracking-widest">
                {isTraitor 
                    ? "Infiltrate the network. Sabotage the data breach without triggering security alerts. Consensus required for deactivation kills."
                    : "Secure the Verse. Collaborate on data missions and filter out anomalous signals in the Council."}
            </p>
          </div>
        )}
      </main>
    );
  }

  if (displayPhase === 'mission') {
    if (!gameState.mission_timer_end) {
      return (
        <main className="min-h-screen bg-obsidian text-white p-6 flex flex-col items-center justify-center text-center animate-fade-enter-active">
          <RoleBadge />
          < GoldBadge />
          <div className="glass p-12 rounded-xl w-48 h-48 flex items-center justify-center text-6xl mb-12 animate-bounce-slow border-2 border-neon-cyan/20 shadow-[0_0_50px_rgba(0,243,255,0.1)]">
              <Cpu className="w-20 h-20 text-neon-cyan" />
          </div>
          <h1 className="text-4xl font-black text-neon-cyan mb-4 font-mono uppercase tracking-tighter">Initializing Breach...</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono leading-relaxed max-w-xs transition-all">
              Wait for Overlord AI to sync data packets and start the timer.
          </p>
        </main>
      );
    }

    if (isBlindfoldPhase && !isTraitor) {
      return (
        <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center animate-fade-enter-active">
          <RoleBadge />
          <GoldBadge />
          <div className="text-8xl mb-12 animate-pulse opacity-20"><Zap className="w-20 h-20 text-white" /></div>
          <h1 className="text-4xl font-black text-gray-700 serif uppercase tracking-tighter mb-4">Disconnecting...</h1>
          <p className="text-gray-800 italic uppercase tracking-[0.3em] font-black text-xs">The Overlord is revealing the encryption to the Spies...</p>
          <div className="mt-20 text-gold/20 font-black text-6xl italic serif animate-pulse">
            {timeLeft - 90}s
          </div>
        </main>
      );
    }
    const mySabotageSignal = votes.find(v => v.voter_id === playerId && v.round_id === 0);
    const signalCount = votes.filter(v => v.round_id === 0).length;
    const alivePlagiarists = players.filter(p => p.role === 'naqal_baaz' && p.status === 'alive').length;

    return (
        <main className="min-h-screen bg-black text-white p-6 flex flex-col justify-between overflow-hidden scanline">
        <RoleBadge />
        <GoldBadge />
        <div className="space-y-6">
            <header className="flex justify-between items-center text-white/40 uppercase tracking-[0.3em] text-[10px] font-black font-mono">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                    <span>{isBlindfoldPhase ? 'DARK_SYNC_ACTIVE' : 'BREACH_IN_PROGRESS'}</span>
                </div>
                <div className="text-neon-cyan font-mono text-xl drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </header>
            
            {activeMission ? (
              <section className="glass p-8 rounded-xl border border-neon-cyan/10 shadow-2xl bg-black/40 animate-fade-enter-active">
                  <h3 className="text-neon-cyan uppercase text-[10px] tracking-widest mb-4 font-black font-mono">Neural Objective</h3>
                  {isBlindfoldPhase && !isTraitor ? (
                      <div className="py-10 text-center space-y-6">
                          <div className="text-4xl animate-pulse grayscale opacity-20"><Zap className="w-12 h-12 text-neon-cyan mx-auto" /></div>
                          <p className="text-neon-cyan/40 text-[10px] uppercase font-black tracking-widest animate-shimmer font-mono">Bypassing Mainframe Security...</p>
                      </div>
                  ) : (
                      <>
                        <h2 className="text-2xl font-black mb-4 font-mono leading-tight uppercase tracking-tighter text-white">{activeMission.title}</h2>
                        <p className="text-white/40 text-xs font-mono uppercase tracking-widest leading-relaxed">"{activeMission.public_goal}"</p>
                      </>
                  )}
              </section>
            ) : (
              <div className="p-10 text-center text-white/20 font-mono text-[10px] uppercase tracking-[0.4em]">Waiting for Overlord AI broadcast...</div>
            )}

            {isTraitor && isAlive && activeMission && (
                <section className="bg-neon-purple/5 border-2 border-neon-purple/20 p-8 rounded-xl animate-fade-enter-active mt-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                        <Shield className="w-4 h-4 text-neon-purple" />
                    </div>
                    <h3 className="text-neon-purple uppercase text-[10px] tracking-[0.3em] mb-4 font-black font-mono">SABOTAGE_INIT</h3>
                    <p className="text-white/80 text-lg font-mono mb-10 uppercase tracking-tight">"{activeMission.secret_sabotage}"</p>
                    
                    <button 
                        onClick={handleSabotageTrigger}
                        disabled={!!mySabotageSignal || gameState.sabotage_used || isBlindfoldPhase || !gameState.mission_timer_end || isSignaling}
                        className={`w-full py-8 px-4 rounded-lg border-2 transition-all duration-300 font-black text-xl uppercase tracking-[0.3em] shadow-2xl relative overflow-hidden active:scale-95 ${
                            (mySabotageSignal || isSignaling) 
                            ? 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed' 
                            : 'bg-neon-purple/20 border-neon-purple text-neon-purple hover:bg-neon-purple hover:text-white shadow-neon-purple/20'
                        }`}
                    >
                        {isSignaling ? "SIGNALING..." : (mySabotageSignal ? `⚡ BREACH_SIGNAL_ACTIVE (${signalCount}/${alivePlagiarists})` : (isBlindfoldPhase ? "SYNC_WAITING..." : (gameState.sabotage_used ? "VERIFIED" : (!gameState.mission_timer_end ? "CLOSED" : "SEND_SIGNAL"))))}
                    </button>
                    {gameState.sabotage_used && (
                        <div className="mt-4 p-4 bg-neon-purple/10 border border-neon-purple/20 rounded-lg flex justify-between items-center animate-fade-enter-active">
                             <span className="text-neon-purple font-black uppercase text-[10px] tracking-[0.3em]">Sabotage Bonus</span>
                             <span className="text-white font-black text-xl font-mono">#1000</span>
                        </div>
                    )}
                </section>
            )}

            {!isTraitor && gameState.sabotage_used && (
                <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl flex justify-between items-center animate-pulse">
                    <span className="text-red-500 font-black uppercase text-[10px] tracking-widest font-mono">Anomalous Breach Detected</span>
                    <span className="text-white/40 text-[10px] font-mono">(-#1000 Pot)</span>
                </div>
            )}
        </div>

        {!isAlive && (
            <div className="bg-black/80 backdrop-blur-md p-10 rounded-3xl text-center border border-white/5">
                <p className="text-red-500 font-bold serif italic text-xl">You are {me.status}.</p>
                <p className="text-gray-500 text-xs mt-2 uppercase">Silence is your only companion.</p>
            </div>
        )}
      </main>
    );
  }

  if (displayPhase === 'majlis') {
    return (
        <main className="min-h-screen bg-black text-white p-6 relative overflow-hidden scanline">
            <RoleBadge />
            <GoldBadge />

            {gameState.tie_protocol === 'decree' ? (
                <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-enter-active">
                     <div className="text-9xl animate-pulse text-neon-cyan"><Cpu className="w-32 h-32 text-neon-cyan" /></div>
                     <div className="text-center space-y-6">
                        <h2 className="text-4xl font-black font-mono text-neon-cyan uppercase tracking-tighter shadow-neon-cyan/20">Overlord Protocol</h2>
                        <p className="text-white/40 uppercase tracking-[0.4em] font-black text-[10px] font-mono">System overwrite in progress...</p>
                     </div>
                </div>
            ) : gameState.tie_protocol === 'spin' ? (
                <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-enter-active">
                     <div className="text-9xl animate-spin-slow text-neon-purple"><Terminal className="w-32 h-32 text-neon-purple" /></div>
                     <div className="text-center space-y-6">
                        <h2 className="text-4xl font-black font-mono text-neon-purple uppercase tracking-tighter">Decryption Matrix</h2>
                        <p className="text-white/40 uppercase tracking-[0.4em] font-black text-[10px] font-mono">Randomizing terminal disconnect...</p>
                     </div>
                </div>
            ) : (
                <div className="space-y-12 animate-fade-enter-active">
                    <header className="text-center space-y-4">
                        <h2 className="text-5xl font-black text-neon-cyan font-mono tracking-tighter uppercase shadow-neon-cyan/10">
                            {gameState.tie_protocol === 'revote' ? 'RE_SYNC_ERROR' : 'Council_Auth'}
                        </h2>
                        <p className="text-white/40 uppercase tracking-[0.4em] font-black text-[10px] font-mono">
                            {gameState.tie_protocol === 'revote' ? 'Consensus failure. Re-voting suspects...' : 'Identify the Anomalous Node'}
                        </p>
                    </header>

                    {votedId ? (
                        <div className="glass p-12 rounded-xl border-2 border-neon-cyan/20 text-center space-y-8 animate-scale-up grayscale opacity-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan animate-shimmer" />
                            <div className="text-6xl text-neon-cyan">LOGGED</div>
                            <h3 className="text-2xl font-black font-mono text-neon-cyan uppercase tracking-tighter">Encrypted_Vote</h3>
                            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-mono">Wait for Overlord arbitration.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {players
                                .filter(p => p.status === 'alive' && p.id !== playerId)
                                .filter(p => !gameState.tie_protocol || gameState.tie_protocol !== 'revote' || gameState.tied_player_ids?.includes(p.id))
                                .map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleVote(p.id)}
                                        className="btn-premium bg-white/5 p-8 rounded-xl border-2 border-white/5 flex justify-between items-center group active:scale-95 transition-all min-h-[44px] hover:border-neon-cyan/30"
                                    >
                                        <span className="text-2xl font-black font-mono uppercase tracking-tighter text-white group-hover:text-neon-cyan transition-colors">{p.name}</span>
                                        <span className="text-neon-cyan text-[10px] font-black uppercase tracking-[0.3em] opacity-30 group-hover:opacity-100 transition-opacity font-mono">DEACTIVATE_NODE</span>
                                    </button>
                                ))
                            }
                        </div>
                    )}
                </div>
            )}
        </main>
    );
  }

  if (displayPhase === 'night') {
    const potentialVictims = players.filter(p => p.status === 'alive' && p.role === 'sukhan_war');
    
    const tally = nightVotes.reduce((acc: any, v) => {
        acc[v.target_id] = (acc[v.target_id] || 0) + 1;
        return acc;
    }, {});

    return (
      <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center relative overflow-hidden scanline">
        <RoleBadge />
        <GoldBadge />

        {isTraitor && isAlive ? (
            (gameState.is_revealing || gameState.reveal_target_id) ? (
                <div className="w-full space-y-12 animate-fade-enter-active">
                    <div className="text-8xl mb-8 animate-pulse text-neon-purple drop-shadow-[0_0_20px_rgba(188,19,254,0.5)]"><Terminal className="w-24 h-24 text-neon-purple mx-auto" /></div>
                    <div className="space-y-6">
                        <h2 className="text-4xl font-black font-mono text-white uppercase tracking-tighter">BREACH_SIGNAL_SENT</h2>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black font-mono">Coordination complete. Silent disconnect pending.</p>
                    </div>
                </div>
            ) : (
                <div className="w-full space-y-10 animate-fade-enter-active">
                    <div className="space-y-4">
                        <h1 className="text-neon-purple font-black uppercase tracking-[0.5em] text-[10px] font-mono shadow-neon-purple/20">BLACKOUT_SYNC</h1>
                        <h2 className="text-4xl font-black font-mono text-white uppercase tracking-tighter">Sever a Terminal</h2>
                        <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-mono">Consensus required for high-security breach.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 w-full max-w-sm mx-auto">
                        {potentialVictims.map(p => {
                            const voteCount = tally[p.id] || 0;
                            const isMyVote = votedId === p.id;

                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleNightVote(p.id)}
                                    className={`relative p-8 rounded-xl border-2 active:scale-95 transition-all flex justify-between items-center group min-h-[44px] ${
                                        isMyVote 
                                        ? 'bg-neon-purple/10 border-neon-purple shadow-[0_0_30px_rgba(188,19,254,0.2)]' 
                                        : 'bg-white/5 border-white/5 hover:border-neon-purple/30'
                                    }`}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-2xl font-black font-mono uppercase tracking-tighter text-white">{p.name}</span>
                                        {isMyVote && <span className="text-[9px] uppercase font-black text-neon-purple tracking-widest mt-1">SELECTION_CAPTURED</span>}
                                    </div>
                                    
                                    {voteCount > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1">
                                                {[...Array(voteCount)].map((_, i) => (
                                                    <div key={i} className="w-3 h-3 rounded-sm bg-neon-purple shadow-[0_0_10px_rgba(188,19,254,1)] animate-pulse" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="glass p-6 rounded-xl border border-neon-purple/10 text-white/30 font-mono uppercase tracking-widest text-[9px] max-w-xs mx-auto leading-relaxed">
                        Overlord AI protocol: Multiple signals required for node termination.
                    </div>
                </div>
            )
        ) : (
            <div className="space-y-10 opacity-20 transition-all duration-1000 scale-90 grayscale">
                <div className="text-9xl mb-4 animate-pulse text-white/40"><Zap className="w-32 h-32 text-white mx-auto" strokeWidth={1} /></div>
                <div className="space-y-4">
                    <h2 className="text-5xl font-black text-white/40 font-mono uppercase tracking-tighter">DATA_BLACKOUT</h2>
                    <p className="text-[10px] uppercase tracking-[0.5em] font-black font-mono">Neural Interface: OFFLINE</p>
                </div>
            </div>
        )}
      </main>
    );
  }

  if (displayPhase === 'payout') {
      const sortedPlayers = [...players].sort((a, b) => (b.gathering_gold || 0) - (a.gathering_gold || 0));
      const myRank = sortedPlayers.findIndex(p => p.id === playerId) + 1;

      return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center scanline">
            <div className="glass p-12 rounded-xl border border-neon-cyan/30 space-y-10 max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-neon-cyan/5 -rotate-45 translate-x-8 -translate-y-8" />
                <div className="space-y-4">
                    <h1 className="text-5xl font-black font-mono text-white uppercase tracking-tighter shadow-neon-cyan/10">Vault_Exit</h1>
                    <p className="text-neon-cyan/50 uppercase text-[10px] font-black tracking-[0.4em] font-mono">Overlord AI verification complete</p>
                </div>
                
                <div className="py-10 bg-black/40 rounded-xl border border-white/5 space-y-3 shadow-inner">
                    <div className="text-6xl font-black text-neon-cyan font-mono drop-shadow-[0_0_20px_rgba(0,243,255,0.4)]">#{me.gathering_gold || 0}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black font-mono">TOTAL_CREDITS</div>
                    <div className="inline-block mt-6 px-4 py-1.5 bg-neon-cyan/10 rounded-full text-neon-cyan text-[10px] font-black uppercase tracking-widest font-mono">RANK #{myRank} // NETWORK_NODE</div>
                </div>

                <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono leading-relaxed px-4">Neural link sync complete. Credits secured in encrypted cold-storage.</p>
            </div>
            <p className="mt-12 text-white/20 text-[10px] uppercase font-black tracking-[0.6em] font-mono">CONNECTION TERMINATED // G_SYNC_OK</p>
        </main>
      );
  }

  if (displayPhase === 'end') {
    const winners = gameState.winner_faction;
    const iWon = (winners === 'poets' && !isTraitor) || (winners === 'plagiarists' && isTraitor);
    
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-8 text-center scanline ${iWon ? 'bg-background' : 'bg-obsidian'}`}>
        <div className="glass p-12 rounded-xl border border-neon-cyan/20 animate-scale-up space-y-8 max-w-md w-full relative">
            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full border-2 font-black font-mono text-sm uppercase tracking-[0.4em] shadow-2xl ${
                iWon ? 'bg-neon-cyan text-black border-white shadow-neon-cyan/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
                {iWon ? 'OP_SUCCESS' : 'OP_FAILURE'}
            </div>

            <h1 className={`text-6xl font-black font-mono uppercase tracking-tighter ${iWon ? 'text-neon-cyan drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-zinc-600'}`}>
                {iWon ? 'PREVAILED' : 'DEFEATED'}
            </h1>
            
            <p className="text-white/60 text-xs uppercase tracking-[0.4em] font-black font-mono">
                {winners === 'poets' ? 'Glitch-Runners Have Secured the Verse' : 'System-Spies Have Corrupted the Network'}
            </p>

            <div className="pt-8 space-y-8">
                {winners === 'poets' && (
                   <div className="space-y-2 pb-8 border-b border-white/5">
                       <div className="text-neon-cyan font-mono text-4xl font-black italic drop-shadow-[0_0_10px_rgba(0,243,255,0.3)]">#{gameState.eidi_pot > 0 ? gameState.eidi_pot : (gameState.last_game_pot || 0)}</div>
                       <div className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black font-mono">TOTAL_RECOVERED_CREDITS</div>
                   </div>
                )}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <div className="text-neon-cyan font-mono text-3xl font-black">#{me.private_gold}</div>
                        <div className="text-[9px] text-white/30 uppercase tracking-widest font-black font-mono">
                            {!isTraitor ? 'SYNC_REWARD' : 'BREACH_BONUS'}
                        </div>
                    </div>
                    <div className="space-y-2 border-l border-white/5 pl-8">
                        <div className="text-neon-purple font-mono text-3xl font-black">#{me.gathering_gold || 0}</div>
                        <div className="text-[9px] text-white/30 uppercase tracking-widest font-black font-mono">NET_ACCUMULATION</div>
                    </div>
                </div>
            </div>
        </div>
        <p className="mt-12 text-white/20 text-[9px] uppercase font-black tracking-[0.5em] font-mono animate-pulse">Wait for Overlord AI to reset global matrix...</p>
      </main>
    );
  }
  return null;
}
