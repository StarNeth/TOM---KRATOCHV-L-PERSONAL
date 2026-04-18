"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger"; 
import { useLenis } from "lenis/react";
import { Globe, Activity, Circle } from "lucide-react";
import { useLanguage } from "@/components/navigation/language-toggle";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

const NAV_ITEMS = [
  { label: "About", id: "#about" }, 
  { label: "Work", id: "#work" }, 
  { label: "Capabilities", id: "#capabilities" }, 
  { label: "Contact", id: "#contact" }
];

// Mobile Menu Overlay Component
const MobileMenuOverlay = ({ 
  isOpen, 
  onClose, 
  onNavigate 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onNavigate: (id: string) => void;
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    if (!overlayRef.current) return;

    if (isOpen) {
      // Lock Lenis scroll
      lenis?.stop();
      document.body.style.overflow = "hidden";

      // Animate in
      gsap.set(overlayRef.current, { display: "flex" });
      
      const tl = gsap.timeline();
      tl.fromTo(overlayRef.current,
        { clipPath: "circle(0% at calc(100% - 40px) 40px)" },
        { clipPath: "circle(150% at calc(100% - 40px) 40px)", duration: 0.6, ease: "power4.out" }
      )
      .fromTo(".mobile-nav-item",
        { x: 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" },
        "-=0.3"
      )
      .fromTo(".mobile-nav-footer",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      );
    } else {
      // Unlock Lenis scroll
      lenis?.start();
      document.body.style.overflow = "";

      // Animate out
      const tl = gsap.timeline({
        onComplete: () => {
          if (overlayRef.current) {
            gsap.set(overlayRef.current, { display: "none" });
          }
        }
      });
      
      tl.to(".mobile-nav-item",
        { x: -30, opacity: 0, duration: 0.3, stagger: 0.05, ease: "power2.in" }
      )
      .to(overlayRef.current,
        { clipPath: "circle(0% at calc(100% - 40px) 40px)", duration: 0.5, ease: "power4.in" },
        "-=0.2"
      );
    }
  }, [isOpen, lenis]);

  const handleNavClick = (id: string) => {
    onNavigate(id);
    onClose();
  };

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[150] bg-[#020202]/98 backdrop-blur-2xl flex-col justify-center items-center hidden"
      style={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
    >
      {/* Navigation Links */}
      <nav ref={navItemsRef} className="flex flex-col items-center gap-8">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.label}
            onClick={() => handleNavClick(item.id)}
            className="mobile-nav-item group relative overflow-hidden py-2"
          >
            <span className="font-syne font-black text-5xl sm:text-6xl uppercase tracking-tighter text-white transition-transform duration-500 group-hover:translate-y-[-110%] block">
              {item.label}
            </span>
            <span className="absolute top-0 left-0 w-full text-center font-instrument italic text-5xl sm:text-6xl lowercase text-white/80 translate-y-[110%] transition-transform duration-500 group-hover:translate-y-0">
              {item.label}
            </span>
            <span className="absolute -left-8 top-1/2 -translate-y-1/2 font-mono text-[10px] text-white/30 tracking-widest">
              0{i + 1}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer info */}
      <div className="mobile-nav-footer absolute bottom-12 left-0 right-0 flex justify-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase">System Architect</span>
          <div className="w-12 h-[1px] bg-white/20" />
          <span className="font-mono text-[9px] tracking-[0.2em]">Czech Republic</span>
        </div>
      </div>
    </div>
  );
};

// Hamburger Button Component
const HamburgerButton = ({ 
  isOpen, 
  onClick 
}: { 
  isOpen: boolean; 
  onClick: () => void;
}) => {
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const line3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.to(line1Ref.current, { rotate: 45, y: 6, duration: 0.3, ease: "power2.out" });
      gsap.to(line2Ref.current, { opacity: 0, scaleX: 0, duration: 0.2, ease: "power2.out" });
      gsap.to(line3Ref.current, { rotate: -45, y: -6, duration: 0.3, ease: "power2.out" });
    } else {
      gsap.to(line1Ref.current, { rotate: 0, y: 0, duration: 0.3, ease: "power2.out" });
      gsap.to(line2Ref.current, { opacity: 1, scaleX: 1, duration: 0.3, ease: "power2.out", delay: 0.1 });
      gsap.to(line3Ref.current, { rotate: 0, y: 0, duration: 0.3, ease: "power2.out" });
    }
  }, [isOpen]);

  return (
    <button 
      onClick={onClick}
      className="md:hidden relative z-[200] w-10 h-10 flex flex-col items-center justify-center gap-1.5 pointer-events-auto"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      <div ref={line1Ref} className="w-6 h-[2px] bg-white origin-center" />
      <div ref={line2Ref} className="w-6 h-[2px] bg-white origin-center" />
      <div ref={line3Ref} className="w-6 h-[2px] bg-white origin-center" />
    </button>
  );
};

export const Header = () => {
  const containerRef = useRef<HTMLElement>(null);
  const lenis = useLenis();
  
  // ZMĚNĚNO: Přidání hooku pro jazyk
  const { language, toggleLanguage } = useLanguage();
  
  const [time, setTime] = useState<string>("00:00:00");
  const [scrollProg, setScrollProg] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleScrollTo = useCallback((e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.querySelector<HTMLElement>(targetId);
    if (target) {
      if (lenis) {
        lenis.scrollTo(target, { offset: 0, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [lenis]);

  const handleMobileNavigate = useCallback((targetId: string) => {
    const target = document.querySelector<HTMLElement>(targetId);
    if (target) {
      // Small delay to let menu close animation start
      setTimeout(() => {
        if (lenis) {
          lenis.scrollTo(target, { offset: 0, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        } else {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  }, [lenis]);

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
    <>
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
          {/* Mobile hamburger */}
          <div className="sys-element md:hidden">
            <HamburgerButton 
              isOpen={isMobileMenuOpen} 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            />
          </div>

          {/* Desktop system info */}
          <div className="sys-element hidden md:flex flex-wrap justify-end items-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-white uppercase drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
            {/* ZMĚNĚNO: Div nahrazen tlačítkem. Dynamicky zobrazuje EN/CS a spouští toggleLanguage */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:opacity-60 transition-opacity cursor-pointer"
            >
              <Globe className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
              <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
            </button>
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

          {/* Desktop navigation */}
          <nav className="sys-element relative hidden md:block w-[400px] h-[130px] mt-6">
            {NAV_ITEMS.map((item, i) => (
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

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleMobileNavigate}
      />
    </>
  );
};
