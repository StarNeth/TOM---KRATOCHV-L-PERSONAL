"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const skillsData =[
  "AI WEB ARCHITECT", "UI/UX ENGINEERING", "FRONTEND SYSTEMS",
  "CREATIVE DEVELOPMENT", "WEBGL / 3D EXPERIENCES", "OSINT & SEC-OPS",
  "PROMPT ENGINEERING", "REACT / NEXT.JS"
];

export const Capabilities = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nodesRef = useRef<HTMLDivElement[]>([]);
  const innerNodesRef = useRef<HTMLDivElement[]>([]); 
  const ringRefs = useRef<HTMLDivElement[]>([]);
  const isCharging = useRef<boolean[]>(new Array(skillsData.length).fill(false));
  
  const isMatrixActive = useRef<boolean>(false);

  const physicsState = useRef(
    skillsData.map((_, i) => ({
      x: (i % 3) * 100 + 100,
      y: Math.floor(i / 3) * 100 + 100,
      vx: 0, vy: 0, rotation: Math.random() * 360, rotSpeed: 0.5
    }))
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const isMobile = window.innerWidth < 768;
    const collisionRadius = isMobile ? 110 : 200;
    const boundaryPadding = isMobile ? 40 : 80;

    let animationFrameId: number;
    const friction = 0.94;
    let isVisible = false;
    let lastMatrixDraw = 0;

    const renderLoop = (timestamp: number) => {
      if (!isVisible) return; 

      // 1. PHYSICS UPDATE
      const { width, height } = container.getBoundingClientRect();
      const nodes = physicsState.current;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i]; const n2 = nodes[j];
          const dx = n2.x - n1.x; const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < collisionRadius && dist > 0) {
            const overlap = collisionRadius - dist;
            const nx = dx / dist; const ny = dy / dist;
            n1.x -= (nx * overlap) * 0.5; n1.y -= (ny * overlap) * 0.5;
            n2.x += (nx * overlap) * 0.5; n2.y += (ny * overlap) * 0.5;
            const kx = n1.vx - n2.vx; const ky = n1.vy - n2.vy;
            const p = (nx * kx + ny * ky) * 0.8;
            n1.vx -= p * nx; n1.vy -= p * ny;
            n2.vx += p * nx; n2.vy += p * ny;
          }
        }
      }

      nodes.forEach((node, i) => {
        const el = nodesRef.current[i];
        const ring = ringRefs.current[i];
        if (!el || !ring) return;

        node.vx *= friction; node.vy *= friction;
        node.vx += (Math.random() - 0.5) * 0.2;
        node.vy += (Math.random() - 0.5) * 0.2;
        node.x += node.vx; node.y += node.vy;

        if (node.x < boundaryPadding) { node.x = boundaryPadding; node.vx *= -1; }
        if (node.x > width - boundaryPadding) { node.x = width - boundaryPadding; node.vx *= -1; }
        if (node.y < boundaryPadding) { node.y = boundaryPadding; node.vy *= -1; }
        if (node.y > height - boundaryPadding) { node.y = height - boundaryPadding; node.vy *= -1; }

        node.rotSpeed = gsap.utils.interpolate(node.rotSpeed, 0.5, 0.02);
        node.rotation += node.rotSpeed;

        gsap.set(el, { x: node.x, y: node.y });
        gsap.set(ring, { rotation: node.rotation });
      });

      // 2. MATRIX UPDATE (Throttled to ~50ms)
      if (isMatrixActive.current && timestamp - lastMatrixDraw > 50) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff2a00"; 
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const text = Math.random() > 0.5 ? "1" : "0";
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) drops[i] = 0;
          drops[i]++;
        }
        lastMatrixDraw = timestamp;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };
    
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top bottom", 
      end: "bottom top", 
      onToggle: (self) => { 
        isVisible = self.isActive;
        if (isVisible) {
          animationFrameId = requestAnimationFrame(renderLoop);
        } else {
          cancelAnimationFrame(animationFrameId);
        }
      }
    });

    const titleEl = sectionRef.current?.querySelector('.cap-title');
    if (titleEl) {
      gsap.fromTo(titleEl, 
        { opacity: 0, y: 50 }, 
        { opacity: 1, y: 0, duration: 1, ease: "power4.out", scrollTrigger: { trigger: sectionRef.current, start: "top 60%" } }
      );
    }

    return () => cancelAnimationFrame(animationFrameId);
  },[]);

  const handleChargeStart = (index: number) => {
    isCharging.current[index] = true;
    isMatrixActive.current = true;
    if (canvasRef.current) {
      gsap.to(canvasRef.current, { opacity: 0.2, duration: 0.5, ease: "power2.out", filter: "brightness(1)" });
    }

    const inner = innerNodesRef.current[index];
    const ring = ringRefs.current[index];
    gsap.killTweensOf(inner); gsap.killTweensOf(ring);
    gsap.to(inner, { scale: 0.85, duration: 0.5, ease: "power2.out" });
    gsap.to(ring, { borderColor: "rgba(255, 42, 0, 0.8)", boxShadow: "0 0 20px rgba(255,42,0,0.5)", duration: 0.3 });
    physicsState.current[index].rotSpeed = 30;
  };

  const handleChargeRelease = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (!isCharging.current[index]) return;
    isCharging.current[index] = false;

    const inner = innerNodesRef.current[index];
    const ring = ringRefs.current[index];

    gsap.killTweensOf(inner); gsap.killTweensOf(ring);
    gsap.to(inner, { scale: 1, duration: 0.6, ease: "elastic.out(1.2, 0.3)" });
    gsap.to(ring, { borderColor: "rgba(255, 255, 255, 0.1)", boxShadow: "none", duration: 0.8 });

    if (canvasRef.current) {
      gsap.fromTo(canvasRef.current,
        { opacity: 0.5, filter: "brightness(2)" },
        { 
          opacity: 0, 
          filter: "brightness(1)", 
          duration: 1.5, 
          ease: "power2.out",
          onComplete: () => { isMatrixActive.current = false; } 
        }
      );
    }

    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
    window.dispatchEvent(new CustomEvent("webgl-shoot", { detail: { x: clientX, y: clientY } }));

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    physicsState.current.forEach((node, i) => {
      if (i === index) { node.rotSpeed = 60; return; }
      const dx = node.x - clickX;
      const dy = node.y - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 800) {
        const power = (800 - dist) / 800;
        node.vx += (dx / dist) * power * 150;
        node.vy += (dy / dist) * power * 150;
        node.rotSpeed = power * 40;
      }
    });
  };

  return (
    <section ref={sectionRef} id="capabilities" className="relative w-full h-[120vh] z-10 text-white flex flex-col items-center justify-center pt-24 pb-32 overflow-hidden">
      <div className="cap-title flex flex-col items-center mb-8 md:mb-12 mix-blend-difference pointer-events-none px-4 text-center w-full max-w-[100vw]">
        <h2 className="font-syne font-bold text-4xl md:text-8xl uppercase tracking-tighter">Architecture</h2>
        <p className="font-mono text-[8px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] uppercase text-white/50 mt-4 max-w-[80vw]">[ Containment Field ] — Hold node to charge. Release to fire.
        </p>
      </div>

      <div ref={containerRef} className="relative w-[95vw] md:w-[90vw] max-w-6xl h-[70vh] bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.01)]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none mix-blend-screen" />
        {skillsData.map((skill, i) => (
          <div
            key={i}
            ref={(el) => { nodesRef.current[i] = el!; }}
            className="absolute top-0 left-0 flex items-center justify-center w-[120px] h-[120px] md:w-[200px] md:h-[200px] pointer-events-auto cursor-crosshair md:cursor-pointer"
            style={{ transform: "translate(-50%, -50%)" }}
            onMouseDown={() => handleChargeStart(i)}
            onMouseUp={(e) => handleChargeRelease(e, i)}
            onMouseLeave={(e) => handleChargeRelease(e, i)}
            onTouchStart={() => handleChargeStart(i)}
            onTouchEnd={(e) => handleChargeRelease(e, i)}
          >
            <div ref={(el) => { innerNodesRef.current[i] = el!; }} className="relative w-full h-full flex items-center justify-center">
              <div
                ref={(el) => { ringRefs.current[i] = el!; }}
                className="absolute w-full h-full rounded-full border border-white/10 border-t-white/40 border-b-white/5 mix-blend-overlay will-change-transform transition-colors duration-300"
              />
              <div className="absolute px-3 py-1.5 md:px-5 md:py-2.5 bg-black/80 backdrop-blur-md rounded-full border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] pointer-events-none">
                <span className="font-syne font-bold text-[8px] md:text-[11px] tracking-[0.1em] md:tracking-[0.2em] uppercase text-white whitespace-nowrap">
                  {skill}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};