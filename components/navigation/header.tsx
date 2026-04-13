"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger"; 
import { useLenis } from "lenis/react";
import { Globe, Activity, Circle } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export const Header = () => {
  const containerRef = useRef<HTMLElement>(null);
  const lenis = useLenis();
  
  const [time, setTime] = useState<string>("00:00:00");
  const [scrollProg, setScrollProg] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString('cs-CZ', { hour12: false }));
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (lenis) return; 
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) setScrollProg(Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100))));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lenis]);

  useLenis((scroll) => {
    setScrollProg(Math.min(100, Math.max(0, Math.round(scroll.progress * 100))));
  });

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.querySelector<HTMLElement>(targetId);
    if (target) {
      if (lenis) {
        lenis.scrollTo(target, { offset: 0, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  useGSAP(() => {
    gsap.fromTo(".sys-element", 
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, ease: "power3.out", delay: 0.2 }
    );

    const xOffsets = [360, 270, 110, 0]; 
    const items = gsap.utils.toArray('.nav-item');

    items.forEach((item: any, i) => {
      gsap.fromTo(item,
        { x: -xOffsets[i], y: -(i * 32) },
        { 
          x: 0, y: 0, ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "250px top", 
            scrub: 1 
          }
        }
      );
    });
  }, { scope: containerRef });

  return (
    <header 
      ref={containerRef} 
      className="fixed top-0 left-0 w-full px-6 py-8 md:px-12 md:py-10 flex justify-between items-start z-[100] text-white pointer-events-none mix-blend-difference"
    >
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        <Link 
          href="/" 
          onClick={(e) => handleScrollTo(e, 'body')}
          className="sys-element font-syne font-black text-2xl tracking-tighter uppercase leading-none hover:opacity-60 transition-opacity text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]"
        >
          TOMÁŠ K.
        </Link>
        <div className="sys-element flex flex-col font-mono text-[9px] tracking-[0.2em] text-white uppercase mt-1 opacity-80">
          <span>System Architect</span>
          <span className="opacity-50">Diagnostics // Security</span>
        </div>
      </div>

      <div className="flex flex-col items-end pointer-events-auto max-w-[65vw]">
        {/* OPRAVA: hidden na mobilu, flex na desktopu (md:flex) */}
        <div className="sys-element hidden md:flex flex-wrap justify-end items-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-white uppercase drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
            <span>CZECH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-1.5 h-1.5 fill-white animate-pulse" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Activity className="w-3 h-3 text-white" />
            <span className="text-white">
              {scrollProg.toString().padStart(2, '0')}%
            </span>
          </div>
        </div>

        {/* OPRAVA: hidden na mobilu, block na desktopu (md:block) */}
        <nav className="sys-element relative hidden md:block w-[400px] h-[130px] mt-6">
          {[
            { label: "About", id: "#about" }, 
            { label: "Work", id: "#work" }, 
            { label: "Capabilities", id: "#capabilities" }, 
            { label: "Contact", id: "#contact" }
          ].map((item, i) => (
            <a 
              key={item.label}
              href={item.id}
              onClick={(e) => handleScrollTo(e, item.id)}
              style={{ top: `${i * 32}px` }}
              className="nav-item absolute right-0 group flex flex-col overflow-hidden font-sans text-sm tracking-[0.1em] uppercase text-white hover:opacity-60 transition-opacity py-1 cursor-pointer"
            >
              <span className="inline-block transition-transform duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-[120%]">
                {item.label}
              </span>
              <span className="absolute top-0 left-0 w-full text-right inline-block translate-y-[120%] transition-transform duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-0 text-white">
                {item.label}
              </span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
};