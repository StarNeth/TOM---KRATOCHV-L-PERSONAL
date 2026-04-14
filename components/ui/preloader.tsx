"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
// [ ! ] OPRAVA 1: Použití useGSAP místo useEffect zabrání zdvojení animací a zčernání obrazovky
import { useGSAP } from "@gsap/react";

export const Preloader = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  
  const [text, setText] = useState("hello.");
  const [isFinished, setIsFinished] = useState(false);

  useGSAP(() => {
    // Uzamkneme scrollování stránky
    document.body.style.overflow = "hidden";

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFinished(true);
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    // 1. Text "hello." je vidět půl vteřiny, pak plynule zmizí
    tl.to(textRef.current, { 
      opacity: 0, 
      scale: 1.05, 
      filter: "blur(8px)", 
      duration: 0.8, 
      ease: "power2.inOut", 
      delay: 0.5 
    })
    // 2. Na pozadí se změní stav textu
    .call(() => setText("ahoj.")) 
    // 3. Slovo "ahoj." se plynule objeví z mlhy
    .to(textRef.current, { 
      opacity: 1, 
      scale: 1, 
      filter: "blur(0px)", 
      duration: 0.8, 
      ease: "power2.out" 
    })
    // 4. Ahoj se propadne zpět do tmy
    .to(textRef.current, { 
      opacity: 0, 
      scale: 0.95, 
      filter: "blur(10px)", 
      duration: 0.8, 
      ease: "power2.inOut", 
      delay: 0.4 
    })
    // 5. Glow i černá opona se plynule rozpustí (Fade-out)
    .to(glowRef.current, { opacity: 0, duration: 0.5 }, "<")
    .to(containerRef.current, {
      opacity: 0,
      duration: 1.5, 
      ease: "power3.inOut"
    });

  }, { scope: containerRef }); // Scope zaručí, že se po unmountu všechno čistě uklidí

  // Jakmile je hotovo, vymažeme komponentu z DOMu, aby nebrzdila web
  if (isFinished) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-[#020202] flex items-center justify-center pointer-events-auto"
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dark-pulse {
          0% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.2); opacity: 0.05; }
          100% { transform: scale(1); opacity: 0.15; }
        }
        .animate-dark-pulse {
          animation: dark-pulse 6s infinite ease-in-out;
          will-change: transform, opacity;
        }
      `}} />

      {/* [ ! ] OPRAVA 2: mix-blend-screen zaručí, že světlo v černé barvě nezmizí */}
      <div 
        ref={glowRef}
        className="absolute w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-white blur-[80px] animate-dark-pulse opacity-15 mix-blend-screen pointer-events-none"
      />

      <div 
        ref={textRef} 
        className="relative z-10 font-serif italic font-light text-4xl md:text-6xl tracking-wide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
      >
        {text}
      </div>
    </div>
  );
};