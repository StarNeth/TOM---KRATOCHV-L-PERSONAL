"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export const Cursor = () => {
  const cursorWrapperRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skrytí nativního kurzoru
    document.body.style.cursor = "none";

    // GSAP quickTo pro maximální plynulost bez re-renderů Reactu
    const xMove = gsap.quickTo(cursorWrapperRef.current, "x", { duration: 0.1, ease: "power3.out" });
    const yMove = gsap.quickTo(cursorWrapperRef.current, "y", { duration: 0.1, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      xMove(e.clientX);
      yMove(e.clientY);
    };

    // CS:GO styl smrštění (Shrink)
    const handleMouseDown = () => {
      gsap.to(crosshairRef.current, { 
        scale: 0.5, // Výrazné smrštění
        duration: 0.05, // Blesková rychlost jako výstřel
        ease: "power4.out",
        overwrite: "auto" // Zabraní glitchům při rychlém klikání
      });
    };

    const handleMouseUp = () => {
      gsap.to(crosshairRef.current, { 
        scale: 1, 
        duration: 0.3, 
        ease: "back.out(1.7, 0.3)", // Rychlý, ale lehce pružný návrat
        overwrite: "auto"
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <div
      ref={cursorWrapperRef}
      className="fixed top-0 left-0 pointer-events-none z-[100] mix-blend-difference"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      <div ref={crosshairRef} className="relative w-8 h-8">
        {/* Tlustší, kratší čáry - CS:GO style (šířka 2px, délka 8px, mezera uprostřed) */}
        {/* Horní */}
        <div className="absolute top-0 left-1/2 w-[2px] h-2.5 bg-white -translate-x-1/2" />
        {/* Spodní */}
        <div className="absolute bottom-0 left-1/2 w-[2px] h-2.5 bg-white -translate-x-1/2" />
        {/* Levá */}
        <div className="absolute left-0 top-1/2 w-2.5 h-[2px] bg-white -translate-y-1/2" />
        {/* Pravá */}
        <div className="absolute right-0 top-1/2 w-2.5 h-[2px] bg-white -translate-y-1/2" />
      </div>
    </div>
  );
};