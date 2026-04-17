"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export const Preloader = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameWrapperRef = useRef<HTMLDivElement>(null);
  const secondaryElementsRef = useRef<HTMLDivElement>(null);
  
  const [counter, setCounter] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isWebglReady, setIsWebglReady] = useState(false);
  const [phase, setPhase] = useState<"loading" | "animating">("loading");

  // 1. ČEKÁME NA SKUTEČNÉ NAČTENÍ (WebGL + Window Load)
  useEffect(() => {
    const handleReady = () => setIsWebglReady(true);
    window.addEventListener("webgl-ready", handleReady);
    
    // Safety timeout, kdyby WebGL spadlo (aby web nezůstal viset na 99%)
    const fallback = setTimeout(handleReady, 8000);
    
    return () => {
      window.removeEventListener("webgl-ready", handleReady);
      clearTimeout(fallback);
    };
  }, []);

  // 2. LOGIKA POČÍTADLA (Zastaví se na 99 %, pokud není načteno)
  useEffect(() => {
    if (phase !== "loading") return;
    
    let current = 0;
    let lastTime = performance.now();
    let frameId: number;
    let isCancelled = false; // Pojistka proti React Strict Mode

    const updateCounter = (time: number) => {
      if (isCancelled) return;
      
      const delta = Math.min(time - lastTime, 30);
      lastTime = time;

      // ZPOMALENO: Nyní trvá 2.5 sekundy (2500ms) dojet do 99%
      current += (delta / 2500) * 100;
      
      if (current >= 99 && !isWebglReady) {
        setCounter(99);
        frameId = requestAnimationFrame(updateCounter);
      } else if (current >= 100 && isWebglReady) {
        setCounter(100);
        setPhase("animating"); 
      } else {
        setCounter(Math.floor(current));
        frameId = requestAnimationFrame(updateCounter);
      }
    };
    
    frameId = requestAnimationFrame(updateCounter);
    
    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [phase, isWebglReady]);

  // Zákaz scrollování
  useEffect(() => {
    if (!isFinished) document.body.style.overflow = "hidden";
  }, [isFinished]);

  // 3. MASTER CHOREOGRAFIE (T & K)
  useGSAP(() => {
    if (phase !== "animating") return;

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFinished(true);
        // OPRAVA: Vystřelíme správný event pro tvůj Hero.tsx!
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    // A. Skryjeme procenta a popisky
    tl.to(secondaryElementsRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      ease: "power3.inOut"
    });

    // B. Přesuneme celé jméno absolutně na střed obrazovky
    tl.to(nameWrapperRef.current, {
      top: "50%",
      left: "50%",
      xPercent: -50,
      yPercent: -50,
      duration: 1.2,
      ease: "expo.inOut"
    }, "-=0.2");

    // C. Skryjeme všechna písmena KROMĚ T a K a smrskneme jejich šířku na 0
    tl.to(".fade-letter", {
      opacity: 0,
      width: 0,
      marginRight: 0,
      paddingRight: 0,
      duration: 0.8,
      ease: "power3.inOut"
    }, "-=0.4");

    // Skryjeme mezeru (br) mezi jménem a příjmením, aby se T a K daly vedle sebe
    tl.to(".name-break", {
      display: "none",
      duration: 0
    }, "-=0.8");

    // D. Opona vyjede nahoru
    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 1,
      ease: "expo.inOut"
    }, "+=0.3"); // Malá pauza, ať si uživatel to "TK" stihne prohlédnout

  }, { scope: containerRef, dependencies: [phase] });

  if (isFinished) return null;

  // Rozdělení jména pro individuální animaci písmen
  const renderWord = (word: string) => {
    return word.split("").map((char, index) => {
      // První písmeno necháme (T a K), ostatní dostanou třídu fade-letter
      const isInitial = index === 0;
      return (
        <span 
          key={index} 
          className={`inline-block overflow-hidden ${isInitial ? 'tk-letter' : 'fade-letter'}`}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] bg-[#f4f4f4] text-[#0a0a0a] pointer-events-none"
    >
      {/* Tento wrapper drží jméno. Na začátku je vlevo nahoře (top-6 left-6).
        GSAP ho pak animuje na top: 50%, left: 50%, translate: -50% -50%
      */}
      <div 
        ref={nameWrapperRef} 
        className="absolute top-6 left-6 md:top-12 md:left-12 flex flex-col md:flex-row md:gap-4 items-start"
      >
        <h1 className="font-syne font-black text-[12vw] md:text-[8vw] leading-[0.85] tracking-tighter uppercase m-0 flex flex-wrap">
          <div className="flex">
            {renderWord("Tomáš")}
          </div>
          <span className="name-break block w-full md:hidden"></span>
          <div className="flex md:ml-4">
            {renderWord("Kratochvíl.")}
          </div>
        </h1>
      </div>

      {/* Všechno ostatní, co zmizí (Procenta, texty, čáry) */}
      <div ref={secondaryElementsRef} className="absolute inset-0 p-6 md:p-12 flex flex-col justify-between">
        
        {/* Top Meta Text */}
        <div className="flex justify-end w-full">
          <div className="flex gap-4 mt-6 md:mt-8 font-jetbrains text-xs md:text-sm uppercase tracking-widest font-bold opacity-50">
            <span>Sys.01</span>
            <span>—</span>
            <span>System Architect</span>
          </div>
        </div>

        {/* Bottom Counter */}
        <div className="flex justify-between items-end w-full h-full">
          <div className="font-jetbrains text-xs md:text-sm uppercase tracking-widest opacity-50 pb-2 md:pb-4">
            Loading
            <br />
            Digital Experience
          </div>
          
          <div className="font-jetbrains font-bold text-[22vw] md:text-[16vw] leading-[0.75] flex items-end">
            {counter.toString().padStart(3, "0")}
            <span className="font-syne text-[10vw] md:text-[6vw] leading-[1] mb-[1vw] ml-2">%</span>
          </div>
        </div>

      </div>
    </div>
  );
};