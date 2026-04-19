"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/navigation/language-toggle";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const DICTIONARY = {
  en: {
    sectionLabel: "02 // Selected Work",
    titlePart1: "Proven",
    titlePart2: "Systems.",
    projects: [
      { id: "01", title: "ShuXiangLou", role: "Interactive Web", image: "/shu-xien-glou.vercel.app_.webp", brandColor: "#050505", slug: "ShuXiangLou", actionText: "Explore Project" },
      { id: "02", title: "Kings Barber", role: "Digital Presentation", image: "/kingsbarber-silk.vercel.app_.webp", brandColor: "#0a0a0a", slug: "kings-barber", actionText: "Explore Project" },
      { id: "03", title: "Project Aion", role: "SaaS R&D", image: "/placeholder.jpg", brandColor: "#111111", slug: "aion", actionText: "View Details" },
    ]
  },
  cs: {
    sectionLabel: "02 // Vybraná Práce",
    titlePart1: "Ověřené",
    titlePart2: "Systémy.",
    projects: [
      { id: "01", title: "ShuXiangLou", role: "Interaktivní Web", image: "/shu-xien-glou.vercel.app_.webp", brandColor: "#050505", slug: "ShuXiangLou", actionText: "Prozkoumat Projekt" },
      { id: "02", title: "Kings Barber", role: "Digitální Prezentace", image: "/kingsbarber-silk.vercel.app_.webp", brandColor: "#0a0a0a", slug: "kings-barber", actionText: "Prozkoumat Projekt" },
      { id: "03", title: "Project Aion", role: "SaaS Architektura", image: "/placeholder.jpg", brandColor: "#111111", slug: "aion", actionText: "Zobrazit Detaily" },
    ]
  }
};

export const Projects = () => {
  const { language } = useLanguage();
  const t = DICTIONARY[language];
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const track = trackRef.current;
      if (!track) return;
      
      // OPTIMALIZACE FORCED REFLOW: Vypočítáme jen při resize, ne při každém ticku
      let scrollAmount = 0;
      const calculateScroll = () => {
        scrollAmount = track.scrollWidth - window.innerWidth;
      };
      calculateScroll();
      window.addEventListener("resize", calculateScroll);
      
      gsap.to(track, {
        x: () => -scrollAmount,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${scrollAmount}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true 
        }
      });

      return () => window.removeEventListener("resize", calculateScroll);
    }, sectionRef);
    return () => ctx.revert();
  },[]);

  return (
    <section ref={sectionRef} id="work" className="relative w-full h-[100svh] bg-transparent overflow-hidden">
      <div ref={trackRef} className="flex h-full items-center px-[5vw] md:px-[10vw] gap-[8vw] md:gap-[15vw] will-change-transform py-20">
        
        <div className="flex-shrink-0 w-[90vw] md:w-[55vw] pl-4 md:pl-0 max-w-[100vw]">
          <span className="font-mono text-[10px] tracking-[0.5em] text-white/40 uppercase block mb-6">{t.sectionLabel}</span>
          <h2 className="font-syne font-black text-[clamp(2.5rem,10vw,5rem)] md:text-[clamp(5rem,10vw,10rem)] uppercase tracking-tighter leading-[0.9] text-white whitespace-pre-wrap">
            {t.titlePart1} <br /> 
            <span className="font-instrument italic font-light lowercase">
              {t.titlePart2}
            </span>
          </h2>
        </div>

        {t.projects.map((p, index) => (
          <Link 
            key={p.id} 
            href={`/work/${p.slug}`} 
            aria-label={`View case study for ${p.title}`}
            // OPTIMALIZACE CLS: Odstraněno h-[60svh], přidáno aspect-[3/4] pro stabilní render kontejneru
            className="group relative w-[85vw] md:w-[50vw] aspect-[3/4] md:aspect-[4/3] flex-shrink-0 cursor-pointer block"
          >
            <div className="absolute -top-8 md:-top-12 left-0 z-20 mix-blend-difference pointer-events-none transition-transform duration-700 group-hover:-translate-y-4">
              <h3 className="font-syne font-black text-3xl sm:text-5xl md:text-8xl lg:text-9xl uppercase tracking-tighter text-white opacity-80 group-hover:opacity-100 transition-opacity break-words max-w-[85vw]">
                {p.title}
              </h3>
            </div>
            
            <div className="relative w-full h-full overflow-hidden rounded-[2rem] border border-white/10" style={{ backgroundColor: p.brandColor }}>
              <Image 
                src={p.image}
                alt={`Screenshot of ${p.title}`}
                fill
                sizes="(max-width: 768px) 85vw, 50vw"
                className="object-cover object-top transition-all duration-[10s] ease-linear group-hover:object-bottom"
                priority={index === 0} 
              />
              
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/10 transition-colors duration-700 z-10" />
              <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 right-6 md:right-8 z-20 flex justify-between items-end transform transition-transform duration-700 group-hover:translate-y-[-5px]">
              <div className="flex flex-col">
                  <span className="font-mono text-[9px] md:text-[10px] tracking-widest uppercase text-white/60 mb-2">{p.id} // {p.role}</span>
                  <span className="font-instrument italic text-lg md:text-xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    {p.actionText}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};