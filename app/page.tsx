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
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ZMĚNĚNO: Žádný umělý delay. WebGL startuje okamžitě, což řeší černou obrazovku při návratu z projektů. */}
      <WebGLScene />

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