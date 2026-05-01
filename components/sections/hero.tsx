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
  en: { dive: "Enter", locale: "EN / CZ" },
  cs: { dive: "Vstup", locale: "CZ / EN" },
}

export const Hero = () => {
  const containerRef = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const firstRowRef = useRef<HTMLSpanElement>(null)
  const secondRowRef = useRef<HTMLSpanElement>(null)
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
      const isBot = !!customEvent.detail?.isBot
      setAnimState({ ready: true, isBot })

      const alreadyPlayed = !!sessionStorage.getItem("preloader_played")
      if (alreadyPlayed || isBot) {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px)",
          clearProps: "willChange",
        })
        gsap.set(".hero-ui", { opacity: 1, y: 0 })
      } else {
        gsap.to([firstRowRef.current, secondRowRef.current], {
          opacity: 1,
          duration: 0.6,
          delay: 0.2,
          stagger: 0.04,
          ease: "power2.out",
        })
      }
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

  // Velocity-driven skew + tracking — rAF, zero re-renders, gated on visibility.
  useEffect(() => {
    if (!animState.ready || !isVisible) return
    let raf = 0
    const tick = () => {
      const { normalized, intensity } = velocityBus.get()
      const h1 = nameRef.current
      if (h1) {
        const skew = normalized * -4
        const tracking = -0.04 - intensity * 0.02
        h1.style.setProperty("--skew", `${skew}deg`)
        h1.style.setProperty("--track", `${tracking}em`)
      }
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
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px)",
          clearProps: "willChange",
        })
        gsap.set(".hero-ui", { opacity: 1, y: 0 })
      } else if (animState.ready) {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 110,
          opacity: 0,
          filter: "blur(14px)",
        })
        gsap.set(".hero-ui", { opacity: 0, y: 12 })

        const tl = gsap.timeline()
        tl.to(firstRowRef.current, {
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.4,
          ease: ease.silk,
        })
          .to(
            secondRowRef.current,
            {
              yPercent: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 1.4,
              ease: ease.silk,
            },
            "-=1.15"
          )
          .to(
            ".hero-ui",
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: ease.decay,
              stagger: 0.12,
            },
            "-=0.7"
          )
      } else {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 110,
          opacity: 0,
          filter: "blur(14px)",
        })
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
        <h1
          ref={nameRef}
          style={{
            ["--skew" as any]: "0deg",
            ["--track" as any]: "-0.04em",
            transform: "skewY(var(--skew))",
            letterSpacing: "var(--track)",
            fontFeatureSettings: '"ss01", "ss02", "cv01", "ss03"',
            willChange: "transform, letter-spacing",
            transition: "transform 120ms linear, letter-spacing 200ms linear",
            filter:
              "drop-shadow(0 2px 18px rgba(0,0,0,0.65)) drop-shadow(0 0 42px rgba(0,0,0,0.40)) drop-shadow(0 0 28px rgba(255,255,255,0.06))",
            color: "#ffffff",
          }}
          className="relative font-sans font-black leading-[0.82] uppercase text-center w-full flex flex-col items-center"
        >
          <span className="block overflow-hidden w-full">
            <span
              ref={firstRowRef}
              className="block whitespace-nowrap"
              style={{
                fontSize: "clamp(3.2rem, 15vw, 22rem)",
                marginLeft: "-0.04em",
                opacity: 0,
              }}
            >
              TOMÁŠ
            </span>
          </span>
          <span className="block overflow-hidden w-full -mt-[0.06em]">
            <span
              ref={secondRowRef}
              className="block"
              style={{
                fontSize: "clamp(2.2rem, 10.5vw, 15rem)",
                color: "rgba(255,255,255,0.94)",
                marginRight: "-0.04em",
                whiteSpace: "nowrap",
                opacity: 0,
              }}
            >
              KRATOCHVÍL
            </span>
          </span>
        </h1>

        <div
          className="hero-ui mt-10 flex items-center gap-4 font-mono text-[10px] tracking-[0.45em] uppercase text-white/60"
          style={{ textShadow: "0 0 16px rgba(0,0,0,0.75)" }}
        >
          <span className="block h-px w-10 bg-white/30" />
          <span>Creative Frontend Developer</span>
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