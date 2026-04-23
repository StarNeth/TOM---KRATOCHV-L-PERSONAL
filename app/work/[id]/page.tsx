"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"

// SSR OFF
const WebGLSceneDynamic = dynamic(
  () => import("@/components/webgl/scene").then((mod) => mod.WebGLScene),
  {
    ssr: false,
    loading: () => <div aria-hidden className="fixed inset-0 pointer-events-none" />,
  }
)

const WebGLScene = React.memo(WebGLSceneDynamic)

import { useLanguage } from "@/components/navigation/language-toggle"
import { ease } from "@/lib/easing"

const PROJECT_ORDER = ["shuxianglou", "kings-barber"]

const DICTIONARY = {
  en: {
    return: "Return",
    roleLabel: "Role",
    liveSite: "Live Project",
    nextProject: "Next Project",
    projects: {
      shuxianglou: {
        title: "Shu Xiang Lou",
        role: "Interactive Web Experience",
        description:
          "A new authentic restaurant in the heart of Třebíč. They serve over 200 dishes and cook absolutely amazingly. We rejected boring templates and created a site that reflects their unique atmosphere.",
        techStack: ["Next.js 16", "React Three Fiber", "GSAP", "Tailwind"],
        image: "/shu-xien-glou.vercel.app_.webp",
        liveUrl: "https://www.shuxianglou.cz/",
        zone: 2,
      },
      "kings-barber": {
        title: "Kings Barber",
        role: "Digital Identity & Frontend",
        description:
          "An African barbershop in the center of Třebíč. This place has an absolutely special vibe, mostly thanks to the amazing owner originally from Nigeria. We built the site to transfer exactly this energy into the digital world.",
        techStack: ["Next.js 16", "React 19", "GSAP Timeline"],
        image: "/kingsbarber-silk.vercel.app_.webp",
        liveUrl: "https://kingsbarber-silk.vercel.app",
        zone: 3,
      },
    },
  },
  cs: {
    return: "Návrat",
    roleLabel: "Role",
    liveSite: "Živá Stránka",
    nextProject: "Další Projekt",
    projects: {
      shuxianglou: {
        title: "Shu Xiang Lou",
        role: "Interaktivní Web",
        description:
          "Nová autentická restaurace v srdci Třebíče. Mají tu přes 200 jídel a vaří naprosto úžasně. Odmítli jsme nudné šablony a vytvořili pro ně web, který odráží jejich jedinečnou atmosféru.",
        techStack: ["Next.js 16", "React Three Fiber", "GSAP", "Tailwind"],
        image: "/shu-xien-glou.vercel.app_.webp",
        liveUrl: "https://www.shuxianglou.cz/",
        zone: 2,
      },
      "kings-barber": {
        title: "Kings Barber",
        role: "Digitální Identita & Frontend",
        description:
          "Africký barbershop v centru Třebíče. Tento podnik má naprosto speciální vibe, hlavně díky úžasnému majiteli původem z Nigérie. Web jsme postavili tak, aby přesně tuhle energii přenesl do digitálu.",
        techStack: ["Next.js 16", "React 19", "GSAP Timeline"],
        image: "/kingsbarber-silk.vercel.app_.webp",
        liveUrl: "https://kingsbarber-silk.vercel.app",
        zone: 3,
      },
    },
  },
}

export default function ProjectDetail() {
  const params = useParams()
  const router = useRouter()
  const slug = params.id as string
  const { language } = useLanguage()

  const currentLang = (language as keyof typeof DICTIONARY) || "en"
  const t = DICTIONARY[currentLang]
  const project = t?.projects[slug as keyof typeof t.projects]

  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioning = useRef(false)

  const [webglReady, setWebglReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setWebglReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useGSAP(
    () => {
      if (!project) return
      const isMob = window.innerWidth < 1024

      gsap.to(".transition-curtain", {
        opacity: 0,
        duration: isMob ? 0.25 : 0.9,
        ease: ease.mechanical,
        delay: 0,
      })

      gsap.fromTo(
        ".detail-title-char",
        { y: "110%" },
        {
          y: "0%",
          duration: isMob ? 0.55 : 1.15,
          stagger: isMob ? 0 : 0.022,
          ease: ease.silk,
          delay: isMob ? 0.08 : 0.25,
          clearProps: "transform",
        }
      )

      gsap.fromTo(
        ".ui-element",
        { y: 30, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: isMob ? 0.55 : 1.1,
          stagger: isMob ? 0.03 : 0.09,
          ease: ease.decay,
          delay: isMob ? 0.25 : 0.65,
          clearProps: "transform,filter",
        }
      )

      gsap.fromTo(
        ".mac-window-wrapper",
        { y: 60, opacity: 0, scale: 0.86, filter: "blur(14px)" },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: isMob ? 0.8 : 1.4,
          ease: ease.ballistic,
          delay: isMob ? 0.25 : 0.55,
          clearProps: "transform,filter",
        }
      )
    },
    { scope: containerRef, dependencies: [slug, project?.title] }
  )

  useEffect(() => {
    if (!project) return
    let cleared = false
    window.dispatchEvent(new CustomEvent("webgl-transition", { detail: { value: 0.85, color: project.zone } }))

    const obj = { v: 0.85 }
    gsap.to(obj, {
      v: 0,
      duration: 1.6,
      ease: ease.silk,
      delay: 0.2,
      onUpdate: () => {
        if (!cleared) {
          window.dispatchEvent(
            new CustomEvent("webgl-transition", { detail: { value: obj.v, color: project.zone } })
          )
        }
      },
    })

    return () => {
      cleared = true
      window.dispatchEvent(new CustomEvent("webgl-transition", { detail: { value: 0, color: -1 } }))
    }
  }, [project?.zone])

  const triggerNextProject = useCallback(() => {
    if (isTransitioning.current || !project) return
    isTransitioning.current = true

    const currentIndex = PROJECT_ORDER.indexOf(slug)
    const nextSlug = PROJECT_ORDER[(currentIndex + 1) % PROJECT_ORDER.length]

    gsap.to(".ui-element, .title-wrapper, .mac-window-wrapper", {
      opacity: 0,
      y: -20,
      scale: 0.96,
      filter: "blur(8px)",
      duration: 0.7,
      ease: ease.mechanical,
    })

    const obj = { v: 0 }
    gsap.to(obj, {
      v: 1.0,
      duration: 1.25,
      ease: ease.mechanical,
      onUpdate: () => {
        window.dispatchEvent(
          new CustomEvent("webgl-transition", { detail: { value: obj.v, color: project.zone } })
        )
      },
      onComplete: () => {
        gsap.to(".transition-curtain", {
          opacity: 1,
          duration: 0.45,
          ease: ease.mechanical,
          onComplete: () => router.push(`/work/${nextSlug}`),
        })
      },
    })
  }, [slug, project, router])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!window.matchMedia("(pointer: fine)").matches) return
      if (e.deltaY > 60) triggerNextProject()
    },
    [triggerNextProject]
  )

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  if (!project) return null

  return (
    <main
      ref={containerRef}
      className="relative w-full min-h-[100svh] desktop-lock bg-transparent text-white selection:bg-white selection:text-black"
    >
      <div className="transition-curtain fixed inset-0 z-[9999] bg-[#020203] pointer-events-none" />

      {webglReady && <WebGLScene />}

      <div key={slug} className="relative w-full min-h-[100svh] flex flex-col">
        <nav className="relative lg:absolute top-0 left-0 w-full pt-10 pb-4 px-6 md:px-10 z-[100] flex justify-between items-start pointer-events-none ui-element">
          <Link
            href="/"
            className="group font-mono text-[10px] tracking-[0.2em] uppercase text-white pointer-events-auto flex items-center gap-4 hover:text-white/60"
            style={{ transition: `color 300ms ${ease.mechanical}` }}
          >
            <span
              className="w-8 h-[1px] bg-white group-hover:w-12"
              style={{ transition: `width 300ms ${ease.silk}` }}
            />
            {t.return}
          </Link>
        </nav>

        <div className="w-full h-full flex-1 flex flex-col lg:justify-center px-6 md:px-12 lg:px-20 pb-32 lg:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-24 w-full max-w-[1920px] mx-auto items-center">
            <div
              className="col-span-1 lg:col-span-5 flex flex-col gap-6 lg:gap-8 z-10 mt-4 lg:mt-0 opacity-100 translate-x-0"
            >
              <div className="title-wrapper pb-4 min-h-[5rem] flex flex-wrap gap-x-4 md:gap-x-6">
                {project.title.split(" ").map((word, i) => (
                  <span
                    key={i}
                    className="flex pb-4"
                    style={{
                      clipPath: "inset(0 -100vw 0 0)",
                      paddingRight: "0.15em",
                    }}
                  >
                    {word.split("").map((char, j) => (
                      <span
                        key={j}
                        className="detail-title-char font-syne font-black uppercase tracking-[-0.05em] leading-[0.82] text-white inline-block"
                        style={{
                          fontSize: "clamp(3.5rem, 10vw, 7.5rem)",
                          paddingRight: j === word.length - 1 ? "0.08em" : "0.22em",
                          marginRight: j === word.length - 1 ? "0" : "-0.22em",
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                ))}
              </div>

              <div className="ui-element flex flex-col gap-1 mt-2">
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">{t.roleLabel}</span>
                <span className="font-syne text-xl font-bold uppercase tracking-wider">{project.role}</span>
              </div>

              <div className="ui-element">
                <p className="font-instrument text-base md:text-xl leading-relaxed text-white/80 font-light">
                  {project.description}
                </p>
              </div>

              <div className="ui-element pt-2 lg:pt-4">
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 border border-white/20 rounded-full font-mono text-[10px] tracking-widest uppercase text-white/70 bg-transparent backdrop-blur-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {project.liveUrl !== "#" && (
                <div className="ui-element pt-6 lg:pt-8">
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-4 text-white"
                  >
                    <span
                      className="font-syne font-bold uppercase tracking-widest text-sm relative z-10 group-hover:text-black"
                      style={{ transition: `color 500ms ${ease.mechanical}` }}
                    >
                      {t.liveSite}
                    </span>
                    <div
                      className="absolute inset-0 bg-white scale-x-0 origin-left group-hover:scale-x-100 -z-10 rounded-full -mx-4 px-4"
                      style={{ transition: `transform 500ms ${ease.silk}` }}
                    />
                    <span
                      className="font-mono text-sm group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10 group-hover:text-black"
                      style={{ transition: `transform 500ms ${ease.silk}, color 500ms ${ease.mechanical}` }}
                    >
                      ↗
                    </span>
                  </a>
                </div>
              )}
            </div>

            <div className="mac-window-wrapper col-span-1 lg:col-span-7 relative h-[60vh] lg:h-[75vh] w-full z-[150] mt-10 lg:mt-0">
              <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] lg:shadow-[0_60px_120px_rgba(0,0,0,0.85)] bg-[#050505] border border-white/10 flex flex-col rounded-[2rem] lg:rounded-[2.5rem]"
              >
                <div className="w-full h-10 lg:h-12 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-[#111111]/95 backdrop-blur-md group/mac relative z-10 cursor-default">
                  <div className="flex gap-2 lg:gap-2.5">
                    {/* Červené zavře projekt a vrátí na Home */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push("/")
                      }}
                      className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center outline-none cursor-pointer"
                    >
                      <span className="opacity-0 group-hover/mac:opacity-100 text-[#4c0000] text-[8px] leading-none mb-[1px] font-bold">
                        ✕
                      </span>
                    </button>
                    {/* Žluté a zelené jen pro design */}
                    <div className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#ffbd2e] flex items-center justify-center">
                      <span className="opacity-0 group-hover/mac:opacity-100 text-[#593e00] text-[8px] leading-none mb-[1px] font-bold">
                        −
                      </span>
                    </div>
                    <div className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#27c93f] flex items-center justify-center">
                      <span className="opacity-0 group-hover/mac:opacity-100 text-[#004d00] text-[8px] leading-none mb-[1px] font-bold">
                        ⤢
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-[8px] lg:text-[9px] text-white/30 tracking-widest uppercase pointer-events-none">
                    {new URL(project.liveUrl === "#" ? "https://internal.system" : project.liveUrl).hostname}
                  </div>
                  <div className="w-10 lg:w-12" />
                </div>

                <div
                  className="w-full h-full overflow-y-auto custom-scrollbar relative bg-[#020202] z-10 overscroll-none pointer-events-auto"
                  data-lenis-prevent="true"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <Image
                    src={project.image || "/placeholder.svg"}
                    alt={`${project.title} Interface`}
                    width={1440}
                    height={8000}
                    className="w-full h-auto block object-top"
                    priority
                    fetchPriority="high"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1440px"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="desktop-hide w-full flex justify-center mt-16 ui-element z-[200]">
            <button
              onClick={triggerNextProject}
              className="group flex flex-col items-center gap-4 text-white/50 hover:text-white pointer-events-auto outline-none"
              style={{ transition: `color 400ms ${ease.mechanical}` }}
            >
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-center">{t.nextProject}</span>
              <div
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-white"
                style={{ transition: `background 500ms ${ease.mechanical}, border-color 500ms ${ease.mechanical}` }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white group-hover:text-black group-hover:translate-y-1"
                  style={{ transition: `transform 500ms ${ease.silk}, color 500ms ${ease.mechanical}` }}
                >
                  <path
                    d="M13 1L1 13M1 13H9.4M1 13V4.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <div
          className="hidden desktop-indicator absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-4 opacity-100 mix-blend-difference pointer-events-none ui-element"
          style={{ transition: `opacity 500ms ${ease.silk}` }}
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/50 text-center">Iterate Sequence</span>
          <div className="w-5 h-8 border border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1 h-2 bg-white rounded-full animate-wheel-scroll" />
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (hover: hover) and (pointer: fine) {
          .desktop-lock { height: 100svh; overflow: hidden; }
          .desktop-indicator { display: flex; }
          .desktop-hide { display: none; }
        }

        @media (max-width: 1023px), (pointer: coarse) {
          .custom-scrollbar::-webkit-scrollbar { display: none; }
          .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
        @media (min-width: 1024px) and (pointer: fine) {
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
        }

        @keyframes wheel-scroll {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(12px); opacity: 0; }
        }
        .animate-wheel-scroll { animation: wheel-scroll 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
      `,
        }}
      />
    </main>
  )
}