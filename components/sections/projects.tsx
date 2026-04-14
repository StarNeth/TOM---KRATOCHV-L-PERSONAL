"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const projectsData = [
  { id: "01", title: "Shu-Xien-Lou", role: "Frontend Architecture", video: "/videos/restaurant.mp4", image: "/shu-xien-glou.vercel.app_.png", brandColor: "#050505", slug: "shu-xien-lou" },
  { id: "02", title: "Kings Barber", role: "UI Engineering", video: "/videos/barber.mp4", image: "/kings-barber.png", brandColor: "#0a0a0a", slug: "kings-barber" },
  { id: "03", title: "Project Aion", role: "In Development", video: "/videos/aion.mp4", image: "/aion.png", brandColor: "#111111", slug: "aion" },
];

export const Projects = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const track = trackRef.current;
      if (!track) return;
      
      const getScrollAmount = () => track.scrollWidth - window.innerWidth;
      
      gsap.to(track, {
        x: () => -getScrollAmount(), // Musí být funkce, aby reagovalo na resize
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${getScrollAmount()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          // [ ! ] OPRAVA: Přepočítá animaci, když se na mobilu schová adresní řádek
          invalidateOnRefresh: true 
        }
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    // [ ! ] OPRAVA: Použití h-[100svh] (Small Viewport Height) řeší skákání na iOS/Androidu
    <section ref={sectionRef} id="work" className="relative w-full h-[100svh] bg-transparent overflow-hidden">
      
      {/* OPRAVA: Přidal jsem py-20 na obal, aby texty nebyly namačkané až nahoře a nerozbíjely se o lištu */}
      <div ref={trackRef} className="flex h-full items-center px-[5vw] md:px-[10vw] gap-[8vw] md:gap-[15vw] will-change-transform py-20">
        
        {/* OPRAVA: Vynucené w-screen s paddingem na mobilu zaručí, že "PROVEN systems." sedí hezky uprostřed a neuteče */}
        <div className="flex-shrink-0 w-[90vw] md:w-[40vw] pl-4 md:pl-0">
          <span className="font-mono text-[10px] tracking-[0.5em] text-white/40 uppercase block mb-6">02 // Selected Work</span>
          <h2 className="font-syne font-black text-6xl md:text-9xl uppercase tracking-tighter leading-[0.8] text-white">
            Proven <br /> <span className="font-instrument italic font-light lowercase">Systems.</span>
          </h2>
        </div>

        {projectsData.map((p) => (
          <Link key={p.id} href={`/work/${p.slug}`} className="group relative w-[85vw] md:w-[50vw] h-[60svh] md:h-[65vh] flex-shrink-0 cursor-pointer block">
            <div className="absolute -top-8 md:-top-12 left-0 z-20 mix-blend-difference pointer-events-none transition-transform duration-700 group-hover:-translate-y-4">
              <h3 className="font-syne font-black text-4xl sm:text-6xl md:text-8xl lg:text-9xl uppercase tracking-tighter text-white opacity-80 group-hover:opacity-100 transition-opacity">
                {p.title}
              </h3>
            </div>
            
            <div className="relative w-full h-full overflow-hidden rounded-[2rem] border border-white/10" style={{ backgroundColor: p.brandColor }}>
              <div className="absolute top-0 left-0 w-full h-full bg-[length:100%_auto] bg-top transition-all duration-[10s] ease-linear group-hover:bg-bottom" style={{ backgroundImage: `url('${p.image}')` }} />
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/10 transition-colors duration-700 z-10" />
              <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 right-6 md:right-8 z-20 flex justify-between items-end transform transition-transform duration-700 group-hover:translate-y-[-5px]">
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] md:text-[10px] tracking-widest uppercase text-white/60 mb-2">{p.id} // {p.role}</span>
                  <span className="font-instrument italic text-lg md:text-xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    View Case Study
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