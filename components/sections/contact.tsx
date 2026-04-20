"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useLanguage } from "@/components/navigation/language-toggle"; // PŘIDÁNO

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

const DICTIONARY = {
  en: {
    copied: "Copied to clipboard",
    clickHint: "Click to copy"
  },
  cs: {
    copied: "Zkopírováno do schránky",
    clickHint: "Kliknutím zkopíruješ"
  }
};

const socials = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/tomas-kratochvil/" },
  { label: "GitHub", href: "https://github.com/StarNeth/" },
  { label: "Phone", href: "tel:+420602193021" },
];

export const Contact = () => {
  const { language } = useLanguage(); // PŘIDÁNO
  const t = DICTIONARY[language]; // PŘIDÁNO
  const sectionRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useGSAP(() => {
    gsap.fromTo(".contact-reveal",
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 75%" } }
    );

    gsap.to(".parallax-content", {
      y: -50, ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: true }
    });
  }, { scope: sectionRef });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!emailRef.current || window.innerWidth < 768) return; // Disable on mobile
    const rect = emailRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    gsap.to(emailRef.current, {
      x: x * 0.1, y: y * 0.1, duration: 0.2, ease: "power2.out"
    });
  };

  const handleMouseLeave = () => {
    if (!emailRef.current) return;
    gsap.to(emailRef.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("root@tomaskratochvil.com");
    setCopied(true);
    gsap.fromTo(".copy-feedback", 
      { opacity: 0, scale: 0.8, y: 10 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(2)" }
    );
    gsap.to(".copy-feedback", { opacity: 0, y: -10, duration: 0.3, delay: 2 });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section 
      ref={sectionRef} 
      id="contact" 
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-12 z-10 bg-transparent text-white overflow-hidden perspective-[1000px]"
    >
      
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-full relative z-10 parallax-content mt-10">
        
        {/* Header */}
        <div className="contact-reveal flex items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-12 opacity-50">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase"></span>
        </div>

        {/* Email (Main CTA) - Responsive Typography */}
        <div 
          className="contact-reveal relative cursor-pointer w-full max-w-full text-center group z-20 px-2"
          onClick={handleCopy} 
          onMouseMove={handleMouseMove} 
          onMouseLeave={handleMouseLeave} 
          ref={emailRef}
        >
          <div className="copy-feedback absolute left-1/2 -translate-x-1/2 -top-12 sm:-top-16 opacity-0 pointer-events-none z-30">
          <div className="px-4 sm:px-5 py-2 bg-white text-black font-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase rounded-none drop-shadow-2xl whitespace-nowrap">
              {t.copied}
            </div>
          </div>

          {/* 
            Responsive Email Typography:
            - Mobile: clamp(1.2rem, 6vw, 2rem) with break-all for word-break
            - Desktop: clamp(2rem, 5vw, 7rem) with normal break
          */}
          <h2 
            className="font-syne font-black leading-[1.1] tracking-tight text-white transition-all duration-200 group-hover:text-transparent group-hover:[-webkit-text-stroke:2px_white] text-[clamp(1.25rem,6vw,2.5rem)] sm:text-[clamp(2rem,5vw,4rem)] md:text-[clamp(2.5rem,4.5vw,7rem)] break-all sm:break-normal hyphens-auto sm:hyphens-none"
            lang="en"
          >
            root@tomaskratochvil.com
          </h2>
          
          {/* Click hint */}
          <span className="block mt-4 font-mono text-[9px] sm:text-[10px] tracking-[0.3em] text-white/30 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
            {t.clickHint}
          </span>
        </div>

        {/* Social Links - Responsive */}
        <div className="contact-reveal mt-12 sm:mt-16 md:mt-24 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 md:gap-20">
          {socials.map((social) => (
            <Link
              key={social.label} 
              href={social.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative overflow-hidden font-syne font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl uppercase tracking-tighter text-white/50 hover:text-white transition-colors"
            >
              {/* Text Roll Effect */}
              <span className="inline-block transition-transform duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-[120%]">
                {social.label}
              </span>
              <span className="absolute top-0 left-0 text-center w-full inline-block translate-y-[120%] transition-transform duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-0 text-white italic font-instrument font-light lowercase tracking-normal">
                {social.label}
              </span>
            </Link>
          ))}
        </div>

      </div>

      {/* Minimal Footer */}
      <footer className="absolute bottom-4 sm:bottom-6 w-full text-center pointer-events-none opacity-30 px-4">
         <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.3em] uppercase">
            © {new Date().getFullYear()} Tomáš Kratochvíl
         </span>
      </footer>
    </section>
  );
};
