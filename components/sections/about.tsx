"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { MeshDistortMaterial, Float } from "@react-three/drei"
import * as THREE from "three"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease } from "@/lib/easing"
import { velocityBus } from "@/lib/velocity-bus"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

const DICTIONARY = {
  en: {
    sectionLabel: "About",
    backgroundWord: "REACTOR",
    mainTitlePart1: "Engineering",
    mainTitlePart2: "precision.",
    methodologyTitle: "Methodology",
    methodologyPoints: ["Root Cause Analysis.", "Zero-Error Tolerance.", "Systematic Diagnostics."],
    capTitle: "Capabilities",
    capabilities: ["Frontend Architecture", "WebGL / 3D Experiences", "UI/UX Engineering", "OSINT & Security"],
    narrativeTitlePart1: "My background does not lie in traditional design agencies.",
    narrativeTitlePart2: "It lies in the primary circuit of a nuclear reactor.",
    paragraph1:
      "As a former diagnostics specialist for 6-9 kV protections at the Dukovany Nuclear Power Plant, I was trained in an environment with zero tolerance for failure.",
    paragraph2:
      "I do not just write code. I engineer digital infrastructure. I bring the rigorous mindset of Root Cause Analysis and systematic problem-solving into frontend development, integrating complex WebGL experiences and AI-driven architectures with uncompromising stability.",
  },
  cs: {
    sectionLabel: "O mně",
    backgroundWord: "REAKTOR",
    mainTitlePart1: "Inženýrská",
    mainTitlePart2: "přesnost.",
    methodologyTitle: "Metodologie",
    methodologyPoints: ["Analýza kořenových příčin.", "Nulová tolerance chyb.", "Systematická diagnostika."],
    capTitle: "Schopnosti",
    capabilities: ["Architektura Frontendu", "WebGL / 3D Zážitky", "UI/UX Inženýrství", "OSINT & Bezpečnost"],
    narrativeTitlePart1: "Mé zázemí neleží v tradičních designových agenturách.",
    narrativeTitlePart2: "Leží v primárním okruhu jaderného reaktoru.",
    paragraph1:
      "Jako bývalý specialista diagnostiky ochran 6-9 kV v Jaderné elektrárně Dukovany jsem byl vycvičen v prostředí s absolutně nulovou tolerancí k selhání.",
    paragraph2:
      "Nepíšu jen kód. Projektuji digitální infrastrukturu. Do frontendového vývoje přináším striktní analytické myšlení, kde integruji komplexní WebGL zážitky a architektury řízené umělou inteligencí do nekompromisně stabilních systémů.",
  },
}

// ── AMBIENT 3D ──────────────────────────────────────────────────────────
const DarkGlassShape = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
    meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.05
  })
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={1.2}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <MeshDistortMaterial
          color="#050505"
          envMapIntensity={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.9}
          roughness={0.1}
          distort={0.4}
          speed={1.5}
        />
      </mesh>
    </Float>
  )
}

const Lazy3DBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldRender, setShouldRender] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if ("requestIdleCallback" in window) {
            ;(window as any).requestIdleCallback(() => setShouldRender(true), { timeout: 1000 })
          } else {
            setTimeout(() => setShouldRender(true), 200)
          }
        }
      },
      { rootMargin: "100px 0px", threshold: 0.1 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none opacity-40">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center">
        {shouldRender && (
          <Canvas
            camera={{ position: [0, 0, 6] }}
            dpr={isMobile ? [0.5, 0.75] : [1, 1.5]}
            gl={{ powerPreference: isMobile ? "low-power" : "high-performance", antialias: !isMobile }}
          >
            <ambientLight intensity={1} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <DarkGlassShape />
          </Canvas>
        )}
      </div>
    </div>
  )
}

// Utility — wrap each word of a sentence in a mask for line reveal.
// IMPORTANT: mask needs TOP padding (diacritics like Á, Í, ě) and BOTTOM
// padding (descenders like g, y, p). Without it, Czech text gets chipped.
const MaskedSentence = ({ text, className }: { text: string; className?: string }) => {
  const words = text.split(" ")
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block align-middle mr-[0.25em]"
          style={{
            // `overflow: clip` hides overflow without creating a scroll
            // container. Padding reserves room for diacritics/descenders.
            overflow: "clip",
            paddingTop: "0.28em",
            paddingBottom: "0.28em",
            marginTop: "-0.28em",
            marginBottom: "-0.28em",
          }}
        >
          <span
            className="about-word inline-block"
            style={{ transform: "translateY(110%)", opacity: 0 }}
          >
            {w}
          </span>
        </span>
      ))}
    </span>
  )
}

export const About = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language]
  const containerRef = useRef<HTMLElement>(null)
  const bgWordRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  // Velocity-driven skew on the massive bg word.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = bgWordRef.current
      if (el) {
        const { normalized, intensity } = velocityBus.get()
        el.style.setProperty("--bg-skew", `${normalized * -8}deg`)
        el.style.setProperty("--bg-shift", `${normalized * -40}px`)
        el.style.setProperty("--bg-stretch", `${1 + intensity * 0.12}`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useGSAP(
    () => {
      // Word-level masked reveal with stagger — the signature move.
      const wordGroups = gsap.utils.toArray<HTMLElement>(".reveal-group")
      wordGroups.forEach((group) => {
        const words = group.querySelectorAll<HTMLElement>(".about-word")
        gsap.to(words, {
          y: "0%",
          opacity: 1,
          duration: 1.1,
          stagger: 0.045,
          ease: ease.silk,
          scrollTrigger: { trigger: group, start: "top 82%" },
        })
      })

      // Editorial lines
      gsap.utils.toArray<HTMLElement>(".editorial-line").forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.3,
            ease: ease.mechanical,
            scrollTrigger: { trigger: line, start: "top 90%" },
          }
        )
      })

      // Section label pulse
      gsap.fromTo(
        ".section-label",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: ease.decay,
          scrollTrigger: { trigger: containerRef.current, start: "top 80%" },
        }
      )

      // Background word scroll-linked translation (parallax drift)
      if (bgWordRef.current) {
        gsap.to(bgWordRef.current, {
          xPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        })
      }
    },
    { scope: containerRef, dependencies: [language] }
  )

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || isMobile) return
    const x = (e.clientX / window.innerWidth - 0.5) * 20
    const y = (e.clientY / window.innerHeight - 0.5) * 20
    gsap.to(".mouse-parallax", { x, y, duration: 1, ease: ease.silk })
  }

  return (
    <section
      ref={containerRef}
      id="about"
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-[150vh] bg-transparent text-white pt-32 pb-48 z-10 overflow-hidden"
    >
      <Lazy3DBackground />

      {/* ── TYPOGRAPHIC VIOLENCE: screen-bleeding word, velocity-skewed ── */}
      <div
        ref={bgWordRef}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-0 right-0 -translate-y-1/2 z-[1] select-none"
        style={{
          ["--bg-skew" as any]: "0deg",
          ["--bg-shift" as any]: "0px",
          ["--bg-stretch" as any]: 1,
          transform:
            "translate(var(--bg-shift), -50%) skewY(var(--bg-skew)) scaleY(var(--bg-stretch))",
          willChange: "transform",
          transition: `transform 160ms linear`,
          mixBlendMode: "difference",
        }}
      >
        <span
          className="font-syne font-black uppercase whitespace-nowrap block text-white/[0.06] tracking-[-0.06em] leading-[0.82]"
          style={{
            fontSize: "clamp(12rem, 38vw, 44rem)",
            marginLeft: "-0.04em",
            fontFeatureSettings: '"ss01", "ss02"',
          }}
        >
          {t.backgroundWord}
        </span>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 lg:px-24">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 sm:mb-24 md:mb-32">
          <div>
            <span className="section-label font-mono text-xs tracking-[0.2em] text-white/40 uppercase block mb-4">
              {t.sectionLabel}
            </span>
            <h2 className="reveal-group font-syne font-black text-4xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tighter uppercase leading-[1.05] break-words drop-shadow-[0_0_30px_rgba(0,0,0,0.9)]">
              <MaskedSentence text={t.mainTitlePart1} />
              <br />
              <span className="font-instrument font-light italic lowercase text-white/80 tracking-normal">
                <MaskedSentence text={t.mainTitlePart2} />
              </span>
            </h2>
          </div>
        </div>

        <div className="editorial-line w-full h-[1px] bg-white/20 origin-left mb-16 sm:mb-24 md:mb-32" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-8 sm:gap-12">
            <div className="lg:sticky lg:top-40 flex flex-col gap-8 sm:gap-12 mouse-parallax">
              <div>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase block mb-4">
                  {t.methodologyTitle}
                </span>
                <p className="reveal-group font-sans text-sm md:text-base leading-relaxed text-white/70 flex flex-col gap-1">
                  {t.methodologyPoints.map((point, i) => (
                    <span
                      key={i}
                      className="block"
                      style={{
                        overflow: "clip",
                        paddingTop: "0.2em",
                        paddingBottom: "0.2em",
                      }}
                    >
                      <span className="about-word inline-block" style={{ transform: "translateY(110%)", opacity: 0 }}>
                        {point}
                      </span>
                    </span>
                  ))}
                </p>
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase block mb-4">
                  {t.capTitle}
                </span>
                <ul className="reveal-group font-sans text-sm md:text-base leading-relaxed text-white/70 flex flex-col gap-2">
                  {t.capabilities.map((cap, i) => (
                    <li
                      key={i}
                      style={{
                        overflow: "clip",
                        paddingTop: "0.2em",
                        paddingBottom: "0.2em",
                      }}
                    >
                      <span className="about-word inline-block" style={{ transform: "translateY(110%)", opacity: 0 }}>
                        {cap}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Main narrative */}
          <div className="lg:col-span-8 flex flex-col gap-16 sm:gap-24 md:gap-32 lg:pl-16">
            <div className="mouse-parallax">
            <h3 className="reveal-group font-syne font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.25] tracking-tight uppercase break-words drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
            <MaskedSentence text={t.narrativeTitlePart1} />
                <span className="font-instrument font-light italic lowercase text-white/60 tracking-normal">
                  <MaskedSentence text={t.narrativeTitlePart2} />
                </span>
              </h3>
            </div>

            <div className="editorial-line w-[10vw] h-[1px] bg-white/40 origin-left" />

            <div className="mouse-parallax">
            <p className="reveal-group font-sans text-lg sm:text-xl md:text-2xl lg:text-3xl leading-[1.45] text-white/85 font-medium break-words drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
                <MaskedSentence text={t.paragraph1} />
              </p>
            </div>

            <div className="mouse-parallax">
            <p className="reveal-group font-sans text-base sm:text-lg md:text-xl leading-[1.6] text-white/55 break-words drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
                <MaskedSentence text={t.paragraph2} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
