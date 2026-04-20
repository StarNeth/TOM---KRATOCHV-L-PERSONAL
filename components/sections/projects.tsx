"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/navigation/language-toggle";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const DICTIONARY = {
  en: { titlePart1: "Digital", titlePart2: "Architectures." },
  cs: { titlePart1: "Digitální", titlePart2: "Architektury." }
};

const projects = [
  { id: "01", title: "ShuXiangLou", image: "/shu-xien-glou.vercel.app_.webp", slug: "shuxianglou" },
  { id: "02", title: "Kings Barber", image: "/kingsbarber-silk.vercel.app_.webp", slug: "kings-barber" },
];

export const Projects = () => {
  const { language } = useLanguage();
  const t = DICTIONARY[language];
  
  const containerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const track = trackRef.current;
    if (!track) return;

    let scrollAmount = track.scrollWidth - window.innerWidth;
    
    gsap.to(track, {
      x: () => -scrollAmount,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: () => `+=${scrollAmount}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (window.innerWidth > 768) {
            const velocity = self.getVelocity() / 400; 
            const clamped = Math.min(Math.max(velocity, -5), 5); 
            
            gsap.to(".project-card", {
              rotationY: -clamped * 1.5,
              skewX: clamped * 0.5,      
              z: Math.abs(clamped) * -20, 
              duration: 0.5,
              ease: "power2.out",
              overwrite: "auto"
            });
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("webgl-speed-boost", { 
              detail: { speed: Math.abs(self.getVelocity()) / 1000 } 
            }));
          }
        }
      }
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="work" className="relative w-full h-[100vh] bg-transparent perspective-[2000px] overflow-hidden">
      <div ref={trackRef} className="flex h-full items-center px-[5vw] md:px-[10vw] gap-[10vw] md:gap-[15vw] will-change-transform pr-[20vw] z-10 transform-style-3d">
        
        <div className="flex-shrink-0 w-[90vw] md:w-[45vw] relative z-20 pointer-events-none transform-gpu">
          <span className="font-mono text-[10px] tracking-[0.5em] text-white/50 uppercase block mb-6"></span>
          <h2 className="font-syne font-black text-[clamp(4rem,10vw,10rem)] uppercase tracking-tighter leading-[0.85] text-white whitespace-pre-wrap drop-shadow-2xl">
            {t.titlePart1} <br /> 
            <span className="font-instrument italic font-light lowercase text-white/70">
              {t.titlePart2}
            </span>
          </h2>
        </div>

        {projects.map((p, index) => (
          <div key={p.id} className="relative w-[85vw] md:w-[55vw] aspect-[3/4] md:aspect-[16/10] flex-shrink-0 group project-card transform-gpu will-change-transform z-50">
            
            <div className="absolute -top-12 -left-6 z-0 pointer-events-none opacity-20 hidden md:block transform-gpu -translate-z-20">
              <span className="font-mono text-[10px] tracking-[0.5em] text-white uppercase"></span>
            </div>

            <Link 
              href={`/work/${p.slug}`} 
              draggable={false}
              aria-label={`View case study for ${p.title}`}
              className="relative block w-full h-full rounded-xl md:rounded-[2rem] overflow-hidden border border-white/10 bg-[#050505] shadow-[0_30px_60px_rgba(0,0,0,0.8)] pointer-events-auto cursor-pointer"
            >
              <Image 
                src={p.image}
                alt={`Screenshot of ${p.title}`}
                fill
                draggable={false}
                sizes="(max-width: 768px) 85vw, 60vw"
                className="object-cover object-top opacity-70 group-hover:opacity-100 transition-all duration-700 ease-out group-hover:scale-105 select-none"
                priority={index === 0} 
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/10 to-transparent opacity-90 pointer-events-none" />
              
              <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 z-20 pointer-events-none">
                <h3 className="font-syne font-black text-4xl md:text-6xl uppercase tracking-tighter leading-none text-white transition-transform duration-500 group-hover:translate-x-2">
                  {p.title}
                </h3>
              </div>

              <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-20 pointer-events-none">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md group-hover:bg-white transition-all duration-500">
                  <svg 
                    width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                    className="text-white group-hover:text-black transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
                  >
                    <path d="M1 13L13 1M13 1H4.6M13 1V9.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .transform-style-3d { transform-style: preserve-3d; }
        .-translate-z-20 { transform: translateZ(-50px); }
      `}} />
    </section>
  );
};