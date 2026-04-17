"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMobile } from "@/hooks/use-mobile";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

// Luxurious Dark Glass Object
const DarkGlassShape = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.05;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={1.2}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <MeshDistortMaterial
          color="#050505"
          envMapIntensity={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.9}
          roughness={0.1}
          distort={0.4}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
};

// Lazy-loaded 3D Background with IntersectionObserver
const Lazy3DBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Delay Canvas mount to prevent TBT spike
          if ("requestIdleCallback" in window) {
            requestIdleCallback(() => setShouldRender(true), { timeout: 1000 });
          } else {
            setTimeout(() => setShouldRender(true), 200);
          }
        }
      },
      { 
        rootMargin: "100px 0px", // Start loading slightly before in view
        threshold: 0.1 
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none opacity-40">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center">
        {shouldRender && (
          <Canvas 
            camera={{ position: [0, 0, 6] }}
            dpr={isMobile ? [0.5, 0.75] : [1, 1.5]} // Lower DPR on mobile
            gl={{ 
              powerPreference: isMobile ? "low-power" : "high-performance",
              antialias: !isMobile,
            }}
          >
            <ambientLight intensity={1} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <DarkGlassShape />
          </Canvas>
        )}
      </div>
    </div>
  );
};

export const About = () => {
  const containerRef = useRef<HTMLElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useMobile();

  useGSAP(() => {
    // Kinetic masked reveal of text on scroll
    textRefs.current.forEach((el) => {
      if (!el) return;
      gsap.fromTo(el,
        { y: 100, opacity: 0, clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" },
        {
          y: 0,
          opacity: 1,
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          duration: 1.5,
          ease: "power4.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          }
        }
      );
    });

    // Parallax editorial lines
    gsap.utils.toArray(".editorial-line").forEach((line: any) => {
      gsap.fromTo(line, 
        { scaleX: 0 }, 
        { scaleX: 1, duration: 1.5, ease: "expo.out", scrollTrigger: { trigger: line, start: "top 90%" } }
      );
    });

  }, { scope: containerRef });

  // Subtle mouse-move parallax for text blocks (desktop only)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || isMobile) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    
    gsap.to(".mouse-parallax", {
      x: x,
      y: y,
      duration: 1,
      ease: "power2.out"
    });
  };

  return (
    <section 
      ref={containerRef} 
      id="about" 
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-[150vh] bg-transparent text-white pt-32 pb-48 z-10"
    >
      {/* 3D Background - Lazy loaded with IntersectionObserver */}
      <Lazy3DBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 lg:px-24">
        
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 sm:mb-24 md:mb-32">
          <div className="overflow-hidden" ref={(el) => { textRefs.current[0] = el; }}>
            <span className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase block mb-4">
              01 / Architecture
            </span>
            <h2 className="font-syne font-black text-4xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tighter uppercase leading-[0.9]">
              Engineering <br />
              <span className="font-instrument font-light italic lowercase text-white/80 tracking-normal">precision.</span>
            </h2>
          </div>
        </div>

        <div className="editorial-line w-full h-[1px] bg-white/20 origin-left mb-16 sm:mb-24 md:mb-32" />

        {/* Content Grid (Golden Ratio layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Sticky Sidebar with details */}
          <div className="lg:col-span-4 flex flex-col gap-8 sm:gap-12">
            <div className="lg:sticky lg:top-40 flex flex-col gap-8 sm:gap-12 mouse-parallax">
              <div className="overflow-hidden" ref={(el) => { textRefs.current[1] = el; }}>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase block mb-4">Methodology</span>
                <p className="font-sans text-sm md:text-base leading-relaxed text-white/70">
                  Root Cause Analysis. <br />
                  Zero-Error Tolerance. <br />
                  Systematic Diagnostics.
                </p>
              </div>
              <div className="overflow-hidden" ref={(el) => { textRefs.current[2] = el; }}>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase block mb-4">Capabilities</span>
                <ul className="font-sans text-sm md:text-base leading-relaxed text-white/70 flex flex-col gap-2">
                  <li>Frontend Architecture</li>
                  <li>WebGL / 3D Experiences</li>
                  <li>UI/UX Engineering</li>
                  <li>OSINT & Security</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main narrative */}
          <div className="lg:col-span-8 flex flex-col gap-16 sm:gap-24 md:gap-32 lg:pl-16">
            
            <div className="overflow-hidden mouse-parallax" ref={(el) => { textRefs.current[3] = el; }}>
              <h3 className="font-syne font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.2] tracking-tight uppercase">
                My background does not lie in traditional design agencies. <span className="font-instrument font-light italic lowercase text-white/60 tracking-normal">It lies in the primary circuit of a nuclear reactor.</span>
              </h3>
            </div>

            <div className="editorial-line w-[10vw] h-[1px] bg-white/40 origin-left" />

            <div className="overflow-hidden mouse-parallax" ref={(el) => { textRefs.current[4] = el; }}>
              <p className="font-sans text-lg sm:text-xl md:text-2xl lg:text-3xl leading-[1.4] text-white/80 font-medium">
                As a former diagnostics specialist for 6-9 kV protections at the Dukovany Nuclear Power Plant, I was trained in an environment with zero tolerance for failure.
              </p>
            </div>

            <div className="overflow-hidden mouse-parallax" ref={(el) => { textRefs.current[5] = el; }}>
              <p className="font-sans text-base sm:text-lg md:text-xl leading-[1.6] text-white/50">
                I do not just write code. I engineer digital infrastructure. I bring the rigorous mindset of Root Cause Analysis and systematic problem-solving into frontend development, integrating complex WebGL experiences and AI-driven architectures with uncompromising stability.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
