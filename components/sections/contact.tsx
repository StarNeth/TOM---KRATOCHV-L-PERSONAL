"use client"

/**
 * contact.tsx — System Architect contact terminal.
 *
 *  WHAT'S HERE
 *  ────────────
 *  This is not a marketing form — it's a single primary affordance (the
 *  email address, click-to-copy) flanked by three direct channels
 *  (LinkedIn / GitHub / Phone). The spec calls these "form elements"; in
 *  this build the form ELEMENT is the email line itself, treated as the
 *  submit target. There's nothing else to type into.
 *
 *  TOKENISED TYPOGRAPHY
 *  ─────────────────────
 *   • Display headline (the email) on the system's display scale,
 *     clamp(2.25rem, 6vw, 6rem). Uses `var(--core)` (bone) explicitly so
 *     the `text-transparent` hover trick can be reverted without breaking
 *     the cascade.
 *   • 8px mono labels with 0.3em letter-spacing — matches the rest of
 *     the HUD vocabulary (telemetry-panel, hero status column).
 *   • Zero-radius interactive elements. The copy-feedback chip and the
 *     socials list use 1px `var(--rule)` borders.
 *   • Precision hover line — a 1px `var(--core)` rule sweeps in from the
 *     left under the email when the area is armed (focus or hover). Uses
 *     `--ease-mechanical` so it reads as a system-level commit.
 *
 *  HANDSHAKE — CONTACT_ARMED
 *  ──────────────────────────
 *  When the user enters the email region (mouseenter / focus), the
 *  coreStateBus handshake flips to "CONTACT_ARMED". The scene shader can
 *  bias toward the cobalt zone on this signal (the existing
 *  hoveredZone + uTransition contracts are unaffected — this is pure
 *  handshake state). On mouseleave / blur the handshake returns to IDLE
 *  unless something else has claimed it in the meantime.
 *
 *  NO PHYSICS TOUCHED
 *  ──────────────────
 *  No lerp loops, no springs, no rAF. GSAP fromTo for the reveal stagger,
 *  ScrollTrigger for the scroll-linked parallax. Webgl-shoot,
 *  uTransition, cumArrival, V_SmithCorrelated — all untouched.
 */

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Link from "next/link"
import { useLanguage } from "@/components/navigation/language-toggle"
import { coreStateBus } from "@/lib/core-state-bus"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

const DICTIONARY = {
  en: {
    sectionId: "0x04 / CONTACT",
    primaryLabel: "PRIMARY CHANNEL / EMAIL",
    socialsLabel: "DIRECT LINKS",
    copied: "COPIED TO CLIPBOARD",
    clickHint: "CLICK TO COPY",
    submitHint: "ENTER TO COMMIT",
  },
  cs: {
    sectionId: "0x04 / KONTAKT",
    primaryLabel: "HLAVNÍ KANÁL / E-MAIL",
    socialsLabel: "PŘÍMÉ ODKAZY",
    copied: "ZKOPÍROVÁNO",
    clickHint: "KLIKNI PRO KOPÍROVÁNÍ",
    submitHint: "ENTER PRO POTVRZENÍ",
  },
}

const socials = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/tomas-kratochvil/", channel: "01" },
  { label: "GitHub",   href: "https://github.com/StarNeth/",                 channel: "02" },
  { label: "Phone",    href: "tel:+420602193021",                            channel: "03" },
]

const EMAIL = "root@tomaskratochvil.com"

export const Contact = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language]
  const sectionRef    = useRef<HTMLElement>(null)
  const emailZoneRef  = useRef<HTMLDivElement>(null)
  const emailRef      = useRef<HTMLDivElement>(null)
  const hoverLineRef  = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // ── REVEAL TIMELINE + PARALLAX ──────────────────────────────────────
  useGSAP(
    () => {
      gsap.fromTo(
        ".contact-reveal",
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        },
      )
      gsap.to(".parallax-content", {
        y: -50,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: true },
      })
    },
    { scope: sectionRef },
  )

  // ── CONTACT_ARMED HANDSHAKE ─────────────────────────────────────────
  // The handshake is owned by the bus; we set it on enter / restore on
  // leave. We DO NOT clobber a NAVIGATING or SECTION_LOCK state — those
  // take precedence. Effect cleanup also restores so HMR + unmount don't
  // strand the handshake in CONTACT_ARMED.
  useEffect(() => {
    const zone = emailZoneRef.current
    if (!zone) return

    const arm = () => {
      const cur = coreStateBus.get().handshake
      if (cur === "NAVIGATING" || cur === "SECTION_LOCK") return
      coreStateBus.set({ handshake: "CONTACT_ARMED" })
    }
    const disarm = () => {
      if (coreStateBus.get().handshake === "CONTACT_ARMED") {
        coreStateBus.set({ handshake: "IDLE" })
      }
    }

    zone.addEventListener("mouseenter", arm, { passive: true })
    zone.addEventListener("mouseleave", disarm, { passive: true })
    zone.addEventListener("focusin", arm, { passive: true })
    zone.addEventListener("focusout", disarm, { passive: true })

    return () => {
      zone.removeEventListener("mouseenter", arm)
      zone.removeEventListener("mouseleave", disarm)
      zone.removeEventListener("focusin", arm)
      zone.removeEventListener("focusout", disarm)
      // Final cleanup — never leave the bus stuck in CONTACT_ARMED.
      if (coreStateBus.get().handshake === "CONTACT_ARMED") {
        coreStateBus.set({ handshake: "IDLE" })
      }
    }
  }, [])

  // ── PRECISION HOVER LINE ────────────────────────────────────────────
  // A 1px rule sweeps under the email zone. Pure CSS scaleX transition
  // driven by the [data-armed] attribute on the zone wrapper.
  const setArmed = (on: boolean) => {
    if (emailZoneRef.current) emailZoneRef.current.dataset.armed = on ? "1" : "0"
  }

  // ── EMAIL MAGNETIC NUDGE ────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!emailRef.current || window.innerWidth < 768) return
    const rect = emailRef.current.getBoundingClientRect()
    const x = e.clientX - (rect.left + rect.width / 2)
    const y = e.clientY - (rect.top + rect.height / 2)
    gsap.to(emailRef.current, { x: x * 0.08, y: y * 0.08, duration: 0.2, ease: "power2.out" })
  }
  const handleMouseLeave = () => {
    setArmed(false)
    if (emailRef.current) {
      gsap.to(emailRef.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" })
    }
  }
  const handleMouseEnter = () => setArmed(true)

  // ── CLIP COMMIT ─────────────────────────────────────────────────────
  const handleCopy = () => {
    void navigator.clipboard.writeText(EMAIL)
    setCopied(true)
    gsap.fromTo(
      ".copy-feedback",
      { opacity: 0, scale: 0.9, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.24, ease: "back.out(2)" },
    )
    gsap.to(".copy-feedback", { opacity: 0, y: -8, duration: 0.3, delay: 1.8 })
    setTimeout(() => setCopied(false), 2300)
  }
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleCopy()
    }
  }

  return (
    <section
      ref={sectionRef}
      id="contact"
      data-section-index="4"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-12 z-10 bg-transparent overflow-hidden perspective-[1000px]"
      style={{ color: "var(--core)" }}
    >
      {/* ── SECTION HUD HEADER ──────────────────────────────────────── */}
      <div
        className="contact-reveal absolute top-12 left-4 sm:left-6 md:left-12 right-4 sm:right-6 md:right-12 flex items-center justify-between font-mono text-[8px] sm:text-[9px] uppercase pointer-events-none"
        style={{
          letterSpacing: "0.3em",
          color: "color-mix(in oklch, var(--core) 50%, transparent)",
        }}
      >
        <span>{t.sectionId}</span>
        <span aria-hidden>————</span>
        <span>{t.primaryLabel}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-full relative z-10 parallax-content mt-10">
        {/* ── EMAIL ZONE (the "form element") ─────────────────────── */}
        <div
          ref={emailZoneRef}
          data-armed="0"
          className="contact-reveal relative cursor-pointer w-full max-w-full text-center group z-20 px-2"
          onClick={handleCopy}
          onKeyDown={handleKey}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="button"
          tabIndex={0}
          aria-label={`Copy ${EMAIL} to clipboard`}
          data-cursor="hover"
        >
          {/* COPIED FEEDBACK CHIP — zero-radius, 1px rule */}
          <div className="copy-feedback absolute left-1/2 -translate-x-1/2 -top-12 sm:-top-16 opacity-0 pointer-events-none z-30">
            <div
              className="px-4 sm:px-5 py-2 font-mono text-[8px] sm:text-[9px] uppercase tabular-nums whitespace-nowrap"
              style={{
                letterSpacing: "0.3em",
                color: "var(--core)",
                backgroundColor: "rgba(8,8,10,0.85)",
                border: "1px solid var(--rule)",
                borderRadius: 0,
              }}
            >
              {t.copied}
            </div>
          </div>

          <div ref={emailRef} className="inline-block">
            <h2
              className="font-syne font-black leading-[1.05] tracking-tight transition-colors duration-200 group-hover:text-transparent group-hover:[-webkit-text-stroke:1px_var(--core)] text-[clamp(1.4rem,6vw,2.5rem)] sm:text-[clamp(2.2rem,5vw,4.5rem)] md:text-[clamp(3rem,5vw,7rem)] break-all sm:break-normal hyphens-auto sm:hyphens-none drop-shadow-[0_0_40px_rgba(0,0,0,0.85)]"
              lang="en"
              style={{ color: "var(--core)" }}
            >
              {EMAIL}
            </h2>
          </div>

          {/* PRECISION HOVER LINE — 1px rule, scaleX(0)→(1) on [data-armed] */}
          <div
            ref={hoverLineRef}
            aria-hidden
            className="hover-line mx-auto mt-4 sm:mt-6 origin-left"
            style={{
              height: "1px",
              width: "min(560px, 80%)",
              backgroundColor: "var(--core)",
              transformOrigin: "left center",
              transform: "scaleX(0)",
              transition: "transform 320ms var(--ease-mechanical)",
            }}
          />

          {/* HINT ROW — only visible while armed */}
          <div
            className="mt-3 flex items-center justify-center gap-3 font-mono text-[8px] sm:text-[9px] uppercase opacity-0 transition-opacity duration-300"
            style={{
              letterSpacing: "0.3em",
              color: "color-mix(in oklch, var(--core) 40%, transparent)",
            }}
          >
            <span aria-hidden>›</span>
            <span>{t.clickHint}</span>
            <span aria-hidden className="opacity-50">/</span>
            <span>{t.submitHint}</span>
          </div>
        </div>

        {/* ── DIRECT LINKS ─────────────────────────────────────────── */}
        <div className="contact-reveal mt-16 sm:mt-20 md:mt-28 w-full max-w-3xl">
          <div
            className="flex items-center justify-between font-mono text-[8px] sm:text-[9px] uppercase mb-5"
            style={{
              letterSpacing: "0.3em",
              color: "color-mix(in oklch, var(--core) 40%, transparent)",
            }}
          >
            <span>{t.socialsLabel}</span>
            <span aria-hidden>{socials.length.toString().padStart(2, "0")} CHANNELS</span>
          </div>

          <ul
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}
          >
            {socials.map((s, i) => (
              <li
                key={s.label}
                className="relative"
                style={{
                  borderRight: i < socials.length - 1 ? "1px solid var(--rule)" : undefined,
                }}
              >
                <Link
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 px-5 py-5 transition-colors"
                  data-cursor="hover"
                >
                  <span
                    className="font-mono text-[8px] uppercase"
                    style={{
                      letterSpacing: "0.3em",
                      color: "color-mix(in oklch, var(--core) 50%, transparent)",
                    }}
                  >
                    CH/{s.channel}
                  </span>
                  <span
                    className="font-syne font-bold uppercase tracking-tight text-base sm:text-lg md:text-xl transition-colors"
                    style={{ color: "color-mix(in oklch, var(--core) 80%, transparent)" }}
                  >
                    <span className="group-hover:hidden">{s.label}</span>
                    <span className="hidden group-hover:inline" style={{ color: "var(--core)" }}>
                      {s.label}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-[8px]"
                    style={{
                      letterSpacing: "0.3em",
                      color: "color-mix(in oklch, var(--core) 40%, transparent)",
                    }}
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* MINIMAL FOOTER */}
      <footer className="absolute bottom-4 sm:bottom-6 w-full text-center pointer-events-none px-4">
        <span
          className="font-mono text-[8px] sm:text-[9px] uppercase"
          style={{
            letterSpacing: "0.3em",
            color: "color-mix(in oklch, var(--core) 30%, transparent)",
          }}
        >
          © {new Date().getFullYear()} TOMÁŠ KRATOCHVÍL · KRATOCHVIL.SYS
        </span>
      </footer>

      {/* SCOPED CSS — armed state animates the hover line + hint row.
          Tailwind hover:* won't help because the trigger is mouseenter on
          the parent zone, not the hint row itself. */}
      <style jsx>{`
        :global([data-armed="1"]) .hover-line {
          transform: scaleX(1);
        }
        :global([data-armed="1"]) > .mt-3 {
          opacity: 1;
        }
      `}</style>
    </section>
  )
}
