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
  
  // ZMĚNA: Defaultně musí být true/false takové, aby preloader blokoval web a nic neprobliklo
  const [shouldRun, setShouldRun] = useState(true); 
  const [isFinished, setIsFinished] = useState(false); 

  useEffect(() => {
    // 1. Zabráníme probliknutí a ověříme paměť hned na začátku
    if (sessionStorage.getItem("preloader_played")) {
      setShouldRun(false);
      setIsFinished(true);
      // Musíme to vystřelit s mikro-zpožděním, aby se Hero stihl namountovat
      setTimeout(() => window.dispatchEvent(new CustomEvent("preloader-complete")), 50);
      return;
    }
    setPhase("loading");
  }, []);

  // 2. Plynulé počítadlo procent
  useEffect(() => {
    if (!shouldRun || phase !== "loading") return;
    
    let current = 0;
    let lastTime = performance.now();
    let frameId: number;

    const updateCounter = (time: number) => {
      const delta = Math.min(time - lastTime, 30);
      lastTime = time;

      current += (delta / 2500) * 100; // 2.5 vteřiny
      
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
  }, [shouldRun, phase]);

  useEffect(() => {
    if (!isFinished && shouldRun) document.body.style.overflow = "hidden";
  }, [isFinished, shouldRun]);

  // 3. CHOREOGRAFIE: Písmena vzletí, TK se spojí
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

    // A. Zmizí procenta a detaily
    tl.to(secondaryElementsRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power3.inOut"
    });

    // B. Písmena vyletí nahoru a fade-outnou JEDNOTLIVĚ
    tl.to(".fade-letter", {
      y: -100,
      opacity: 0,
      duration: 0.6,
      stagger: 0.03, // Každé písmeno vyletí chvíli po tom předchozím
      ease: "power3.in"
    }, "+=0.2");

    // C. Písmena "T" a "K" se přisunou k sobě (zrušíme mezeru těch zmizelých písmen)
    tl.to(".fade-letter", {
      width: 0,
      paddingRight: 0,
      marginRight: 0,
      duration: 0.8,
      ease: "expo.inOut"
    }, "+=0.1");
    
    tl.to(".name-space", { width: 0, duration: 0.8, ease: "expo.inOut" }, "<");

    // D. Vytažení opony (celého preloaderu) plynule nahoru
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
          className={`inline-block overflow-hidden ${isInitial ? 'text-white' : 'fade-letter text-white/90'}`}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#020202] text-white pointer-events-auto">
      
      {/* Jméno - Zmenšeno a elegantně vycentrováno */}
      <div 
        ref={nameWrapperRef} 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        {/* ZMĚNĚNO: Z obřích 12vw na decentní text-4xl / md:text-6xl */}
        <h1 className="font-syne font-bold text-4xl md:text-6xl tracking-tighter uppercase m-0 flex items-center">
          <div className="flex">
            {renderWord("TOMÁŠ")}
          </div>
          <span className="name-space w-3 md:w-5 inline-block"></span>
          <div className="flex">
            {renderWord("KRATOCHVÍL")}
          </div>
        </h1>
      </div>

      <div ref={secondaryElementsRef} className="absolute inset-0 p-6 md:p-12 flex flex-col justify-between pointer-events-none">
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2 opacity-30">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase">SYS.01</span>
          </div>
          <div className="flex gap-4 font-jetbrains text-xs uppercase tracking-widest font-bold opacity-50">
            <span>System Architect</span>
          </div>
        </div>

        <div className="flex justify-between items-end w-full">
          <div className="font-jetbrains text-[10px] md:text-xs uppercase tracking-widest opacity-50 pb-2">
            Loading<br />Digital Experience
          </div>
          
          <div className="font-jetbrains font-bold text-5xl md:text-7xl leading-none flex items-end">
            {counter.toString().padStart(3, "0")}
            <span className="font-syne text-xl md:text-2xl mb-1 ml-2 opacity-50">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};