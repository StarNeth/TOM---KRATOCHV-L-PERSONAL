"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Character-by-character reveal component (Nezměněno od v0)
const TypedText = ({ 
  text, 
  delay = 0, 
  duration = 0.8,
  onComplete 
}: { 
  text: string; 
  delay?: number; 
  duration?: number;
  onComplete?: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll(".preloader-char");
    
    gsap.fromTo(chars,
      { opacity: 0, y: 20, filter: "blur(8px)" },
      { 
        opacity: 1, 
        y: 0, 
        filter: "blur(0px)",
        duration: 0.08, 
        stagger: duration / chars.length,
        ease: "power2.out",
        delay,
        onComplete
      }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="overflow-hidden">
      <span className="inline-block">
        {text.split("").map((char, i) => (
          <span 
            key={i} 
            className="preloader-char inline-block opacity-0"
            style={{ whiteSpace: char === " " ? "pre" : undefined }}
          >
            {char}
          </span>
        ))}
      </span>
    </div>
  );
};

export const Preloader = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const curtainTopRef = useRef<HTMLDivElement>(null);
  const curtainBottomRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [counter, setCounter] = useState(0);
  const [phase, setPhase] = useState<"init" | "loading" | "reveal" | "done">("init");
  const [isFinished, setIsFinished] = useState(false);
  
  // NOVÉ: Stavy pro synchronizaci
  const [isCounterDone, setIsCounterDone] = useState(false);
  const [isWebglReady, setIsWebglReady] = useState(false);

  // NOVÉ: Posloucháme, kdy WebGL řekne, že je hotovo
  useEffect(() => {
    const handleReady = () => setIsWebglReady(true);
    window.addEventListener("webgl-ready", handleReady);
    
    // Fallback: kdyby WebGL zklamalo, po 5 sekundách to pustíme dál
    const fallbackTimeout = setTimeout(handleReady, 5000);
    return () => {
      window.removeEventListener("webgl-ready", handleReady);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Counter animation
  const animateCounter = useCallback(() => {
    const obj = { value: 0 };
    
    gsap.to(obj, {
      value: 100,
      duration: 2.0,
      ease: "power2.inOut",
      onUpdate: () => {
        setCounter(Math.floor(obj.value));
      },
      onComplete: () => {
        // ZMĚNA: Nejdeme rovnou do reveal, ale jen zaznamenáme, že animace skončila
        setIsCounterDone(true);
      }
    });
  }, []);

  // NOVÉ: Jakmile skončí čítač A ZÁROVEŇ je WebGL načtené, přepneme fázi na "reveal"
  useEffect(() => {
    if (isCounterDone && isWebglReady && phase !== "reveal" && phase !== "done") {
      setPhase("reveal");
    }
  }, [isCounterDone, isWebglReady, phase]);

  useGSAP(() => {
    if (!containerRef.current) return;
    document.body.style.overflow = "hidden";

    const masterTimeline = gsap.timeline();

    masterTimeline
      .to({}, { duration: 0.3 }) 
      .call(() => setPhase("loading"))
      .to({}, { duration: 0.1 })
      .call(() => animateCounter());

    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        scaleX: 1,
        duration: 2.0,
        ease: "power2.inOut",
        delay: 0.4
      });
    }
  }, { scope: containerRef });

  // Phase 2: Reveal animation (Zůstává vizuál od v0)
  useEffect(() => {
    if (phase !== "reveal") return;

    const revealTimeline = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFinished(true);
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    revealTimeline
      .to(containerRef.current, {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        duration: 0.1,
        ease: "power4.in"
      })
      .to(containerRef.current, {
        backgroundColor: "#020202",
        duration: 0.2,
        ease: "power2.out"
      })
      .call(() => {
        window.dispatchEvent(new CustomEvent("preloader-hide-start"));
      })
      .to(curtainTopRef.current, {
        yPercent: -100,
        duration: 0.8,
        ease: "power4.inOut"
      }, "curtain")
      .to(curtainBottomRef.current, {
        yPercent: 100,
        duration: 0.8,
        ease: "power4.inOut"
      }, "curtain")
      .to(".preloader-content", {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
      }, "curtain+=0.2")
      .to(containerRef.current, {
        pointerEvents: "none",
        duration: 0
      });

  }, [phase]);

  if (isFinished) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#020202] flex flex-col items-center justify-center pointer-events-auto">
      {/* Vizuální kód zůstává beze změny od v0 */}
      <div ref={curtainTopRef} className="absolute top-0 left-0 right-0 h-1/2 bg-[#020202] z-50" />
      <div ref={curtainBottomRef} className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#020202] z-50" />

      <div className="preloader-content relative z-40 flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          {phase === "init" && (
            <div className="font-mono text-[10px] tracking-[0.4em] text-white/30 uppercase">
              <TypedText text="INITIALIZING..." duration={0.5} />
            </div>
          )}
          
          {(phase === "loading" || phase === "reveal") && (
            <div className="flex flex-col items-center gap-6">
              <div className="font-syne font-black text-3xl md:text-5xl lg:text-6xl tracking-tighter text-white">
                <TypedText text="TOMÁŠ KRATOCHVÍL" duration={0.8} delay={0.1} />
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">
                <TypedText text="System Architect // Nuclear-Grade Code" duration={0.6} delay={0.3} />
              </div>
            </div>
          )}
        </div>

        {(phase === "loading" || phase === "reveal") && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <span ref={counterRef} className="font-mono text-6xl md:text-8xl font-bold tracking-tighter text-white tabular-nums">
              {counter.toString().padStart(3, "0")}
            </span>
            <div className="relative w-48 md:w-64 h-[1px] bg-white/10 overflow-hidden">
              <div ref={progressBarRef} className="absolute inset-0 bg-white origin-left" style={{ transform: "scaleX(0)" }} />
            </div>
            <span className="font-mono text-[9px] tracking-[0.5em] text-white/20 uppercase mt-2">
              Loading Assets
            </span>
          </div>
        )}
      </div>

      <div className="preloader-content absolute top-8 left-8 flex items-center gap-2 opacity-30">
        <div className="w-3 h-[1px] bg-white" />
        <span className="font-mono text-[8px] tracking-[0.3em] text-white uppercase">SYS.01</span>
      </div>
      <div className="preloader-content absolute bottom-8 right-8 flex items-center gap-2 opacity-30">
        <span className="font-mono text-[8px] tracking-[0.3em] text-white uppercase">2026</span>
        <div className="w-3 h-[1px] bg-white" />
      </div>
      <div className="preloader-content absolute w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-white/5 blur-[100px] pointer-events-none" style={{ animation: "pulse 4s ease-in-out infinite" }} />
      <style dangerouslySetInnerHTML={{__html: `@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.05; } 50% { transform: scale(1.2); opacity: 0.02; } }`}} />
    </div>
  );
};