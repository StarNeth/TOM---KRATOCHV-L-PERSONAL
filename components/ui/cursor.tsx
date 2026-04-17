"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export const Cursor = () => {
  const cursorWrapperRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // VÝKONNOSTNÍ ZÁMEK PRO MOBILY
    if (typeof window !== "undefined" && window.innerWidth < 768) return;

    document.body.style.cursor = "none";

    const xMove = gsap.quickTo(cursorWrapperRef.current, "x", { duration: 0.15, ease: "power3.out" });
    const yMove = gsap.quickTo(cursorWrapperRef.current, "y", { duration: 0.15, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      xMove(e.clientX);
      yMove(e.clientY);
    };

    const handleMouseDown = () => {
      gsap.to(crosshairRef.current, { 
        scale: 0.5, 
        duration: 0.1, 
        ease: "power4.out",
        overwrite: "auto" 
      });
    };

    const handleMouseUp = () => {
      gsap.to(crosshairRef.current, { 
        scale: 1, 
        duration: 0.3, 
        ease: "back.out(1.7)", 
        overwrite: "auto"
      });
    };

    // NOVÉ: Inteligentní detekce klikatelných elementů (Hover efekt)
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Zjistíme, jestli myš najela na link, tlačítko, nebo element s kurzorem pointer
      const isClickable = target.closest("a, button, [role='button'], .cursor-pointer");
      
      if (isClickable) {
        // Animace do tvaru 'X' a zvětšení
        gsap.to(crosshairRef.current, { 
          rotation: 45, 
          scale: 1.4, 
          duration: 0.4, 
          ease: "back.out(2)", 
          overwrite: "auto" 
        });
      } else {
        // Návrat do normálního tvaru '+'
        gsap.to(crosshairRef.current, { 
          rotation: 0, 
          scale: 1, 
          duration: 0.3, 
          ease: "power3.out", 
          overwrite: "auto" 
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseover", handleMouseOver); // Přidán hover listener

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseover", handleMouseOver);
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <div 
      ref={cursorWrapperRef} 
      // Zvýšil jsem z-index na 9999, aby kurzor nezalezl pod preloader nebo menu
      className="hidden md:block fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      {/* Lehce zmenšený základní stav (w-6 místo w-8) působí víc "profi" */}
      <div ref={crosshairRef} className="relative w-6 h-6">
        <div className="absolute top-0 left-1/2 w-[2px] h-2 bg-white -translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-[2px] h-2 bg-white -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 w-2 h-[2px] bg-white -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 w-2 h-[2px] bg-white -translate-y-1/2" />
      </div>
    </div>
  );
};