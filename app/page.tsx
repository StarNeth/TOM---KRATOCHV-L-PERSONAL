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
    // ZMĚNĚNO: Sekvenční zapalování (Sequential Ignition).
    // Necháme grafickou kartu odpočinout během Preloaderu. 
    // WebGL se začne kompilovat až ve chvíli, kdy Preloader skončí.
    const handlePreloaderDone = () => {
      // Dáme prohlížeči ještě 100ms volno na překreslení DOMu, pak nahodíme 3D
      setTimeout(() => setMountedWebGL(true), 100);
    };

    window.addEventListener("preloader-complete", handlePreloaderDone);

    // Záchrana pro jistotu (kdyby event selhal)
    const safetyTimer = setTimeout(() => setMountedWebGL(true), 4000);

    return () => {
      window.removeEventListener("preloader-complete", handlePreloaderDone);
      clearTimeout(safetyTimer);
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