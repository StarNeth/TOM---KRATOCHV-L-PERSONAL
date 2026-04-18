"use client";

import { useRef, useMemo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/navigation/language-toggle"; // PŘIDÁNO

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const DICTIONARY = {
  en: {
    title: "Architecture",
    subtitle: "[ Tap nodes to disrupt the system ]"
  },
  cs: {
    title: "Architektura",
    subtitle: "[ Klikni na uzly pro narušení systému ]"
  }
};

const skillsData = [
  "AI WEB ARCHITECT", "UI/UX ENGINEERING", "FRONTEND SYSTEMS",
  "CREATIVE DEVELOPMENT", "WEBGL / 3D EXPERIENCES", "OSINT & SEC-OPS",
  "PROMPT ENGINEERING", "REACT / NEXT.JS"
];

// Pevně dané pozice v procentech (x, y), aby se nepřekrývaly a vypadalo to jako architektonický nákres
const desktopPositions = [
  { x: 15, y: 20 }, { x: 50, y: 15 }, { x: 85, y: 25 },
  { x: 20, y: 55 }, { x: 80, y: 50 },
  { x: 30, y: 85 }, { x: 70, y: 80 }, { x: 50, y: 60 }
];

// Na mobilu je poskládáme víc pod sebe do "cik-cak" mřížky
const mobilePositions = [
  { x: 25, y: 10 }, { x: 75, y: 20 },
  { x: 25, y: 35 }, { x: 75, y: 45 },
  { x: 25, y: 60 }, { x: 75, y: 70 },
  { x: 25, y: 85 }, { x: 75, y: 95 }
];

export const Capabilities = () => {
  const { language } = useLanguage(); // PŘIDÁNO
  const t = DICTIONARY[language]; // PŘIDÁNO
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement[]>([]);
  const magneticRefs = useRef<HTMLDivElement[]>([]);

  // 1. GENTLE LEVITATION (Dýchání) - Nahrazuje těžkou fyziku!
  useGSAP(() => {
    nodesRef.current.forEach((node, i) => {
      if (!node) return;
      
      // Každé tlačítko má trochu jiný rytmus, aby to nevypadalo uměle
      gsap.to(node, {
        y: `+=${Math.random() * 15 + 10}`,
        x: `+=${(Math.random() - 0.5) * 10}`,
        duration: Math.random() * 2 + 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: Math.random() * -5, // Aby nezačínaly všechny stejně
      });
    });

    // Animace nadpisu při scrollování
    const titleEl = sectionRef.current?.querySelector('.cap-title');
    if (titleEl) {
      gsap.fromTo(titleEl, 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 65%" } }
      );
    }
  }, { scope: containerRef });

  // 2. MAGNETICKÝ EFEKT (Desktop)
  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    // Vypneme hover na mobilu, tam nedává smysl
    if (window.innerWidth < 768) return; 

    const el = nodesRef.current[index];
    const magneticEl = magneticRefs.current[index];
    if (!el || !magneticEl) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.3; // Síla magnetu
    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;

    gsap.to(magneticEl, { x, y, duration: 0.5, ease: "power2.out", overwrite: true });
  };

  const handleMouseLeave = (index: number) => {
    const magneticEl = magneticRefs.current[index];
    if (magneticEl) {
      gsap.to(magneticEl, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)", overwrite: true });
    }
  };

  // 3. VÝSTŘEL (Action)
  const handleClick = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    const magneticEl = magneticRefs.current[index];
    
    // Rychlý "Pulse" efekt na kliknuté pilulce
    gsap.fromTo(magneticEl, 
      { scale: 0.85, borderColor: "rgba(255,255,255,0.8)" }, 
      { scale: 1, borderColor: "rgba(255,255,255,0.1)", duration: 0.6, ease: "elastic.out(1, 0.4)" }
    );

    // Vystřelíme event do tvého Liquid shaderu
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
    window.dispatchEvent(new CustomEvent("webgl-shoot", { detail: { x: clientX, y: clientY } }));
  };

  return (
    <section ref={sectionRef} id="capabilities" className="relative w-full min-h-[120svh] md:h-[120vh] z-10 text-white flex flex-col items-center justify-center py-24 overflow-hidden">
      
      {/* Nápis - Čistý, ukotvený nahoře */}
      <div className="cap-title flex flex-col items-center mb-12 pointer-events-none px-4 text-center w-full z-20">
        <h2 className="font-syne font-bold text-4xl md:text-7xl uppercase tracking-tighter drop-shadow-lg">{t.title}</h2>
        <p className="font-mono text-[9px] md:text-xs tracking-[0.3em] uppercase text-white/50 mt-4">
          {t.subtitle}
        </p>
      </div>

      {/* Skleněný kontejner - Vrací webu strukturu */}
      {/* Box */}
      <div 
        ref={containerRef} 
        className="relative w-[92vw] md:w-[85vw] max-w-6xl h-auto min-h-[70vh] py-12 bg-black/20 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-wrap justify-center items-center gap-4 md:gap-0"
      >
        {skillsData.map((skill, i) => {
          const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
          // Desktop má pevné pozice, mobil používá bezpečný CSS Flexbox
          const style = isMobile 
            ? { position: "relative" as const } 
            : { position: "absolute" as const, left: `${desktopPositions[i].x}%`, top: `${desktopPositions[i].y}%`, transform: "translate(-50%, -50%)" };

          return (
            <div
              key={i}
              ref={(el) => { nodesRef.current[i] = el!; }}
              className="cursor-pointer group"
              style={style}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
              onMouseDown={(e) => handleClick(e, i)}
              onTouchStart={(e) => handleClick(e, i)}
            >
              {/* Samotná "Pilulka" */}
              <div 
                ref={(el) => { magneticRefs.current[i] = el!; }} 
                className="relative px-4 py-2.5 md:px-6 md:py-3.5 bg-black/80 backdrop-blur-md rounded-full border border-white/10 transition-colors duration-300 group-hover:bg-white/10 group-hover:border-white/25 flex items-center justify-center will-change-transform"
              >
                <span className="font-syne font-bold text-[9px] md:text-[11px] tracking-[0.15em] uppercase text-white whitespace-nowrap">
                  {skill}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};