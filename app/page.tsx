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

  useEffect(() => {
    // SOTY OPTIMALIZACE PRO 100/100:
    // WebGL se spustí AŽ KDYŽ uživatel udělá první akci. 
    const handleInteraction = () => {
      setMountedWebGL(true);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
    };

    window.addEventListener("scroll", handleInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", handleInteraction, { once: true, passive: true });
    window.addEventListener("mousemove", handleInteraction, { once: true, passive: true });

    const fallbackTimer = setTimeout(() => {
      handleInteraction();
    }, 4000);

    return () => {
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      clearTimeout(fallbackTimer);
    };
  }, []);

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