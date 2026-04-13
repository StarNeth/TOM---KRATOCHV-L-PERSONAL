"use client";

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
  return (
    <>
      <WebGLScene />

      {/* Hlavní scroll kontejner - z-10 zaručí že je nad WebGL */}
      <main className="relative w-full text-white z-10">
        <Header />
        
        {/* IDs v komponentách: */}
        {/* Hero nemá id, je to začátek stránky */}
        <Hero />
        
        {/* id="about" */}
        <About /> 
        
        {/* id="work" */}
        <Projects />
        
        {/* id="capabilities" */}
        <Capabilities />
        
        {/* id="contact" */}
        <Contact />
      </main>
    </>
  );
}