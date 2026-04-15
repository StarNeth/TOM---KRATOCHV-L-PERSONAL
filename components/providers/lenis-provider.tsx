"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollState {
  scroll: number;
  velocity: number;
  direction: number;
  progress: number;
}

export const scrollStore: ScrollState = {
  scroll: 0,
  velocity: 0,
  direction: 1,
  progress: 0,
};

const LenisContext = createContext<{ lenis: Lenis | null }>({ lenis: null });

export function useLenisInstance() {
  return useContext(LenisContext);
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    // ČISTÁ KONFIGURACE BEZ CHYBNÝCH TYPŮ
    const lenisInstance = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenisRef.current = lenisInstance;
    setLenis(lenisInstance);

    let smoothedVelocity = 0;

    lenisInstance.on("scroll", ({ scroll, velocity, direction, progress }: ScrollState) => {
      smoothedVelocity = smoothedVelocity * 0.85 + velocity * 0.15;
      scrollStore.scroll = scroll;
      scrollStore.velocity = smoothedVelocity;
      scrollStore.direction = direction;
      scrollStore.progress = progress;
    });

    lenisInstance.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenisInstance.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenisInstance.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <LenisContext.Provider value={{ lenis }}>
      {children}
    </LenisContext.Provider>
  );
}