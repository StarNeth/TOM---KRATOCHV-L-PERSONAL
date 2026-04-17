"use client";

import { useRef, useEffect } from "react";
import { useLenis } from "lenis/react";

/**
 * High-performance CSS animated gradient fallback for when WebGL is unavailable.
 * Matches the shader's color palette and scroll-reactive behavior.
 */
export const CSSFallbackGradient = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef(0);
  const lenis = useLenis();

  useEffect(() => {
    const handleScroll = () => {
      if (lenis) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgress.current = window.scrollY / maxScroll;
      updateGradient();
    };

    const updateGradient = () => {
      if (!containerRef.current) return;
      const progress = scrollProgress.current;

      // Match shader color transitions
      // Hero: dark grays (0-30%), Work: dark blues (30-70%), Contact: orange/reds (70-100%)
      let color1: string, color2: string, color3: string;

      if (progress < 0.3) {
        // Hero zone - dark obsidian
        const t = progress / 0.3;
        color1 = lerpColor("#020203", "#050508", t);
        color2 = lerpColor("#0a0a0d", "#101015", t);
        color3 = lerpColor("#151518", "#1a1a20", t);
      } else if (progress < 0.7) {
        // Work zone - dark blues
        const t = (progress - 0.3) / 0.4;
        color1 = lerpColor("#050508", "#020308", t);
        color2 = lerpColor("#101015", "#0a1530", t);
        color3 = lerpColor("#1a1a20", "#152040", t);
      } else {
        // Contact zone - warm tones
        const t = (progress - 0.7) / 0.3;
        color1 = lerpColor("#020308", "#150200", t);
        color2 = lerpColor("#0a1530", "#301505", t);
        color3 = lerpColor("#152040", "#452010", t);
      }

      containerRef.current.style.setProperty("--gradient-c1", color1);
      containerRef.current.style.setProperty("--gradient-c2", color2);
      containerRef.current.style.setProperty("--gradient-c3", color3);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lenis]);

  // Lenis scroll listener
  useLenis((scroll) => {
    scrollProgress.current = scroll.progress;
    if (containerRef.current) {
      const progress = scroll.progress;
      let color1: string, color2: string, color3: string;

      if (progress < 0.3) {
        const t = progress / 0.3;
        color1 = lerpColor("#020203", "#050508", t);
        color2 = lerpColor("#0a0a0d", "#101015", t);
        color3 = lerpColor("#151518", "#1a1a20", t);
      } else if (progress < 0.7) {
        const t = (progress - 0.3) / 0.4;
        color1 = lerpColor("#050508", "#020308", t);
        color2 = lerpColor("#101015", "#0a1530", t);
        color3 = lerpColor("#1a1a20", "#152040", t);
      } else {
        const t = (progress - 0.7) / 0.3;
        color1 = lerpColor("#020308", "#150200", t);
        color2 = lerpColor("#0a1530", "#301505", t);
        color3 = lerpColor("#152040", "#452010", t);
      }

      containerRef.current.style.setProperty("--gradient-c1", color1);
      containerRef.current.style.setProperty("--gradient-c2", color2);
      containerRef.current.style.setProperty("--gradient-c3", color3);
    }
  });

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      style={{
        "--gradient-c1": "#020203",
        "--gradient-c2": "#0a0a0d",
        "--gradient-c3": "#151518",
      } as React.CSSProperties}
    >
      {/* Base gradient layer */}
      <div 
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, var(--gradient-c3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 80% 50%, var(--gradient-c2) 0%, transparent 40%),
            radial-gradient(ellipse 70% 60% at 20% 80%, var(--gradient-c2) 0%, transparent 40%),
            linear-gradient(180deg, var(--gradient-c1) 0%, var(--gradient-c2) 50%, var(--gradient-c1) 100%)
          `,
          backgroundSize: "100% 100%",
          transition: "background 0.5s ease-out",
        }}
      />
      
      {/* Subtle animated overlay for organic movement */}
      <div 
        className="absolute inset-0 animate-gradient-pulse opacity-30"
        style={{
          background: `
            radial-gradient(circle at 30% 40%, var(--gradient-c3) 0%, transparent 30%),
            radial-gradient(circle at 70% 60%, var(--gradient-c2) 0%, transparent 25%)
          `,
        }}
      />
    </div>
  );
};

// Linear interpolation between two hex colors
function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
