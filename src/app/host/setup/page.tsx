'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/game-logic';
import { Suspense } from 'react';

function HostSetupContent() {
  const router = useRouter();
  const [cyber_shadows_runner, setPlayerName] = useState('');
  const [shouldPlay, setShouldPlay] = useState(false);
  const [minPlayers, setMinPlayers] = useState(8);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!cyber_shadows_runner) return alert('Enter your name');
    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { game, player } = await createRoom(code, cyber_shadows_runner, shouldPlay, minPlayers);
      localStorage.setItem('cyber_shadows_runner', cyber_shadows_runner);
      if (player) localStorage.setItem('playerId', player.id);
      localStorage.setItem('roomId', game.id);
      localStorage.setItem('isHost', 'true');
      router.push(`/host/${code}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-obsidian text-white font-mono selection:bg-neon-cyan selection:text-black">
      <div className="max-w-xl w-full glass p-8 lg:p-10 rounded-xl space-y-8 animate-fade-enter-active border border-neon-cyan/10 shadow-[0_0_50px_rgba(0,243,255,0.05)] bg-neon-cyan/5 scanline">
        <div className="text-center space-y-2">
          <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(0,243,255,0.3)]">
            Overlord_Initialize
          </h1>
          <div className="h-0.5 w-24 bg-neon-cyan/40 mx-auto rounded-full" />
          <p className="text-neon-cyan/60 text-[10px] uppercase font-black tracking-[0.5em]">Command_Center_Auth</p>
        </div>

        <div className="space-y-8 animate-fade-enter-active">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 tracking-[0.4em] ml-1">Overlord_ID_Authentication</label>
            <input
                type="text"
                placeholder="Enter_Access_Key"
                value={cyber_shadows_runner}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-obsidian/50 border border-neon-cyan/20 rounded-sm px-6 py-4 focus:outline-none focus:border-neon-cyan transition-all text-white text-xl font-black text-center uppercase tracking-widest placeholder:text-white/10"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
              <label className="text-[10px] uppercase font-black text-white/30 tracking-[0.4em]">Minimum_Node_Count</label>
              <span className="text-2xl font-black text-neon-cyan italic tracking-tighter">{minPlayers} <span className="text-[8px] uppercase font-black opacity-30 tracking-widest ml-2">Units</span></span>
            </div>
            <div className="bg-obsidian/40 p-6 rounded-xl border border-white/5 space-y-4">
              <input 
                type="range" 
                min="4" 
                max="20" 
                step="1"
                value={minPlayers}
                onChange={(e) => setMinPlayers(parseInt(e.target.value))}
                className="w-full h-1 bg-neon-cyan/20 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
              />
              <div className="flex justify-between text-[10px] font-black text-white/20 uppercase tracking-widest">
                <span>04_Minimal</span>
                <span>08_Standard</span>
                <span>12_Dense</span>
                <span>20_Critical</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-neon-cyan/5 p-4 rounded-xl border border-neon-cyan/10 group cursor-pointer hover:bg-neon-cyan/10 transition-all" onClick={() => setShouldPlay(!shouldPlay)}>
             <div className="space-y-1">
                <div className="text-[10px] font-black uppercase text-neon-cyan tracking-[0.3em]">Direct_Node_Control</div>
                <div className="text-[8px] text-white/40 uppercase font-black tracking-widest">Host as Player // Active Participant</div>
             </div>
             <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${shouldPlay ? 'bg-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.5)]' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-sm transition-all duration-300 ${shouldPlay ? 'translate-x-6 rotate-180' : 'translate-x-0'}`} />
             </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-neon-cyan py-5 rounded-sm text-black border-neon-cyan shadow-[0_0_30px_rgba(0,243,255,0.2)] text-xl font-black uppercase tracking-widest hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'INITIALIZING...' : 'Establish_Network'}
          </button>
          
          <div className="space-y-4 px-2">
             <div className="flex items-start gap-4 opacity-40">
                <span className="text-neon-cyan mt-1 text-xl">⚡</span>
                <p className="text-[10px] uppercase font-black tracking-widest leading-loose">As the Overlord AI, you will orchestrate the phases and verify the digital credentials of your runners.</p>
             </div>
          </div>

          <button 
            onClick={() => router.push('/')} 
            className="w-full text-[10px] uppercase font-black text-white/20 hover:text-neon-cyan transition-colors py-4 mt-4 tracking-[0.5em]"
          >
            Return_to_Mainframe
          </button>
        </div>
      </div>
    </main>
  );
}

export default function HostSetup() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-gold">Loading...</div>}>
      <HostSetupContent />
    </Suspense>
  );
}
