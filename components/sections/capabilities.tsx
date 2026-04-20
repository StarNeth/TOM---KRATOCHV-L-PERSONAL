"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/navigation/language-toggle";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const DICTIONARY = {
  en: { title: "Architecture" },
  cs: { title: "Architektura" }
};

const skillsData = [
  { text: "SYSTEM ARCHITECTURE", type: "solid", desk: { x: 15, y: 20 } },
  { text: "NEXT.JS 16", type: "outline", desk: { x: 50, y: 15 } },
  { text: "REACT 19", type: "orange", desk: { x: 80, y: 25 } },
  { text: "WEBGL", type: "circle", desk: { x: 20, y: 50 } },
  { text: "UI/UX", type: "outline", desk: { x: 85, y: 55 } },
  { text: "PERFORMANCE", type: "solid", desk: { x: 15, y: 80 } },
  { text: "3D EXPERIENCES", type: "outline", desk: { x: 50, y: 85 } },
  { text: "GSAP", type: "orange", desk: { x: 80, y: 85 } }
];

export const Capabilities = () => {
  const { language } = useLanguage();
  const t = DICTIONARY[language as keyof typeof DICTIONARY];
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement[]>([]);
  const magneticRefs = useRef<HTMLDivElement[]>([]);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useGSAP(() => {
    if (!isMounted) return;

    // 1. NEUSTÁLÁ ORGANICKÁ LEVITACE
    nodesRef.current.forEach((node, i) => {
      if (!node) return;
      gsap.to(node, {
        y: `+=${isMobile ? (Math.random() * 10 - 5) : (Math.random() * 40 - 20)}`, 
        x: `+=${isMobile ? (Math.random() * 8 - 4) : (Math.random() * 30 - 15)}`, 
        rotation: `+=${isMobile ? 0 : (Math.random() * 10 - 5)}`,
        duration: Math.random() * 3 + 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * -0.7,
      });
    });

    const titleEl = sectionRef.current?.querySelector('.cap-title');
    if (titleEl) {
      gsap.fromTo(titleEl, 
        { opacity: 0, scale: 0.9, filter: "blur(10px)" }, 
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.5, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 70%" } }
      );
    }
  }, { scope: sectionRef, dependencies: [isMounted, isMobile] });

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (isMobile) return; 
    const el = nodesRef.current[index];
    const magneticEl = magneticRefs.current[index];
    if (!el || !magneticEl) return;
    
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
    
    gsap.to(magneticEl, { x, y, scale: 1.05, duration: 0.5, ease: "power2.out", overwrite: "auto" });
  };

  const handleMouseLeave = (index: number) => {
    const magneticEl = magneticRefs.current[index];
    if (magneticEl) gsap.to(magneticEl, { x: 0, y: 0, scale: 1, duration: 0.9, ease: "elastic.out(1, 0.3)", overwrite: "auto" });
  };

  // 3. SHOCKWAVE KLIK - OPRAVENO: Použití onPointerDown pro sjednocení událostí
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    // Release capture zajišťuje, že prvek nebude "držet" event, pokud uživatel posune prst pryč
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    const magneticEl = magneticRefs.current[index];
    if (!magneticEl) return;

    gsap.fromTo(magneticEl, 
      { scale: 0.8 }, 
      { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.3)", overwrite: "auto" }
    );

    window.dispatchEvent(new CustomEvent("webgl-shoot", { detail: { x: e.clientX, y: e.clientY } }));
  };

  if (!isMounted) return <section className="min-h-[100svh] bg-transparent" />;

  return (
    <section ref={sectionRef} id="capabilities" className="relative w-full min-h-[100svh] z-10 flex flex-col items-center justify-center overflow-hidden py-24 md:py-0">
      
      <div className="cap-title relative md:absolute md:inset-0 flex items-center justify-center pointer-events-none z-10 px-4 mb-12 md:mb-0">
        <h2 className="font-syne font-black text-[clamp(3.5rem,12vw,10rem)] uppercase tracking-tighter leading-none text-white/50 md:text-white/10 mix-blend-normal">
          {t.title}
        </h2>
      </div>

      <div ref={containerRef} className="relative md:absolute md:inset-0 w-full md:h-full z-20 pointer-events-none max-w-[1600px] mx-auto flex flex-wrap content-center justify-center gap-3 px-4 md:px-0 md:block">
        
        {skillsData.map((skill, i) => {
          let baseClasses = "flex items-center justify-center transition-shadow duration-500 will-change-transform shadow-2xl ";
          let textClasses = "font-syne font-black tracking-widest uppercase pointer-events-none select-none "; // Přidáno select-none
          
          if (skill.type === "solid") {
            baseClasses += "bg-white text-black px-5 py-3 md:px-10 md:py-6 rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]";
            textClasses += "text-[10px] md:text-xs";
          } else if (skill.type === "outline") {
            baseClasses += "bg-transparent border border-white/20 text-white px-5 py-3 md:px-10 md:py-6 rounded-full backdrop-blur-md hover:border-white hover:bg-white/5";
            textClasses += "text-[10px] md:text-xs";
          } else if (skill.type === "orange") {
            baseClasses += "bg-[#ff2a00] text-white px-5 py-3 md:px-10 md:py-6 rounded-2xl hover:bg-white hover:text-[#ff2a00] hover:shadow-[0_0_30px_rgba(255,42,0,0.5)]";
            textClasses += "text-[10px] md:text-xs";
          } else if (skill.type === "circle") {
            baseClasses += "bg-[#030303]/80 border border-white/10 text-white w-20 h-20 md:w-32 md:h-32 rounded-full backdrop-blur-md hover:border-[#ff2a00]";
            textClasses += "text-[9px] md:text-[10px] text-center leading-tight";
          }

          return (
            <div
              key={i}
              ref={(el) => { nodesRef.current[i] = el!; }}
              className="relative md:absolute pointer-events-auto touch-none" // Přidáno touch-none pro zamezení mobilních gest překážejících kliknutí
              style={!isMobile ? {
                left: `${skill.desk.x}%`,
                top: `${skill.desk.y}%`,
                transform: "translate(-50%, -50%)"
              } : {}}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
              onPointerDown={(e) => handlePointerDown(e, i)} // ZDE JE OPRAVA (onPointerDown)
            >
              <div ref={(el) => { magneticRefs.current[i] = el!; }} className={baseClasses}>
                <span className={textClasses}>{skill.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};