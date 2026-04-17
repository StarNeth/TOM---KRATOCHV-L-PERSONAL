"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Image from "next/image";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// Cleaned up image paths to standard web-safe names
const projectsData = [
  { id: "01", title: "Shu-Xien-Lou", role: "Frontend Architecture", image: "/shu-xien-glou.vercel.app_.png", brandColor: "#050505", slug: "shu-xien-lou" },
  { id: "02", title: "Kings Barber", role: "UI Engineering", image: "/kings-barber.png", brandColor: "#0a0a0a", slug: "kings-barber" },
  { id: "03", title: "Project Aion", role: "In Development", image: "/aion.png", brandColor: "#111111", slug: "aion" },
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
        x: () => -getScrollAmount(),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${getScrollAmount()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true 
        }
      });
    }, sectionRef);
    return () => ctx.revert();
  },[]);

  return (
    <section ref={sectionRef} id="work" className="relative w-full h-[100svh] bg-transparent overflow-hidden">
      <div ref={trackRef} className="flex h-full items-center px-[5vw] md:px-[10vw] gap-[8vw] md:gap-[15vw] will-change-transform py-20">
        
        <div className="flex-shrink-0 w-[85vw] md:w-[40vw] pl-4 md:pl-0 max-w-[90vw]">
          <span className="font-mono text-[9px] md:text-[10px] tracking-[0.4em] md:tracking-[0.5em] text-white/40 uppercase block mb-4 md:mb-6">02 // Selected Work</span>
          <h2 className="font-syne font-black text-4xl sm:text-6xl md:text-9xl uppercase tracking-tighter leading-[0.85] text-white">
            Proven <br /> <span className="font-instrument italic font-light lowercase">Systems.</span>
          </h2>
        </div>

        {projectsData.map((p) => (
          <Link 
            key={p.id} 
            href={`/work/${p.slug}`} 
            aria-label={`View case study for ${p.title}`}
            className="group relative w-[85vw] md:w-[50vw] h-[60svh] md:h-[65vh] flex-shrink-0 cursor-pointer block"
          >
            <div className="absolute -top-6 md:-top-12 left-0 z-20 mix-blend-difference pointer-events-none transition-transform duration-700 group-hover:-translate-y-4 max-w-full overflow-hidden">
              <h3 className="font-syne font-black text-2xl sm:text-4xl md:text-7xl lg:text-8xl uppercase tracking-tighter text-white opacity-80 group-hover:opacity-100 transition-opacity truncate">
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
                loading="lazy"
                quality={80}
              />
              
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
