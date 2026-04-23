// components/sections/capabilities.tsx
"use client"

import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { velocityBus } from "@/lib/velocity-bus"
import { ease } from "@/lib/easing"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

const DICTIONARY = {
  en: { title: "Architecture" },
  cs: { title: "Architektura" },
}

const skillsData = [
  { text: "SYSTEM ARCHITECTURE", type: "solid",   desk: { x: 15, y: 20 } },
  { text: "NEXT.JS 16",          type: "outline", desk: { x: 50, y: 15 } },
  { text: "REACT 19",            type: "orange",  desk: { x: 80, y: 25 } },
  { text: "WEBGL",               type: "circle",  desk: { x: 20, y: 50 } },
  { text: "UI/UX",               type: "outline", desk: { x: 85, y: 55 } },
  { text: "PERFORMANCE",         type: "solid",   desk: { x: 15, y: 80 } },
  { text: "3D EXPERIENCES",      type: "outline", desk: { x: 50, y: 85 } },
  { text: "GSAP",                type: "orange",  desk: { x: 80, y: 85 } },
]

export const Capabilities = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language as keyof typeof DICTIONARY]
  const sectionRef   = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodesRef     = useRef<HTMLDivElement[]>([])
  const magneticRefs = useRef<HTMLDivElement[]>([])
  const textSpanRefs = useRef<HTMLSpanElement[]>([])

  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile]   = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const titleTextRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isMounted) return
    const el = titleTextRef.current
    if (!el) return

    const target = t.title
    const CHARS  = "0123456789ABCDEF!@#$%&*<>/?^~+=-|[]{}"
    const PER_CHAR_MS = 18   
    const WARMUP_MS   = 120  
    let raf = 0
    let start = 0

    const tick = (now: number) => {
      if (!start) start = now
      const elapsed = now - start
      let out = ""
      for (let i = 0; i < target.length; i++) {
        if (elapsed >= WARMUP_MS + i * PER_CHAR_MS) out += target[i]
        else if (target[i] === " ") out += " "
        else out += CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      el.textContent = out
      if (elapsed < WARMUP_MS + target.length * PER_CHAR_MS + 40) {
        raf = requestAnimationFrame(tick)
      } else {
        el.textContent = target
      }
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          raf = requestAnimationFrame(tick)
          obs.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    if (sectionRef.current) obs.observe(sectionRef.current)

    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      if (el) el.textContent = target
    }
  }, [isMounted, t.title])

  useGSAP(
    () => {
      if (!isMounted) return

      const timeout = setTimeout(() => {
        nodesRef.current.forEach((node, i) => {
          if (!node) return
          gsap.to(node, {
            y: `+=${isMobile ? Math.random() * 10 - 5 : Math.random() * 40 - 20}`,
            x: `+=${isMobile ? Math.random() * 8 - 4 : Math.random() * 30 - 15}`,
            duration: Math.random() * 3 + 4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * -0.7,
          })
        })
      }, 200)

      const titleEl = sectionRef.current?.querySelector(".cap-title")
      if (titleEl) {
        gsap.fromTo(
          titleEl,
          { opacity: 0, scale: 0.92, filter: "blur(12px)" },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.4,
            ease: ease.silk,
            scrollTrigger: { trigger: sectionRef.current, start: "top 85%" },
          }
        )
      }

      return () => clearTimeout(timeout)
    },
    { scope: sectionRef, dependencies: [isMounted, isMobile] }
  )

  // ── REGRESSION 02 FIX: Velocity rAF gated on mobile ───────────────
  useEffect(() => {
    if (!isMounted || isMobile) return
    let raf = 0
    const tick = () => {
      const { normalized, intensity } = velocityBus.get()
      const stretch = 1 + intensity * 0.08
      const skew    = normalized * 2
      for (const node of nodesRef.current) {
        if (!node) continue
        node.style.setProperty("--cap-stretch", `${stretch}`)
        node.style.setProperty("--cap-skew",    `${skew}deg`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isMounted, isMobile])

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (isMobile) return
    const el         = nodesRef.current[index]
    const magneticEl = magneticRefs.current[index]
    if (!el || !magneticEl) return
    const rect = el.getBoundingClientRect()
    const x    = (e.clientX - rect.left - rect.width  / 2) * 0.4
    const y    = (e.clientY - rect.top  - rect.height / 2) * 0.4
    gsap.to(magneticEl, {
      x, y, scale: 1.05,
      duration: 0.5,
      ease: ease.silk,
      overwrite: "auto",
    })
  }

  const handleMouseLeave = (index: number) => {
    const magneticEl = magneticRefs.current[index]
    if (magneticEl)
      gsap.to(magneticEl, {
        x: 0, y: 0, scale: 1,
        duration: 0.7,
        ease: ease.ballistic,
        overwrite: "auto",
      })
  }

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

    const magneticEl = magneticRefs.current[index]
    const textEl     = textSpanRefs.current[index]

    window.dispatchEvent(
      new CustomEvent("webgl-shoot", { detail: { x: e.clientX, y: e.clientY } })
    )

    if (magneticEl) {
      gsap.fromTo(
        magneticEl,
        { scale: 0.82 },
        {
          scale: 1,
          duration: 0.55,
          ease: ease.ballistic,
          overwrite: "auto",
        }
      )
    }

    if (textEl) {
      gsap.timeline({ overwrite: "auto" })
        .fromTo(
          textEl,
          {
            letterSpacing: "0.1em",
            filter: "blur(0px)",
            opacity: 1,
          },
          {
            letterSpacing: "0.55em",
            filter: "blur(3px)",
            opacity: 0.7,
            duration: 0.12,
            ease: "power4.out",
          }
        )
        .to(textEl, {
          letterSpacing: "0.1em",
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.85,
          ease: ease.silk,
        })
        .to(textEl, {
          letterSpacing: "0.06em",
          duration: 0.2,
          ease: ease.mechanical,
        })
        .to(textEl, {
          letterSpacing: "0.1em",
          duration: 0.4,
          ease: ease.silk,
        })
    }
  }

  if (!isMounted) return <section className="min-h-[100svh] bg-transparent" />

  return (
    // ── REGRESSION 02 FIX: Added 'isolate' to restore iOS overflow hidden ──
    <section
      ref={sectionRef}
      id="capabilities"
      className="relative isolate w-full min-h-[100svh] z-10 flex flex-col items-center justify-center overflow-hidden py-24 md:py-0"
    >
      <div className="cap-title relative md:absolute md:inset-0 flex items-center justify-center pointer-events-none z-10 px-4 mb-12 md:mb-0 w-full overflow-hidden md:overflow-visible">
        <h2 className="font-sans font-black text-[clamp(2.5rem,14vw,16rem)] uppercase tracking-[-0.05em] leading-[0.82] text-white/50 md:text-white/8 mix-blend-normal whitespace-nowrap w-full text-center">
          <span
            ref={titleTextRef}
            style={{ fontVariantNumeric: "tabular-nums", display: "inline-block" }}
          >
            {t.title}
          </span>
        </h2>
      </div>

      <div
        ref={containerRef}
        className="relative md:absolute md:inset-0 w-full md:h-full z-20 pointer-events-none max-w-[1600px] mx-auto flex flex-wrap content-center justify-center gap-3 px-4 md:px-0 md:block"
      >
        {skillsData.map((skill, i) => {
          let baseClasses =
            "flex items-center justify-center transition-shadow duration-500 will-change-transform shadow-2xl "
          let textClasses =
            "font-sans font-black tracking-widest uppercase pointer-events-none select-none "

          if (skill.type === "solid") {
            baseClasses +=
              "bg-white text-black px-5 py-3 md:px-10 md:py-6 rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            textClasses += "text-[10px] md:text-xs"
          } else if (skill.type === "outline") {
            baseClasses +=
              "bg-transparent border border-white/20 text-white px-5 py-3 md:px-10 md:py-6 rounded-full backdrop-blur-md hover:border-white hover:bg-white/5"
            textClasses += "text-[10px] md:text-xs"
          } else if (skill.type === "orange") {
            baseClasses +=
              "bg-[#ff2a00] text-white px-5 py-3 md:px-10 md:py-6 rounded-2xl hover:bg-white hover:text-[#ff2a00] hover:shadow-[0_0_30px_rgba(255,42,0,0.5)]"
            textClasses += "text-[10px] md:text-xs"
          } else if (skill.type === "circle") {
            baseClasses +=
              "bg-[#030303]/80 border border-white/10 text-white w-20 h-20 md:w-32 md:h-32 rounded-full backdrop-blur-md hover:border-[#ff2a00]"
            textClasses += "text-[9px] md:text-[10px] text-center leading-tight"
          }

          return (
            <div
              key={i}
              ref={(el) => { nodesRef.current[i] = el! }}
              className="relative md:absolute pointer-events-auto touch-none"
              style={
                isMobile ? {} : { left: `${skill.desk.x}%`, top: `${skill.desk.y}%` }
              }
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
              onPointerDown={(e) => handlePointerDown(e, i)}
            >
              <div
                ref={(el) => { magneticRefs.current[i] = el! }}
                className={baseClasses}
                // ── REGRESSION 02 FIX: Mobile transforms removed to stop bleeding ──
                style={{
                  ["--cap-stretch" as any]: 1,
                  ["--cap-skew"    as any]: "0deg",
                  transform: isMobile
                    ? undefined
                    : "translate(-50%, -50%) scaleY(var(--cap-stretch)) skewX(var(--cap-skew))",
                  willChange: isMobile ? undefined : "transform",
                  transition: isMobile
                    ? undefined
                    : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <span
                  ref={(el) => { textSpanRefs.current[i] = el! }}
                  className={textClasses}
                  style={{ willChange: "letter-spacing, filter, opacity" }}
                >
                  {skill.text}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}