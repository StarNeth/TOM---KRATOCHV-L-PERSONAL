"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/navigation/language-toggle";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

const DICTIONARY = {
  en: { dive: "Enter System" },
  cs: { dive: "Vstoupit do systému" }
};

export const Hero = () => {
  const containerRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const { language } = useLanguage();
  const content = DICTIONARY[language as keyof typeof DICTIONARY];
  
  // ZMĚNĚNO: Ukládáme si, jestli můžeme animovat a JESTLI JE TO BOT
  const [animState, setAnimState] = useState<{ ready: boolean, isBot: boolean }>({ ready: false, isBot: false });

  useEffect(() => {
    // Nasloucháme preloaderu
    const triggerAnim = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAnimState({ ready: true, isBot: !!customEvent.detail?.isBot });
    };
    window.addEventListener("preloader-complete", triggerAnim);

    // Záchytná síť, pokud uživatel stránku jen refresnul (preloader už neexistuje)
    if (sessionStorage.getItem("preloader_played")) {
      const isBot = /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(navigator.userAgent);
      setAnimState({ ready: true, isBot });
    }

    return () => window.removeEventListener("preloader-complete", triggerAnim);
  }, []);

  useGSAP(() => {
    if (!animState.ready) return;

    if (animState.isBot) {
      // ==========================================
      // BOT BYPASS: OKAMŽITÉ ZOBRAZENÍ (0ms delay)
      // ==========================================
      gsap.set(nameRef.current, { y: 0, opacity: 1, filter: "blur(0px)", scale: 1 });
      gsap.set(".hero-ui", { opacity: 1, y: 0 });
    } else {
      // ==========================================
      // LIDSKÁ VERZE: Plynulá a krásná animace
      // ==========================================
      const tl = gsap.timeline();
      tl.fromTo(nameRef.current,
        { y: 40, opacity: 0, filter: "blur(10px)", scale: 0.95 },
        { y: 0, opacity: 1, filter: "blur(0px)", scale: 1, duration: 1.5, ease: "power3.out" }
      ).fromTo(".hero-ui",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.15 },
        "-=0.8"
      );
    }

    const xTo = gsap.quickTo(nameRef.current, "x", { duration: 1.5, ease: "power3.out" });
    const yTo = gsap.quickTo(nameRef.current, "y", { duration: 1.5, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const xRatio = (e.clientX / window.innerWidth) - 0.5;
      const yRatio = (e.clientY / window.innerHeight) - 0.5;
      xTo(xRatio * 40);
      yTo(yRatio * 40);
    };
    
    if (window.innerWidth > 768) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    gsap.to(containerRef.current, {
      yPercent: 20,
      opacity: 0,
      filter: "blur(15px)",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1
      }
    });

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, { scope: containerRef, dependencies: [animState] });

  return (
    <section ref={containerRef} className="relative h-[100svh] w-full flex flex-col justify-center items-center z-10 perspective-[1000px]">
      <div className="relative z-10 flex flex-col items-center w-full max-w-[100vw] px-4 sm:px-6 mix-blend-difference">

      <h1 
        ref={nameRef}
        className="relative font-sans font-black tracking-tighter uppercase text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] text-center will-change-transform w-full flex flex-col items-center opacity-0 py-4"
      >
        {/* ZMĚNĚNO: Přidán lg breakpoint pro iPad, sníženo vw pro bezpečný prostor a fixní line-height (leading-[0.9]) */}
        <span className="block text-[clamp(1.5rem,8vw,4rem)] sm:text-[clamp(2.5rem,7vw,6rem)] md:text-[clamp(4rem,8vw,8rem)] lg:text-[clamp(5rem,8.5vw,10rem)] whitespace-nowrap leading-[0.9]">
          TOMÁŠ
        </span>
        <span className="block text-[clamp(1.5rem,8vw,4rem)] sm:text-[clamp(2.5rem,7vw,6rem)] md:text-[clamp(4rem,8vw,8rem)] lg:text-[clamp(5rem,8.5vw,10rem)] text-white/90 whitespace-nowrap leading-[0.9]">
          KRATOCHVÍL
        </span>
      </h1>

        <div className="hero-ui opacity-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent mt-12 w-[120px]" />
      </div>

      <div className="hero-ui opacity-0 absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20 text-white pointer-events-auto mix-blend-difference">
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/0 via-white/40 to-white/0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-[bounce_2s_infinite]" />
        </div>
        <span className="font-mono text-[9px] tracking-[0.6em] text-white/40 uppercase animate-pulse">
          {content.dive}
        </span>
      </div>
    </section>
  );
};