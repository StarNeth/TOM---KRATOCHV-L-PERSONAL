"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Character-by-character reveal component
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
        setPhase("reveal");
      }
    });
  }, []);

  useGSAP(() => {
    if (!containerRef.current) return;
    
    // Lock scroll during preloader
    document.body.style.overflow = "hidden";

    const masterTimeline = gsap.timeline();

    // Phase 1: Initial system boot text reveal
    masterTimeline
      .to({}, { duration: 0.3 }) // Initial pause
      .call(() => setPhase("loading"))
      .to({}, { duration: 0.1 })
      .call(() => animateCounter());

    // Progress bar animation (synced with counter)
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        scaleX: 1,
        duration: 2.0,
        ease: "power2.inOut",
        delay: 0.4
      });
    }

  }, { scope: containerRef });

  // Phase 2: Reveal animation (curtain transition)
  useEffect(() => {
    if (phase !== "reveal") return;

    const revealTimeline = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFinished(true);
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    // Flash effect
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
      // Fire preloader-hide-start for Hero to begin animation
      .call(() => {
        window.dispatchEvent(new CustomEvent("preloader-hide-start"));
      })
      // Curtain reveal
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
      // Fade out remaining elements
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
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] bg-[#020202] flex flex-col items-center justify-center pointer-events-auto"
    >
      {/* Curtain Top */}
      <div 
        ref={curtainTopRef}
        className="absolute top-0 left-0 right-0 h-1/2 bg-[#020202] z-50"
      />
      
      {/* Curtain Bottom */}
      <div 
        ref={curtainBottomRef}
        className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#020202] z-50"
      />

      {/* Preloader Content */}
      <div className="preloader-content relative z-40 flex flex-col items-center justify-center gap-8">
        
        {/* System Boot Text */}
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

        {/* Counter */}
        {(phase === "loading" || phase === "reveal") && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <span 
              ref={counterRef}
              className="font-mono text-6xl md:text-8xl font-bold tracking-tighter text-white tabular-nums"
            >
              {counter.toString().padStart(3, "0")}
            </span>
            
            {/* Progress Bar */}
            <div className="relative w-48 md:w-64 h-[1px] bg-white/10 overflow-hidden">
              <div 
                ref={progressBarRef}
                className="absolute inset-0 bg-white origin-left"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            
            <span className="font-mono text-[9px] tracking-[0.5em] text-white/20 uppercase mt-2">
              Loading Assets
            </span>
          </div>
        )}
      </div>

      {/* Subtle corner markers */}
      <div className="preloader-content absolute top-8 left-8 flex items-center gap-2 opacity-30">
        <div className="w-3 h-[1px] bg-white" />
        <span className="font-mono text-[8px] tracking-[0.3em] text-white uppercase">SYS.01</span>
      </div>
      
      <div className="preloader-content absolute bottom-8 right-8 flex items-center gap-2 opacity-30">
        <span className="font-mono text-[8px] tracking-[0.3em] text-white uppercase">2024</span>
        <div className="w-3 h-[1px] bg-white" />
      </div>

      {/* Ambient glow */}
      <div 
        className="preloader-content absolute w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-white/5 blur-[100px] pointer-events-none"
        style={{
          animation: "pulse 4s ease-in-out infinite",
        }}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.05; }
          50% { transform: scale(1.2); opacity: 0.02; }
        }
      `}} />
    </div>
  );
};
