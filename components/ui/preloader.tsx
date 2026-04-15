"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export const Preloader = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  
  const [text, setText] = useState("hello.");
  const [isFinished, setIsFinished] = useState(false);

  useGSAP(() => {
    document.body.style.overflow = "hidden";

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFinished(true);
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    tl.to(textRef.current, { opacity: 0, scale: 1.05, duration: 0.8, ease: "power2.inOut", delay: 0.5 })
      .call(() => setText("ahoj.")) 
      .to(textRef.current, { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" })
      .to(textRef.current, { opacity: 0, scale: 0.95, duration: 0.8, ease: "power2.inOut", delay: 0.4 })
      .to(glowRef.current, { opacity: 0, duration: 0.5 }, "<")
      .to(containerRef.current, { 
        opacity: 0, 
        duration: 1.5, 
        ease: "power3.inOut",
        onStart: () => {
          // Cinematic Handshake: Tell Hero to start animating
          window.dispatchEvent(new CustomEvent("preloader-hide-start"));
        }
      });

  }, { scope: containerRef });

  if (isFinished) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#020202] flex items-center justify-center pointer-events-auto">
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

      <div 
        ref={glowRef}
        className="absolute w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-white blur-[80px] animate-dark-pulse opacity-15 mix-blend-screen pointer-events-none"
      />

      <div ref={textRef} className="relative z-10 font-serif italic font-light text-4xl md:text-6xl tracking-wide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
        {text}
      </div>
    </div>
  );
};