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
  const [canRenderWebGL, setCanRenderWebGL] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    // DÁME PRELOADERU ČAS (1.5 sekundy), ABY SE V KLIDU ROZBĚHL
    // Než mu do toho hodíme granát v podobě WebGL kompilace.
    const timer = setTimeout(() => {
      setCanRenderWebGL(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* WebGL se namountuje až po 1.5s */}
      {canRenderWebGL && <WebGLScene />}

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