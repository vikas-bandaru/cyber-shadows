'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinRoom } from '@/lib/game-logic';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [cyber_shadows_runner, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Restore player name and handle auto-fill from URL
  useEffect(() => {
    // Restore name
    const storedName = localStorage.getItem('cyber_shadows_runner');
    if (storedName) setPlayerName(storedName);

    // Auto-fill room code
    const code = searchParams.get('code');
    if (code) {
      const upperCode = code.toUpperCase();
      setRoomCode(upperCode);
      setIsAutoFilled(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('Auto-filling room code:', upperCode);
      }
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!roomCode || !cyber_shadows_runner) return alert('Enter name and room code');
    setLoading(true);
    try {
      const { player, roomId } = await joinRoom(roomCode, cyber_shadows_runner);
      localStorage.setItem('cyber_shadows_runner', cyber_shadows_runner);
      localStorage.setItem('playerId', player.id);
      localStorage.setItem('roomId', roomId);
      localStorage.setItem('isHost', 'false');
      router.push(`/play/${roomCode}`);
    } catch (error) {
      console.error(error);
      alert('Failed to join room. Check code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-obsidian text-white font-mono selection:bg-neon-cyan selection:text-black">
      <div className="relative group/join-container flex flex-col items-center lg:block w-full max-w-xl">
        <div className="w-full relative glass p-10 lg:p-14 rounded-xl space-y-12 animate-fade-enter-active border border-neon-cyan/10 shadow-[0_0_50px_rgba(0,243,255,0.05)] bg-neon-cyan/5 scanline">
          <div className="text-center space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(0,243,255,0.3)]">Establish_Link</h1>
            <p className="text-neon-cyan/60 font-black tracking-widest uppercase text-[10px]">Enter_Network_Credentials</p>
          </div>

          <div className="flex flex-col items-center gap-8">
            {/* ONBOARDING TOOLTIP */}
            <div className="hidden lg:flex justify-center z-50">
              <details className="group">
                <summary className="list-none cursor-pointer flex items-center gap-4 px-6 py-3 rounded-sm border border-neon-cyan/20 bg-neon-cyan/5 hover:bg-neon-cyan/10 transition-all text-[11px] uppercase font-black tracking-widest text-neon-cyan/80 whitespace-nowrap">
                  <span className="w-5 h-5 rounded-full border border-neon-cyan/40 flex items-center justify-center text-[10px]">?</span>
                  PROTOCOL_BRIEFING
                </summary>
                <div className="absolute left-1/2 -translate-x-1/2 mt-6 lg:left-full lg:top-0 lg:ml-12 lg:mt-0 lg:translate-x-0 w-80 glass p-8 rounded-xl border border-neon-cyan/20 shadow-2xl animate-fade-in z-50 bg-obsidian/90 backdrop-blur-xl">
                  <h4 className="text-neon-cyan font-black mb-4 border-b border-neon-cyan/20 pb-2 uppercase tracking-widest">Security_Protocols</h4>
                  <ul className="space-y-4 text-xs text-white/60 leading-relaxed uppercase font-black tracking-widest">
                    <li className="flex gap-4">
                      <span className="text-neon-cyan">01.</span>
                      <span><strong>Breach_Vault:</strong> Work with the team to bypass encryption.</span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-neon-cyan">02.</span>
                      <span><strong>Expose_Spy:</strong> Identify the System-Spy among Glitch-Runners.</span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-neon-cyan">03.</span>
                      <span><strong>Maintain_Link:</strong> Avoid deactivation or network expulsion.</span>
                    </li>
                  </ul>
                  <div className="mt-6 pt-4 border-t border-neon-cyan/10 text-[8px] uppercase tracking-[0.3em] opacity-30 text-center italic">
                    Protect_Credentials // Guard_Secret
                  </div>
                </div>
              </details>
            </div>

            {isAutoFilled && roomCode ? (
              <div className="animate-fade-in py-2 px-8 bg-neon-cyan/10 border border-neon-cyan/20 rounded-sm inline-block shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                <p className="text-neon-cyan text-[10px] uppercase font-black tracking-widest text-center">
                  LINK_INITIALIZED // WAITING_FOR_AUTH
                </p>
              </div>
            ) : (
              <p className="text-neon-cyan/30 text-[10px] uppercase font-black tracking-[0.5em] text-center">Infiltrate_Existing_Segment</p>
            )}
          </div>

          <div className="space-y-8 animate-fade-enter-active">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-white/30 tracking-[0.4em] ml-1">Runner_Alias</label>
                <input
                    type="text"
                    placeholder="Enter_Alias"
                    value={cyber_shadows_runner}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-obsidian/50 border border-neon-cyan/20 rounded-sm px-8 py-5 focus:outline-none focus:border-neon-cyan transition-all text-white text-2xl font-black text-center uppercase tracking-widest placeholder:text-white/5"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-neon-purple/40 tracking-[0.4em] ml-1">Access_Segment_Code</label>
                <input
                    type="text"
                    placeholder="XXXXXX"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setIsAutoFilled(false);
                    }}
                    className="w-full bg-neon-purple/5 border border-neon-purple/20 rounded-sm px-8 py-6 focus:outline-none focus:border-neon-purple transition-all text-white text-center text-5xl font-black tracking-[0.3em] placeholder:text-neon-purple/5"
                />
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-neon-cyan py-6 rounded-sm text-black border-neon-cyan shadow-[0_0_30px_rgba(0,243,255,0.2)] text-2xl font-black uppercase tracking-widest hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'SEQUENCING...' : 'Join_Network'}
            </button>

            <button 
              onClick={() => router.push('/')} 
              className="w-full text-[10px] uppercase font-black text-white/20 hover:text-neon-cyan transition-colors py-4 mt-2 tracking-[0.5em]"
            >
              Disconnect_to_Mainframe
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Join() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian flex items-center justify-center text-neon-cyan font-mono animate-pulse uppercase tracking-[1em]">Establishing_Secure_Link...</div>}>
      <JoinContent />
    </Suspense>
  );
}
