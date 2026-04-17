"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export const Preloader = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const linesContainerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  
  const [text, setText] = useState("hello.");
  const [isFinished, setIsFinished] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useGSAP(() => {
    if (!isMounted) return;
    
    document.body.style.overflow = "hidden";

    const lines = linesContainerRef.current?.querySelectorAll('.preloader-line');
    const chars = textRef.current?.querySelectorAll('.preloader-char');

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setIsFinished(true);
        window.dispatchEvent(new CustomEvent("preloader-complete"));
      }
    });

    // Initial state
    gsap.set(chars, { y: 60, opacity: 0, rotateX: -90 });
    gsap.set(lines, { scaleX: 0 });
    gsap.set(progressRef.current, { scaleX: 0 });

    // Counter animation (0 to 100)
    const counter = { value: 0 };
    tl.to(counter, {
      value: 100,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = Math.round(counter.value).toString().padStart(3, '0');
        }
      }
    }, 0);

    // Progress bar
    tl.to(progressRef.current, {
      scaleX: 1,
      duration: 2.5,
      ease: "power2.inOut"
    }, 0);

    // Staggered lines reveal
    tl.to(lines, {
      scaleX: 1,
      duration: 1.2,
      stagger: 0.08,
      ease: "expo.out"
    }, 0.2);

    // "hello." chars reveal
    tl.to(chars, {
      y: 0,
      opacity: 1,
      rotateX: 0,
      duration: 0.8,
      stagger: 0.05,
      ease: "back.out(1.7)"
    }, 0.5);

    // Hold, then transition to "ahoj."
    tl.to(chars, {
      y: -60,
      opacity: 0,
      rotateX: 90,
      duration: 0.6,
      stagger: 0.03,
      ease: "power3.in"
    }, "+=0.6")
      .call(() => setText("ahoj."))
      .set(chars, { y: 60, rotateX: -90 })
      .to(chars, {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: "back.out(1.7)"
      });

    // Final reveal sequence
    tl.to(lines, {
      scaleX: 0,
      transformOrigin: "right center",
      duration: 0.8,
      stagger: 0.05,
      ease: "expo.in"
    }, "+=0.5");

    tl.to(chars, {
      y: -100,
      opacity: 0,
      rotateX: 90,
      duration: 0.5,
      stagger: 0.02,
      ease: "power3.in"
    }, "<");

    tl.to(progressRef.current, {
      scaleX: 0,
      transformOrigin: "right center",
      duration: 0.6,
      ease: "expo.in"
    }, "<0.1");

    tl.to(counterRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.4,
      ease: "power2.in"
    }, "<");

    // Cinematic curtain reveal
    tl.to(containerRef.current, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      duration: 1.2,
      ease: "expo.inOut",
      onStart: () => {
        window.dispatchEvent(new CustomEvent("preloader-hide-start"));
      }
    });

  }, { scope: containerRef, dependencies: [isMounted] });

  if (isFinished) return null;

  const chars = text.split('');

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] bg-[#010101] flex flex-col items-center justify-center pointer-events-auto"
      style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
    >
      {/* Ambient grid lines */}
      <div ref={linesContainerRef} className="absolute inset-0 flex flex-col justify-center gap-[15vh] px-8 pointer-events-none opacity-20">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="preloader-line h-[1px] w-full bg-gradient-to-r from-transparent via-white/60 to-transparent origin-left"
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-[20vh] left-1/2 -translate-x-1/2 w-[200px] md:w-[300px]">
        <div className="h-[1px] w-full bg-white/10 relative overflow-hidden">
          <div 
            ref={progressRef}
            className="absolute inset-0 bg-gradient-to-r from-white/40 via-white to-white/40 origin-left"
          />
        </div>
        <div className="mt-4 flex justify-center">
          <span 
            ref={counterRef}
            className="font-mono text-[10px] tracking-[0.5em] text-white/40"
          >
            000
          </span>
        </div>
      </div>

      {/* Main text with 3D char animation */}
      <div 
        ref={textRef} 
        className="relative z-10 font-serif italic font-light text-5xl md:text-7xl lg:text-8xl tracking-wide text-white perspective-[1000px]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {chars.map((char, i) => (
          <span 
            key={`${text}-${i}`}
            className="preloader-char inline-block"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>

      {/* Subtle corner markers */}
      <div className="absolute top-8 left-8 w-8 h-8 border-l border-t border-white/10" />
      <div className="absolute top-8 right-8 w-8 h-8 border-r border-t border-white/10" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-l border-b border-white/10" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-r border-b border-white/10" />
    </div>
  );
};
