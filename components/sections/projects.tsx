"use client"

import { useRef, useEffect, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease } from "@/lib/easing"
import { velocityBus } from "@/lib/velocity-bus"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.config({ ignoreMobileResize: true })
}

const DICTIONARY = {
  en: { titlePart1: "Digital", titlePart2: "Architectures.", label: "Selected · 2024—2026" },
  cs: { titlePart1: "Digitální", titlePart2: "Architektury.", label: "Vybrané · 2024—2026" },
}

const projects = [
  { id: "01", title: "ShuXiangLou", image: "/shu-xien-glou.vercel.app_.webp", slug: "shuxianglou" },
  { id: "02", title: "Kings Barber", image: "/kingsbarber-silk.vercel.app_.webp", slug: "kings-barber" },
]

// ─────────────────────────────────────────────────────────────────────────────
// HUD DECRYPTION PROTOCOL
// Geometric / monospace-friendly pool — glyphs that won't visually collapse
// against the Syne weight-900 display.
// ─────────────────────────────────────────────────────────────────────────────
const SCRAMBLE_POOL = "█▓▒░◆◉◈▲▼►◄#$%&*<>?:01XABCDEF/\\[]{}+-="

const decrypt = (el: HTMLElement, finalText: string, duration = 1.2) => {
  const total = finalText.length
  const durMs = duration * 1000
  const startT = performance.now()
  let raf = 0

  const step = () => {
    const t = Math.min(1, (performance.now() - startT) / durMs)
    // ease-out-cubic — fast initial reveal, settles cleanly at the lock
    const reveal = 1 - Math.pow(1 - t, 3)
    const locked = Math.floor(reveal * total)

    let out = ""
    for (let i = 0; i < total; i++) {
      const c = finalText[i]
      if (c === " ") {
        out += " "
        continue
      }
      if (i < locked) {
        out += c
      } else {
        out += SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0]
      }
    }
    el.textContent = out

    if (t < 1) {
      raf = requestAnimationFrame(step)
    } else {
      el.textContent = finalText
    }
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

// ─────────────────────────────────────────────────────────────────────────────
// CAST-IRON ASYMMETRIC SPRING — velocity-integrated, regime-aware.
//
// This is NOT a lerp. Each channel carries its own velocity, and the
// regime (accelerating toward target vs recovering past zero) is decided
// by the SIGN of velocity relative to the sign of error — not by the
// magnitude comparison used in first-pass implementations. That means
// the spring correctly enters RECOVERY when the mass overshoots and
// begins pulling back, producing the characteristic drift-past-zero
// settle that reads as a magnetised iron plate, not a CSS transition.
//
// Semi-implicit Euler keeps the integrator stable at 120Hz + dt-clamped
// to a 30fps floor so a dropped frame never injects energy.
// ─────────────────────────────────────────────────────────────────────────────
interface SpringState { pos: number; vel: number }
interface SpringConfig {
  kAccel: number  // stiffness on the attack — high = snappy engagement
  kRec:   number  // stiffness on recovery  — low  = magnetic drift
  bAccel: number  // damping on the attack
  bRec:   number  // damping on recovery   — under-damped so it overshoots
}

const CAST_IRON: SpringConfig = {
  kAccel: 380, kRec: 45,
  bAccel: 28,  bRec: 9.5,
}
const CAST_IRON_STRETCH: SpringConfig = {
  kAccel: 520, kRec: 68,
  bAccel: 34,  bRec: 12,
}

const stepSpring = (
  s: SpringState,
  target: number,
  dt: number,
  cfg: SpringConfig = CAST_IRON,
) => {
  const error = target - s.pos
  // Regime detection by velocity-direction, not magnitude. If velocity
  // is pushing us TOWARD the target (same sign as error) or we're near
  // rest, we're accelerating. Otherwise we've passed the target and
  // the spring is recovering.
  const accelerating =
    Math.sign(error) === Math.sign(s.vel) || Math.abs(s.vel) < 1e-3
  const k = accelerating ? cfg.kAccel : cfg.kRec
  const b = accelerating ? cfg.bAccel : cfg.bRec
  // Semi-implicit Euler — stable, causally correct.
  s.vel += (k * error - b * s.vel) * dt
  s.pos += s.vel * dt
  return s.pos
}

export const Projects = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language]

  const containerRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const bgWordRef = useRef<HTMLDivElement>(null)

  // Cached DOM refs — the rAF loop NEVER calls querySelector.
  const cardRefs = useRef<HTMLElement[]>([])
  const titleRefs = useRef<HTMLElement[]>([])
  const imgWrapRefs = useRef<HTMLDivElement[]>([])
  const chromaRRefs = useRef<HTMLDivElement[]>([])
  const chromaCRefs = useRef<HTMLDivElement[]>([])

  const [isVisible, setIsVisible] = useState(false)

  // Horizontal scroll pin — no local velocity math. The bus owns physics.
  useGSAP(
    () => {
      const track = trackRef.current
      if (!track) return

      const scrollAmount = () => Math.max(0, track.scrollWidth - window.innerWidth)

      gsap.to(track, {
        x: () => -scrollAmount(),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: () => `+=${scrollAmount()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    },
    { scope: containerRef },
  )

  // Visibility gate — rAF tilt loop only runs while in/near viewport.
  useEffect(() => {
    if (!containerRef.current) return
    const io = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: "300px",
    })
    io.observe(containerRef.current)
    return () => io.disconnect()
  }, [])

  // ───────────────────────────────────────────────────────────────────────────
  // SINGLE rAF LOOP — CACHED REFS + ASYMMETRIC SPRING
  // Direct style.setProperty on CSS variables. No React state in the hot path.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return
    let raf = 0
    const cards = cardRefs.current
    const bg = bgWordRef.current

    // Persistent spring state — lives across frames, reset on teardown.
    // Each channel has independent position AND velocity so the regime
    // switch happens CHANNEL-LOCALLY: one channel can be accelerating
    // while another is recovering.
    const sRotY      : SpringState = { pos: 0, vel: 0 }
    const sSkewX     : SpringState = { pos: 0, vel: 0 }
    const sBgSkew    : SpringState = { pos: 0, vel: 0 }
    const sBgStretch : SpringState = { pos: 1, vel: 0 }

    let lastT = performance.now()

    const tick = (now: number) => {
      // Clamp dt at 30fps floor. A dropped frame must NOT inject energy
      // into the integrator — that's how you get the "jump" artifact on
      // every other portfolio.
      const dt = Math.min((now - lastT) / 1000, 0.033)
      lastT = now

      const { normalized, intensity } = velocityBus.get()

      // Velocity-driven targets
      const tRotY      = -normalized * 5
      const tSkewX     =  normalized * 2
      const tBgSkew    =  normalized * -6
      const tBgStretch = 1 + intensity * 0.1

      // Semi-implicit Euler with regime-aware stiffness per channel
      stepSpring(sRotY,      tRotY,      dt)
      stepSpring(sSkewX,     tSkewX,     dt)
      stepSpring(sBgSkew,    tBgSkew,    dt)
      stepSpring(sBgStretch, tBgStretch, dt, CAST_IRON_STRETCH)

      const vw = window.innerWidth
      const viewportCenter = vw / 2
      const span = vw * 0.65

      for (let i = 0; i < cards.length; i++) {
        const el = cards[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const cardCenter = rect.left + rect.width / 2
        const rawOffset = (cardCenter - viewportCenter) / span
        const offset = Math.max(-1, Math.min(1, rawOffset))

        const posRotY = -offset * 30
        const posSkewX = offset * 6
        const posZ = -Math.abs(offset) * 180 - Math.abs(normalized) * 40
        const scale = 1 - Math.abs(offset) * 0.08 - intensity * 0.03

        el.style.setProperty("--rotY", `${posRotY + sRotY.pos}deg`)
        el.style.setProperty("--skewX", `${posSkewX + sSkewX.pos}deg`)
        el.style.setProperty("--z", `${posZ}px`)
        el.style.setProperty("--scale", `${scale}`)
      }

      if (bg) {
        bg.style.setProperty("--bg-skew", `${sBgSkew.pos}deg`)
        bg.style.setProperty("--bg-stretch", `${sBgStretch.pos}`)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isVisible])

  // ───────────────────────────────────────────────────────────────────────────
  // CARD ENTRANCE + HUD DECRYPTION
  // On entry into the pinned horizontal area, the card reveals AND the title
  // decrypts from noise into locked text. Width is pre-measured & locked with
  // min-width so the scramble can never cause layout jitter.
  // ───────────────────────────────────────────────────────────────────────────
  useGSAP(
    () => {
      const cleanups: Array<() => void> = []

      // Pre-measure + prime with [ CLASSIFIED ] before scramble fires
      titleRefs.current.forEach((titleEl) => {
        if (!titleEl) return
        const w = titleEl.getBoundingClientRect().width
        if (w > 0) titleEl.style.minWidth = `${Math.ceil(w)}px`
        titleEl.textContent = "[ CLASSIFIED ]"
      })

      const containerAnim = ScrollTrigger.getAll().find(
        (st) => st.pin === containerRef.current,
      )?.animation

      gsap.utils.toArray<HTMLElement>(".project-card-entrance").forEach((card, i) => {
        const titleEl = titleRefs.current[i]
        const finalText = projects[i]?.title ?? ""

        gsap.fromTo(
          card,
          { opacity: 0, y: 60, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.3,
            ease: ease.silk,
            scrollTrigger: {
              trigger: card,
              containerAnimation: containerAnim,
              start: "left 90%",
            },
            delay: i * 0.05,
            onStart: () => {
              if (titleEl) {
                const stop = decrypt(titleEl, finalText, 1.2)
                cleanups.push(stop)
              }
            },
          },
        )
      })

      gsap.fromTo(
        ".projects-title-char",
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.3,
          stagger: 0.03,
          ease: ease.silk,
          scrollTrigger: { trigger: containerRef.current, start: "top 85%" },
        },
      )

      return () => cleanups.forEach((fn) => fn())
    },
    { scope: containerRef, dependencies: [language] },
  )

  // ───────────────────────────────────────────────────────────────────────────
  // NUCLEAR MICRO-INTERACTION — RGB SPLIT GLITCH + SLOW HIGH-TENSION ZOOM
  // 80ms chromatic aberration spike (steps easing = no smoothing = pure glitch)
  // followed by a 2.6s expo.out zoom. Leaves the viewer with a sense of
  // violence → silence.
  // ───────────────────────────────────────────────────────────────────────────
  useGSAP(
    () => {
      const removers: Array<() => void> = []

      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const link = card.querySelector<HTMLAnchorElement>("a")
        const wrap = imgWrapRefs.current[i]
        const cR = chromaRRefs.current[i]
        const cC = chromaCRefs.current[i]
        if (!link || !wrap) return

        const onEnter = () => {
          const targets = [wrap, cR, cC].filter(Boolean) as Element[]
          gsap.killTweensOf(targets)

          // Zlověstný pomalý zoom, který buduje napětí
          gsap.to(wrap, { opacity: 1, duration: 0.4, ease: "power2.out" })
          gsap.to(wrap, { scale: 1.12, duration: 4, ease: "power1.out" })

          if (cR && cC) {
            // Vytvoříme samostatnou timeline s dlouhou pauzou mezi glitchemi (2.2 sekundy klid)
            const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.2 })

            tl.set([cR, cC], { opacity: 0.9 })
              // Brutální 40ms roztržení kanálů
              .to(cR, { x: () => gsap.utils.random(-8, 8), y: () => gsap.utils.random(-4, 4), duration: 0.04, ease: "steps(1)" })
              .to(cC, { x: () => gsap.utils.random(-8, 8), y: () => gsap.utils.random(-4, 4), duration: 0.04, ease: "steps(1)" }, "<")
              // Mikrotřesení samotného obrazu ve stejnou chvíli
              .to(wrap, { x: () => gsap.utils.random(-3, 3), duration: 0.04, ease: "steps(1)" }, "<")
              // Okamžitý návrat do absolutního klidu (do 40ms)
              .to([cR, cC], { x: 0, y: 0, opacity: 0, duration: 0.04, ease: "power2.out" })
              .to(wrap, { x: 0, duration: 0.04, ease: "power2.out" }, "<")

            // Uložíme referenci na timeline přímo na DOM element, abychom ji mohli zabít při onLeave
            ;(wrap as any).glitchTl = tl
          }
        }

        const onLeave = () => {
          const targets = [wrap, cR, cC].filter(Boolean) as Element[]
          gsap.killTweensOf(targets)
          
          // Bezpečné zabití nekonečné smyčky
          if ((wrap as any).glitchTl) {
            ;(wrap as any).glitchTl.kill()
          }

          // Sametový návrat do původního stavu
          gsap.to(wrap, {
            scale: 1,
            x: 0,
            y: 0,
            skewX: 0,
            opacity: 0.85,
            duration: 0.8,
            ease: "power3.out",
          })
          
          if (cR && cC) {
            gsap.to([cR, cC], { opacity: 0, x: 0, y: 0, duration: 0.15 })
          }
        }

        link.addEventListener("mouseenter", onEnter)
        link.addEventListener("mouseleave", onLeave)
        removers.push(() => {
          link.removeEventListener("mouseenter", onEnter)
          link.removeEventListener("mouseleave", onLeave)
        })
      })

      return () => removers.forEach((fn) => fn())
    },
    { scope: containerRef },
  )

  return (
    <section
      ref={containerRef}
      id="work"
      className="relative w-full h-[100vh] bg-transparent perspective-[2200px] overflow-hidden"
    >
      <div
        ref={bgWordRef}
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1] select-none"
        style={{
          ["--bg-skew" as any]: "0deg",
          ["--bg-stretch" as any]: 1,
        }}
      >
        <span
          className="font-syne font-black uppercase whitespace-nowrap tracking-[-0.06em] leading-[0.82] text-white/[0.05]"
          style={{
            fontSize: "clamp(4rem, 16vw, 17rem)",
            transform: "skewY(var(--bg-skew)) scaleY(var(--bg-stretch))",
            willChange: "transform",
            transition: `transform 160ms linear`,
          }}
        >
          WORK/LOG
        </span>
      </div>

      <div
        ref={trackRef}
        className="flex h-full items-center px-[5vw] md:px-[10vw] gap-[10vw] md:gap-[15vw] will-change-transform pr-[20vw] z-10 transform-style-3d relative"
      >
        <div className="flex-shrink-0 w-[90vw] md:w-auto md:min-w-[45vw] relative z-20 pointer-events-none transform-gpu">
          <span className="font-mono text-[10px] tracking-[0.5em] text-white/50 uppercase block mb-6">
            {t.label}
          </span>
          <h2
            className="font-syne font-black uppercase tracking-[-0.05em] leading-[0.82] text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            style={{ fontSize: "clamp(5rem, 14vw, 14rem)", fontFeatureSettings: '"ss01","ss02"' }}
          >
            <span className="block whitespace-nowrap" style={{ clipPath: "inset(0 -100vw 0 0)" }}>
              <span className="projects-title-char inline-block">{t.titlePart1}</span>
            </span>
            <span
              className="block whitespace-nowrap -mt-[0.08em]"
              style={{ clipPath: "inset(-0.15em -100vw 0 0)" }}
            >
              <span className="projects-title-char inline-block font-instrument italic font-light lowercase text-white/70">
                {t.titlePart2}
              </span>
            </span>
          </h2>
          <div className="mt-8 flex items-center gap-4 font-mono text-[10px] tracking-[0.4em] uppercase text-white/40">
            <span className="block h-px w-10 bg-white/30" />
            <span>{"Scroll →"}</span>
          </div>
        </div>

        {projects.map((p, index) => (
          <div
            key={p.id}
            className="project-card-entrance relative w-[85vw] md:w-[55vw] aspect-[3/4] md:aspect-[16/10] flex-shrink-0 z-50"
            style={{
              opacity: 0,
              willChange: "transform, opacity, filter",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              ref={(el) => {
                if (el) cardRefs.current[index] = el
              }}
              className="project-card relative w-full h-full group transform-gpu will-change-transform"
              style={{
                ["--rotY" as any]: "0deg",
                ["--skewX" as any]: "0deg",
                ["--z" as any]: "0px",
                ["--scale" as any]: 1,
                transform:
                  "rotateY(var(--rotY)) skewX(var(--skewX)) translateZ(var(--z)) scale(var(--scale))",
                // ZMĚNĚNO: Odstraněn CSS transition. Fyziku teď 100% řídí asymLerp v JS.
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute -top-8 md:-top-12 -left-2 md:-left-6 z-0 pointer-events-none hidden md:block"
                style={{ transform: "translateZ(-80px)" }}
              >
                <span
                  className="font-syne font-black uppercase tracking-[-0.04em] leading-none text-white/10"
                  style={{ fontSize: "clamp(6rem, 10vw, 12rem)" }}
                >
                  {p.id}
                </span>
              </div>

              <Link
                href={`/work/${p.slug}`}
                draggable={false}
                aria-label={`View case study for ${p.title}`}
                data-cursor="hover"
                className="relative block w-full h-full rounded-xl md:rounded-[2rem] overflow-hidden border border-white/10 bg-[#050505] shadow-[0_40px_80px_rgba(0,0,0,0.9)] pointer-events-auto cursor-pointer"
              >
                {/* Primary image — lives inside a GSAP-driven wrapper for the zoom/glitch */}
                <div
                  ref={(el) => {
                    if (el) imgWrapRefs.current[index] = el
                  }}
                  className="absolute inset-0 will-change-transform transform-gpu"
                  style={{ opacity: 0.85 }}
                >
                  <Image
                    src={p.image || "/placeholder.svg"}
                    alt={`Screenshot of ${p.title}`}
                    fill
                    draggable={false}
                    quality={100}
                    sizes="(max-width: 768px) 85vw, (max-width: 1200px) 60vw, 1100px"
                    className="object-cover object-top select-none"
                    priority={index === 0}
                  />
                </div>

                {/* RGB split — RED channel (cheap CSS filter hue-shift of the same source) */}
                <div
                  ref={(el) => {
                    if (el) chromaRRefs.current[index] = el
                  }}
                  aria-hidden
                  className="absolute inset-0 pointer-events-none z-10" // ZMĚNĚNO: Přidán z-10
                  style={{
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "top",
                    mixBlendMode: "screen",
                    opacity: 0,
                    filter: "sepia(1) saturate(14) hue-rotate(-50deg) brightness(1.15)",
                    willChange: "opacity, transform",
                  }}
                />
                {/* RGB split — CYAN channel */}
                <div
                  ref={(el) => {
                    if (el) chromaCRefs.current[index] = el
                  }}
                  aria-hidden
                  className="absolute inset-0 pointer-events-none z-10" // ZMĚNĚNO: Přidán z-10
                  style={{
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "top",
                    mixBlendMode: "screen",
                    opacity: 0,
                    filter: "sepia(1) saturate(14) hue-rotate(150deg) brightness(1.15)",
                    willChange: "opacity, transform",
                  }}
                />

                {/* ZMĚNĚNO: Přidán z-0, aby gradient podlezl glitch efekt */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/10 to-transparent opacity-90 pointer-events-none z-0" />

                <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20 pointer-events-none">
                  <span className="font-mono text-[9px] tracking-[0.4em] text-white/50 uppercase">
                    {p.id} · CASE
                  </span>
                </div>

                <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 z-20 pointer-events-none">
                  <h3
                    ref={(el) => {
                      if (el) titleRefs.current[index] = el
                    }}
                    className="font-syne font-black uppercase tracking-[-0.04em] leading-none text-white group-hover:translate-x-2 whitespace-nowrap"
                    style={{
                      fontSize: "clamp(2.5rem, 5.5vw, 5rem)",
                      transition: `transform 500ms ${ease.silk}`,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.title}
                  </h3>
                </div>

                <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-20 pointer-events-none">
                  <div
                    className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md group-hover:bg-white group-hover:border-white"
                    style={{
                      transition: `background 500ms ${ease.mechanical}, border-color 500ms ${ease.mechanical}`,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-white group-hover:text-black group-hover:translate-x-1 group-hover:-translate-y-1"
                      style={{
                        transition: `transform 500ms ${ease.silk}, color 500ms ${ease.mechanical}`,
                      }}
                    >
                      <path
                        d="M1 13L13 1M13 1H4.6M13 1V9.4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `.transform-style-3d { transform-style: preserve-3d; }` }} />
    </section>
  )
}
