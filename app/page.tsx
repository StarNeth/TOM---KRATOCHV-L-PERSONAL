"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/navigation/header";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about"; 
import { Projects } from "@/components/sections/projects";
import { Capabilities } from "@/components/sections/capabilities"; 
import { Contact } from "@/components/sections/contact"; 

const WebGLScene = dynamic(
  () => import("@/components/webgl/scene").then((mod) => mod.WebGLScene),
  { ssr: false }
);

export default function Home() {
  const [mountWebGL, setMountedWebGL] = useState(false);

  // 1. Zcela samostatný useEffect pro scrollování nahoru při návratu na domovskou stránku
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // 2. Druhý useEffect výhradně pro složitou logiku WebGL a preloaderu
  useEffect(() => {
    let isMounted = true;
    
    // Sequential ignition: Wait for preloader to complete before mounting WebGL
    // This prevents GPU contention during the loading phase
    const handlePreloaderDone = () => {
      // Use requestIdleCallback for non-blocking WebGL initialization
      // This reduces TBT by deferring heavy GPU work to idle periods
      const mountCanvas = () => {
        if (!isMounted) return;
        // Small delay for DOM repaint before starting WebGL
        requestAnimationFrame(() => {
          if (isMounted) setMountedWebGL(true);
        });
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(mountCanvas, { timeout: 2000 });
      } else {
        // Fallback for Safari and older browsers
        setTimeout(mountCanvas, 150);
      }
    };

    window.addEventListener("preloader-complete", handlePreloaderDone);

    // Safety fallback if preloader event doesn't fire
    const safetyTimer = setTimeout(() => {
      if (isMounted) setMountedWebGL(true);
    }, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener("preloader-complete", handlePreloaderDone);
      clearTimeout(safetyTimer);
    };
  }, []); // Empty dependency array - run once on mount

  return (
    <>
      {mountWebGL && <WebGLScene />}

      <main className="relative w-full text-white z-10">
        <Header />
        <Hero />
        <About /> 
        <Projects />
        <Capabilities />
        <Contact />
      </main>
    </>
  );
}