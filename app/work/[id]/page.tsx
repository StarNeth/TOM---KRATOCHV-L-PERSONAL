"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { WebGLScene } from "@/components/webgl/scene";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// Lokální databáze obohacená o VŠECHNY tvé projekty
const getProjectData = (slug: string) => {
  const normalizedSlug = slug.toLowerCase();
  
  if (normalizedSlug === "shu-xien-lou" || normalizedSlug === "shuxianglou") {
    return {
      title: "SHU-XIEN-LOU",
      brandColor: "transparent", 
      textColor: "#FFFFFF",
      role: "System Architecture // WebGL UI",
      challenge: "Převést statickou prezentaci tradiční restaurace na hardwarově akcelerovaný digitální zážitek. Cílem bylo absolutně plynulé rozhraní bez kompromisů v rychlosti načítání – design, který dýchá, ale na který se nečeká.",
      approach: "Aplikoval jsem svůj inženýrský přístup. Jádro běží na Next.js 16, zatímco fyziku pohybu a 3D částicové efekty řídí fúze GSAP a React Three Fiber. Celé uživatelské rozhraní stojí na bezbariérových Radix komponentách pro zajištění maximální stability.",
      techStack: ["Next.js", "React", "Three.js / WebGL", "GSAP", "Lenis", "Tailwind CSS"],
      image: "/shu-xien-glou.vercel.app_.webp",
      liveUrl: "https://www.shuxianglou.cz/" 
    };
  }
  
  if (slug === "kings-barber") {
    return {
      title: "KINGS BARBER",
      brandColor: "transparent", 
      textColor: "#FFFFFF",
      role: "UI Engineering // Frontend",
      challenge: "Navrhnout nekompromisní digitální identitu pro prémiový barbershop. Systém musel vizuálně vyzařovat luxus a maskulinitu, ale technicky fungovat bleskově i na slabších mobilních sítích.",
      approach: "Vytvořil jsem temný, vysoce kontrastní design systém s důrazem na mikrointerakce. Brutální optimalizace LCP (Largest Contentful Paint) zajistila okamžité načtení velkých fotek, zatímco GSAP hladce diriguje tok obsahu.",
      techStack: ["Next.js", "React", "GSAP", "Tailwind CSS", "Framer Motion"],
      image: "/kingsbarber-silk.vercel.app_.webp", 
      liveUrl: "https://kingsbarber-silk.vercel.app" 
    };
  }

  // Default fallback (Aion)
  return {
    title: "PROJECT AION",
    brandColor: "transparent", 
    textColor: "#ffffff",
    role: "System Architect // R&D",
    challenge: "Architektura a kompletní vývoj masivní SaaS platformy od nuly. Cílem bylo postavit škálovatelný systém s hlubokou integrací 3D prostředí a kinematických animací.",
    approach: "Místo tradičního ručního psaní kódu jsem využil pokročilou AI orchestraci pro rapidní iteraci frontend architektury. Výsledkem je extrémně rychlý vývojový cyklus doručující absolutní stabilitu a čistý kód.",
    techStack: ["Next.js", "React", "Three.js", "AI Orchestration", "Node.js"],
    image: "/placeholder.jpg", 
    liveUrl: "#" 
  };
};

export default function ProjectDetail() {
  const params = useParams();
  const slug = params.id as string;
  const project = getProjectData(slug);
  
  const containerRef = useRef<HTMLDivElement>(null);

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
      <WebGLScene />

      {/* --- TOP NAVIGACE --- */}
      <nav className="fixed top-0 left-0 w-full p-6 md:p-12 z-[100] mix-blend-difference pointer-events-none flex justify-between items-center">
        {/* ZMĚNĚNO: Vrácen <Link>. Hard-reload ničil výkon WebGL a dělal záseky. Next.js router to zvládne plynule. */}
        <Link href="/" className="font-syne font-bold text-xl pointer-events-auto hover:opacity-70 transition-opacity flex items-center gap-2 text-white">
            ← <span className="uppercase text-sm tracking-widest mt-1 font-mono">Archive</span>
        </Link>
      </nav>

      {/* --- HERO SEKCE --- */}
      <section className="relative z-10 w-full min-h-[60vh] flex flex-col justify-end items-start px-6 md:px-12 lg:px-24 pb-20 pt-32 perspective-[1000px]">
        <div className="overflow-hidden w-full">
          <h1 className="hero-title font-syne font-black text-5xl md:text-[8vw] leading-[0.85] tracking-tighter uppercase text-white mix-blend-difference transform-gpu">
            {project.title}
          </h1>
        </div>
      </section>

      {/* --- OBSAHOVÁ ČÁST --- */}
      <section className="relative z-10 w-full pb-48" style={{ color: project.textColor }}>
        <div className="h-12 md:h-24 w-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-6 md:px-12 lg:px-24 max-w-[1800px] mx-auto relative">
          
          {/* LEVÝ SLOUPEC: EDITORIAL INFO & TECH STACK */}
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

              {/* LIVE BUTTON */}
              {project.liveUrl !== "#" && (
                <div className="border-t border-white/20 pt-8 reveal-item">
                  <a 
                    href={project.liveUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="group relative w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full overflow-hidden"
                  >
                    <span className="relative z-10 font-syne font-bold uppercase tracking-widest text-xs">Launch Live Project</span>
                    <span className="relative z-10 font-mono text-sm transform transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                    <div className="absolute inset-0 bg-[#e0e0e0] transform scale-y-0 origin-bottom transition-transform duration-300 group-hover:scale-y-100" />
                  </a>
                </div>
              )}

            </div>
          </div>

          {/* PRAVÝ SLOUPEC: BROWSER MOCKUP */}
          <div className="col-span-1 lg:col-span-8 pt-12 lg:pt-0">
            <div className="w-full rounded-[1.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] bg-[#050505] border border-white/10 flex flex-col">
              
            <div className="w-full h-12 border-b border-white/10 flex items-center px-6 gap-3 bg-[#111111]/90 backdrop-blur-md sticky top-0 z-20">
                 {/* ZMĚNĚNO: Použit <a> tag a href nastaven na "/" pro konzistentní hard-reload */}
                 <a href="/" className="group relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#ff2a00] rounded-full animate-ping opacity-60 group-hover:animate-none" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff2a00] shadow-[0_0_12px_rgba(255,42,0,0.8)] transition-transform duration-300 group-hover:scale-110" />
                 </a>
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
              </div>
              
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