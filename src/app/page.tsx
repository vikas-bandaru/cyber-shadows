'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useLayoutEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LandingContent() {
  const [showRules, setShowRules] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const rulesRef = useRef<HTMLButtonElement>(null);
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code');

  // URL for joining with code if available
  const joinUrl = roomCode ? `/join?code=${roomCode}` : '/join';

  // Force scroll to top and disable restoration on mount
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Sticky menu scroll listener
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Intersection Observer for auto-expanding rules
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Trigger only if intersecting AND the user has scrolled from the top
        if (entry.isIntersecting && window.scrollY > 50) {
          setShowRules(true);
        }
      },
      { 
        threshold: 1.0, 
        rootMargin: '0px 0px -10% 0px'
      }
    );

    if (rulesRef.current) {
      observer.observe(rulesRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rulesRef.current) observer.unobserve(rulesRef.current);
    };
  }, []);

  const rules = [
    {
      title: "The Heist",
      description: "You have 90 seconds to breach the data-vault. The Glitch-Runners must collaborate, while the System-Spies seek to sabotage.",
      icon: "🛰️"
    },
    {
      title: "The Breach",
      description: "Gather in the terminal to debate and vote. Unmask the spies and disconnect them from the network before they silence the true runners.",
      icon: "⚡"
    },
    {
      title: "The Silence",
      description: "As the system reboots, the encryption begins. The spies choose their target to silence, moving one step closer to absolute network control.",
      icon: "👁️‍🗨️"
    }
  ];

  return (
    <main className="min-h-screen bg-obsidian text-white flex flex-col items-center selection:bg-neon-cyan selection:text-black overflow-x-hidden font-mono">
      {/* Sticky Menu / Header */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 border-b border-neon-cyan/10 bg-obsidian/80 backdrop-blur-md px-6 py-4 flex justify-between items-center ${isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-3">
          <span className="text-neon-cyan font-black text-xl tracking-tighter uppercase">Cyber-Shadows</span>
        </div>
        <div className="flex gap-4">
          <Link href={joinUrl} className="text-[10px] font-black uppercase tracking-widest text-neon-cyan/60 hover:text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/50 px-4 py-2 rounded-sm transition-all">Join_Session</Link>
          <Link href="/host/setup" className="text-[10px] font-black uppercase tracking-widest bg-neon-cyan text-black px-4 py-2 rounded-sm hover:bg-white transition-all">Host_Session</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-5xl w-full space-y-16 py-24 animate-fade-enter-active">
        <div className="space-y-6">
          <div className="flex items-center justify-center space-x-6 mb-4">
            <div className="h-[1px] w-16 bg-neon-cyan/30 hidden sm:block"></div>
            <span className="text-neon-cyan uppercase tracking-[0.8em] text-[10px] font-black">Node_Established: 2026</span>
            <div className="h-[1px] w-16 bg-neon-cyan/30 hidden sm:block"></div>
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black text-white uppercase tracking-tighter leading-none drop-shadow-[0_0_50px_rgba(0,243,255,0.3)]">
            Cyber<span className="text-neon-cyan">Shadows</span>
          </h1>
          <p className="text-lg sm:text-2xl text-neon-cyan/60 font-black uppercase tracking-[0.2em] italic">
            "High-Stakes_Data_Heists_&_Digital_Betrayal"
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8 w-full max-w-xl">
          <Link 
            href="/host/setup" 
            className="group relative w-full sm:w-1/2 overflow-hidden rounded-sm p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-[-1000%] animate-[spin-slow_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00F3FF_0%,#000_50%,#00F3FF_100%)]" />
            <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-sm bg-obsidian px-8 py-5 text-xl font-black uppercase tracking-widest text-neon-cyan transition-colors group-hover:bg-transparent group-hover:text-black">
              Start_Breach
            </div>
          </Link>

          <Link 
            href={joinUrl} 
            className="w-full sm:w-1/2 rounded-sm border border-neon-cyan/40 px-8 py-5 text-xl font-black uppercase tracking-widest text-neon-cyan/80 hover:bg-neon-cyan/10 hover:text-neon-cyan transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            Join_Session
          </Link>
        </div>

        {/* Scroll Indicator or CTA for Rules */}
        <button 
          ref={rulesRef}
          onClick={() => setShowRules(!showRules)}
          className="group flex flex-col items-center gap-4 text-white/20 hover:text-neon-cyan/60 transition-colors uppercase text-[12px] font-black tracking-[0.5em] mt-16 bg-transparent outline-none border-none"
        >
          <span>Terminal_Protocol (Rules)</span>
          <div className={`transition-all duration-700 ease-in-out ${showRules ? '-rotate-180 text-neon-cyan scale-125' : 'animate-bounce-slow'}`}>
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={showRules ? "drop-shadow-[0_0_12px_rgba(0,243,255,0.8)]" : ""}
            >
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
            </svg>
          </div>
        </button>
      </section>

      {/* Rules Section (The Nizaam) */}
      <section className={`w-full max-w-7xl px-6 transition-all duration-700 ease-in-out ${showRules ? 'opacity-100 max-h-[2000px] mb-24' : 'opacity-0 max-h-0 overflow-hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {rules.map((rule, idx) => (
            <div 
              key={idx} 
              className="group glass p-10 rounded-xl border border-neon-cyan/10 hover:border-neon-cyan/40 transition-all hover:translate-y-[-10px] duration-500 bg-neon-cyan/5 scanline"
            >
              <div className="text-4xl mb-8 bg-neon-cyan/10 w-20 h-20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 text-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                {rule.icon}
              </div>
              <h3 className="text-2xl font-black text-neon-cyan uppercase tracking-tighter mb-6">{rule.title}</h3>
              <p className="text-white/60 leading-relaxed font-black uppercase text-xs tracking-widest opacity-80">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full p-8 border-t border-white/5 flex flex-col items-center justify-center space-y-4">
        <p className="text-white/10 text-[10px] uppercase font-black tracking-[0.5em] text-center leading-loose">
          Experience_the_thrill_of_the_digital_underground.<br/>
          Built_for_the_runners_and_the_spies_of_the_Cyber-Shadows.<br/>
          Project_Lead: Vikas Bandaru // Node_v1.0.4
        </p>
        <div className="flex gap-8 opacity-20 hover:opacity-100 transition-opacity">
          <div className="h-1 w-1 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,1)]"></div>
          <div className="h-1 w-1 rounded-full bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,1)]"></div>
          <div className="h-1 w-1 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,1)]"></div>
        </div>
      </footer>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20 -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-cyan/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/5 blur-[150px] rounded-full"></div>
      </div>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian flex flex-col items-center justify-center text-neon-cyan font-mono animate-pulse uppercase tracking-[2em]">Inbound_Connection...</div>}>
      <LandingContent />
    </Suspense>
  );
}
