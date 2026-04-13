"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useLanguage } from "@/components/navigation/language-toggle";
import { WebGLScene } from "@/components/webgl/scene"; 
import { Grain } from "@/components/ui/grain";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// Lokální databáze obohacená o TECH STACK z tvého package.json
const getProjectData = (slug: string) => {
  if (slug === "shu-xien-lou") {
    return {
      title: "SHU-XIEN-LOU",
      brandColor: "transparent", 
      textColor: "#FFFFFF",
      role: "System Architecture // WebGL UI",
      challenge: "Transformovat statickou prezentaci tradiční restaurace do hardwarově akcelerovaného digitálního zážitku. Cílem bylo absolutně plynulé rozhraní bez kompromisů v rychlosti načítání.",
      approach: "Aplikovali jsme inženýrskou 'Zero-error' metodiku. Architektura je postavena na Next.js 16 s Turbopackem. Pro fyziku pohybu jsme propojili GSAP s Lenis smooth scrollem. Prostorová hloubka a částicové efekty jsou řízeny přes React Three Fiber (WebGL), zatímco UI komponenty využívají bezbariérové Radix primitiva.",
      techStack: ["Next.js 16", "React 19", "Three.js / WebGL", "GSAP 3", "Lenis", "Radix UI", "Tailwind 4"],
      image: "/shu-xien-glou.vercel.app_.png" 
    };
  }
  // Default fallback
  return {
    title: "PROJECT AION",
    brandColor: "transparent", 
    textColor: "#ffffff",
    role: "System Architect // R&D",
    challenge: "Od nuly postavit komplexní SaaS platformu, která integruje umělou inteligenci do procesu vývoje a testování.",
    approach: "Místo manuálního psaní kódu jsme využili precizní prompt engineering k budování frontend architektury.",
    techStack: ["React", "AI Prompting", "Node.js", "Security"],
    image: "/shu-xien-glou.vercel.app_.png" 
  };
};

export default function ProjectDetail() {
  const params = useParams();
  const slug = params.id as string;
  const project = getProjectData(slug);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    document.body.style.overflowX = "hidden";

    const ctx = gsap.context(() => {
      // Opona (Page Transition)
      gsap.fromTo(".page-transition-overlay", 
        { scaleY: 1 }, 
        { scaleY: 0, transformOrigin: "top", duration: 1.2, ease: "expo.inOut" }
      );

      // Extrémní vstupní animace nadpisu
      gsap.fromTo(".hero-title", 
        { y: 150, opacity: 0, rotateX: 20 }, 
        { y: 0, opacity: 1, rotateX: 0, duration: 1.5, ease: "power4.out", delay: 0.5 }
      );

      // Odhalení textů při scrollu
      gsap.utils.toArray(".reveal-item").forEach((el: any) => {
        gsap.fromTo(el,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } }
        );
      });

      // Stagger animace pro Tech Stack pilulky
      gsap.fromTo(".tech-pill",
        { y: 20, opacity: 0 },
        { 
          y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "back.out(1.5)",
          scrollTrigger: { trigger: ".tech-container", start: "top 85%" }
        }
      );
    }, containerRef);

    return () => {
      ctx.revert();
      document.body.style.overflowX = "auto";
    };
  }, []);

  return (
    <main ref={containerRef} className="relative w-full bg-[#030303] text-white min-h-screen selection:bg-white selection:text-black">
      
      {/* Fake Page Transition Overlay */}
      <div className="page-transition-overlay fixed inset-0 z-[200] bg-[#050505] pointer-events-none" />

      {/* [SOTY] GRAIN KOMPONENTA */}
      <Grain />
      
      {/* [SOTY] WEBGL SCENE (Tvé Obsidian fluid pozadí) */}
      <WebGLScene />

      {/* --- TOP NAVIGACE (Včetně Language Toggleru) --- */}
      <nav className="fixed top-0 left-0 w-full p-6 md:p-12 z-[100] mix-blend-difference pointer-events-none flex justify-between items-center">
        {/* Back Button */}
        <Link href="/#work" className="font-syne font-bold text-xl pointer-events-auto hover:opacity-70 transition-opacity flex items-center gap-2 text-white">
           ← <span className="uppercase text-sm tracking-widest mt-1 font-mono">Archive</span>
        </Link>
        
        {/* Language Toggler (Minimalistický SOTY design) */}
        <div className="pointer-events-auto flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase">
        <button 
            onClick={() => setLanguage("cs")} 
            className={`transition-all duration-300 ${language === "cs" ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" : "text-white/30 hover:text-white/70"}`}
          >
            CZ
          </button>
          <span className="text-white/20">//</span>
          <button 
            onClick={() => setLanguage("en")} 
            className={`transition-all duration-300 ${language === "en" ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" : "text-white/30 hover:text-white/70"}`}
          >
            EN
          </button>
        </div>
      </nav>

      {/* --- HERO SEKCE --- */}
      <section className="relative z-10 w-full min-h-[60vh] flex flex-col justify-end items-start px-6 md:px-12 lg:px-24 pb-20 pt-32 perspective-[1000px]">
        <div className="overflow-hidden w-full">
          <h1 className="hero-title font-syne font-black text-5xl md:text-[8vw] leading-[0.85] tracking-tighter uppercase text-white mix-blend-difference transform-gpu">
            {project.title}
          </h1>
        </div>
      </section>

      {/* --- OBSAHOVÁ ČÁST (SCROLL AREA) --- */}
      {/* Zrušen marginTop, background transparent kvůli WebGL pozadí */}
      <section className="relative z-10 w-full pb-48" style={{ color: project.textColor }}>
        <div className="h-12 md:h-24 w-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-6 md:px-12 lg:px-24 max-w-[1800px] mx-auto relative">
          
          {/* LEVÝ SLOUPEC: EDITORIAL INFO & TECH STACK (Sticky chování) */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-12 lg:pr-12 relative">
            <div className="flex flex-col gap-12 lg:sticky lg:top-32 bg-[#030303]/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-2xl">
              
              <div className="border-t border-white/20 pt-4 reveal-item">
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#ffffff] block mb-2">01 / Scope</span>
                <span className="font-sans text-sm md:text-base font-bold tracking-widest uppercase">{project.role}</span>
              </div>

              <div className="border-t border-white/20 pt-4 reveal-item">
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-50 block mb-6">02 / Challenge</span>
                <p className="font-sans text-base leading-relaxed opacity-90">
                  {project.challenge}
                </p>
              </div>

              <div className="border-t border-white/20 pt-4 reveal-item">
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-50 block mb-6">03 / Architecture</span>
                <p className="font-sans text-base leading-relaxed opacity-90">
                  {project.approach}
                </p>
              </div>

              {/* TECH STACK */}
              <div className="border-t border-white/20 pt-4 tech-container">
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-50 block mb-6">04 / Technologies</span>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span key={tech} className="tech-pill px-3 py-1.5 border border-white/20 rounded-full font-mono text-[9px] tracking-widest uppercase text-white/80 bg-white/5 backdrop-blur-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* PRAVÝ SLOUPEC: BROWSER MOCKUP (Full Scroll) */}
          {/* Už žádný malý kontejner. Je vysoký přesně podle obrázku. Scroluješ jím přirozeně. */}
          <div className="col-span-1 lg:col-span-8 pt-12 lg:pt-0">
            <div className="w-full rounded-[1.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] bg-[#050505] border border-white/10 flex flex-col">
              
              {/* macOS Header - Obsahuje funkční CLOSE tlačítko */}
              <div className="w-full h-12 border-b border-white/10 flex items-center px-6 gap-3 bg-[#111111]/90 backdrop-blur-md sticky top-0 z-20">
                 {/* ČERVENÉ TLAČÍTKO (Pulzující zavírač) */}
                 <Link href="/#work" className="group relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#ff2a00] rounded-full animate-ping opacity-60 group-hover:animate-none" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff2a00] shadow-[0_0_12px_rgba(255,42,0,0.8)] transition-transform duration-300 group-hover:scale-110" />
                 </Link>
                 {/* Žluté a zelené dekorativní tečky */}
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
              </div>
              
              {/* Samotná nekonečná fotka (Žádné overflow-y-auto, bere plnou výšku dokumentu) */}
              <div className="w-full relative">
                <img 
                  src={project.image} 
                  alt={`${project.title} Interface`} 
                  className="w-full h-auto object-cover block"
                />
              </div>
              
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}