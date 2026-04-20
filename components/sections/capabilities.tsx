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

// Vyladěné pozice tak, aby pokryly celou obrazovku a nepřekrývaly se s nadpisem uprostřed
const skillsData = [
  { text: "SYSTEM ARCHITECTURE", type: "solid", desk: { x: 15, y: 20 }, mob: { x: 50, y: 15 } },
  { text: "NEXT.JS 16", type: "outline", desk: { x: 50, y: 15 }, mob: { x: 20, y: 30 } },
  { text: "REACT 19", type: "orange", desk: { x: 80, y: 25 }, mob: { x: 80, y: 40 } },
  { text: "WEBGL", type: "circle", desk: { x: 20, y: 50 }, mob: { x: 25, y: 60 } },
  { text: "UI/UX", type: "outline", desk: { x: 85, y: 55 }, mob: { x: 85, y: 70 } },
  { text: "PERFORMANCE", type: "solid", desk: { x: 15, y: 80 }, mob: { x: 50, y: 85 } },
  { text: "3D EXPERIENCES", type: "outline", desk: { x: 50, y: 85 }, mob: { x: 20, y: 10 } },
  { text: "GSAP", type: "orange", desk: { x: 80, y: 85 }, mob: { x: 80, y: 20 } }
];

export const Capabilities = () => {
  const { language } = useLanguage();
  const t = DICTIONARY[language];
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
        y: `+=${Math.random() * 40 - 20}`, 
        x: `+=${Math.random() * 30 - 15}`, 
        rotation: `+=${Math.random() * 10 - 5}`,
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
  }, { scope: sectionRef, dependencies: [isMounted] });

  // 2. MAGNETICKÝ HOVER (Pouze Desktop)
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

  // 3. SHOCKWAVE KLIK
  const handleClick = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    const magneticEl = magneticRefs.current[index];
    if (!magneticEl) return;

    gsap.fromTo(magneticEl, 
      { scale: 0.8 }, 
      { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.3)", overwrite: "auto" }
    );

    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
    window.dispatchEvent(new CustomEvent("webgl-shoot", { detail: { x: clientX, y: clientY } }));
  };

  // Zabránění Hydration Mismatch (Neskáčou prvky po načtení)
  if (!isMounted) return <section className="min-h-[100svh] bg-transparent" />;

  return (
    <section ref={sectionRef} id="capabilities" className="relative w-full min-h-[110svh] z-10 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Obrovský čistý nadpis ukotvený ve středu */}
      <div className="cap-title absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
        <h2 className="font-syne font-black text-[clamp(3.5rem,12vw,10rem)] uppercase tracking-tighter leading-none text-white/5 md:text-white/10 mix-blend-overlay md:mix-blend-normal">
          {t.title}
        </h2>
      </div>

      {/* Kontejner dovedností */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-20 pointer-events-none max-w-[1600px] mx-auto">
        {skillsData.map((skill, i) => {
          const pos = isMobile ? skill.mob : skill.desk;
          
          let baseClasses = "relative flex items-center justify-center transition-shadow duration-500 will-change-transform shadow-2xl ";
          let textClasses = "font-syne font-black tracking-widest uppercase pointer-events-none ";
          
          if (skill.type === "solid") {
            baseClasses += "bg-white text-black px-6 py-4 md:px-10 md:py-6 rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]";
            textClasses += "text-[10px] md:text-xs";
          } else if (skill.type === "outline") {
            baseClasses += "bg-transparent border border-white/20 text-white px-6 py-4 md:px-10 md:py-6 rounded-full backdrop-blur-md hover:border-white hover:bg-white/5";
            textClasses += "text-[10px] md:text-xs";
          } else if (skill.type === "orange") {
            baseClasses += "bg-[#ff2a00] text-white px-6 py-4 md:px-10 md:py-6 rounded-sm md:rounded-2xl hover:bg-white hover:text-[#ff2a00] hover:shadow-[0_0_30px_rgba(255,42,0,0.5)]";
            textClasses += "text-[10px] md:text-xs";
          } else if (skill.type === "circle") {
            baseClasses += "bg-[#030303]/80 border border-white/10 text-white w-24 h-24 md:w-32 md:h-32 rounded-full backdrop-blur-md hover:border-[#ff2a00]";
            textClasses += "text-[9px] md:text-[10px] text-center leading-tight";
          }

          return (
            <div
              key={i}
              ref={(el) => { nodesRef.current[i] = el!; }}
              className="absolute pointer-events-auto"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)"
              }}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
              onMouseDown={(e) => handleClick(e, i)}
              onTouchStart={(e) => handleClick(e, i)}
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