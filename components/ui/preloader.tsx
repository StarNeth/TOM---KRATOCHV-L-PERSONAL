"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export const Preloader = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameWrapperRef = useRef<HTMLDivElement>(null);
  const secondaryElementsRef = useRef<HTMLDivElement>(null);
  
  const [counter, setCounter] = useState(0);
  const [phase, setPhase] = useState<"init" | "loading" | "animating">("init");
  
  const [shouldRun, setShouldRun] = useState(true); 
  const [isFinished, setIsFinished] = useState(false); 
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Rychlá detekce mobilu po mountu
    setIsMobile(window.innerWidth < 768);

    if (sessionStorage.getItem("preloader_played")) {
      setShouldRun(false);
      setIsFinished(true);
      setTimeout(() => window.dispatchEvent(new CustomEvent("preloader-complete")), 50);
      return;
    }
    setPhase("loading");
  }, []);

  useEffect(() => {
    if (!shouldRun || phase !== "loading") return;
    
    let current = 0;
    let lastTime = performance.now();
    let frameId: number;

    // LCP FIX: Na mobilu běží loading jen 1 vteřinu, na PC 2.5 vteřiny
    const duration = isMobile ? 1000 : 2500;

    const updateCounter = (time: number) => {
      const delta = Math.min(time - lastTime, 30);
      lastTime = time;

      current += (delta / duration) * 100;
      
      if (current >= 100) {
        setCounter(100);
        setPhase("animating"); 
      } else {
        setCounter(Math.floor(current));
        frameId = requestAnimationFrame(updateCounter);
      }
    };
    
    frameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(frameId);
  }, [shouldRun, phase, isMobile]);

  useEffect(() => {
    if (!isFinished && shouldRun) document.body.style.overflow = "hidden";
  }, [isFinished, shouldRun]);

  useGSAP(() => {
    if (phase !== "animating") return;

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        sessionStorage.setItem("preloader_played", "true");
        setIsFinished(true);
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    tl.to(secondaryElementsRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power3.inOut"
    });

    tl.to(".fade-letter", {
      y: -100,
      opacity: 0,
      duration: 0.6,
      stagger: 0.03,
      ease: "power3.in"
    }, "+=0.2");

    tl.to(".fade-letter", {
      width: 0,
      paddingRight: 0,
      marginRight: 0,
      duration: 0.8,
      ease: "expo.inOut"
    }, "+=0.1");
    
    tl.to(".name-space", { width: 0, duration: 0.8, ease: "expo.inOut" }, "<");

    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 1.2,
      ease: "expo.inOut"
    }, "+=0.3");

  }, { scope: containerRef, dependencies: [phase] });

  if (!shouldRun || isFinished) return null;

  const renderWord = (word: string) => {
    return word.split("").map((char, index) => {
      const isInitial = index === 0;
      return (
        <span 
          key={index} 
          // FIX OŘEZU PÍSMEN (T, L, R) ZŮSTÁVÁ ZDE
          className={`inline-block overflow-visible px-[0.1em] -mx-[0.1em] ${isInitial ? 'text-white' : 'fade-letter text-white/90'}`}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#020202] text-white pointer-events-auto overflow-hidden">
      
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      <div 
        ref={nameWrapperRef} 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <h1 className="font-syne font-bold text-4xl md:text-6xl tracking-tighter uppercase m-0 flex items-center drop-shadow-2xl">
          <div className="flex">
            {renderWord("TOMÁŠ")}
          </div>
          <span className="name-space w-3 md:w-5 inline-block"></span>
          <div className="flex">
            {renderWord("KRATOCHVÍL")}
          </div>
        </h1>
      </div>

      <div ref={secondaryElementsRef} className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end pointer-events-none">
        
        <div className="flex flex-col w-full max-w-2xl mx-auto gap-4">
          <div className="flex justify-between items-end w-full px-1">
            <div className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest opacity-40">
              Initializing
            </div>
            
            <div className="font-syne font-bold text-3xl md:text-5xl leading-none flex items-end">
              {counter.toString().padStart(3, "0")}
              <span className="font-mono text-sm md:text-base mb-1 ml-1 opacity-50">%</span>
            </div>
          </div>
          
          <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" 
              style={{ width: `${counter}%`, transition: "width 0.1s linear" }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};