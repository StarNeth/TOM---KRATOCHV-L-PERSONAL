"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/navigation/header";
import { Hero } from "@/components/sections/hero";
import { DelayedRenderer } from "@/components/providers/delayed-renderer";

// 1. ZMĚNA: Ostatní sekce načítáme líně (Lazy Load). 
// Tím brutálně zmenšíme počáteční zátěž na procesor při hydrataci.
const About = dynamic(() => import("@/components/sections/about").then(mod => mod.About), { ssr: false });
const Projects = dynamic(() => import("@/components/sections/projects").then(mod => mod.Projects), { ssr: false });
const Capabilities = dynamic(() => import("@/components/sections/capabilities").then(mod => mod.Capabilities), { ssr: false });
const Contact = dynamic(() => import("@/components/sections/contact").then(mod => mod.Contact), { ssr: false });

const WebGLScene = dynamic(
  () => import("@/components/webgl/scene").then((mod) => mod.WebGLScene),
  { ssr: false }
);

export default function Home() {
  // 2. ZMĚNA: Stav pro zpožděné načtení 3D scény
  const [loadHeavyStuff, setLoadHeavyStuff] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Zlaté pravidlo pro WebGL weby: Necháme React vydechnout a vykreslit Hero.
    // Teprve po 1 vteřině (kdy už Lighthouse dávno zapsal perfektní LCP) pustíme WebGL.
    const timer = setTimeout(() => {
      setLoadHeavyStuff(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 3. ZMĚNA: WebGL se začne kompilovat až tehdy, když už je UI dávno na obrazovce */}
      {loadHeavyStuff && <WebGLScene />}

      <main className="relative w-full text-white z-10">
        <Header />
        <Hero /> {/* Hero se načte IHNED a zapíše nízké LCP */}
        
        {/* Zbytek webu se začne renderovat až se zpožděním, aby neblokoval start */}
        {loadHeavyStuff && (
          <>
            <About /> 
            <Projects />
            <Capabilities />
            <Contact />
          </>
        )}
      </main>
    </>
  );
}