'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { usePlayers } from '@/hooks/usePlayers';
import { useState, useEffect, useRef } from 'react';
import { Cpu, Zap, Terminal, Shield, Activity, Lock } from 'lucide-react';
import { THEME } from '@/lib/theme-config';

export default function PublicDisplay() {
  const { roomCode } = useParams() as { roomCode: string };
  const { gameState, loading: gameLoading } = useGameState(roomCode);
  const phase = gameState?.current_phase || 'lobby';
  const roomId = gameState?.id;
  const { players, loading: playersLoading } = usePlayers(roomId || '');
  const [origin, setOrigin] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWinnerHighlight, setShowWinnerHighlight] = useState(false);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    hasPlayedRef.current = false;
  }, [gameState?.mission_timer_end, phase]);

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

  useEffect(() => {
    if (gameState?.reveal_target_id) {
       setShowWinnerHighlight(false);
       const timer = setTimeout(() => setShowWinnerHighlight(true), 5000);
       return () => clearTimeout(timer);
    } else {
       setShowWinnerHighlight(false);
    }
  }, [gameState?.reveal_target_id]);

  const playBuzzer = async () => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

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
      if (now >= target - 1000) {
        playBuzzer();
      }
    }
  }, [timeLeft, phase, gameState?.mission_timer_end]);

  if (gameLoading || playersLoading) return <div className="min-h-screen bg-obsidian flex items-center justify-center text-neon-cyan font-mono text-4xl animate-pulse tracking-tighter uppercase whitespace-nowrap">Initializing_Core_Systems...</div>;
  if (!gameState) return <div className="min-h-screen bg-obsidian flex items-center justify-center text-neon-purple font-black font-mono uppercase tracking-widest">Fatal_Error: Room_{roomCode}_Not_Found</div>;

  const joinUrl = `${origin}/?code=${roomCode}`;

  return (
    <main className="h-screen max-h-screen bg-obsidian text-white flex flex-col overflow-hidden font-mono">
      
      <div className="h-0.5 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan w-full opacity-50" />

      <header className="p-4 lg:p-10 flex justify-between items-start shrink-0">
        <div className="space-y-1">
            <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]">Cyber-Shadows</h1>
            <div className="flex items-center gap-4 opacity-50">
                <span className="h-[1px] w-12 bg-neon-cyan" />
                <span className="uppercase tracking-[1em] text-[8px] font-black text-neon-cyan">Distributed_Heist_Protocol_v1.0</span>
            </div>
        </div>
        
        <div className="text-right glass p-4 lg:p-6 rounded-xl border border-neon-cyan/20 flex flex-col items-center shadow-2xl bg-neon-cyan/5 min-w-[100px] lg:min-w-[150px] scanline">
            <div className="text-[10px] lg:text-xs uppercase font-black text-neon-cyan/60 tracking-[0.3em] mb-2">Node_Access</div>
            <div className="text-2xl lg:text-5xl font-black tracking-tighter text-white leading-none font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{roomCode}</div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 lg:p-10 relative">
        
        {phase === 'lobby' && (
            <div className="space-y-10 animate-fade-enter-active">
                <div className="text-6xl animate-pulse flex justify-center"><Terminal className="w-24 h-24 text-neon-cyan shadow-[0_0_30px_rgba(0,243,255,0.3)]" /></div>
                <h2 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tighter">{THEME.phaseLabels.lobby}...</h2>
                <div className="flex gap-4 justify-center">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-sm border-2 transition-all duration-700 ${players[i] ? 'bg-neon-cyan border-neon-cyan scale-110 shadow-[0_0_20px_rgba(0,243,255,0.5)]' : 'bg-white/5 border-white/10'}`} />
                    ))}
                </div>
                <div className="space-y-4">
                    <p className="text-white/30 uppercase tracking-[0.5em] font-black text-[10px]">Initialize_Terminal_Session</p>
                    <p className="text-neon-cyan font-mono text-xl lg:text-4xl font-black bg-white/5 px-10 py-5 rounded-xl border border-white/10 select-all cursor-none hover:bg-neon-cyan/10 transition-all tracking-tighter">
                        {joinUrl.replace('http://', '').replace('https://', '')}
                    </p>
                </div>
            </div>
        )}

        {phase === 'reveal' && (
            <div className="space-y-8 animate-scale-up">
                <h2 className="text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(0,243,255,0.2)]">{THEME.phaseLabels.reveal}</h2>
                <div className="h-0.5 w-48 bg-neon-cyan mx-auto opacity-30 shadow-[0_0_10px_rgba(0,243,255,1)]" />
                <p className="text-neon-cyan/60 text-xl uppercase tracking-[0.6em] font-black animate-pulse">Maintain_Silence_Protocol</p>
            </div>
        )}

        {phase === 'mission' && (
            <div className="space-y-10 animate-fade-enter-active max-w-5xl text-center">
                {!gameState.mission_timer_end ? (
                    <div className="space-y-12 py-10">
                        <div className="text-8xl animate-pulse flex justify-center"><Cpu className="w-48 h-48 text-neon-cyan shadow-[0_0_50px_rgba(0,243,255,0.2)]" /></div>
                        <div className="space-y-6">
                            <h2 className="text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter">{THEME.phaseLabels.mission}...</h2>
                            <p className="text-neon-cyan/40 text-2xl uppercase tracking-[0.6em] font-black">{THEME.overlord}_Is_Mapping_Nodes</p>
                        </div>
                    </div>
                ) : timeLeft > 90 ? (
                    <div className="space-y-12 py-10 animate-pulse">
                        <div className="text-8xl select-none opacity-20 flex justify-center"><Zap className="w-48 h-48 text-neon-purple shadow-[0_0_50px_rgba(188,19,254,0.3)]" /></div>
                        <div className="space-y-2">
                            <h2 className="text-6xl lg:text-5xl font-black text-neon-purple uppercase tracking-[0.3em]">BLACKOUT_SYNC</h2>
                            <p className="text-white/20 text-xl uppercase tracking-[0.8em] font-black">System_Stealth_Initialized</p>
                            <div className="text-9xl font-black text-neon-purple mt-12 font-mono tracking-tighter shadow-neon-purple/20 drop-shadow-2xl">
                                {timeLeft - 90}S
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="max-h-[65vh] overflow-y-auto scrollbar-hide flex flex-col items-center">
                            <div className="flex flex-col items-center gap-4 lg:gap-8 mb-6 lg:mb-12">
                                 <h2 className="text-xl lg:text-2xl uppercase tracking-[1em] text-neon-cyan/40 font-black">Extraction_Window</h2>
                                <div className={`text-7xl lg:text-[8rem] font-black leading-none font-mono transition-all duration-500 tracking-tighter ${timeLeft <= 20 ? 'text-neon-purple animate-pulse' : 'text-white'}`}>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </div>
                            </div>
                            <div className="glass p-10 lg:p-14 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 relative overflow-hidden group shadow-2xl scanline w-full">
                                <div className="absolute inset-0 bg-neon-cyan/5 animate-pulse" />
                                <div className="relative z-10 space-y-4">
                                    <div className="text-5xl opacity-40 group-hover:scale-110 transition-transform duration-1000 flex justify-center"><Cpu className="w-16 h-16 text-neon-cyan" /></div>
                                    <p className="text-2xl lg:text-4xl font-black uppercase leading-tight text-white">Analyze_Streams_For_Anomalies</p>
                                    <p className="text-[10px] text-neon-cyan/40 uppercase tracking-[0.5em] font-black">Scanning network for System-Spy interference signatures...</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}

        {phase === 'majlis' && (
            <div className="space-y-10 animate-fade-enter-active w-full max-w-6xl font-mono">
                {!gameState.tie_protocol || gameState.tie_protocol === 'none' ? (
                    <>
                        <h2 className="text-7xl lg:text-9xl font-black text-white tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]">{THEME.phaseLabels.majlis}</h2>
                        <p className="text-2xl text-neon-cyan/50 uppercase tracking-[0.5em] font-black border-b border-neon-cyan/20 pb-4">Scan_Matrix. Verify_Nodes. Purge_Anomalies.</p>
                        <div className="grid grid-cols-4 gap-6 pt-10 max-h-[65vh] overflow-y-auto scrollbar-hide px-4 content-start">
                            {players.filter(p => p.status === 'alive').map(p => (
                                <div key={p.id} className="glass p-6 lg:p-8 rounded-xl border border-white/10 shadow-xl hover:border-neon-cyan/30 transition-all bg-neon-cyan/5">
                                    <div className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight">{p.name}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-neon-cyan/40 mt-2 font-black">Node_Synced</div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : gameState.tie_protocol === 'decree' ? (
                    <div className="space-y-12 animate-scale-up py-20">
                         <div className="text-[12rem] animate-pulse flex justify-center"><Cpu className="w-64 h-64 text-neon-purple shadow-[0_0_80px_rgba(188,19,254,0.3)]" /></div>
                         <div className="space-y-6">
                            <h2 className="text-4xl lg:text-6xl font-black text-neon-purple uppercase tracking-tighter">OVERLORD_OVERRIDE_ACTIVE</h2>
                            <p className="text-white/40 text-2xl uppercase tracking-[0.6em] font-black">Processing_Final_Termination_Command...</p>
                         </div>
                    </div>
                ) : gameState.tie_protocol === 'revote' ? (
                    <div className="space-y-12 animate-fade-enter-active py-20">
                         <h2 className="text-7xl lg:text-9xl font-black text-neon-purple uppercase tracking-tighter animate-pulse">MATRIX_SPLIT_DETECTED</h2>
                         <p className="text-white/60 text-3xl uppercase tracking-[0.4em] font-black underline decoration-neon-purple/40 underline-offset-8">Final_Deliberation: {gameState.tied_player_ids?.map(id => players.find(p => p.id === id)?.name).join(' VS ')}</p>
                         <div className="flex justify-center gap-10 pt-10">
                            {gameState.tied_player_ids?.map(id => {
                                const p = players.find(p => p.id === id);
                                return (
                                    <div key={id} className="glass p-12 rounded-xl border border-neon-purple/40 bg-neon-purple/5 min-w-[350px] scanline">
                                        <div className="text-4xl font-black text-white mb-6 uppercase tracking-tight">{p?.name}</div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-neon-purple animate-shimmer w-full shadow-[0_0_15px_rgba(188,19,254,0.5)]" />
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                ) : gameState.tie_protocol === 'spin' ? (
                    <div className="space-y-8 animate-fade-enter-active py-6 flex flex-col items-center max-h-[75vh] min-h-0 overflow-hidden">
                         <h2 className="text-2xl lg:text-4xl font-black text-neon-cyan uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]">Neural_Override_Protocol</h2>
                         
                         <div className="relative w-[60vh] h-[60vh] flex items-center justify-center">
                            {/* Player Cards in Circle */}
                            {gameState.tied_player_ids?.map((id, i) => {
                                const p = players.find(p => p.id === id);
                                const tiedCount = gameState.tied_player_ids?.length || 1;
                                const angle = (i * 360) / tiedCount;
                                const isWinner = gameState.reveal_target_id === id;
                                
                                return (
                                    <div 
                                        key={id} 
                                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 glass p-4 lg:p-6 rounded-xl border-2 transition-all duration-1000 min-w-[120px] lg:min-w-[200px] text-center ${
                                             (showWinnerHighlight && isWinner) ? 'border-neon-cyan scale-110 shadow-[0_0_50px_rgba(0,243,255,0.4)] z-50 bg-neon-cyan/10' : 'border-white/10 opacity-30 scale-90 grayscale'
                                        }`}
                                        style={{ 
                                            left: `${50 + 44 * Math.cos((angle * Math.PI) / 180)}%`,
                                            top: `${50 + 44 * Math.sin((angle * Math.PI) / 180)}%`
                                        }}
                                    >
                                        <div className={`text-lg lg:text-2xl font-black uppercase tracking-tight ${isWinner ? 'text-neon-cyan' : 'text-white'}`}>{p?.name}</div>
                                        {showWinnerHighlight && isWinner && <div className="text-[10px] text-neon-cyan font-black uppercase tracking-[0.3em] mt-3 animate-pulse">SECTOR_LOCKED</div>}
                                    </div>
                                );
                            })}

                             {/* RANDOMIZED DECRYPTION */}
                             {(() => {
                                 const tiedIds = gameState?.tied_player_ids || [];
                                 const winnerIndex = (gameState?.reveal_target_id && tiedIds.length > 0) ? tiedIds.indexOf(gameState.reveal_target_id) : -1;
                                 const hasWinner = winnerIndex !== -1;
                                 
                                 // 0 degrees is Right (3 o'clock)
                                 // The Pen tip is at Top (12 o'clock) relative to its center pivot
                                 // To point at 0 degrees, we need rotate(90deg)
                                 const baseRotation = 90;
                                 const targetAngle = hasWinner ? (winnerIndex * 360 / tiedIds.length) : 0;
                                  const rotations = 360 * 12; // 12 full cycles for drama
                                  const finalRotation = hasWinner ? (rotations + targetAngle + baseRotation) : 0;

                                 return (
                                      <div 
                                          key={hasWinner ? `winner-${gameState.reveal_target_id}` : 'spinning'}
                                          className={`w-96 h-96 relative flex items-center justify-center transition-all ${hasWinner ? 'animate-spin-to-stop' : 'animate-spin-slow'}`}
                                         style={{ 
                                             '--target-rotation': `${finalRotation}deg`,
                                             transformOrigin: 'center center'
                                         } as any}
                                     >
                                         {/* Outer Ring Decoration */}
                                         <div className="absolute inset-0 rounded-full border border-white/5 animate-pulse" />
                                                                                  {/* Decryption Cursor */}
                                          <div className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 w-4 bg-gradient-to-t from-transparent via-neon-cyan to-neon-cyan rounded-full shadow-[0_0_30px_rgba(0,243,255,0.5)] flex flex-col items-center">
                                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-7xl select-none filter drop-shadow-[0_0_15px_rgba(0,243,255,1)] flex justify-center">
                                                 <Cpu className="w-16 h-16 text-neon-cyan rotate-180" />
                                             </div>
                                         </div>
                                         
                                         {/* Center Pivot Point */}
                                         <div className="w-16 h-16 rounded-full bg-obsidian border-4 border-neon-cyan z-20 shadow-[0_0_30px_rgba(0,243,255,0.4)] flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-neon-cyan animate-pulse" />
                                         </div>
                                     </div>
                                 );
                             })()}
                         </div>
                          <p className="text-neon-cyan/40 text-[10px] lg:text-sm uppercase tracking-[0.5em] font-black animate-pulse bg-white/5 px-8 py-3 rounded-xl border border-white/5">
                             {gameState.reveal_target_id ? "SECTOR_LOCKED. ENCRYPTION_SECURED." : "SCANNING_NEURAL_SIGNATURES..."}
                         </p>
                    </div>
                ) : null}
            </div>
        )}

        {phase === 'night' && (
            <div className="space-y-8 animate-pulse text-neon-purple font-mono">
                <div className="text-8xl mb-6 opacity-30 flex justify-center"><Zap className="w-48 h-48 text-white shadow-[0_0_50px_rgba(188,19,254,0.4)]" /></div>
                <h2 className="text-5xl font-black uppercase tracking-tighter">System_Reboot_In_Progress</h2>
                <div className="h-14 lg:h-16 overflow-hidden whitespace-nowrap border-y border-neon-purple/30 bg-neon-purple/5 scanline flex items-center">
                    <div className="inline-block animate-marquee-slow min-w-[200%]">
                        <span className="text-neon-purple text-xl uppercase tracking-[1em] font-black mx-24 opacity-60">THE_NETWORK_HAS_FALLEN._THE_SPIES_RULE_THE_DATA_STREAM.</span>
                        <span className="text-neon-purple text-xl uppercase tracking-[1em] font-black mx-24 opacity-60">THE_NETWORK_HAS_FALLEN._THE_SPIES_RULE_THE_DATA_STREAM.</span>
                    </div>
                </div>
            </div>
        )}


        {phase === 'end' && (
                 <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl animate-scale-up overflow-hidden py-4 font-mono">
                    <div className="text-2xl lg:text-4xl mb-4 flex justify-center"><Cpu className="w-24 h-24 text-neon-cyan shadow-[0_0_40px_rgba(0,243,255,0.3)]" /></div>
                    <h2 className="text-3xl lg:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(0,243,255,0.4)] text-center leading-tight">
                        {gameState.winner_faction === 'poets' ? 'Network_Secured: Glitch-Runners_Prevail' : 'Breach_Complete: System-Spies_In_Control'}
                    </h2>

                    {gameState.winner_faction === 'poets' && (
                        <div className="mt-8 space-y-2 animate-fade-enter-active text-center shrink-0">
                            <p className="text-lg lg:text-3xl text-neon-cyan/80 italic leading-snug font-black uppercase tracking-widest">
                                "The code is written. The vault is secure."
                            </p>
                            <p className="text-[10px] lg:text-xs uppercase tracking-[0.6em] text-white/20 font-black">
                                [SYSTEM_STATUS: ENCRYPTED]
                            </p>
                        </div>
                    )}
                    
                    <div className="w-full mt-10 space-y-6 flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-neon-cyan/40 uppercase tracking-[0.6em] font-black text-xs">Extraction_Metrics</h3>
                            <div className="text-right">
                                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest mr-3">Final_Vault_Yield:</span>
                                <span className="text-3xl lg:text-5xl font-black text-white italic tracking-tighter">₹{gameState.eidi_pot > 0 ? gameState.eidi_pot : (gameState.last_game_pot || 0)}</span>
                            </div>
                        </div>

        <div className="grid grid-cols-2 gap-4 lg:gap-6 overflow-y-auto pr-2 pb-6 scrollbar-hide py-4">
                            {[...players].sort((a, b) => (b.private_gold || 0) - (a.private_gold || 0)).map((p, i) => {
                                const isWinner = p.role === 'sukhan_war' && p.status === 'alive';
                                const isPlagiarist = p.role === 'naqal_baaz';
                                
                                return (
                                    <div key={p.id} className={`glass flex items-center justify-between p-4 lg:p-6 rounded-xl border transition-all duration-700 ${isWinner ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-[0_0_20px_rgba(0,243,255,0.1)]' : 'border-white/5 opacity-60'}`}>
                                        <div className="flex items-center gap-4 lg:gap-6 overflow-hidden">
                                            <div className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-neon-cyan text-black' : 'bg-white/5 text-white'}`}>
                                                {i + 1}
                                            </div>
                                            <div className="text-left truncate">
                                                <div className={`text-xl lg:text-2xl font-black uppercase truncate ${isWinner ? 'text-white' : 'text-white/60'}`}>{p.name}</div>
                                                <div className="flex gap-3 items-center mt-1">
                                                    <span className={`text-[10px] lg:text-xs uppercase font-black tracking-widest ${isPlagiarist ? 'text-neon-purple' : 'text-neon-cyan'}`}>{isPlagiarist ? THEME.roles.spy : THEME.roles.runner}</span>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-white/20 whitespace-nowrap">{p.status === 'banished' ? 'OFFLINE' : p.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] uppercase font-black text-neon-cyan/40 tracking-widest">Credits</div>
                                            <div className="text-xl lg:text-3xl font-black text-white">₹{p.private_gold || 0}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

      </div>

      {phase === 'payout' && (
        <div className="fixed inset-0 z-[150] bg-obsidian flex flex-col items-center justify-center p-6 lg:p-20 overflow-hidden font-mono">
            <div className="max-w-7xl w-full space-y-6 lg:space-y-10 animate-fade-enter-active flex flex-col max-h-full">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl lg:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]">
                        Terminal_Session_Summary
                    </h2>
                    <div className="h-0.5 w-64 bg-neon-cyan/40 mx-auto rounded-full shadow-[0_0_10px_rgba(0,243,255,0.5)]" />
                    <p className="text-neon-cyan/60 text-xs lg:text-lg uppercase font-black tracking-[0.6em]">Cumulative_Data_Allocation_Report</p>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:gap-8 overflow-y-auto pr-2 pb-10 scrollbar-hide py-4 flex-1">
                    {players.sort((a, b) => (b.gathering_gold || 0) - (a.gathering_gold || 0)).map((p, idx) => (
                        <div key={p.id} className="glass p-6 lg:p-10 rounded-xl border border-neon-cyan/20 flex items-center justify-between transition-all duration-300 bg-neon-cyan/5">
                            <div className="flex items-center gap-8 lg:gap-14">
                                <span className={`text-3xl lg:text-6xl font-black italic ${idx < 3 ? 'text-neon-cyan' : 'text-white/20'}`}>
                                    {idx + 1}
                                </span>
                                <div className="space-y-2">
                                    <div className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tight">{p.name} {p.status === 'banished' ? '[OFFLINE]' : ''}</div>
                                    <div className="text-xs lg:text-sm text-neon-cyan/40 uppercase font-black tracking-[0.4em]">{p.role === 'naqal_baaz' ? THEME.roles.spy : THEME.roles.runner}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] lg:text-xs uppercase font-black text-white/20 tracking-widest mb-2">Total_Allocated</div>
                                <div className="text-2xl lg:text-5xl font-black text-white tracking-tighter italic">₹{p.gathering_gold || 0}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center py-4">
                    <p className="text-white/10 text-xs lg:text-sm uppercase tracking-[0.3em] font-black italic">"Data is power. The terminal is immortal."</p>
                </div>
            </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-8 lg:p-14 flex justify-between items-end bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-50 font-mono">
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_15px_rgba(0,243,255,0.8)]" />
                <div className="text-xs uppercase font-black text-neon-cyan/60 tracking-[0.5em]">Shadow_Network_Node_Active</div>
            </div>
            <div className="px-10 py-4 bg-neon-cyan/5 text-neon-cyan rounded-xl border border-neon-cyan/20 font-black uppercase tracking-[0.3em] text-sm shadow-inner scanline">
                Status: <span className="text-white ml-3">{THEME.phaseLabels[phase as keyof typeof THEME.phaseLabels] || phase}</span>
            </div>
        </div>
        <div className="flex items-center gap-8 lg:gap-16">
            {phase === 'mission' && timeLeft > 0 && (
                <div className="text-right border-r border-white/10 pr-8 lg:pr-16">
                    <div className="text-[8px] lg:text-[10px] uppercase font-black text-white/20 tracking-[0.4em] mb-3">System_Clock</div>
                    <div className="text-xl lg:text-4xl font-black text-neon-cyan drop-shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                        {timeLeft > 90 ? `${timeLeft - 90}S` : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                    </div>
                </div>
            )}
            <div className="text-right">
                <div className="text-[10px] lg:text-xs uppercase font-black text-white/30 tracking-[0.4em] mb-3">Vault_Allocation</div>
                <div className="text-2xl lg:text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">₹{phase === 'lobby' ? 0 : (gameState.eidi_pot > 0 ? gameState.eidi_pot : (gameState.last_game_pot || 0))}</div>
            </div>
        </div>
      </footer>
      {gameState.is_revealing && (
        <div className="fixed inset-0 z-[200] bg-obsidian flex flex-col items-center justify-center p-6 lg:p-20 text-center animate-fade-enter-active font-mono">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(188,19,254,0.15)_0%,transparent_70%)] animate-pulse" />
            
            <div className="relative space-y-10 lg:space-y-20 animate-scale-up max-w-full">
                <div className="space-y-4 lg:space-y-8">
                    <h3 className="text-neon-purple font-black uppercase tracking-[1em] text-sm lg:text-3xl animate-pulse">NETWORK_SECURITY_ALERT</h3>
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-neon-purple to-transparent shadow-[0_0_20px_rgba(188,19,254,0.8)]" />
                </div>

                <div className="space-y-6 lg:space-y-10">
                   <h2 className="text-4xl lg:text-9xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_50px_rgba(188,19,254,0.6)]">
                     RUNNER_OFFLINE
                   </h2>
                   <p className="text-neon-purple/80 text-lg lg:text-4xl uppercase tracking-[0.5em] font-black animate-marquee-slow">Consensus_Override_Engaged // Anomalous_Signatures_Purged</p>
                </div>

                {gameState.reveal_target_id && (
                  <div className="glass p-12 lg:p-24 rounded-xl border-4 border-neon-purple/40 bg-neon-purple/5 shadow-[0_0_100px_rgba(188,19,254,0.2)] animate-bounce-subtle scanline">
                      <div className="text-4xl lg:text-8xl font-black text-white mb-4 lg:mb-8 uppercase tracking-tighter">
                        {players.find(p => p.id === gameState.reveal_target_id)?.name}
                      </div>
                      <p className="text-neon-purple font-black text-xl lg:text-3xl uppercase tracking-[0.8em]">ID_DEACTIVATED</p>
                  </div>
                )}

                <div className="pt-20 lg:pt-32 text-white/10 text-xs lg:text-xl uppercase tracking-[1em] font-black">
                   "The network re-syncs. One node remains dark."
                </div>
            </div>
        </div>
      )}
    </main>
  );
}
