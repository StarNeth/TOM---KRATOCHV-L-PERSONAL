"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease } from "@/lib/easing"
import { dur } from "@/lib/motion"
import { velocityBus } from "@/lib/velocity-bus"
import { coreStateBus } from "@/lib/core-state-bus"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

// ────────────────────────────────────────────────────────────────────────
// COPY
// ────────────────────────────────────────────────────────────────────────
const DICTIONARY = {
  en: {
    sectionLabel: "02 // ABOUT",
    sectionId: "ENGINEER PROFILE",
    eyebrow: "Operator credentials",
    titleA: "Engineering",
    titleB: "precision.",
    spec: {
      heading: "Specification",
      rows: [
        ["Lateral displacement", "0.00 mm"],
        ["Root-cause depth", "6 – 9 kV"],
        ["Error tolerance", "ZERO"],
        ["Structural coupling", "ENGAGED"],
        ["Cycle integrity", "100.00 %"],
        ["Operating mode", "PRIMARY"],
      ],
    },
    methodHeading: "Methodology",
    method: ["Root-cause analysis.", "Zero-error tolerance.", "Systematic diagnostics."],
    capHeading: "Capabilities",
    caps: ["Frontend architecture", "WebGL · 3D experiences", "UI/UX engineering", "OSINT · security"],
    narrativeA: "My background does not lie in design agencies.",
    narrativeB: "It lies in the primary circuit of a nuclear reactor.",
    paragraph1:
      "As a former diagnostics specialist for 6–9 kV protection systems at the Dukovany Nuclear Power Plant, I was trained in an environment with zero tolerance for failure.",
    paragraph2:
      "I do not write code. I engineer digital infrastructure — bringing the rigor of root-cause analysis and systematic problem-solving into frontend development, integrating complex WebGL and AI-driven architectures with uncompromising stability.",
    flickerNote: "system status",
  },
  cs: {
    sectionLabel: "02 // O MNĚ",
    sectionId: "OPERÁTOR · KARTA",
    eyebrow: "Záznam operátora",
    titleA: "Inženýrská",
    titleB: "přesnost.",
    spec: {
      heading: "Specifikace",
      rows: [
        ["Laterální výchylka", "0.00 mm"],
        ["Hloubka analýzy", "6 – 9 kV"],
        ["Tolerance chyb", "NULA"],
        ["Strukturální vazba", "AKTIVNÍ"],
        ["Integrita cyklu", "100.00 %"],
        ["Režim", "PRIMÁRNÍ"],
      ],
    },
    methodHeading: "Metodologie",
    method: ["Analýza kořenových příčin.", "Nulová tolerance chyb.", "Systematická diagnostika."],
    capHeading: "Schopnosti",
    caps: ["Architektura frontendu", "WebGL · 3D zážitky", "UI/UX inženýrství", "OSINT · bezpečnost"],
    narrativeA: "Mé zázemí neleží v designových agenturách.",
    narrativeB: "Leží v primárním okruhu jaderného reaktoru.",
    paragraph1:
      "Jako bývalý specialista diagnostiky ochran 6–9 kV v Jaderné elektrárně Dukovany jsem byl vycvičen v prostředí s absolutně nulovou tolerancí k selhání.",
    paragraph2:
      "Nepíšu kód. Projektuji digitální infrastrukturu — do frontendového vývoje přináším striktní analytické myšlení, kde integruji komplexní WebGL zážitky a architektury řízené umělou inteligencí do nekompromisně stabilních systémů.",
    flickerNote: "stav systému",
  },
}

// ────────────────────────────────────────────────────────────────────────
// MASKED-SENTENCE REVEAL
//
// Each word is wrapped in a clip mask with vertical padding so diacritics
// (Á, Í, ě) and descenders (g, y, p) survive. Inner span starts 110% below
// and animates to 0%. The actual GSAP call lives in `useGSAP` below.
// ────────────────────────────────────────────────────────────────────────
const MaskedSentence = ({ text, className }: { text: string; className?: string }) => {
  const words = text.split(" ")
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block align-middle mr-[0.25em]"
          style={{
            overflow: "clip",
            paddingTop: "0.28em",
            paddingBottom: "0.28em",
            marginTop: "-0.28em",
            marginBottom: "-0.28em",
          }}
        >
          <span className="about-word inline-block" style={{ transform: "translateY(110%)", opacity: 0 }}>
            {w}
          </span>
        </span>
      ))}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────
// SPEC ROW
//
// Four-character measurement readouts in monospace, dotted leader between
// label and value (data-table convention from operations manuals).
// ────────────────────────────────────────────────────────────────────────
const SpecRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 py-2 text-[10px] tracking-[0.18em] uppercase font-mono">
    <span className="text-[var(--color-dim-strong)] whitespace-nowrap">{label}</span>
    <span aria-hidden className="flex-1 mx-2 border-b border-dotted border-[var(--color-dim)]/50 translate-y-[-2px]" />
    <span
      className="whitespace-nowrap tabular-nums"
      style={{ color: accent ? "var(--color-cobalt)" : "var(--color-bone)" }}
    >
      {value}
    </span>
  </div>
)

// ────────────────────────────────────────────────────────────────────────
// THE ONE-FLICKER JOKE
//
// A single ASCII status block ("PRIMARY · NOMINAL") sits in the spec
// column. Exactly ONCE per session, between 6 and 22 seconds after mount,
// it flickers for a single rAF frame to the surgical-red. The user almost
// certainly won't consciously see it — but if they do, the system winked.
//
// Why exactly once: any more and it becomes "an animation." A single
// random anomaly is what a real plant operator might catch out of the
// corner of their eye and never see again. That's the joke.
// ────────────────────────────────────────────────────────────────────────
const FlickerLed = ({ note }: { note: string }) => {
  const ledRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ledRef.current
    if (!el) return
    if (typeof window === "undefined") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return

    const delay = 6000 + Math.random() * 16000 // 6–22s
    const flickerDur = 40 + Math.random() * 40 // 40–80ms (1–5 frames at 60Hz)

    const t1 = window.setTimeout(() => {
      el.style.color = "var(--color-surgical)"
      el.style.textShadow = "0 0 6px var(--color-surgical)"
      // Audit trail — the telemetry panel watches `audit` for one-shot events.
      coreStateBus.set({ audit: { code: "ANOM-01", at: Date.now() } })
      const t2 = window.setTimeout(() => {
        if (!el) return
        el.style.color = ""
        el.style.textShadow = ""
      }, flickerDur)
      // store on element for cleanup
      ;(el as any).__t2 = t2
    }, delay)

    return () => {
      window.clearTimeout(t1)
      const t2 = (el as any).__t2
      if (t2) window.clearTimeout(t2)
    }
  }, [])
  return (
    <div className="flex items-center justify-between text-[10px] tracking-[0.22em] uppercase font-mono mt-3 pt-3 border-t border-[var(--color-dim)]/30">
      <span className="text-[var(--color-dim-strong)]">{note}</span>
      <span ref={ledRef} className="text-[var(--color-bone)]" style={{ transition: "color 30ms linear, text-shadow 30ms linear" }}>
        ● PRIMARY · NOMINAL
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// LIVE LATERAL READOUT
//
// One numeric field in the spec column ticks live, mirroring scroll
// velocity. Shows the user the system is INSTRUMENTED — not just styled
// to look it.
// ────────────────────────────────────────────────────────────────────────
const LiveLateral = () => {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        const { normalized } = velocityBus.get()
        // Lateral displacement scaled to ±2.40mm at peak velocity.
        const mm = (normalized * 2.4).toFixed(2)
        el.textContent = `${mm} mm`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <span ref={ref} className="tabular-nums text-[var(--color-cobalt)]">
      0.00 mm
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────
// SECTION
// ────────────────────────────────────────────────────────────────────────
export const About = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language]
  const containerRef = useRef<HTMLElement>(null)
  const bgRuleRef = useRef<HTMLDivElement>(null)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.innerWidth < 1024)
    const onR = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener("resize", onR)
    return () => window.removeEventListener("resize", onR)
  }, [])

  // Velocity-driven hairline skew on the section's left rule. Tiny effect,
  // but it ties this section into the same kinetic conversation as Hero —
  // the page feels like a single instrument, not seven independent ones.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = bgRuleRef.current
      if (el) {
        const { normalized } = velocityBus.get()
        el.style.setProperty("--rule-skew", `${normalized * -2}deg`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useGSAP(
    () => {
      // Word-level masked reveal — the signature move from the previous
      // revision, kept verbatim because it works.
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

      // Editorial dividers — scaleX from 0 to 1, mechanical ease (a "commit").
      gsap.utils.toArray<HTMLElement>(".editorial-line").forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.3,
            ease: ease.mechanical,
            scrollTrigger: { trigger: line, start: "top 90%" },
          },
        )
      })

      // Section identifier (top-left) — slow opacity climb, no transform.
      gsap.fromTo(
        ".section-label",
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.9,
          ease: ease.decay,
          scrollTrigger: { trigger: containerRef.current, start: "top 88%" },
        },
      )

      // Spec column reveal — top-down stagger, like a status panel
      // booting up.
      gsap.fromTo(
        ".spec-row",
        { opacity: 0, x: -8 },
        {
          opacity: 1,
          x: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: ease.mechanical,
          scrollTrigger: { trigger: ".spec-column", start: "top 80%" },
        },
      )
    },
    { scope: containerRef, dependencies: [language] },
  )

  return (
    <section
      ref={containerRef}
      id="about"
      data-section-index="2"
      className="relative w-full text-[var(--color-bone)] py-24 md:py-32 lg:py-48 z-10 overflow-hidden bg-transparent"
    >
      {/* Velocity-skewed left rule. Subtle. Sells the "instrumented" tone. */}
      <div
        ref={bgRuleRef}
        aria-hidden
        className="hidden lg:block absolute top-0 bottom-0 left-12 w-px pointer-events-none"
        style={{
          ["--rule-skew" as any]: "0deg",
          background:
            "linear-gradient(to bottom, transparent 0, var(--color-graphite) 18%, var(--color-graphite) 82%, transparent 100%)",
          transform: "skewY(var(--rule-skew))",
          transition: "transform 160ms linear",
          willChange: "transform",
          opacity: 0.5,
        }}
      />

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 lg:px-24">
        {/* ── HEADER STRIP ─────────────────────────────────────────────── */}
        <div className="flex items-end justify-between mb-12 md:mb-20">
          <div className="section-label flex flex-col gap-1">
            <span className="text-hud text-[var(--color-dim-strong)]">{t.sectionLabel}</span>
            <span className="text-hud-sm text-[var(--color-dim)]">{t.sectionId}</span>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
            <span className="text-hud-sm text-[var(--color-dim)]">{t.eyebrow}</span>
            <span className="text-hud text-[var(--color-dim-strong)]">CLEARANCE · OPEN</span>
          </div>
        </div>

        {/* ── DISPLAY TITLE ────────────────────────────────────────────── */}
        <h2
          className="reveal-group font-display font-black uppercase tracking-[-0.04em] leading-[0.92] mb-12 md:mb-20"
          style={{ fontSize: "clamp(2.6rem, 9vw, 9rem)" }}
        >
          <MaskedSentence text={t.titleA} />{" "}
          <span className="font-italic font-light italic lowercase text-[var(--color-bone)]/65 tracking-normal">
            <MaskedSentence text={t.titleB} />
          </span>
        </h2>

        <div className="editorial-line w-full h-px bg-[var(--color-graphite)] origin-left mb-12 md:mb-20" />

        {/* ── TWO-COLUMN BODY ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* SPEC COLUMN — sticky on desktop, stacked on mobile. */}
          <aside className="spec-column lg:col-span-4 lg:sticky lg:top-32 self-start flex flex-col gap-10">
            <div>
              <header className="flex items-center gap-3 mb-4">
                <span aria-hidden className="font-mono text-[10px] text-[var(--color-cobalt)]">
                  [
                </span>
                <span className="text-hud text-[var(--color-dim-strong)]">{t.spec.heading}</span>
                <span aria-hidden className="font-mono text-[10px] text-[var(--color-cobalt)]">
                  ]
                </span>
              </header>
              <div className="border-t border-[var(--color-graphite)]">
                {t.spec.rows.map(([label, value], i) => (
                  <div key={label} className="spec-row">
                    {i === 0 ? (
                      <div className="flex items-baseline justify-between gap-3 py-2 text-[10px] tracking-[0.18em] uppercase font-mono">
                        <span className="text-[var(--color-dim-strong)] whitespace-nowrap">{label}</span>
                        <span
                          aria-hidden
                          className="flex-1 mx-2 border-b border-dotted border-[var(--color-dim)]/50 translate-y-[-2px]"
                        />
                        <LiveLateral />
                      </div>
                    ) : (
                      <SpecRow label={label} value={value} accent={i === 3} />
                    )}
                  </div>
                ))}
              </div>
              <FlickerLed note={t.flickerNote} />
            </div>

            <div>
              <header className="flex items-center gap-3 mb-4">
                <span aria-hidden className="font-mono text-[10px] text-[var(--color-cobalt)]">
                  [
                </span>
                <span className="text-hud text-[var(--color-dim-strong)]">{t.methodHeading}</span>
                <span aria-hidden className="font-mono text-[10px] text-[var(--color-cobalt)]">
                  ]
                </span>
              </header>
              <ul className="reveal-group flex flex-col gap-1.5 text-sm leading-relaxed text-[var(--color-bone)]/75">
                {t.method.map((line, i) => (
                  <li
                    key={i}
                    style={{ overflow: "clip", paddingTop: "0.18em", paddingBottom: "0.18em" }}
                  >
                    <span
                      className="about-word inline-block"
                      style={{ transform: "translateY(110%)", opacity: 0 }}
                    >
                      <span aria-hidden className="text-[var(--color-cobalt)] mr-2 font-mono text-[11px]">
                        ↳
                      </span>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <header className="flex items-center gap-3 mb-4">
                <span aria-hidden className="font-mono text-[10px] text-[var(--color-cobalt)]">
                  [
                </span>
                <span className="text-hud text-[var(--color-dim-strong)]">{t.capHeading}</span>
                <span aria-hidden className="font-mono text-[10px] text-[var(--color-cobalt)]">
                  ]
                </span>
              </header>
              <ul className="reveal-group flex flex-col gap-2 text-sm leading-relaxed text-[var(--color-bone)]/75">
                {t.caps.map((cap, i) => (
                  <li
                    key={i}
                    style={{ overflow: "clip", paddingTop: "0.18em", paddingBottom: "0.18em" }}
                  >
                    <span
                      className="about-word inline-block"
                      style={{ transform: "translateY(110%)", opacity: 0 }}
                    >
                      <span aria-hidden className="font-mono text-[10px] text-[var(--color-dim-strong)] mr-3 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {cap}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* NARRATIVE COLUMN ────────────────────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-14 md:gap-20 lg:pl-12">
            <h3
              className="reveal-group font-display font-bold uppercase tracking-[-0.025em] leading-[1.18]"
              style={{ fontSize: "clamp(1.7rem, 3.6vw, 3.4rem)" }}
            >
              <MaskedSentence text={t.narrativeA} />{" "}
              <span className="font-italic font-light italic lowercase text-[var(--color-bone)]/55 tracking-normal">
                <MaskedSentence text={t.narrativeB} />
              </span>
            </h3>

            <div className="editorial-line w-[12vw] max-w-[120px] h-px bg-[var(--color-cobalt)] origin-left" />

            <p
              className="reveal-group font-body leading-[1.5] text-[var(--color-bone)]/85 font-medium"
              style={{ fontSize: "clamp(1.05rem, 1.6vw, 1.45rem)" }}
            >
              <MaskedSentence text={t.paragraph1} />
            </p>

            <p
              className="reveal-group font-body leading-[1.62] text-[var(--color-bone)]/55"
              style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.15rem)" }}
            >
              <MaskedSentence text={t.paragraph2} />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
