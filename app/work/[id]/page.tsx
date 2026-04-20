"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import Image from "next/image";
import { WebGLScene } from "@/components/webgl/scene";
import { useLanguage } from "@/components/navigation/language-toggle";

const PROJECT_ORDER = ["shuxianglou", "kings-barber"];

const DICTIONARY = {
  en: {
    return: "Return",
    roleLabel: "Role",
    liveSite: "Live Project",
    nextProject: "Next Project",
    projects: {
      "shuxianglou": {
        title: "Shu Xiang Lou",
        role: "Interactive Web Experience",
        description: "A new authentic restaurant in the heart of Třebíč. They serve over 200 dishes and cook absolutely amazingly. We rejected boring templates and created a site that reflects their unique atmosphere.",
        techStack: ["Next.js 16", "React Three Fiber", "GSAP", "Tailwind"],
        image: "/shu-xien-glou.vercel.app_.webp",
        liveUrl: "https://www.shuxianglou.cz/",
        zone: 2
      },
      "kings-barber": {
        title: "Kings Barber",
        role: "Digital Identity & Frontend",
        description: "An African barbershop in the center of Třebíč. This place has an absolutely special vibe, mostly thanks to the amazing owner originally from Nigeria. We built the site to transfer exactly this energy into the digital world.",
        techStack: ["Next.js 16", "React 19", "GSAP Timeline"],
        image: "/kingsbarber-silk.vercel.app_.webp",
        liveUrl: "https://kingsbarber-silk.vercel.app",
        zone: 3
      }
    }
  },
  cs: {
    return: "Návrat",
    roleLabel: "Role",
    liveSite: "Živá Stránka",
    nextProject: "Další Projekt",
    projects: {
      "shuxianglou": {
        title: "Shu Xiang Lou",
        role: "Interaktivní Web",
        description: "Nová autentická restaurace v srdci Třebíče. Mají tu přes 200 jídel a vaří naprosto úžasně. Odmítli jsme nudné šablony a vytvořili pro ně web, který odráží jejich jedinečnou atmosféru.",
        techStack: ["Next.js 16", "React Three Fiber", "GSAP", "Tailwind"],
        image: "/shu-xien-glou.vercel.app_.webp",
        liveUrl: "https://www.shuxianglou.cz/",
        zone: 2
      },
      "kings-barber": {
        title: "Kings Barber",
        role: "Digitální Identita & Frontend",
        description: "Africký barbershop v centru Třebíče. Tento podnik má naprosto speciální vibe, hlavně díky úžasnému majiteli původem z Nigérie. Web jsme postavili tak, aby přesně tuhle energii přenesl do digitálu.",
        techStack: ["Next.js 16", "React 19", "GSAP Timeline"],
        image: "/kingsbarber-silk.vercel.app_.webp",
        liveUrl: "https://kingsbarber-silk.vercel.app",
        zone: 3
      }
    }
  }
};

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;
  const { language } = useLanguage();
  
  const t = DICTIONARY[language as keyof typeof DICTIONARY];
  const project = t.projects[slug as keyof typeof t.projects];
  
  const containerRef = useRef<HTMLDivElement>(null);
  const macWindowRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isTransitioning = useRef(false);

  useGSAP(() => {
    if (!project) return;
    
    // Detekce mobilu pro GSAP - na mobilu to prostě odpálíme hned
    const isMob = window.innerWidth < 1024;

    // Opona zmizí bleskově (0.1s místo 0.8s)
    gsap.to(".transition-curtain", { 
      opacity: 0, 
      duration: isMob ? 0.1 : 0.8, 
      ease: "none", 
      delay: 0 
    });

    // NADPIS - Tohle je to LCP! Zrušíme stagger a delay na mobilu.
    gsap.fromTo(".detail-title-char", 
      { y: isMob ? 20 : 100, opacity: 0 }, 
      { 
        y: 0, 
        opacity: 1, 
        duration: isMob ? 0.3 : 1, // Na mobilu 0.3s
        stagger: isMob ? 0 : 0.02, // Na mobilu vyjedou všechna písmena naráz!
        ease: "power2.out", 
        delay: isMob ? 0.1 : 0.4 
      }
    );

    gsap.fromTo(".ui-element",
      { y: 30, opacity: 0 },
      { 
        y: 0, opacity: 1, 
        duration: isMob ? 0.4 : 1.2, 
        stagger: isMob ? 0.02 : 0.1, 
        ease: "power3.out", 
        delay: isMob ? 0.2 : 0.6, 
        clearProps: "transform" 
      }
    );
  }, { scope: containerRef, dependencies: [project?.title] });

  useEffect(() => {
    if (!macWindowRef.current) return;
    if (isFullscreen) {
      gsap.to(macWindowRef.current, {
        width: "90vw", height: "85vh", top: "50%", left: "50%", xPercent: -50, yPercent: -50, duration: 0.8, ease: "power3.inOut"
      });
    } else {
      gsap.to(macWindowRef.current, {
        width: "100%", height: "100%", top: "0%", left: "0%", xPercent: 0, yPercent: 0, duration: 0.8, ease: "power3.inOut"
      });
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!project) return;
    let cleared = false;
    window.dispatchEvent(new CustomEvent("webgl-transition", { detail: { value: 0.85, color: project.zone } }));
    
    const obj = { v: 0.85 };
    gsap.to(obj, {
      v: 0, duration: 1.5, ease: "expo.out", delay: 0.2,
      onUpdate: () => {
        if (!cleared) {
          window.dispatchEvent(new CustomEvent("webgl-transition", { detail: { value: obj.v, color: project.zone } }));
        }
      }
    });

    return () => {
      cleared = true;
      window.dispatchEvent(new CustomEvent("webgl-transition", { detail: { value: 0, color: -1 } }));
    };
  }, [project?.zone]);

  const triggerNextProject = useCallback(() => {
    if (isTransitioning.current || !project) return;
    isTransitioning.current = true;
    
    const currentIndex = PROJECT_ORDER.indexOf(slug);
    const nextSlug = PROJECT_ORDER[(currentIndex + 1) % PROJECT_ORDER.length];

    gsap.to(".ui-element, .title-wrapper", { opacity: 0, y: -20, duration: 0.6, ease: "power2.in" });

    const obj = { v: 0 };
    gsap.to(obj, {
      v: 1.0, 
      duration: 1.2, 
      ease: "power2.inOut",
      onUpdate: () => {
        window.dispatchEvent(new CustomEvent("webgl-transition", { detail: { value: obj.v, color: project.zone } }));
      },
      onComplete: () => {
        gsap.to(".transition-curtain", {
          opacity: 1, duration: 0.4, 
          onComplete: () => router.push(`/work/${nextSlug}`)
        });
      }
    });
  }, [slug, project, router]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (isFullscreen || window.innerWidth < 1024) return; 
    if (e.deltaY > 60) {
      triggerNextProject();
    }
  }, [isFullscreen, triggerNextProject]);

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  if (!project) return null;

  return (
    <main 
      ref={containerRef} 
      className="relative w-full min-h-[100svh] lg:h-[100svh] lg:overflow-hidden bg-transparent text-white selection:bg-white selection:text-black"
    >
      
      <div className="transition-curtain fixed inset-0 z-[9999] bg-[#020203] pointer-events-none" />
      <WebGLScene />

      <nav className="relative lg:absolute top-0 left-0 w-full pt-10 pb-4 px-6 md:px-10 z-[100] flex justify-between items-start pointer-events-none ui-element">
        <Link href="/#work" className="group font-mono text-[10px] tracking-[0.2em] uppercase text-white pointer-events-auto flex items-center gap-4 hover:text-white/60 transition-colors">
            <span className="w-8 h-[1px] bg-white group-hover:w-12 transition-all duration-300" />
            {t.return}
        </Link>
      </nav>

      <div className="w-full min-h-full flex flex-col lg:justify-center px-6 md:px-12 lg:px-20 pb-32 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-24 w-full max-w-[1920px] mx-auto items-center">
          
          <div className={`col-span-1 lg:col-span-5 flex flex-col gap-6 lg:gap-8 z-10 transition-all duration-700 mt-4 lg:mt-0 ${isFullscreen ? 'opacity-0 translate-x-[-50px] pointer-events-none' : 'opacity-100 translate-x-0'}`}>
            
            <div className="title-wrapper pb-4 min-h-[5rem] flex flex-wrap gap-x-4 md:gap-x-6">
              {project.title.split(" ").map((word, i) => (
                <span key={i} className="overflow-hidden flex pb-4 pr-8">
                  {word.split("").map((char, j) => (
                    <span key={j} className="detail-title-char font-syne font-black text-[clamp(3.5rem,10vw,7rem)] uppercase tracking-tighter leading-[0.85] text-white inline-block pr-[0.3em] -mr-[0.3em]">
                      {char}
                    </span>
                  ))}
                </span>
              ))}
            </div>

            <div className="ui-element flex flex-col gap-1 mt-2">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">{t.roleLabel}</span>
              <span className="font-syne text-xl font-bold uppercase tracking-wider">{project.role}</span>
            </div>

            <div className="ui-element">
              <p className="font-instrument text-base md:text-xl leading-relaxed text-white/80 font-light">
                {project.description}
              </p>
            </div>

            <div className="ui-element pt-2 lg:pt-4">
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech, i) => (
                  <span key={i} className="px-4 py-2 border border-white/20 rounded-full font-mono text-[10px] tracking-widest uppercase text-white/70 bg-transparent backdrop-blur-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {project.liveUrl !== "#" && (
              <div className="ui-element pt-6 lg:pt-8">
                <a 
                  href={project.liveUrl} target="_blank" rel="noopener noreferrer" 
                  className="group relative inline-flex items-center gap-4 text-white"
                >
                  <span className="font-syne font-bold uppercase tracking-widest text-sm relative z-10 transition-colors group-hover:text-black">{t.liveSite}</span>
                  <div className="absolute inset-0 bg-white scale-x-0 origin-left transition-transform duration-500 ease-out group-hover:scale-x-100 -z-10 rounded-full -mx-4 px-4" />
                  <span className="font-mono text-sm transform transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10 group-hover:text-black">↗</span>
                </a>
              </div>
            )}
          </div>

          {/* FIX: Zde byla odstraněna třída 'ui-element' (na konci původního divu) */}
          <div className="col-span-1 lg:col-span-7 relative h-[60vh] lg:h-[75vh] w-full z-[150] mt-10 lg:mt-0">
            <div 
              className={`fixed inset-0 z-[998] transition-all duration-700 ${isFullscreen ? 'bg-black/80 backdrop-blur-md pointer-events-auto opacity-100' : 'bg-transparent pointer-events-none opacity-0'}`} 
              onClick={() => setIsFullscreen(false)} 
            />

            <div 
              ref={macWindowRef}
              className={`absolute top-0 left-0 w-full h-full overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] lg:shadow-[0_50px_100px_rgba(0,0,0,0.8)] bg-[#050505] border border-white/10 flex flex-col rounded-[2rem] lg:rounded-[2.5rem] ${isFullscreen ? 'fixed z-[999]' : ''}`}
            >
              <div className="w-full h-10 lg:h-12 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-[#111111]/95 backdrop-blur-md group/mac relative z-10 cursor-default">
                <div className="flex gap-2 lg:gap-2.5">
                   <button onClick={(e) => { e.stopPropagation(); isFullscreen ? setIsFullscreen(false) : router.push('/#work') }} className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center transition-colors outline-none cursor-pointer">
                     <span className="opacity-0 group-hover/mac:opacity-100 text-[#4c0000] text-[8px] leading-none mb-[1px] font-bold">✕</span>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(false) }} className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#ffbd2e] flex items-center justify-center transition-colors outline-none cursor-pointer">
                     <span className="opacity-0 group-hover/mac:opacity-100 text-[#593e00] text-[8px] leading-none mb-[1px] font-bold">−</span>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen) }} className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#27c93f] flex items-center justify-center transition-colors outline-none cursor-pointer">
                     <span className="opacity-0 group-hover/mac:opacity-100 text-[#004d00] text-[8px] leading-none mb-[1px] font-bold">⤢</span>
                   </button>
                </div>
                <div className="font-mono text-[8px] lg:text-[9px] text-white/30 tracking-widest uppercase pointer-events-none">
                  {new URL(project.liveUrl === "#" ? "https://internal.system" : project.liveUrl).hostname}
                </div>
                <div className="w-10 lg:w-12" />
              </div>
              
              <div 
                className="w-full h-full overflow-y-auto custom-scrollbar relative bg-[#020202] z-10 overscroll-none" 
                data-lenis-prevent="true" 
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <Image 
                  src={project.image} 
                  alt={`${project.title} Interface`} 
                  width={1440} 
                  height={8000} 
                  className="w-full h-auto block object-top" 
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1440px"
                  unoptimized // FIX: Vercel už nebude obrázek zdržovat renderováním!
                />
              </div>
            </div>
          </div>

        </div>

        <div className="lg:hidden w-full flex justify-center mt-16 ui-element z-[200]">
          <button 
            onClick={triggerNextProject} 
            className="group flex flex-col items-center gap-4 text-white/50 hover:text-white transition-colors pointer-events-auto outline-none"
          >
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-center">{t.nextProject}</span>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-500">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white group-hover:text-black transition-transform duration-500 group-hover:translate-y-1">
                <path d="M13 1L1 13M1 13H9.4M1 13V4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>

      </div>

      <div className={`hidden lg:flex absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-4 transition-opacity duration-500 ${isFullscreen ? 'opacity-0' : 'opacity-100'} mix-blend-difference pointer-events-none ui-element`}>
        <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/50 text-center">Iterate Sequence</span>
        <div className="w-5 h-8 border border-white/30 rounded-full flex justify-center p-1">
          <div className="w-1 h-2 bg-white rounded-full animate-wheel-scroll" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1023px) {
          .custom-scrollbar::-webkit-scrollbar { display: none; }
          .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
        @media (min-width: 1024px) {
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
        }
        
        @keyframes wheel-scroll { 
          0% { transform: translateY(0); opacity: 1; } 
          100% { transform: translateY(12px); opacity: 0; } 
        }
        .animate-wheel-scroll { animation: wheel-scroll 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
      `}} />
    </main>
  );
}