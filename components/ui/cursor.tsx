"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export const Cursor = () => {
  const cursorWrapperRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // [ ! ] VÝKONNOSTNÍ ZÁMEK PRO MOBILY:
    // Pokud jsme na mobilu (pod 768px), úplně zrušíme spouštění JS pro kurzor!
    if (typeof window !== "undefined" && window.innerWidth < 768) return;

    document.body.style.cursor = "none";

    const xMove = gsap.quickTo(cursorWrapperRef.current, "x", { duration: 0.1, ease: "power3.out" });
    const yMove = gsap.quickTo(cursorWrapperRef.current, "y", { duration: 0.1, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      xMove(e.clientX);
      yMove(e.clientY);
    };

    const handleMouseDown = () => {
      gsap.to(crosshairRef.current, { 
        scale: 0.5, 
        duration: 0.05, 
        ease: "power4.out",
        overwrite: "auto" 
      });
    };

    const handleMouseUp = () => {
      gsap.to(crosshairRef.current, { 
        scale: 1, 
        duration: 0.3, 
        ease: "back.out(1.7, 0.3)", 
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
      // [ ! ] OPRAVA: hidden md:block zaručí, že na mobilu nebude kurzor překážet
      className="hidden md:block fixed top-0 left-0 pointer-events-none z-[100] mix-blend-difference"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      <div ref={crosshairRef} className="relative w-8 h-8">
        <div className="absolute top-0 left-1/2 w-[2px] h-2.5 bg-white -translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-[2px] h-2.5 bg-white -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 w-2.5 h-[2px] bg-white -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 w-2.5 h-[2px] bg-white -translate-y-1/2" />
      </div>
    </div>
  );
};