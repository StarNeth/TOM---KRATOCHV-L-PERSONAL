"use client"

// components/sections/about.tsx
// ─────────────────────────────────────────────────────────────────────────
// THE SPECIFICATION ENVIRONMENT — Section 6C
//
// Not a section. A specification environment. Three things share the
// same space the way instruments share a laboratory bench:
//
//   1. THE NARRATIVE — Instrument Serif italic. The only human voice
//      on the site. One paragraph each, sparingly placed.
//
//   2. THE MEASUREMENT DISPLAY — three columns separated by 1px rules.
//      Each: enormous Syne Black numeral, microscopic unit, label.
//      The "0 CRITICAL FAILURES" column contains the only joke on the
//      site: on first hover the 0 reads "1" for 33ms, then self-corrects.
//      Fires once per session. Only engineers will see it.
//
//   3. THE SPECIFICATION PANEL — single 1px left border creates the
//      panel. No box. Tabular datasheet rows.
//
// Removed (per directive): the 3D sphere background (the fluid is the
// substrate; nothing else competes), and the giant REACTOR
// mix-blend-difference word (saturated decoration).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease as gsapEase } from "@/lib/easing"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

const DICTIONARY = {
  en: {
    sectionLabel: "01 / ABOUT",
    h2Lead: "Engineering",
    h2Tail: "precision.",
    narrative1:
      "My background does not lie in traditional design agencies. It lies in the primary circuit of a nuclear reactor.",
    narrative2:
      "As a former diagnostics specialist for 6–9 kV protections at the Dukovany Nuclear Power Plant, I was trained in an environment with absolutely zero tolerance for failure.",
    narrative3:
      "I do not just write code. I engineer digital infrastructure — the rigorous mindset of root-cause analysis and systematic problem-solving, applied to frontend, WebGL and AI-driven architectures.",
    metric1Label: "PROFESSIONAL OPERATION",
    metric2Label: "HIGH-VOLTAGE SYSTEMS",
    metric3Label: "FAILURES RECORDED",
    specHeading: "SPECIFICATION",
    specRows: [
      ["DOMAIN", "FRONTEND // WEBGL // AI"],
      ["RUNTIME", "NEXT.JS 16 / REACT 19"],
      ["PHYSICS", "SPRING / FBM / GGX"],
      ["LATITUDE", "N 50.0755°"],
      ["LONGITUDE", "E 14.4378°"],
      ["MTBF", "∞ (TARGET)"],
      ["AVAILABILITY", "99.997%"],
    ] as const,
  },
  cs: {
    sectionLabel: "01 / O MNĚ",
    h2Lead: "Inženýrská",
    h2Tail: "přesnost.",
    narrative1:
      "Mé zázemí neleží v tradičních designových agenturách. Leží v primárním okruhu jaderného reaktoru.",
    narrative2:
      "Jako bývalý specialista diagnostiky ochran 6–9 kV v Jaderné elektrárně Dukovany jsem byl vycvičen v prostředí s absolutně nulovou tolerancí k selhání.",
    narrative3:
      "Nepíšu jen kód. Projektuji digitální infrastrukturu — striktní analytické myšlení a systematické řešení problémů aplikované na frontend, WebGL a AI architektury.",
    metric1Label: "PROVOZ",
    metric2Label: "VYSOKONAPĚŤOVÉ SYSTÉMY",
    metric3Label: "ZAZNAMENANÝCH SELHÁNÍ",
    specHeading: "SPECIFIKACE",
    specRows: [
      ["DOMÉNA", "FRONTEND // WEBGL // AI"],
      ["RUNTIME", "NEXT.JS 16 / REACT 19"],
      ["FYZIKA", "PRUŽINA / FBM / GGX"],
      ["ŠÍŘKA", "N 50.0755°"],
      ["DÉLKA", "E 14.4378°"],
      ["MTBF", "∞ (CÍL)"],
      ["DOSTUPNOST", "99,997%"],
    ] as const,
  },
}

// ─── MeasurementColumn ─────────────────────────────────────────────────
// One enormous numeral, one microscopic unit, one label. The third column
// holds the joke — see CriticalFailures below.
const Numeral = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      fontFamily: "var(--font-sans), sans-serif",
      fontWeight: 900,
      fontSize: "clamp(4.5rem, 13vw, 11rem)",
      lineHeight: 0.82,
      letterSpacing: "-0.05em",
      color: "var(--signal)",
      fontFeatureSettings: '"ss01", "ss02", "tnum"',
      fontVariantNumeric: "tabular-nums",
      display: "block",
    }}
  >
    {children}
  </span>
)

// ─── The Joke ───────────────────────────────────────────────────────────
// On first hover: the 0 reads "1" for 33ms, then self-corrects. Fires
// once per session via sessionStorage. No animation. An erroneous
// reading that self-corrects. Per the directive: "Only engineers will
// understand why this is there. Only engineers will see it."
const SESSION_KEY = "tk_critical_flickered"

const CriticalFailures = (): React.ReactElement => {
  const [shown, setShown] = useState<"0" | "1">("0")
  const fired = useRef(false)

  const onEnter = () => {
    if (fired.current) return
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      fired.current = true
      return
    }
    fired.current = true
    setShown("1")
    if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, "1")
    window.setTimeout(() => setShown("0"), 33)
  }

  return (
    <span onMouseEnter={onEnter} style={{ display: "inline-block" }}>
      <Numeral>{shown}</Numeral>
    </span>
  )
}

const Unit = ({ children }: { children: React.ReactNode }) => (
  <span
    className="type-mono-micro-8"
    style={{ color: "var(--text-dim)", display: "block", marginTop: 8 }}
  >
    {children}
  </span>
)

const ColLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    className="type-mono-micro-8"
    style={{
      color: "var(--text-data)",
      display: "block",
      marginTop: 24,
      letterSpacing: "0.40em",
    }}
  >
    {children}
  </span>
)

export const About = (): React.ReactElement => {
  const { language } = useLanguage()
  const t = DICTIONARY[language as keyof typeof DICTIONARY]
  const containerRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // The clip-path reveal — a measuring plate being lifted.
      gsap.utils.toArray<HTMLElement>(".about-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: "inset(0 0 100% 0)" },
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 1.0,
            ease: gsapEase.silk,
            scrollTrigger: { trigger: el, start: "top 88%" },
          }
        )
      })
      gsap.utils.toArray<HTMLElement>(".about-rule").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: gsapEase.mechanical,
            scrollTrigger: { trigger: el, start: "top 92%" },
          }
        )
      })
    },
    { scope: containerRef, dependencies: [language] }
  )

  return (
    <section
      ref={containerRef}
      id="about"
      className="relative w-full z-10"
      style={{
        paddingTop: "calc(160px + var(--coupling-gap, 0px))",
        paddingBottom: 192,
        background: "transparent",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Section anchor + lead */}
        <div className="flex flex-col gap-3 mb-12 md:mb-16">
          <span
            className="type-mono-micro-10"
            style={{ color: "var(--text-data)" }}
          >
            {t.sectionLabel}
          </span>
          <h2
            aria-label={`${t.h2Lead} ${t.h2Tail}`}
            className="about-reveal"
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontWeight: 900,
              textTransform: "uppercase",
              fontSize: "clamp(2.5rem, 8vw, 6.5rem)",
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
              color: "var(--signal)",
            }}
          >
            {t.h2Lead}{" "}
            <span
              className="type-narrative"
              style={{
                fontSize: "inherit",
                color: "var(--text-primary)",
                lineHeight: "inherit",
              }}
            >
              {t.h2Tail}
            </span>
          </h2>
        </div>

        <div
          className="about-rule"
          style={{
            width: "100%",
            height: 1,
            background: "var(--rule)",
            transformOrigin: "left",
            marginBottom: 80,
          }}
          aria-hidden
        />

        {/* THE MEASUREMENT DISPLAY — the hook */}
        <div
          className="about-reveal grid grid-cols-1 md:grid-cols-3"
          style={{ gap: 0 }}
        >
          <div
            className="flex flex-col py-6 md:py-10"
            style={{
              borderRight: "1px solid var(--rule)",
              paddingRight: 24,
              paddingLeft: 0,
            }}
          >
            <Numeral>6</Numeral>
            <Unit>YR</Unit>
            <ColLabel>{t.metric1Label}</ColLabel>
          </div>
          <div
            className="flex flex-col py-6 md:py-10"
            style={{
              borderRight: "1px solid var(--rule)",
              paddingRight: 24,
              paddingLeft: 24,
            }}
          >
            <Numeral>30000</Numeral>
            <Unit>H</Unit>
            <ColLabel>{t.metric2Label}</ColLabel>
          </div>
          <div
            className="flex flex-col py-6 md:py-10"
            style={{ paddingLeft: 24 }}
          >
            <CriticalFailures />
            <Unit>CRITICAL</Unit>
            <ColLabel>{t.metric3Label}</ColLabel>
          </div>
        </div>

        <div
          className="about-rule"
          style={{
            width: "100%",
            height: 1,
            background: "var(--rule)",
            transformOrigin: "left",
            margin: "80px 0",
          }}
          aria-hidden
        />

        {/* NARRATIVE + SPECIFICATION PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Narrative — the only human voice on the site */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <p className="about-reveal type-narrative">{t.narrative1}</p>
            <p className="about-reveal type-narrative" style={{ color: "var(--text-data)" }}>
              {t.narrative2}
            </p>
            <p className="about-reveal type-narrative">{t.narrative3}</p>
          </div>

          {/* Specification panel — single left rule, no box, tabular datasheet */}
          <aside
            className="lg:col-span-5"
            aria-label="Specification"
            style={{
              borderLeft: "1px solid var(--rule-active)",
              paddingLeft: 24,
            }}
          >
            <div
              className="type-mono-micro-8"
              style={{ color: "var(--text-dim)", marginBottom: 16 }}
            >
              {t.specHeading}
            </div>
            <dl className="flex flex-col">
              {t.specRows.map(([label, value], i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between"
                  style={{
                    padding: "calc(8px + var(--coupling-spec, 0px) / 2) 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <dt
                    className="type-mono-micro-8"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="type-mono-micro-8"
                    style={{ color: "var(--text-data)" }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}
