"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

const socials = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/tomas-kratochvil/" },
  { label: "GitHub", href: "https://github.com/StarNeth/" },
  { label: "Phone", href: "tel:+420602193021" },
];

export const Contact = () => {
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
    if (!emailRef.current) return;
    const rect = emailRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    gsap.to(emailRef.current, {
      x: x * 0.15, y: y * 0.15, duration: 0.2, ease: "power2.out"
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
    <section ref={sectionRef} id="contact" className="relative min-h-screen flex flex-col items-center justify-center px-4 md:px-12 z-10 bg-transparent text-white overflow-hidden perspective-[1000px]">
      
      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 parallax-content mt-10">
        
        {/* ZÁHLAVÍ */}
        <div className="contact-reveal flex items-center justify-center gap-6 mb-12 opacity-50">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase">04</span>
          <div className="w-12 md:w-24 h-[1px] bg-white/30" />
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase">Initiate Sequence</span>
        </div>

        {/* E-MAIL (HLAVNÍ BOD) */}
        <div 
          className="contact-reveal relative cursor-pointer w-full text-center group z-20"
          onClick={handleCopy} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} ref={emailRef}
        >
          <div className="copy-feedback absolute left-1/2 -translate-x-1/2 -top-16 opacity-0 pointer-events-none z-30">
            <div className="px-5 py-2 bg-white text-black font-mono text-xs tracking-[0.2em] uppercase rounded-none drop-shadow-2xl">
              [ Copied to clipboard ]
            </div>
          </div>

          <h2 className="font-syne font-black text-[clamp(1.5rem,4vw,7rem)] leading-[1] tracking-tight text-white transition-all duration-200 group-hover:text-transparent group-hover:[-webkit-text-stroke:2px_white] break-all md:break-normal px-4">
          root@tomaskratochvil.com
          </h2>
        </div>

        {/* CENTROVANÉ SOCIAL ODKAZY (Zcela nový SOTY element) */}
        <div className="contact-reveal mt-16 md:mt-24 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
          {socials.map((social) => (
            <Link
              key={social.label} 
              href={social.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative overflow-hidden font-syne font-bold text-2xl md:text-3xl lg:text-4xl uppercase tracking-tighter text-white/50 hover:text-white transition-colors"
            >
              {/* Luxusní Text Roll Effect */}
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

      {/* MINIMALISTICKÝ COPYRIGHT DOLE */}
      <footer className="absolute bottom-6 w-full text-center pointer-events-none opacity-30">
         <span className="font-mono text-[10px] tracking-[0.3em] uppercase">
            © {new Date().getFullYear()} Tomáš Kratochvíl
         </span>
      </footer>
    </section>
  );
};