"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"

// SSR OFF — three / postprocessing reference window at module init.
const WebGLSceneDynamic = dynamic(
  () => import("@/components/webgl/scene").then((mod) => mod.WebGLScene),
  {
    ssr: false,
    loading: () => <div aria-hidden className="fixed inset-0 pointer-events-none" />,
  },
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
    nextProject: "Advance Sequence",
    loading: "LOADING...",
    livePreview: "LIVE PREVIEW",
    iterate: "Iterate Sequence",
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
    nextProject: "Postoupit Sekvenci",
    loading: "NAČÍTÁNÍ...",
    livePreview: "ŽIVÝ NÁHLED",
    iterate: "Iterovat Sekvenci",
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

// Lock icon — single SVG, draws as 12px next to the URL. Keeps the chrome
// declarative; no font-icon dependency, no emoji.
const LockIcon = () => (
  <svg
    aria-hidden
    width="10"
    height="10"
    viewBox="0 0 10 10"
    className="text-bone/55 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
  >
    <rect x="2" y="4.5" width="6" height="4" rx="0.5" />
    <path d="M3.5 4.5 V 3 a1.5 1.5 0 0 1 3 0 V 4.5" />
  </svg>
)

export default function ProjectDetail() {
  const params = useParams()
  const router = useRouter()
  const slug = params.id as string
  const { language } = useLanguage()

  const currentLang = (language as keyof typeof DICTIONARY) || "en"
  const t = DICTIONARY[currentLang]
  const project = t?.projects[slug as keyof typeof t.projects]

  // Address line — "PROJECT / 0x0{n}" where n = position in PROJECT_ORDER + 1.
  // Stable across language switches; falls back to 0x00 for unknown slugs.
  const projectAddress = (() => {
    const idx = PROJECT_ORDER.indexOf(slug)
    return `PROJECT / 0x0${(idx + 1).toString(16).toUpperCase()}`
  })()

  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioning = useRef(false)
  const [advancing, setAdvancing] = useState(false)

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
        },
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
        },
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
        },
      )
    },
    { scope: containerRef, dependencies: [slug, project?.title] },
  )

  // ── webgl-transition CONTRACT — INVIOLABLE ──
  // The scene's uTransition uniform is driven by these custom events. The
  // entry pulse rises to 0.85 then decays to 0 in 1.6s; on unmount we emit
  // a hard zero. Do not touch the cadence or the event shape — the scene's
  // ASCII matrix dissolve depends on the value passing the >0.001 threshold.
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
            new CustomEvent("webgl-transition", { detail: { value: obj.v, color: project.zone } }),
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
    setAdvancing(true) // mobile button flips to "LOADING..." immediately

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
          new CustomEvent("webgl-transition", { detail: { value: obj.v, color: project.zone } }),
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
    [triggerNextProject],
  )

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  if (!project) return null

  // Pre-compute the URL pieces — host (high-emphasis) + path (muted),
  // so the chrome reads as a real address bar instead of a label.
  const safeUrl = project.liveUrl === "#" ? "https://internal.system" : project.liveUrl
  const urlObj = new URL(safeUrl)

  return (
    <main
      ref={containerRef}
      className="relative w-full min-h-[100svh] desktop-lock bg-transparent text-bone selection:bg-bone selection:text-bg-deep"
    >
      <div className="transition-curtain fixed inset-0 z-[9999] bg-bg-deep pointer-events-none" />

      {webglReady && <WebGLScene />}

      <div key={slug} className="relative w-full min-h-[100svh] flex flex-col">
        <nav className="relative lg:absolute top-0 left-0 w-full pt-10 pb-4 px-6 md:px-10 z-[100] flex justify-between items-start pointer-events-none ui-element">
          <Link
            href="/"
            className="group font-mono text-[10px] tracking-[0.2em] uppercase text-bone pointer-events-auto flex items-center gap-4 hover:text-bone/60"
            style={{ transition: `color 300ms ${ease.mechanical}` }}
          >
            <span
              className="w-8 h-px bg-bone group-hover:w-12"
              style={{ transition: `width 300ms ${ease.silk}` }}
            />
            {t.return}
          </Link>
        </nav>

        <div className="w-full h-full flex-1 flex flex-col lg:justify-center px-6 md:px-12 lg:px-20 pb-32 lg:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-24 w-full max-w-[1920px] mx-auto items-center">
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-6 lg:gap-8 z-10 mt-4 lg:mt-0 opacity-100 translate-x-0">
              {/* Address line — system-style identifier, monospace, sits
                  ABOVE the title to anchor the page in the architecture. */}
              <div className="ui-element flex items-center gap-3 font-mono text-[10px] tracking-[0.4em] uppercase text-bone/55">
                <span aria-hidden className="block w-6 h-px bg-rule-strong" />
                <span className="text-bone/85" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {projectAddress}
                </span>
              </div>

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
                        className="detail-title-char font-syne font-black uppercase tracking-[-0.05em] leading-[0.82] text-bone inline-block"
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
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-bone/40">{t.roleLabel}</span>
                <span className="font-syne text-xl font-bold uppercase tracking-wider">{project.role}</span>
              </div>

              <div className="ui-element">
                <p className="font-instrument text-base md:text-xl leading-relaxed text-bone/80 font-light">
                  {project.description}
                </p>
              </div>

              {/* Tech stack — zero-radius rectangles with 1px --rule
                  border. Reads as a declarative spec list instead of UI
                  pills. Hover lifts the rule to --rule-strong. */}
              <div className="ui-element pt-2 lg:pt-4">
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 border border-rule font-mono text-[10px] tracking-widest uppercase text-bone/70 bg-bg-deep/40 backdrop-blur-sm rounded-none hover:border-rule-strong hover:text-bone"
                      style={{
                        transition: `border-color 280ms ${ease.mechanical}, color 280ms ${ease.mechanical}`,
                      }}
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
                    className="group relative inline-flex items-center gap-4 text-bone"
                  >
                    <span
                      className="font-syne font-bold uppercase tracking-widest text-sm relative z-10 group-hover:text-bg-deep"
                      style={{ transition: `color 500ms ${ease.mechanical}` }}
                    >
                      {t.liveSite}
                    </span>
                    <div
                      className="absolute inset-0 bg-bone scale-x-0 origin-left group-hover:scale-x-100 -z-10 -mx-4 px-4 rounded-none"
                      style={{ transition: `transform 500ms ${ease.silk}` }}
                    />
                    <span
                      className="font-mono text-sm group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10 group-hover:text-bg-deep"
                      style={{ transition: `transform 500ms ${ease.silk}, color 500ms ${ease.mechanical}` }}
                    >
                      ↗
                    </span>
                  </a>
                </div>
              )}
            </div>

            {/* Window chrome — title bar darkened to rgba(8,8,10), traffic
                lights followed by static "LIVE PREVIEW" label, then the
                full URL in a centered address bar with a lock icon. Only
                the red light is interactive (closes back to /). */}
            <div className="mac-window-wrapper col-span-1 lg:col-span-7 relative h-[60vh] lg:h-[75vh] w-full z-[150] mt-10 lg:mt-0">
              <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden bg-bg-deep border border-rule flex flex-col rounded-none crt-frame"
                style={{
                  boxShadow:
                    "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,243,236,0.04) inset",
                }}
              >
                <div
                  className="w-full h-9 lg:h-11 flex-shrink-0 border-b border-rule flex items-center px-3 lg:px-5 gap-3 lg:gap-4 backdrop-blur-md group/mac relative z-10 cursor-default"
                  style={{ background: "rgba(8,8,10,0.95)" }}
                >
                  {/* Traffic lights */}
                  <div className="flex gap-2 lg:gap-2.5 flex-shrink-0">
                    {/* Červené zavře projekt a vrátí na Home */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push("/")
                      }}
                      aria-label="Close to home"
                      className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center outline-none cursor-pointer"
                    >
                      <span className="opacity-0 group-hover/mac:opacity-100 text-[#4c0000] text-[8px] leading-none mb-px font-bold">
                        ✕
                      </span>
                    </button>
                    {/* Žluté a zelené jen pro design */}
                    <div aria-hidden className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#ffbd2e]" />
                    <div aria-hidden className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#27c93f]" />
                  </div>

                  {/* LIVE PREVIEW — static label, monospace, with a tiny
                      amber dot to make the "LIVE" word literal. */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      aria-hidden
                      className="block w-1.5 h-1.5 rounded-full bg-amber"
                      style={{ boxShadow: "0 0 6px var(--amber)" }}
                    />
                    <span className="font-mono text-[8px] lg:text-[9px] tracking-[0.32em] uppercase text-bone/65">
                      {t.livePreview}
                    </span>
                  </div>

                  {/* Address bar — full URL split into protocol·host·path
                      so the host wears the higher emphasis. */}
                  <div
                    className="flex-1 mx-2 hidden md:flex items-center gap-2 h-6 lg:h-7 px-2.5 border border-rule rounded-none bg-bg-deep/60 font-mono text-[9px] lg:text-[10px] text-bone/55 truncate"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    <LockIcon />
                    <span className="text-bone/35">{urlObj.protocol}//</span>
                    <span className="text-bone/85 truncate">{urlObj.hostname}</span>
                    <span className="text-bone/45 truncate">{urlObj.pathname === "/" ? "" : urlObj.pathname}</span>
                  </div>

                  {/* Mobile-only compact host */}
                  <div className="flex-1 md:hidden font-mono text-[9px] tracking-widest uppercase text-bone/40 text-center truncate">
                    {urlObj.hostname}
                  </div>

                  <div className="w-10 lg:w-12 flex-shrink-0" />
                </div>

                <div
                  className="w-full h-full overflow-y-auto custom-scrollbar relative bg-bg-deep z-10 overscroll-none pointer-events-auto"
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

          {/* Mobile-only Advance Sequence — full-width, square, with the
              "LOADING..." flash that appears the moment the user taps. The
              router.push happens inside triggerNextProject after the GSAP
              transition completes (~1.7s); the flash bridges that gap. */}
          <div className="desktop-hide w-full mt-16 ui-element z-[200]">
            <button
              onClick={triggerNextProject}
              disabled={advancing}
              className="group w-full h-14 border border-rule-strong rounded-none flex items-center justify-center gap-3 text-bone bg-bg-deep/40 hover:bg-bone hover:text-bg-deep pointer-events-auto outline-none disabled:opacity-90 disabled:cursor-not-allowed"
              style={{
                transition: `background 360ms ${ease.mechanical}, color 360ms ${ease.mechanical}`,
              }}
            >
              <span
                className="font-mono text-[10px] tracking-[0.4em] uppercase"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {advancing ? t.loading : t.nextProject}
              </span>
              {!advancing && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                  className="text-bone group-hover:text-bg-deep group-hover:translate-y-1"
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
              )}
            </button>
          </div>
        </div>

        <div
          className="hidden desktop-indicator absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-4 opacity-100 mix-blend-difference pointer-events-none ui-element"
          style={{ transition: `opacity 500ms ${ease.silk}` }}
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-bone/55 text-center">
            {t.iterate}
          </span>
          <div className="w-5 h-8 border border-rule-strong rounded-full flex justify-center p-1">
            <div className="w-1 h-2 bg-bone rounded-full animate-wheel-scroll" />
          </div>
        </div>
      </div>

      {/* Page-scoped styles —
          .crt-frame::after paints CRT scanlines OVER the mac window on
            desktop only. Pointer-events: none and z-index controlled so it
            never intercepts wheel/click events on the iframe-style scroll
            region. Mobile sets opacity 0 — too coarse to read and the cost
            of a fixed-position blend layer isn't justified.
          .custom-scrollbar — desktop-only thin scrollbar; mobile hidden.
          .animate-wheel-scroll — the iterate-sequence affordance. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (hover: hover) and (pointer: fine) {
          .desktop-lock { height: 100svh; overflow: hidden; }
          .desktop-indicator { display: flex; }
          .desktop-hide { display: none; }
        }

        .crt-frame { position: relative; }
        .crt-frame::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 20;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(245,243,236,0.045) 0,
            rgba(245,243,236,0.045) 1px,
            transparent 1px,
            transparent 3px
          );
          mix-blend-mode: overlay;
          opacity: 0;
        }
        @media (hover: hover) and (pointer: fine) {
          .crt-frame::after { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .crt-frame::after { opacity: 0; }
        }

        @media (max-width: 1023px), (pointer: coarse) {
          .custom-scrollbar::-webkit-scrollbar { display: none; }
          .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
        @media (min-width: 1024px) and (pointer: fine) {
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245,243,236,0.2); border-radius: 0; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(245,243,236,0.4); }
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
