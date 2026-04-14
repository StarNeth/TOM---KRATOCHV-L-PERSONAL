"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// [ ! ] IMPORT GLOBÁLNÍHO JAZYKA
import { useLanguage } from "@/components/navigation/language-toggle";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// [ ! ] LOKÁLNÍ SLOVNÍK PRO TUTO SEKCI
const DICTIONARY = {
  en: {
    firstName: "TOMÁŠ",
    lastName: "KRATOCHVÍL",
    dive: "Initiate Dive"
  },
  cs: {
    firstName: "TOMÁŠ",
    lastName: "KRATOCHVÍL",
    dive: "Zahájit Sestup"
  }
};

export const Hero = () => {
  const containerRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);

  // [ ! ] PŘIPOJENÍ NA GLOBÁLNÍ STATE
  const { language } = useLanguage();
  const content = DICTIONARY[language];

  useGSAP(() => {
    const xTo = gsap.quickTo(nameRef.current, "x", { duration: 1.5, ease: "power3.out" });
    const yTo = gsap.quickTo(nameRef.current, "y", { duration: 1.5, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const xRatio = (e.clientX / window.innerWidth) - 0.5;
      const yRatio = (e.clientY / window.innerHeight) - 0.5;
      xTo(xRatio * 40);
      yTo(yRatio * 40);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animace parallaxu pro scroll zůstává
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

    // [ ! ] ZMĚNA: Úvodní animace čeká na signál z Preloaderu!
    const playIntroAnimation = () => {
      const tl = gsap.timeline();
      
      tl.fromTo(nameRef.current,
        { y: 40, opacity: 0, filter: "blur(10px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.5, ease: "power3.out" }
      );

      // [ ! ] OPRAVA: Zabrání GSAP chybě v terminálu (ověří, že prvky před animací existují)
      const heroUiElements = document.querySelectorAll(".hero-ui");
      if (heroUiElements.length > 0) {
        tl.fromTo(heroUiElements,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.15 },
          "-=0.8"
        );
      }
    };

    // Posloucháme na náš CustomEvent
    window.addEventListener("preloader-complete", playIntroAnimation);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("preloader-complete", playIntroAnimation);
    };
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative h-screen w-full flex flex-col justify-center items-center z-10 overflow-hidden perspective-[1000px]">
      <div className="relative z-10 flex flex-col items-center w-full px-4 mix-blend-difference">

      <h1 
        ref={nameRef}
        // OPRAVA: flex-col pro jistotu a whitespace-nowrap, aby se to NIKDY nerozdělilo
        className="relative font-sans font-black tracking-tighter leading-[0.85] uppercase text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] text-center will-change-transform w-full flex flex-col items-center"
      >
        <span className="block text-[clamp(3.5rem,14vw,6rem)] md:text-[clamp(5rem,8.5vw,10rem)] whitespace-nowrap">
          TOMÁŠ
        </span>
        <span className="block text-[clamp(3.5rem,13vw,6rem)] md:text-[clamp(5rem,8.5vw,10rem)] text-white/90 whitespace-nowrap">
          KRATOCHVÍL
        </span>
      </h1>

        <div className="hero-ui h-px bg-gradient-to-r from-transparent via-white/50 to-transparent mt-12 w-[120px]" />
      </div>

      <div className="hero-ui absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20 text-white pointer-events-auto mix-blend-difference">
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/0 via-white/40 to-white/0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-[bounce_2s_infinite]" />
        </div>
        <span className="font-mono text-[9px] tracking-[0.6em] text-white/40 uppercase animate-pulse">
          {/* [ ! ] POUŽITÍ SLOVNÍKU */}
          {content.dive}
        </span>
      </div>

    </section>
  );
};