"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/navigation/header";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about"; 
import { Projects } from "@/components/sections/projects";
import { Capabilities } from "@/components/sections/capabilities"; 
import { Contact } from "@/components/sections/contact"; 

const WebGLScene = dynamic(
  () => import("@/components/webgl/scene").then((mod) => mod.WebGLScene),
  { 
    ssr: false,
    loading: () => null // Prevent flash while loading
  }
);

export default function Home() {
  const [mountWebGL, setMountWebGL] = useState(false);
  const [isPreloaderDone, setIsPreloaderDone] = useState(false);

  const handlePreloaderComplete = useCallback(() => {
    setIsPreloaderDone(true);
  }, []);

  useEffect(() => {
    window.addEventListener("preloader-complete", handlePreloaderComplete);

    // Safety fallback if preloader event fails
    const safetyTimer = setTimeout(() => {
      setIsPreloaderDone(true);
    }, 5000);

    return () => {
      window.removeEventListener("preloader-complete", handlePreloaderComplete);
      clearTimeout(safetyTimer);
    };
  }, [handlePreloaderComplete]);

  // Mount WebGL after preloader with a small delay for stability
  useEffect(() => {
    if (!isPreloaderDone) return;
    
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleMount = () => {
      if ('requestIdleCallback' in window) {
        (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
          setMountWebGL(true);
        }, { timeout: 200 });
      } else {
        setTimeout(() => setMountWebGL(true), 150);
      }
    };
    
    scheduleMount();
  }, [isPreloaderDone]);

  return (
    <>
      {mountWebGL && <WebGLScene />}

      <main className="relative w-full text-white z-10 overflow-x-hidden">
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
