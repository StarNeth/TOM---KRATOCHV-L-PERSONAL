"use client"

import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { velocityBus } from "@/lib/velocity-bus"
import { ease } from "@/lib/easing"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

const DICTIONARY = {
  en: { dive: "Enter System", locale: "EN / CZ" },
  cs: { dive: "Vstoupit do systému", locale: "CZ / EN" },
}

export const Hero = () => {
  const containerRef = useRef<HTMLElement>(null)
  const tickerRef = useRef<HTMLSpanElement>(null)
  const { language } = useLanguage()
  const content = DICTIONARY[language as keyof typeof DICTIONARY]

  const [animState, setAnimState] = useState<{ ready: boolean; isBot: boolean }>(
    () => {
      if (typeof window === "undefined") return { ready: false, isBot: false }
      if (sessionStorage.getItem("preloader_played")) {
        const isBot = /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(
          navigator.userAgent
        )
        return { ready: true, isBot }
      }
      return { ready: false, isBot: false }
    }
  )

  // Visibility gate for the velocity rAF — keeps it from burning CPU after
  // the hero is scrolled past. Combined with animState.ready, the loop only
  // fires while (a) the hero is mounted+revealed AND (b) on-screen.
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("webgl-transition", { detail: { value: 0, color: -1 } })
    )
  }, [])

  useEffect(() => {
    const triggerAnim = (e: Event) => {
      const customEvent = e as CustomEvent
      setAnimState({ ready: true, isBot: !!customEvent.detail?.isBot })
    }
    window.addEventListener("preloader-complete", triggerAnim)

    const failsafe = window.setTimeout(() => {
      setAnimState((prev) =>
        prev.ready ? prev : { ready: true, isBot: false }
      )
    }, 1800)

    return () => {
      window.removeEventListener("preloader-complete", triggerAnim)
      window.clearTimeout(failsafe)
    }
  }, [])

  // IntersectionObserver — pause rAF when hero is out of view.
  useEffect(() => {
    if (!containerRef.current) return
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "100px" }
    )
    io.observe(containerRef.current)
    return () => io.disconnect()
  }, [])

  // Velocity-driven ticker drift — rAF, zero re-renders, gated on visibility.
  // The h1 skew/tracking writes were removed when the title moved to WebGL;
  // the bottom ticker remains in the DOM and still reads the velocity bus.
  useEffect(() => {
    if (!animState.ready || !isVisible) return
    let raf = 0
    const tick = () => {
      const { normalized } = velocityBus.get()
      if (tickerRef.current) {
        const drift = Math.round(normalized * 40)
        tickerRef.current.style.setProperty("--drift", `${drift}px`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animState.ready, isVisible])

  useGSAP(
    () => {
      const alreadyPlayed =
        typeof window !== "undefined" &&
        !!sessionStorage.getItem("preloader_played")

      if (alreadyPlayed || animState.isBot) {
        gsap.set(".hero-ui", { opacity: 1, y: 0 })
      } else if (animState.ready) {
        gsap.set(".hero-ui", { opacity: 0, y: 12 })

        gsap.to(".hero-ui", {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: ease.decay,
          stagger: 0.12,
          delay: 0.25,
        })
      } else {
        gsap.set(".hero-ui", { opacity: 0, y: 12 })
      }

      gsap.to(containerRef.current, {
        yPercent: 18,
        opacity: 0,
        filter: "blur(14px)",
        ease: ease.mechanical,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    },
    { scope: containerRef, dependencies: [animState.ready, animState.isBot] }
  )

  return (
    <section
      ref={containerRef}
      className="relative h-[100svh] w-full flex flex-col justify-center items-center z-10 perspective-[1000px] overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.14) 55%, rgba(0,0,0,0) 85%)",
        }}
      />

      <div
        className="hero-ui absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-left font-mono text-[9px] tracking-[0.6em] text-white/45 uppercase pointer-events-none z-[2]"
        style={{ textShadow: "0 0 12px rgba(0,0,0,0.7)" }}
      >
        {content.locale}
      </div>
      <div
        className="hero-ui absolute right-4 top-1/2 -translate-y-1/2 rotate-90 origin-right font-mono text-[9px] tracking-[0.6em] text-white/45 uppercase pointer-events-none z-[2]"
        style={{ textShadow: "0 0 12px rgba(0,0,0,0.7)" }}
      >
        N 50.0755 · E 14.4378
      </div>

      <div className="relative z-[3] flex flex-col items-center w-full max-w-[100vw] px-4 sm:px-6">
        <span
          aria-label="Tomáš Kratochvíl"
          role="heading"
          aria-level={1}
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Tomáš Kratochvíl
        </span>

        <div
          className="hero-ui mt-10 flex items-center gap-4 font-mono text-[10px] tracking-[0.45em] uppercase text-white/60"
          style={{ textShadow: "0 0 16px rgba(0,0,0,0.75)" }}
        >
          <span className="block h-px w-10 bg-white/30" />
          <span>System Architect</span>
          <span className="block h-px w-10 bg-white/30" />
        </div>
      </div>

      <div className="hero-ui absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[4] text-white pointer-events-auto">
        <div className="w-[1px] h-10 bg-gradient-to-b from-white/0 via-white/40 to-white/0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-[bounce_2s_infinite]" />
        </div>
        <span
          ref={tickerRef}
          style={{
            ["--drift" as any]: "0px",
            transform: "translateX(var(--drift))",
            willChange: "transform",
            transition: "transform 180ms linear",
            textShadow: "0 0 14px rgba(0,0,0,0.75)",
          }}
          className="font-mono text-[9px] tracking-[0.6em] text-white/55 uppercase"
        >
          {content.dive}
        </span>
      </div>
    </section>
  )
}
