'use client';

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { usePlayers } from '@/hooks/usePlayers';
import { advancePhase, assignRoles, evaluateWinCondition, resetGame, deleteRoom, startMission, liquidatePot, GamePhase, Player, Mission, NARRATOR_SCRIPTS } from '@/lib/game-logic';
import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as Popover from '@radix-ui/react-popover';
import { Terminal, Cpu, Shield, Users, Zap, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HostDashboard() {
  const { roomCode } = useParams() as { roomCode: string };
  const router = useRouter();
  const { gameState, loading: gameLoading, setGameState } = useGameState(roomCode);
  const phase = gameState?.current_phase || 'lobby';
  const roomId = gameState?.id;
  const { players, loading: playersLoading } = usePlayers(roomId || '');
  
  const [votes, setVotes] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [nightVotes, setNightVotes] = useState<any[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [missionOutcome, setMissionOutcome] = useState<'success' | 'failed' | null>(null);
  const [isVotesLocked, setIsVotesLocked] = useState(false);
  const [deactivatedNodeId, setDeactivatedNodeId] = useState<string | null>(null);
  const [silenceConfirmed, setSilenceConfirmed] = useState(false);
  const [origin, setOrigin] = useState('');
  const [devPlagiaristCount, setDevPlagiaristCount] = useState(1);
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [isToolkitOpen, setIsToolkitOpen] = useState(false);
  const [isSabotageVerified, setIsSabotageVerified] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isTerminationConfirmed, setIsTerminationConfirmed] = useState(false);

  useEffect(() => {
    setHostName(localStorage.getItem('cyber_shadows_runner'));
  }, []);

  const isHostAPlayer = useMemo(() => {
    return players.some(p => p.name === hostName);
  }, [players, hostName]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!gameState?.mission_timer_end) {
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

  // Fetch Mission Details
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
    } else {
      setActiveMission(null);
    }
  }, [gameState?.current_mission_id]);

  useEffect(() => {
    if (roomId) {
      const voteChannel = supabase
        .channel(`votes:${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, (payload) => {
          setVotes(prev => [...prev, payload.new]);
        })
        .subscribe();

      const fetchInitialVotes = async () => {
        const { data } = await supabase.from('votes').select('*').eq('room_id', roomId);
        if (data) setVotes(data);
      };
      fetchInitialVotes();

      // Night Votes Subscription
      const nightVoteChannel = supabase
        .channel(`night_votes:${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'night_votes', filter: `room_id=eq.${roomId}` }, () => {
          fetchInitialNightVotes();
        })
        .subscribe();

      const fetchInitialNightVotes = async () => {
        const { data } = await supabase.from('night_votes').select('*').eq('room_id', roomId);
        if (data) setNightVotes(data);
      };
      fetchInitialNightVotes();

      return () => { 
        supabase.removeChannel(voteChannel); 
        supabase.removeChannel(nightVoteChannel);
      };
    }
  }, [roomId]);

  // Derived Data
  const alivePlayers = players.filter(p => p.status === 'alive');
  const alivePoets = players.filter(p => p.status === 'alive' && p.role === 'sukhan_war');
  const alivePlagiarists = players.filter(p => p.status === 'alive' && p.role === 'naqal_baaz');
  
  const voteTallies = useMemo(() => {
    const tallies: Record<string, number> = {};
    votes.forEach(v => {
      // Only count actual votes (round_id >= 1 or 99 for night)
      if (v.round_id >= 1 || v.round_id === 99) {
        tallies[v.target_id] = (tallies[v.target_id] || 0) + 1;
      }
    });
    return tallies;
  }, [votes]);

  const maxVotes = Math.max(...Object.values(voteTallies), 0);
  const mostVotedPlayers = (alivePlayers.length === 2 && maxVotes === 0) ? alivePlayers : alivePlayers.filter(p => (voteTallies[p.id] || 0) === maxVotes && maxVotes > 0);

  const topAliveVictors = useMemo(() => {
    if (!gameState?.winner_faction) return [];
    const winningRole = gameState.winner_faction === 'poets' ? 'sukhan_war' : 'naqal_baaz';
    const factionAlive = players.filter(p => p.role === winningRole && p.status === 'alive');
    if (factionAlive.length === 0) return [];
    const maxScore = Math.max(...factionAlive.map(p => p.private_gold || 0));
    return factionAlive.filter(p => (p.private_gold || 0) === maxScore);
  }, [players, gameState?.winner_faction]);
  const isTie = alivePlayers.length === 2 
    ? (gameState?.tie_protocol === 'none' || !gameState?.tie_protocol)
    : isVotesLocked && mostVotedPlayers.length > 1 && (gameState?.tie_protocol === 'none' || !gameState?.tie_protocol);

  const nightVoteTallies = useMemo(() => {
    const tallies: Record<string, number> = {};
    nightVotes.forEach(v => {
      tallies[v.target_id] = (tallies[v.target_id] || 0) + 1;
    });
    return tallies;
  }, [nightVotes]);

  const maxNightVotes = Math.max(...Object.values(nightVoteTallies), 0);
  const nightConsensusPlayers = alivePlayers.filter(p => (nightVoteTallies[p.id] || 0) === maxNightVotes && maxNightVotes > 0);
  const activeNightTargetId = nightConsensusPlayers.length === 1 ? nightConsensusPlayers[0].id : null;

  const potentialWinner = useMemo(() => {
    if (playersLoading || players.length === 0 || phase === 'lobby' || phase === 'reveal') return null;
    const poetsCount = players.filter(p => p.role === 'sukhan_war' && (p.status === 'alive' || p.status === 'silenced')).length;
    const plagiaristsCount = players.filter(p => p.role === 'naqal_baaz' && (p.status === 'alive' || p.status === 'silenced')).length;
    
    if (plagiaristsCount === 0) return 'poets';
    if (plagiaristsCount >= poetsCount) return 'plagiarists';
    return null;
  }, [players, playersLoading, phase]);
  
  const currentSignals = useMemo(() => players.filter(p => p.has_signaled === true).length, [players]);
  const canVerifySabotage = useMemo(() => {
    if (!gameState || isVerifying || gameState.sabotage_used || isSabotageVerified || currentSignals === 0) return false;
    
    // Unanimous signals from all alive spies
    const requiredSignals = alivePlagiarists.length;
    const isUnanimous = currentSignals === requiredSignals && requiredSignals > 0;
    const isTimeout = timeLeft === 0 && phase === 'mission';
    
    return isUnanimous || isTimeout;
  }, [currentSignals, alivePlagiarists.length, timeLeft, phase, gameState?.sabotage_used, isVerifying, isSabotageVerified]);

  const hasPlayedRef = useRef(false);

  useEffect(() => {
    // Reset the buzzer flag when a new mission starts or phase changes
    hasPlayedRef.current = false;
  }, [gameState?.mission_timer_end, phase]);

  const playBuzzer = async () => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log("🔊 MISSION TIMER OVER - PLAYING BUZZER");
    }
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.5);
    } catch (err) {
      console.error("Audio Playback Error:", err);
    }
  };

  useEffect(() => {
    if (phase === 'mission' && timeLeft === 0 && !hasPlayedRef.current && gameState?.mission_timer_end) {
      const now = Date.now();
      const target = new Date(gameState.mission_timer_end).getTime();
      // Only play if the timer has effectively reached zero naturally
      if (now >= target - 1000) {
        playBuzzer();
      }
    }
  }, [timeLeft, phase, gameState?.mission_timer_end]);

  // FSM Phase Logic
  const handleTransition = async (nextPhase: GamePhase) => {
    if (!roomId) return;
    
    try {
        // Auto Win Condition Check before critical transitions
        if (nextPhase === 'end' || nextPhase === 'night' || (gameState?.current_phase === 'night' && nextPhase === 'mission')) {
            const winner = await evaluateWinCondition(roomId);
            if (winner) {
                await supabase.from('game_rooms').update({ current_phase: 'end', winner_faction: winner }).eq('id', roomId);
                await liquidatePot(roomId, winner);
                return;
            }
        }

        // Phase Cleanup
        if (nextPhase === 'majlis' || nextPhase === 'night' || nextPhase === 'mission') {
            await supabase.from('votes').delete().eq('room_id', roomId);
            await supabase.from('night_votes').delete().eq('room_id', roomId);
            setVotes([]);
            setNightVotes([]);
            setIsVotesLocked(false);
            setDeactivatedNodeId(null);
            setMissionOutcome(null);
            setIsSabotageVerified(false);
            setSilenceConfirmed(false);
            setIsTerminationConfirmed(false);
            
            // Clear reveal state when moving to a new phase
            await supabase.from('game_rooms').update({ 
                is_revealing: false, 
                reveal_target_id: null 
            }).eq('id', roomId);
        }
                // Optimistic UI Update
        console.log("Optimistic Transition to:", nextPhase);
        if (nextPhase === 'mission') {
            const timerEnd = new Date();
            timerEnd.setSeconds(timerEnd.getSeconds() + 90);
            setGameState(prev => prev ? { ...prev, current_phase: nextPhase, mission_timer_end: timerEnd.toISOString() } : null);
        } else {
            setGameState(prev => prev ? { ...prev, current_phase: nextPhase } : null);
        }

        await advancePhase(roomId, nextPhase);
    } catch (err: any) {
        console.error("Transition Error:", err);
        alert(`Error during ${nextPhase} transition: ${err.message || JSON.stringify(err)}`);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const hasSeenTutorial = localStorage.getItem('hasSeenHostTutorial');
    if (hasSeenTutorial === null) {
      setShowTooltips(true);
      setTutorialStep(1);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tutorialContent = [
    {
      step: 1,
      title: "The Mainframe",
      heading: "Initialize the Node",
      text: "Open this on a TV or Projector so all runners can see the data stream.",
      target: "Step 1: Open Public Display"
    },
    {
      step: 2,
      title: "The Connection",
      heading: "Sync the Runners",
      text: `Invite runners using the access code. You need ${gameState?.min_players_required ?? 8} players to begin.`,
      target: "Step 2: Join Link"
    },
    {
      step: 3,
      title: "The Breach",
      heading: "Start the Session",
      text: "Once everyone is synced, click 'Initialize System' to start the heist.",
      target: "Step 3: Start Button"
    }
  ];

  const handleAssignRoles = async () => {
    const minRequired = gameState?.min_players_required ?? (gameState?.is_dev_mode ? 1 : 4);
    if (players.length < minRequired) {
      console.log("Start Blocked:", { current: players.length, required: minRequired });
      return alert(`Minimum ${minRequired} players required to start.`);
    }
    
    setIsAssigning(true);
    console.log("Starting game with", players.length, "players...");
    
    // 1. Immediate Optimistic UI Update for the Overlord
    // This ensures the Teleprompter updates and the button changes INSTANTLY
    setGameState(prev => prev ? { ...prev, current_phase: 'reveal' } : null);
    
    const manualCount = gameState?.is_dev_mode ? devPlagiaristCount : undefined;
    
    try {
      console.log("Assigning roles...");
      await assignRoles(roomId!, manualCount);
      
      console.log("Advancing phase to reveal...");
      await handleTransition('reveal');
      
      // Tutorial Completion
      localStorage.setItem('hasSeenHostTutorial', 'true');
      setShowTooltips(false);
    } catch (err: any) {
      console.error("Critical Game Start Failure:", err);
      const errorMsg = err.message || JSON.stringify(err);
      const errorDetails = err.details || "No further details.";
      alert(`Critical Failure: ${errorMsg}\n\nDetails: ${errorDetails}\n\nThis is likely a Supabase RLS (Row Level Security) issue. Please ensure 'UPDATE' is enabled for the 'game_rooms' and 'players' tables.`);
      
      // Rollback on absolute failure
      setGameState(prev => prev ? { ...prev, current_phase: 'lobby' } : null);
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleDevMode = async (enabled: boolean) => {
    if (!roomId) return;
    
    // Optimistic Update
    console.log("Optimistic Toggle Dev Mode:", enabled);
    setGameState(prev => prev ? { ...prev, is_dev_mode: enabled } : null);
    
    const { error } = await supabase.from('game_rooms').update({ is_dev_mode: enabled }).eq('id', roomId);
    if (error) {
      console.error("Supabase Update Error (is_dev_mode):", error);
      // Rollback on error
      setGameState(prev => prev ? { ...prev, is_dev_mode: !enabled } : null);
      alert("Error enabling dev mode: " + error.message);
    }
  };

  const updateMinPlayers = async (count: number) => {
    if (!roomId) return;
    await supabase.from('game_rooms').update({ min_players_required: count }).eq('id', roomId);
  };

  const handleBanish = async (playerId?: string) => {
    const targetId = playerId || deactivatedNodeId;
    if (!targetId) return;
    
    // Optimistic Update
    setIsTerminationConfirmed(true);
    
    const { error } = await supabase.from('players').update({ status: 'banished' }).eq('id', targetId);
    if (error) {
        console.error("Termination Failed:", error);
        setIsTerminationConfirmed(false);
        alert("Termination failed: " + error.message);
        return;
    }
    
    // Reset tie protocol after termination
    await supabase.from('game_rooms').update({ tie_protocol: 'none', tied_player_ids: [] }).eq('id', roomId);
    
    // Check win condition immediately after termination
    const winner = await evaluateWinCondition(roomId!);
    if (winner) {
        await handleTransition('end');
    }
  };

  const handleTieProtocolSelect = async (protocol: 'decree' | 'revote' | 'spin') => {
    if (!roomId) return;
    await supabase.from('game_rooms').update({ 
        tie_protocol: protocol, 
        tied_player_ids: mostVotedPlayers.map(p => p.id) 
    }).eq('id', roomId);

    if (protocol === 'revote') {
        // Reset votes for revote
        await supabase.from('votes').delete().eq('room_id', roomId);
        setVotes([]);
        setIsVotesLocked(false);
    }
  };

  const [isSpinning, setIsSpinning] = useState(false);
  const handleNeuralOverride = async () => {
    if (!roomId) return;
    setIsSpinning(true);
    
    const tiedIds = gameState?.tied_player_ids || [];
    if (tiedIds.length === 0) {
        setIsSpinning(false);
        return;
    }

    // 1. Determine winner and sync to Display Page immediately
    const winnerId = tiedIds[Math.floor(Math.random() * tiedIds.length)];
    await supabase.from('game_rooms').update({ reveal_target_id: winnerId }).eq('id', roomId);
    
    // 2. Wait 15 seconds (5s spin + 10s showing the result)
    setTimeout(async () => {
        await handleBanish(winnerId);
        // Clear reveal target so next round is fresh
        await supabase.from('game_rooms').update({ reveal_target_id: null }).eq('id', roomId);
        setIsSpinning(false);
    }, 15000);
  };

  const handleSilence = async (targetId: string) => {
    if (!roomId) return;
    await supabase.from('players').update({ status: 'silenced' }).eq('id', targetId);
    await supabase.from('night_votes').delete().eq('room_id', roomId);
    // Persist target for plagiarist lockout
    await supabase.from('game_rooms').update({ reveal_target_id: targetId }).eq('id', roomId);
    setSilenceConfirmed(true);
  };

  const handleWakeUpReveal = async (targetId: string | null) => {
    if (!roomId) return;
    // 1. Set reveal state
    await supabase.from('game_rooms').update({ 
        is_revealing: true, 
        reveal_target_id: targetId 
    }).eq('id', roomId);

    // 2. Evaluate win condition
    const winner = await evaluateWinCondition(roomId);
    
    // 3. Transition to mission after delay (handled by Host clicking button again or auto)
    // For now, let's keep it manual so Host can control the cinematic length.
  };
  const handleVerifySabotage = async () => {
    if (missionOutcome || !gameState || isVerifying || gameState.sabotage_used) return; 
    
    setIsVerifying(true);

    if (!roomId) {
        console.error("Sabotage Verification Failed: Room ID is missing.");
        alert("Error: Room ID missing. Refresh and try again.");
        setIsVerifying(false);
        return;
    }

    // Fresh fetch to prevent race conditions
    const { data: latestRoom, error: fetchError } = await supabase.from('game_rooms').select('*').eq('id', roomId).single();
    if (fetchError || !latestRoom) {
        console.error("Sabotage Fetch Failed:", fetchError);
        alert(`Verification Error: ${fetchError?.message || 'Room not found'}`);
        setIsVerifying(false);
        return;
    }

    if (latestRoom?.sabotage_used) {
        setIsVerifying(false);
        setIsSabotageVerified(true);
        return;
    }

    // 1. Update Game Room State (Consolidated)
    // We set sabotage_triggered to true to signal the finalize logic to apply the tax
    const { error: roomError } = await supabase.from('game_rooms').update({ 
        sabotage_used: true,
        sabotage_triggered: true 
    }).eq('id', roomId);
    
    if (roomError) {
        console.error("Sabotage Room Update Failed Detail:", JSON.stringify(roomError, null, 2));
        alert(`Failed to update sabotage status: ${roomError.message}`);
        setIsVerifying(false);
        return;
    }
    
    // 2. Clear mission signals (round_id 0) is deferred until missionFinalized 
    // to ensure we can still identify signalers in final payout handlers
    
    // 3. Clear mission signals (round_id 0)
    await supabase.from('votes').delete().eq('room_id', roomId).eq('round_id', 0);
    
    // 4. Hard lock locally (Independent of mission outcome)
    setIsSabotageVerified(true);
    setIsVerifying(false); 
  };

  const handleMissionSuccess = async () => {
    if (missionOutcome || !roomId) return;
    
    try {
        const hasSabotage = gameState?.sabotage_triggered || false;
        const addAmount = hasSabotage ? 1000 : 2000;
        
        // 1. Update the Pot
        await supabase.from('game_rooms').update({ 
            eidi_pot: (gameState!.eidi_pot || 0) + addAmount,
            mission_timer_end: null 
        }).eq('id', roomId);

        // 2. If Sabotaged, award signaling plagiarists
        if (hasSabotage) {
            const signalingIds = votes.filter(v => v.round_id === 0).map(v => v.voter_id);
            if (signalingIds.length > 0) {
                // Fetch current golds for these specific players
                const { data: playersToAward } = await supabase
                    .from('players')
                    .select('id, private_gold')
                    .in('id', signalingIds);
                
                for (const p of playersToAward || []) {
                    await supabase.from('players').update({ 
                        private_gold: (p.private_gold || 0) + 1000 
                    }).eq('id', p.id);
                }
            }
        }

        setMissionOutcome('success');
    } catch (err) {
        console.error("Success update failed:", err);
        alert("Failed to update mission outcome.");
    }
  };

  const handleMissionFailure = async () => {
    if (missionOutcome || !roomId) return;
    
    try {
        const hasSabotage = gameState?.sabotage_triggered || false;
        
        // 1. Stop timer
        await supabase.from('game_rooms').update({ 
            mission_timer_end: null 
        }).eq('id', roomId);

        // 2. If Sabotaged, award signaling plagiarists (even on failure!)
        if (hasSabotage) {
            const signalingIds = votes.filter(v => v.round_id === 0).map(v => v.voter_id);
            if (signalingIds.length > 0) {
                const { data: playersToAward } = await supabase
                    .from('players')
                    .select('id, private_gold')
                    .in('id', signalingIds);
                
                for (const p of playersToAward || []) {
                    await supabase.from('players').update({ 
                        private_gold: (p.private_gold || 0) + 1000 
                    }).eq('id', p.id);
                }
            }
        }

        setMissionOutcome('failed');
    } catch (err) {
        console.error("Failure update failed:", err);
        alert("Failed to update mission outcome.");
    }
  };

  const handleStartMission = async () => {
    if (!roomId) return;
    // Reset local verification and outcome states for the new mission
    setIsSabotageVerified(false);
    setIsVerifying(false);
    setMissionOutcome(null);
    await startMission(roomId);
  };

  const handleResetGame = async () => {
    if (!roomId) return;
    
    try {
      // 1. Reset Local State (Instant UI Response)
      // This is critical to prevent the UI from flickering old state before the DB syncs
      setVotes([]);
      setNightVotes([]);
      setIsVotesLocked(false);
      setDeactivatedNodeId(null);
      setMissionOutcome(null);
      setIsSabotageVerified(false);
      setActiveMission(null); // Clear previous mission details
      setSilenceConfirmed(false);
      setIsTerminationConfirmed(false);
      setIsVerifying(false);
      
      // 2. Optimistic Phase Reset
      // Force the Sultan's view to Lobby immediately
      setGameState(prev => prev ? { 
        ...prev, 
        current_phase: 'lobby', 
        eidi_pot: 0, 
        current_round: 0, 
        current_mission_id: null,
        winner_faction: null,
        mission_timer_end: null
      } : null);

      // 3. Reset Database State
      await resetGame(roomId);
      
      console.log("Game Reset Successfully");
    } catch (err: any) {
      console.error("Reset Error:", err);
      alert("Error resetting game: " + err.message);
    }
  };

  const handleEmergencyReset = async () => {
    if (!roomId) return;
    if (confirm("🚨 EMERGENCY RESET: This will permanently delete this room and all its data. Are you sure?")) {
        await deleteRoom(roomId);
        localStorage.removeItem('cyber_shadows_runner');
        localStorage.removeItem('playerId');
        localStorage.removeItem('roomId');
        localStorage.removeItem('isHost');
        router.push('/');
    }
  };

  if (gameLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center scanline">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="font-mono text-2xl text-neon-cyan animate-pulse uppercase tracking-tighter">Initializing Overlord View...</h2>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-6 text-center scanline">
        <div className="glass p-12 rounded-xl border border-neon-cyan/20 max-w-md">
          <h1 className="font-mono text-4xl text-neon-cyan mb-4 uppercase tracking-tighter">Node Not Found</h1>
          <p className="text-white/40 mb-8 font-mono text-xs uppercase tracking-widest">The Overlord has moved to another node, or this access code has expired.</p>
          <button 
            onClick={() => router.push('/')}
            className="btn-premium bg-neon-cyan text-black px-8 py-3 rounded-lg font-black uppercase tracking-[0.2em] text-[10px]"
          >
            Return to Entrance
          </button>
        </div>
      </div>
    );
  }

  const currentMission = activeMission;
  return (
    <main className="min-h-screen bg-background text-white p-4 lg:p-10 space-y-6 relative scanline">
      
      {/* HEADER: Room Code & Public View */}
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="text-[10px] uppercase font-black text-neon-cyan/40 tracking-widest mb-1 font-mono">Room Code</div>
            <span className="text-3xl font-black text-neon-cyan leading-none font-mono tracking-tighter shadow-neon-cyan/10">{roomCode}</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <div className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-1">Join Link</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/60">{origin}/?code={roomCode}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${origin}/?code=${roomCode}`);
                  alert('Link copied to clipboard!');
                }}
                className="btn-premium bg-white/10 px-3 py-1.5 rounded-lg border-white/20 hover:bg-white/20"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {isHostAPlayer && (
            <button 
              onClick={() => window.open(`/play/${roomCode}`, '_blank')}
              className="btn-premium bg-emerald-600/10 text-emerald-500 border-emerald-500/40 px-6 py-4 rounded-full shadow-lg"
            >
              Open My Runner View 🔓
            </button>
          )}
          <div className="relative">
            <Popover.Root open={showTooltips && !isMobile && tutorialStep === 1}>
              <Popover.Trigger asChild>
                <button 
                  onClick={() => {
                    window.open(`/display/${roomCode}`, '_blank');
                    setTutorialStep(2);
                  }}
                  className={`btn-premium bg-neon-cyan/10 text-neon-cyan border-neon-cyan/40 px-6 py-4 rounded-xl shadow-lg relative font-mono text-[10px] font-black uppercase tracking-widest ${showTooltips && tutorialStep === 1 ? 'animate-pulse-gold' : ''}`}
                >
                  Open Display Terminal 📺
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content 
                  side="right" 
                  align="center" 
                  sideOffset={12}
                  className="z-50 outline-none"
                >
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-64 glass p-6 rounded-xl border border-neon-cyan/30 shadow-[0_0_40px_rgba(0,243,255,0.1)] animate-float"
                  >
                    <div className="text-[10px] font-black text-neon-cyan uppercase mb-2 tracking-widest flex justify-between font-mono">
                      <span>Step 1: The Canvas</span>
                      <span>1/3</span>
                    </div>
                    <h4 className="font-mono text-white font-black mb-2 uppercase text-[10px]">Initialize the Node</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed mb-4 font-mono uppercase">Open this on a TV or Projector so all runners can see the data stream and decryption status.</p>
                    <button 
                      onClick={() => setTutorialStep(2)}
                      className="text-[10px] font-black uppercase text-neon-cyan hover:text-white transition-colors flex items-center gap-2 font-mono"
                    >
                      Got it, Next Step →
                    </button>
                    <Popover.Arrow className="fill-neon-cyan/20" />
                  </motion.div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => setIsToolkitOpen(true)}
              className="w-12 h-12 rounded-lg bg-neon-cyan text-black border-2 border-neon-cyan/50 flex items-center justify-center text-xl font-black shadow-lg hover:scale-110 active:scale-90 transition-all font-mono"
              title="Host Toolkit"
            >
              ?
            </button>
            <button 
              onClick={() => setShowTooltips(!showTooltips)}
              className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border transition-all ${showTooltips ? 'bg-neon-cyan text-black border-neon-cyan' : 'bg-transparent text-neon-cyan/40 border-neon-cyan/20'}`}
            >
              Guide {showTooltips ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 1. THE TELEPROMPTER */}
      <Popover.Root open={showTooltips && !isMobile && tutorialStep === 3}>
        <Popover.Trigger asChild>
          <section className="bg-neon-cyan text-black p-6 rounded-xl shadow-xl border-2 border-neon-cyan/50 animate-bounce-subtle relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs uppercase font-black tracking-widest opacity-70 font-mono">Overlord's Teleprompter</h3>
              <button 
                onClick={() => setShowScript(!showScript)}
                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
                  showScript ? 'bg-background text-gold border-background' : 'bg-transparent text-background/40 border-background/20'
                }`}
              >
                {showScript ? '📜 Script Active' : '📜 Show Script'}
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xl lg:text-2xl font-black font-mono leading-tight uppercase tracking-tighter text-black/80">
                {phase === 'lobby' && `Awaiting minimum ${gameState.min_players_required ?? 4} nodes. Click 'INITIALIZE' once synced.`}
                {phase === 'reveal' && "Identity Sync: Ensure all runners have secure links. Spies are now active in the stream."}
                {phase === 'mission' && !gameState.mission_timer_end && "Announce: 60s Dark-Sync. Firewall breach initialization. Runners, eyes off the stream."}
                {phase === 'mission' && gameState.mission_timer_end && "Breach in progress. Data packets are flowing. Data-Lead must verify the hash quietly."}
                {phase === 'majlis' && (
                  gameState?.tie_protocol === 'revote' ? "Conflict detected. Re-Sync in progress. Only flagged nodes available for termination." :
                  gameState?.tie_protocol === 'spin' ? "Decryption Matrix protocol will decide the node disconnect." :
                  gameState?.tie_protocol === 'decree' ? "Overlord Command: Execute final node termination via manual override." :
                  "Council Protocol: Debate and flag anomalous nodes for disconnection. Initiate the purge."
                )}
                {phase === 'night' && (
                  silenceConfirmed 
                  ? "Node disconnected. Broadcasting sequence result to the network." 
                  : "Scanning! Blackout protocol active. System-Spies are voting on their terminals. Confirm once identified."
                )}
                {phase === 'end' && "Breach complete. All credentials revealed. Announce the network victors."}
              </p>
            </div>

            {showScript && (
              <div className="animate-fade-in py-3 px-4 bg-background/5 border-t border-background/10 mt-4 rounded-xl">
                 <div className="text-[8px] uppercase font-black opacity-40 mb-1 tracking-widest">Narrator Script (Read Aloud)</div>
                 <p className="text-lg italic font-medium opacity-90">
                    {phase === 'lobby' && NARRATOR_SCRIPTS.lobby}
                    {phase === 'reveal' && NARRATOR_SCRIPTS.reveal}
                    {phase === 'mission' && !gameState.mission_timer_end && NARRATOR_SCRIPTS.mission_start}
                    {phase === 'mission' && gameState.mission_timer_end && NARRATOR_SCRIPTS.mission_progress}
                    {phase === 'majlis' && NARRATOR_SCRIPTS.council}
                    {phase === 'night' && NARRATOR_SCRIPTS.blackout}
                    {phase === 'end' ? (gameState.winner_faction === 'poets' ? NARRATOR_SCRIPTS.end_runners : NARRATOR_SCRIPTS.end_spies) 
                     : (phase === 'night' ? NARRATOR_SCRIPTS.sync_fallback : '') }
                    {phase === 'mission' && !NARRATOR_SCRIPTS.mission_start && !NARRATOR_SCRIPTS.mission_progress && NARRATOR_SCRIPTS.decree}
                 </p>
              </div>
            )}
          </section>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            side="top" 
            align="center" 
            sideOffset={12}
            className="z-50 outline-none"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-72 glass p-6 rounded-xl border border-neon-cyan/30 shadow-[0_0_40px_rgba(0,243,255,0.1)] font-mono"
            >
              <div className="text-[10px] font-black text-neon-cyan uppercase mb-2 tracking-[0.2em] flex justify-between">
                <span>Step 3: The Decree</span>
                <span>3/3</span>
              </div>
              <h4 className="font-black text-white mb-2 uppercase text-[10px]">Overlord Authorization</h4>
              <p className="text-[10px] text-white/50 leading-relaxed mb-4 uppercase">Once runners have synced, click <strong>INITIALIZE_SYSTEM</strong> in the control panel to begin the heist.</p>
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setTutorialStep(2)}
                  className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
                >
                  ← BACK
                </button>
                <button 
                  onClick={() => setShowTooltips(false)}
                  className="text-[10px] font-black uppercase text-neon-cyan hover:text-white transition-colors"
                >
                  FINISH
                </button>
              </div>
              <Popover.Arrow className="fill-neon-cyan/10" />
            </motion.div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* HOST TOOLKIT DRAWER */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-obsidian text-white shadow-2xl z-50 transform transition-transform duration-500 ease-in-out border-l-2 border-neon-cyan/20 ${isToolkitOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col p-8 font-mono relative overflow-hidden scanline">
          <div className="flex justify-between items-center mb-8 relative z-10 border-b border-white/10 pb-4">
            <h2 className="text-xl font-black uppercase tracking-tighter text-neon-cyan">Overlord_Toolkit</h2>
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => setShowTooltips(!showTooltips)}
                className={`w-6 h-6 rounded border border-white/20 flex items-center justify-center text-[8px] font-black transition-all ${showTooltips ? 'bg-neon-cyan text-black border-neon-cyan' : 'hover:bg-white/10'}`}
                title="Toggle Guide"
              >
                i
              </button>
              <button onClick={() => setIsToolkitOpen(false)} className="text-2xl hover:text-neon-cyan transition-colors font-mono">×</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8 relative z-10 custom-scrollbar pr-2">
            <section className="space-y-4">
              <h3 className="text-[10px] uppercase font-black tracking-widest text-neon-cyan/40 border-l-2 border-neon-cyan pl-2">Network_Glossary</h3>
              <div className="space-y-6">
                <div className="group">
                  <div className="font-black text-xs text-neon-cyan uppercase tracking-widest mb-1">Glitch Runner</div>
                  <div className="text-[10px] text-white/40 leading-relaxed font-mono uppercase">Authorized node. Secondary goal: identify system anomalies and execute terminal purge.</div>
                </div>
                <div className="group">
                  <div className="font-black text-xs text-neon-purple uppercase tracking-widest mb-1">System Spy</div>
                  <div className="text-[10px] text-white/40 leading-relaxed font-mono uppercase">Infiltrator unit. Objective: Corrupt data breach while maintaining signal stealth.</div>
                </div>
                <div className="group">
                  <div className="font-black text-xs text-white uppercase tracking-widest mb-1">Signal Jam</div>
                  <div className="text-[10px] text-white/40 leading-relaxed font-mono uppercase">Node lockout. System-Spies can deactivate one runner's vote during Dark-Sync.</div>
                </div>
                <div className="group">
                  <div className="font-black text-xs text-neon-cyan uppercase tracking-widest mb-1">Breach Council</div>
                  <div className="text-[10px] text-white/40 leading-relaxed font-mono uppercase">Mainframe Assembly. Protocol for debate, node flagging, and deactivation.</div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] uppercase font-black tracking-widest text-neon-cyan/40 border-l-2 border-neon-cyan pl-2">System_Protocols</h3>
              <ul className="text-[10px] space-y-3 list-none opacity-60 font-mono uppercase tracking-widest">
                <li className="flex gap-2"><span className="text-neon-cyan">»</span> Verify "Source of Truth" hash with Data-Lead.</li>
                <li className="flex gap-2"><span className="text-neon-cyan">»</span> Enforce silence during Dark-Sync protocols.</li>
                <li className="flex gap-2"><span className="text-neon-cyan">»</span> Execute terminal purge via matrix randomness or Overlord decree.</li>
              </ul>
            </section>
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/10 text-center relative z-10">
            <div className="text-[8px] uppercase font-black text-white/20 tracking-[0.4em]">© CYBER_SHADOWS • OVERLORD_OS_1.0</div>
          </div>
        </div>
      </div>
      
      {/* OVERLAY */}
      {isToolkitOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsToolkitOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. THE DATA VIEW */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Mission Display */}
          {phase === 'mission' && activeMission && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neon-cyan/5 border border-neon-cyan/20 p-6 rounded-xl font-mono">
                <h4 className="text-[10px] uppercase font-black text-neon-cyan mb-2 tracking-[0.2em]">Public_Broadcast</h4>
                <h3 className="text-xl font-black mb-2 text-white uppercase tracking-tight">{activeMission?.title ?? "Untitled Mission"}</h3>
                <p className="text-white/60 text-xs italic">"{activeMission?.public_goal ?? ""}"</p>
              </div>
              <div className="bg-neon-purple/5 border border-neon-purple/20 p-6 rounded-xl font-mono">
                <h4 className="text-[10px] uppercase font-black text-neon-purple mb-2 tracking-[0.2em]">Classified_Sabotage</h4>
                <p className="text-sm font-black text-neon-purple italic">"{activeMission?.secret_sabotage ?? ""}"</p>
              </div>
              
              {/* THE SOURCE OF TRUTH CARD */}
              <div className="md:col-span-2 bg-neon-cyan/10 border-2 border-neon-cyan/40 rounded-xl p-8 relative overflow-hidden group scanline">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                    <Shield className="w-12 h-12 text-neon-cyan" />
                  </div>
                  <h4 className="text-[10px] uppercase font-black text-neon-cyan mb-4 tracking-[0.3em]">The Source of Truth: Answer Key</h4>
                  <p className="text-4xl font-black text-white tracking-tighter leading-tight font-mono">
                      {activeMission?.host_answer_key || "NO_DATA_SYNC"}
                  </p>
              </div>

              {/* START MISSION BUTTON (Only if timer not started) */}
              {!gameState?.mission_timer_end && (
                <div className="md:col-span-2 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <button 
                        onClick={handleStartMission}
                        className="w-full bg-neon-cyan hover:bg-neon-cyan/90 text-black py-8 rounded-xl text-3xl font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,243,255,0.2)] border-2 border-white/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 font-mono"
                    >
                        <span>⚡ BEGIN_BREACH</span>
                        <span className="text-[10px] font-black opacity-60">(SYNC_TIMER + REVEAL)</span>
                    </button>
                    <p className="text-center text-neon-cyan/40 text-[10px] uppercase font-black mt-6 tracking-widest font-mono">
                        Protocol: Initiating objective broadcast and 2.5-min extraction countdown.
                    </p>
                </div>
              )}
            </div>
          )}

          <section className="glass p-8 rounded-xl border border-white/10 h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Users className="w-16 h-16 text-neon-cyan" />
            </div>
            <div className="flex justify-between items-center mb-8 relative">
              <Popover.Root open={showTooltips && !isMobile && tutorialStep === 2}>
                <Popover.Trigger asChild>
                  <h2 className="text-xl font-black font-mono text-neon-cyan uppercase tracking-tighter cursor-help">Synced_Nodes ({players.length}/{gameState.min_players_required ?? 4})</h2>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content 
                    side="left" 
                    align="center" 
                    sideOffset={12}
                    className="z-50 outline-none"
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-72 glass p-6 rounded-xl border border-neon-cyan/30 shadow-2xl font-mono"
                    >
                      <div className="text-[10px] font-black text-neon-cyan uppercase mb-2 tracking-widest flex justify-between">
                        <span>Step 2: The Gathering</span>
                        <span>2/3</span>
                      </div>
                      <h4 className="font-black text-white mb-2 uppercase text-[10px]">Assemble the Network</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed mb-4 uppercase">Share the link above. Once we reach <strong>{gameState.min_players_required ?? 4} nodes</strong>, the Overlord can initialize the session.</p>
                      <div className="flex justify-between items-center">
                        <button 
                          onClick={() => setTutorialStep(1)}
                          className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
                        >
                          ← BACK
                        </button>
                        <button 
                          onClick={() => setTutorialStep(3)}
                          className="text-[10px] font-black uppercase text-neon-cyan hover:text-white transition-colors"
                        >
                          NEXT →
                        </button>
                      </div>
                      <Popover.Arrow className="fill-neon-cyan/10" />
                    </motion.div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
              <div className="text-[10px] font-black font-mono text-neon-cyan/60 tracking-widest uppercase">Vault: C{gameState.eidi_pot}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {players.map(p => (
                <div key={p.id} className={`p-2 rounded border transition-all font-mono ${
                  p.status === 'alive' ? 'bg-black/40 border-white/10' : 'bg-white/5 border-white/5 grayscale opacity-30 scale-95'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="w-full">
                        <div className="font-black flex justify-between items-center mb-1">
                          <span className={`${p.status === 'alive' ? 'text-white' : 'text-white/40'} uppercase tracking-tight`}>{p.name}</span>
                          {p.name === hostName && (
                            <span className="text-[8px] bg-neon-cyan/20 text-neon-cyan px-2 py-0.5 rounded border border-neon-cyan/20 font-black uppercase tracking-widest">HLD</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className={`text-[8px] uppercase font-black tracking-widest ${p.role === 'sukhan_war' ? 'text-neon-cyan/60' : 'text-neon-purple/80'}`}>
                              {p.role === 'sukhan_war' ? 'GLITCH-RUNNER' : 'SYSTEM-SPY'}
                          </div>
                          <div className="text-[8px] uppercase text-white/20 font-black tracking-widest">
                              {p.status}
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Voting Chart */}
            {phase === 'majlis' && (
                <div className="mt-8 pt-8 border-t border-white/10 font-mono">
                    <h3 className="text-[10px] uppercase font-black text-white/30 mb-6 tracking-widest">Matrix_Vote_Tally ({votes.length}/{alivePlayers.length})</h3>
                    <div className="space-y-4">
                        {alivePlayers.map(p => {
                            const count = voteTallies[p.id] || 0;
                            const percentage = (count / (alivePlayers.length || 1)) * 100;
                            return (
                                <div key={p.id} className="space-y-2">
                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-tight">
                                        <span className="text-white/60">{p.name}</span>
                                        <span className="text-neon-cyan">{count} PACKETS</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.5)] transition-all duration-500" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
          </section>
        </div>

        {/* 3. THE CONTROL PANEL */}
        <div className="space-y-6">
          <section className="glass p-8 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 flex flex-col h-full relative z-10 scanline">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-12 h-12 text-neon-cyan" />
            </div>
            <h2 className="text-sm font-black font-mono text-neon-cyan mb-8 uppercase tracking-[0.3em]">Execution_Matrix</h2>
            
            <div className="flex-1 space-y-4 font-mono">
              {phase === 'lobby' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    {process.env.NODE_ENV === 'development' && (
                      <button 
                        onClick={() => setShowDevSettings(!showDevSettings)}
                        className="text-[10px] uppercase font-black text-neon-cyan/60 hover:text-neon-cyan transition-all flex items-center gap-2"
                      >
                        {showDevSettings ? 'HIDE_CONFIG' : '⚙️ DEV_CONFIG'}
                      </button>
                    )}
                    {gameState?.is_dev_mode && (
                      <span className="text-[10px] bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-neon-purple/20">Dev_Matrix_Active</span>
                    )}
                  </div>

                  {showDevSettings && (
                    <div className="p-6 bg-black/40 rounded-xl border border-white/10 space-y-6 animate-fade-enter-active mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Enable_Dev_Matrix</span>
                        <input 
                          type="checkbox" 
                          checked={gameState?.is_dev_mode || false}
                          onChange={(e) => toggleDevMode(e.target.checked)}
                          className="w-5 h-5 accent-neon-cyan"
                        />
                      </div>

                      {gameState?.is_dev_mode && (
                        <>
                          <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-white/40">Min_Nodes</span>
                              <span className="text-neon-cyan">{gameState.min_players_required}</span>
                            </div>
                            <input 
                              type="range" min="1" max="12" 
                              value={gameState.min_players_required}
                              onChange={(e) => updateMinPlayers(parseInt(e.target.value))}
                              className="w-full accent-neon-cyan h-1 bg-white/5 rounded-full appearance-none"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-white/40">Spy_Infiltration</span>
                              <span className="text-neon-purple">{devPlagiaristCount}</span>
                            </div>
                            <input 
                              type="range" min="1" max={Math.max(1, players.length - 1)} 
                              value={devPlagiaristCount}
                              onChange={(e) => setDevPlagiaristCount(parseInt(e.target.value))}
                              className="w-full accent-neon-purple h-1 bg-white/5 rounded-full appearance-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="relative z-20">
                    <button 
                      onClick={handleAssignRoles}
                      disabled={isAssigning || players.length < (gameState?.min_players_required ?? (gameState?.is_dev_mode ? 1 : 4))}
                      className={`btn-premium w-full bg-neon-cyan text-black py-6 rounded-xl shadow-xl shadow-neon-cyan/20 text-xs font-black uppercase tracking-[0.3em] active:scale-95 transition-all ${isAssigning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isAssigning ? 'SYNCING_NODES...' : 'INITIALIZE_NODES'}
                    </button>
                  </div>
                  {players.length < (gameState?.min_players_required ?? 4) && !gameState?.is_dev_mode && (
                    <p className="text-center text-neon-purple text-[8px] uppercase font-black tracking-widest mt-6 animate-pulse leading-relaxed">
                      Initialization Error: Insufficient nodes detected ({players.length}/{gameState?.min_players_required ?? 4})
                    </p>
                  )}
                </div>
              )}

              {phase === 'reveal' && (
                <button 
                    onClick={() => handleTransition('mission')}
                    disabled={gameState.current_mission_id !== null}
                    className={`btn-premium w-full bg-neon-cyan text-black py-6 rounded-xl shadow-xl shadow-neon-cyan/20 text-xs font-black uppercase tracking-[0.3em] ${gameState.current_mission_id ? 'opacity-20 grayscale' : ''}`}
                >
                    {gameState.current_mission_id ? 'SYNCING_MISSION_DATA...' : 'INITIATE_FIRST_MISSION'}
                </button>
              )}

              {phase === 'mission' && (
                <div className="space-y-4">
                    <div className="bg-black/40 p-6 rounded-xl border border-white/5 text-center mb-6 shadow-inner">
                        <div className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] mb-2">Time_Remaining</div>
                        <div className={`text-5xl font-black tabular-nums tracking-tighter ${timeLeft <= 20 ? 'text-neon-purple animate-pulse' : 'text-white'}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={handleMissionSuccess} 
                            disabled={timeLeft > 90 || !!missionOutcome}
                            className="btn-premium w-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-neon-cyan hover:text-black transition-all"
                        >
                            DATA_RECOVERED ({gameState?.sabotage_triggered ? 'C1000 TAXED' : 'C2000'})
                        </button>
                        
                        <button 
                            onClick={handleMissionFailure} 
                            disabled={timeLeft > 0 || !!missionOutcome}
                            className="btn-premium w-full bg-neon-purple/10 text-neon-purple border border-neon-purple/30 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-neon-purple hover:text-white transition-all"
                        >
                            {timeLeft > 0 ? `SYNCING_PHASE_ACTIVE...` : `BREACH_FAILED: PARSE_ERROR`}
                        </button>
                        
                        <button 
                          onClick={handleVerifySabotage}
                          disabled={!canVerifySabotage || isVerifying || isSabotageVerified}
                          className="btn-premium w-full bg-neon-purple/20 text-neon-purple border border-neon-purple/40 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {gameState?.sabotage_used ? "BREACH_SIGNAL_CONFIRMED" : `VERIFY_SYSTEM_BREACH (${currentSignals}/${alivePlagiarists.length})`}
                        </button>
                    </div>

                    <button 
                        onClick={() => handleTransition('majlis')}
                        disabled={!missionOutcome && !potentialWinner}
                        className="btn-premium w-full bg-white text-black py-6 rounded-xl text-xs font-black uppercase tracking-[0.3em] mt-6 shadow-xl"
                    >
                        {potentialWinner ? 'SYSTEM_HALT: TERMINATE_OPERATION' : 'INITIATE_BREACH_COUNCIL'}
                    </button>
                </div>
              )}

              {phase === 'majlis' && (
                <div className="space-y-6">
                    {alivePlayers.length > 2 && (
                        <button 
                            onClick={() => setIsVotesLocked(true)}
                            disabled={votes.length < alivePlayers.length || isVotesLocked}
                            className={`btn-premium w-full py-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              isVotesLocked ? 'bg-white/5 text-white/20 border border-white/10' : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan'
                            }`}
                        >
                            {isVotesLocked ? "MATRIX_LOCKED" : "LOCK_MATRIX_SYNC"}
                        </button>
                    )}
                    
                    {isVotesLocked && !isTie && gameState?.tie_protocol === 'none' && !isTerminationConfirmed && (
                        <div className="p-6 bg-black/40 rounded-xl border border-white/5 space-y-4">
                            <p className="text-[10px] text-center text-white/40 uppercase font-black tracking-[0.2em] mb-4">Target identified. Execute termination?</p>
                            {mostVotedPlayers.map(p => (
                                <button key={p.id} onClick={() => setDeactivatedNodeId(p.id)} className={`btn-premium w-full py-4 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${deactivatedNodeId === p.id ? 'bg-neon-purple text-white border-neon-purple shadow-lg shadow-neon-purple/20' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                    DEACTIVATE_NODE: {p.name}
                                </button>
                            ))}
                            <button 
                                onClick={() => handleBanish()}
                                disabled={!deactivatedNodeId}
                                className="btn-premium w-full bg-neon-purple text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-neon-purple/20 disabled:opacity-20 mt-6"
                            >
                                CONFIRM_PURGE
                            </button>
                        </div>
                    )}

                    {isTie && (
                        <div className="p-8 bg-neon-cyan/5 rounded-xl border border-neon-cyan/20 animate-scale-up space-y-8">
                            <div className="text-center">
                                <h3 className="text-neon-cyan font-black uppercase tracking-[0.4em] text-[10px] mb-2">Tie_Detected_In_Matrix</h3>
                                <p className="text-white/20 text-[8px] uppercase tracking-widest">Awaiting Overlord Protocol Selection</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => handleTieProtocolSelect('decree')} className="btn-premium w-full bg-neon-cyan text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">🔱 OVERLORD_PROTOCOL</button>
                                {alivePlayers.length > 2 && (
                                    <button onClick={() => handleTieProtocolSelect('revote')} className="btn-premium w-full bg-white/5 text-neon-cyan border border-neon-cyan/40 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">🗳️ MATRIX_RE-SYNC</button>
                                )}
                                <button onClick={() => handleTieProtocolSelect('spin')} className="btn-premium w-full bg-neon-purple/20 text-neon-purple border border-neon-purple/40 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">⚡ NEURAL_OVERRIDE</button>
                            </div>
                        </div>
                    )}

                    {gameState?.tie_protocol === 'decree' && (
                        <div className="p-6 bg-black/40 rounded-xl border border-white/5 space-y-3">
                            <p className="text-[8px] text-center text-neon-cyan uppercase font-black tracking-[0.3em] animate-pulse mb-4">Command Override Active...</p>
                            {gameState.tied_player_ids?.map(id => {
                                const player = players.find(p => p.id === id);
                                return (
                                    <button key={id} onClick={() => handleBanish(id)} className="btn-premium w-full bg-neon-purple/10 border border-neon-purple/40 text-neon-purple py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-all">
                                        DEACTIVATE {player?.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {gameState?.tie_protocol === 'spin' && (
                         <div className="p-10 bg-black/40 rounded-xl border border-neon-purple/20 animate-pulse text-center space-y-8">
                            <h3 className="text-neon-purple font-black uppercase tracking-[0.3em] text-[10px]">Matrix_Randomizer</h3>
                            <button 
                                onClick={handleNeuralOverride} 
                                disabled={isSpinning}
                                className={`w-24 h-24 rounded-full border-2 flex items-center justify-center text-4xl mx-auto transition-all shadow-[0_0_50px_rgba(188,19,254,0.1)] ${isSpinning ? 'animate-spin border-neon-purple' : 'border-neon-purple/20 bg-neon-purple/10'}`}
                            >
                                ⚡
                            </button>
                            <p className="text-neon-purple/40 text-[8px] uppercase font-black tracking-widest">{isSpinning ? 'SCANNING_MATRIX...' : 'INITIATE_DECRYPTION_JUMP'}</p>
                         </div>
                    )}

                    {gameState?.tie_protocol === 'revote' && (
                        <div className="p-8 bg-black/40 rounded-xl border border-neon-cyan/20 text-center space-y-6">
                            <h3 className="text-neon-cyan font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                                {isVotesLocked ? "RE-SYNC_RESULTS" : "RE-SYNC_IN_PROGRESS"}
                            </h3>
                            <p className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-4">Conflict: {gameState.tied_player_ids?.map(id => players.find(p => p.id === id)?.name).join(' vs ')}</p>
                            
                            {!isVotesLocked ? (
                                <>
                                    <div className="text-4xl font-black tabular-nums tracking-tighter text-neon-cyan">{votes.length} / {alivePlayers.length}</div>
                                    <button 
                                        onClick={() => setIsVotesLocked(true)}
                                        disabled={votes.length < alivePlayers.length || isVotesLocked}
                                        className="btn-premium w-full bg-neon-cyan text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-neon-cyan/20 mt-6"
                                    >
                                        LOCK_RE-SYNC
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <p className="text-[8px] text-center text-white/30 uppercase font-black tracking-widest mb-4">Manual deactivation required</p>
                                    {mostVotedPlayers.map(p => (
                                        <button key={p.id} onClick={() => setDeactivatedNodeId(p.id)} className={`btn-premium w-full py-4 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${deactivatedNodeId === p.id ? 'bg-neon-purple text-white border-neon-purple shadow-lg shadow-neon-purple/20' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                            DEACTIVATE {p.name} ({votes.filter(v => v.target_id === p.id).length} PACKETS)
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => handleBanish()}
                                        disabled={!deactivatedNodeId || isTerminationConfirmed}
                                        className="btn-premium w-full bg-neon-purple text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-neon-purple/20 disabled:opacity-20 mt-6"
                                    >
                                        CONFIRM_PURGE
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isTerminationConfirmed && (
                        <div className="p-6 bg-neon-purple/10 rounded-xl border border-neon-purple/40 text-center animate-pulse">
                            <p className="text-neon-purple font-black uppercase tracking-[0.3em] text-[10px] mb-2">Node_Disconnected</p>
                            <p className="text-[8px] text-white/20 uppercase font-black tracking-widest leading-relaxed">Identity scrubbed from active directory clusters.</p>
                        </div>
                    )}

                    <button 
                        onClick={() => potentialWinner ? handleTransition('end') : handleTransition('night')}
                        disabled={!isTerminationConfirmed && !potentialWinner} 
                        className="btn-premium w-full bg-white text-black py-6 rounded-xl text-xs font-black uppercase tracking-[0.3em] mt-8 shadow-xl"
                    >
                        {potentialWinner ? 'SYSTEM_HALT: REVEAL_RESULTS' : 'INITIATE_BLACKOUT_SYNC'}
                    </button>
                </div>
              )}

              {phase === 'night' && (
                <div className="space-y-6">
                    <div className="bg-black/40 p-6 rounded-xl border border-white/5">
                        <h3 className="text-[10px] uppercase font-black text-white/30 mb-8 tracking-[0.3em] text-center">{alivePlagiarists.length > 1 ? "SPY_COORDINATION_MATRIX" : "SPY_TARGET_SELECTION"}</h3>
                        <div className="space-y-4">
                            {alivePoets.map(p => {
                                const count = nightVoteTallies[p.id] || 0;
                                const isConsensus = activeNightTargetId === p.id;
                                const percentage = (count / (alivePlagiarists.length || 1)) * 100;
                                
                                return (
                                    <div key={p.id} className="space-y-2">
                                        <div className="flex justify-between text-[10px] uppercase font-black font-mono">
                                            <span className={isConsensus ? 'text-neon-purple' : 'text-white/40'}>{p.name} {isConsensus && '🎯'}</span>
                                            <span className="text-white/20">{count} PACKETS</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${isConsensus ? 'bg-neon-purple shadow-[0_0_10px_rgba(188,19,254,0.5)]' : 'bg-white/10'}`} style={{ width: `${percentage}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {!silenceConfirmed ? (
                        <div className="space-y-4">
                             <p className="text-[8px] text-center text-neon-purple/60 uppercase font-black tracking-[0.4em] animate-pulse">
                                {nightConsensusPlayers.length > 1 ? "CONFLICT_DETECTED: MANUAL_OVERRIDE_REQUIRED" : "WAITING_FOR_SPY_CONSENSUS..."}
                             </p>
                             
                             <div className="grid grid-cols-1 gap-2">
                                {(nightConsensusPlayers.length > 1 ? nightConsensusPlayers : (activeNightTargetId ? [players.find(p => p.id === activeNightTargetId)!] : [])).map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handleSilence(p.id)}
                                        className="btn-premium w-full bg-neon-purple text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-neon-purple/10"
                                    >
                                        DISCONNECT_NODE: {p.name}
                                    </button>
                                ))}
                             </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-scale-up">
                            <div className="p-6 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl text-center">
                                <p className="text-[10px] uppercase text-neon-cyan font-black tracking-[0.3em]">SIGNAL_JAM_EXECUTED</p>
                            </div>
                            
                            <button 
                                onClick={() => potentialWinner ? handleTransition('end') : handleWakeUpReveal(nightVotes[0]?.target_id || null)}
                                disabled={gameState.is_revealing && !potentialWinner}
                                className="btn-premium w-full bg-neon-cyan text-black py-6 rounded-xl text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-neon-cyan/20 active:scale-95 transition-all"
                            >
                                {potentialWinner ? "SYSTEM_HALT: REVEAL_RESULTS" : gameState.is_revealing ? "SYNCING_REVEAL..." : "WAKE_UP_&_REVEAL"}
                            </button>

                            {gameState.is_revealing && (
                                <button 
                                    onClick={() => handleTransition(potentialWinner ? 'end' : 'mission')}
                                    className="btn-premium w-full bg-white/5 border border-white/10 text-white/60 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest mt-4 hover:bg-white/10 transition-all font-mono"
                                >
                                    {potentialWinner ? "HALT_REVEAL_&_PAYOUT" : "DISMISS_REVEAL_&_NEXT_BREACH"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
              )}

              {phase === 'payout' && (
                <div className="space-y-8">
                    <div className="p-8 bg-black/40 rounded-xl border border-neon-cyan/20 text-center mb-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse" />
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">FINAL_VAULT_PAYOUT</h2>
                        <p className="text-neon-cyan/40 uppercase text-[10px] font-black tracking-[0.4em]">Breach concluded. Overlord rewards dispensed.</p>
                        
                        <div className="mt-12 space-y-4">
                            {players.sort((a, b) => (b.gathering_gold || 0) - (a.gathering_gold || 0)).map((p, idx) => (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:border-neon-cyan/20 transition-all font-mono">
                                    <div className="flex items-center gap-6">
                                        <span className="text-neon-cyan font-black text-xl w-8">#{idx + 1}</span>
                                        <div className="flex flex-col items-start">
                                          <span className="text-white font-black text-base tracking-tight">{p.name} {p.status === 'banished' ? '⚠️' : ''}</span>
                                          <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">{p.role === 'sukhan_war' ? 'GLITCH-RUNNER' : 'SYSTEM-SPY'}</span>
                                        </div>
                                    </div>
                                    <div className="text-neon-cyan font-black text-xl">C{p.gathering_gold || 0}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={handleResetGame}
                            className="btn-premium w-full bg-neon-cyan text-black py-6 rounded-xl text-xs font-black uppercase tracking-[0.3em] shadow-xl"
                        >
                            INITIATE_NEW_PROTOCOL
                        </button>
                        <button 
                            onClick={() => router.push('/')} 
                            className="btn-premium w-full bg-white/5 text-white/40 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-mono"
                        >
                            EXIT_SYSTEM
                        </button>
                    </div>
                </div>
              )}

              {phase === 'end' && (
                <div className="space-y-8">
                    <div className="p-10 bg-black/60 rounded-xl border-2 border-neon-cyan shadow-shadow-neon-cyan/20 text-center mb-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-neon-cyan/5 animate-pulse" />
                        <div className="relative z-10 space-y-8">
                             <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight">
                                {gameState.winner_faction === 'poets' ? 'GLITCH-RUNNERS_PREVAIL' : 
                                 gameState.winner_faction === 'plagiarists' ? 'SYSTEM-SPIES_RULE_MATRIX' : 'BREACH_CONCLUDED'}
                             </h2>
                             <div className="h-px bg-white/10 w-24 mx-auto" />
                             <p className="text-neon-cyan font-black text-2xl tracking-tighter">TOTAL_ALLOCATION: C{gameState.eidi_pot > 0 ? gameState.eidi_pot : gameState.last_game_pot}</p>
                        </div>

                        {topAliveVictors.length > 0 && (
                            <div className="mt-12 p-8 bg-white/5 rounded-xl border border-white/10 animate-fade-enter-active">
                                <p className="text-[8px] text-white/30 font-black uppercase tracking-[0.5em] mb-6">SUPREME_VICTOR_DETECTED</p>
                                <div className="flex flex-wrap justify-center gap-12">
                                    {topAliveVictors.map(v => (
                                        <div key={v.id} className="text-center group">
                                            <div className="text-4xl font-black text-neon-cyan group-hover:scale-110 transition-transform duration-500">{v.name}</div>
                                            <div className="text-[10px] text-white/40 font-mono mt-2 uppercase tracking-widest font-black">C{v.private_gold} CREDITS</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 font-mono">
                        <button onClick={handleResetGame} className="btn-premium w-full bg-neon-cyan text-black py-6 rounded-xl text-xs font-black uppercase tracking-[0.3em] shadow-xl">RE-STACK_BLOCKS</button>
                        <button 
                            onClick={() => handleTransition('payout')} 
                            className="btn-premium w-full bg-white/5 text-white/60 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            DISPENSE_CREDITS_&_HALT
                        </button>
                    </div>
                </div>
              )}
            </div>

            <button 
                onClick={handleEmergencyReset}
                className="mt-12 pt-6 border-t border-white/5 text-[8px] uppercase tracking-[0.6em] text-white/10 hover:text-red-500 transition-colors text-center w-full font-black font-mono"
            >
                EMERGENCY_SYSTEM_RESET
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
