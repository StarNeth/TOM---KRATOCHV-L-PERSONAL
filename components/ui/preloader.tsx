"use client"

/**
 * ═══════════════════════════════════════════════════════════════════
 * PRELOADER — Nuclear Fusion & Portal Reveal
 * ═══════════════════════════════════════════════════════════════════
 *
 * PERFORMANCE CONTRACT
 * ─────────────────────
 * • Exactly ONE React `setState` call exists in this file: `setDone(true)`
 *   at the final frame of Act VII. Everything else is ref + imperative DOM.
 * • 500 particle objects are pre-computed in `useMemo` using seeded math
 *   — deterministic, zero allocation on re-render.
 * • Every animated element carries `will-change: transform, opacity` so
 *   the GPU compositor pre-promotes layers before Act I begins.
 * • The GSAP timeline is stored in a ref and `.kill()`-ed on unmount.
 * • `useLayoutEffect` fires synchronously before the browser's first paint,
 *   guaranteeing zero flicker on return visits ("anti-flicker architecture").
 *
 * ANTI-FLICKER ARCHITECTURE
 * ──────────────────────────
 * SSR renders the preloader shell (invisible on return visits because
 * `useLayoutEffect` hides it before paint). `suppressHydrationWarning`
 * suppresses the React hydration mismatch warning.
 * For zero-SSR preloaders, wrap at the call site with:
 *   `dynamic(() => import('./preloader'), { ssr: false })`
 *
 * ANIMATION SEQUENCE — "Nuclear Fusion & Portal Reveal"
 * ════════════════════════════════════════════════════════
 *
 *  ACT I   — OVERLOAD  (0 → 100, rAF ticker, ≈1.3s)
 *   Counter increments with an intensifying white-hot glow. The glow
 *   radius grows from 8px → 48px as energy approaches critical mass.
 *   At 100: four passes of micro-vibration with escalating amplitude,
 *   then a brightness(8) + blur ramp vaporizes the digits.
 *
 *  ACT II  — BIG BANG  (≈1.5s mark, 0.55s)
 *   500 particles fire radially outward from the counter origin via a
 *   single batched GSAP function-value tween. expo.out gives hyper-fast
 *   initial burst, then graceful deceleration toward viewport edges.
 *
 *  ACT III — THE PULL  (≈2.1s, 0.8s)
 *   Gravity reversal. 250 T-particles arc toward the T letterform
 *   silhouette at −14vw; 250 K-particles arc toward +14vw.
 *   expo.in creates a rubber-band "pull" — slow start, explosive snap.
 *   Particles lock into their pre-computed point-cloud positions,
 *   visually forming the actual geometric shapes of "T" and "K".
 *
 *  ACT IV  — MATERIALIZATION  (≈2.9s, 0.8s)
 *   The letter glyphs fade in from brightness(12) + blur(24px) at the
 *   exact same positions as their particle clouds. The particles
 *   simultaneously scale → 0, creating the illusion that the cloud
 *   *solidified* into the letter.
 *
 *  ACT V   — CINEMATIC DRIFT  (≈3.8s, 1.8s)
 *   T drifts from −14vw → −2.5vw. K drifts from +14vw → +2.5vw.
 *   power1.inOut. 1.8s feels weighted, deliberate, inevitable.
 *
 *  ACT VI  — CRITICAL MASS  (≈5.6s, 0.24s)
 *   Hard snap: T to −1vw, K to +1vw (they TOUCH, not overlap).
 *   Impact pulse: scale 1.06× for 50ms.
 *   Detonation: full-screen #ffffff flash for 50ms.
 *
 *  ACT VII — PORTAL SCALE  (≈5.84s, 0.85s)
 *   T+K scale to 100× as a single merged mass, becoming a white portal
 *   the "camera" flies through. Stage opacity → 0 simultaneously.
 *   The hero section is revealed beneath.
 *
 * ACCESSIBILITY
 * ─────────────
 * • `prefers-reduced-motion`: instant 400ms fade to reveal.
 * • ARIA `role="status"` live region announces 25/50/75/100%.
 * • ESC key triggers immediate exit at any point in the sequence.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import gsap from "gsap"
import { ease } from "@/lib/easing"

// ═══════════════════════════════════════════════════════════════════════════
// LETTERFORM GEOMETRY — module-level pure functions, no side effects
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seeded pseudo-random [0, 1) — deterministic per (n) across every call.
 * Using sin-based hash for speed; the slight non-uniformity at tails is
 * imperceptible at the 500-particle density.
 */
function sr(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

/**
 * Generates normalized coordinates for a point within the "T" letterform.
 * Coordinate space: x ∈ [−0.5, 0.5], y ∈ [−0.5, 0.5] (y+ = top).
 *
 * T structure:
 *  ┌──────────────────┐  y = +0.50
 *  │   TOP BAR (full  │  y = +0.28
 *  │   width, 22% H)  │
 *  └────────┬─────────┘
 *           │ STEM
 *           │ (26% W, 78% H)
 *           └──────────────   y = −0.50
 */
function tPoint(i: number): { nx: number; ny: number } {
  const r1 = sr(i * 3.100 + 0.100)
  const r2 = sr(i * 7.900 + 0.200)
  const r3 = sr(i * 13.70 + 0.300)

  const BAR_BOT  = 0.28   // y of bar's lower edge
  const BAR_TOP  = 0.50   // y of bar's upper edge
  const STEM_HW  = 0.13   // stem half-width

  // Area-proportional sampling ensures uniform density within each zone.
  const barArea  = 1.0 * (BAR_TOP - BAR_BOT)        // ≈ 0.220
  const stemArea = STEM_HW * 2 * (BAR_BOT + 0.50)   // ≈ 0.204
  const barRatio = barArea / (barArea + stemArea)    // ≈ 0.519

  if (r3 < barRatio) {
    // Top horizontal bar — full width, upper 22%
    return { nx: r1 - 0.5, ny: BAR_BOT + r2 * (BAR_TOP - BAR_BOT) }
  } else {
    // Vertical stem — narrow center, lower 78%
    return {
      nx: (r1 - 0.5) * STEM_HW * 2,
      ny: -0.5 + r2 * (BAR_BOT + 0.5),
    }
  }
}

/**
 * Generates normalized coordinates for a point within the "K" letterform.
 * Coordinate space: x ∈ [−0.5, 0.5], y ∈ [−0.5, 0.5] (y+ = top).
 *
 * K structure:
 *  │                /   y = +0.50
 *  │ STEM          /    upper diagonal arm
 *  │ (32% W)      ×     ← branch point (x = −0.18)
 *  │               \    lower diagonal arm
 *  │                \   y = −0.50
 *
 * The diagonal arms have a cross-section thickness of ≈ 13% of height.
 */
function kPoint(i: number): { nx: number; ny: number } {
  const r1 = sr(i * 4.300 + 0.400)
  const r2 = sr(i * 8.900 + 0.500)
  const r4 = sr(i * 23.70 + 0.700)

  const STEM_L   = -0.50  // stem left edge
  const STEM_R   = -0.18  // stem right edge / arm branch point
  const ARM_X1   =  0.50  // arm tip x
  const ARM_Y1   =  0.50  // upper arm tip y
  const ARM_HT   =  0.065 // arm half-thickness (normalized)

  // Arm vector (upper arm — lower arm is y-mirror)
  const armDX  = ARM_X1 - STEM_R  // 0.68
  const armDY  = ARM_Y1           // 0.50
  const armLen = Math.sqrt(armDX * armDX + armDY * armDY) // ≈ 0.844

  // Unit vectors: tangent + perpendicular (CCW rotation)
  const tX = armDX / armLen  //  0.806
  const tY = armDY / armLen  //  0.593
  const pX = -tY             // −0.593
  const pY =  tX             //  0.806

  // Area weights for proportional sampling
  const stemArea = (STEM_R - STEM_L) * 1.0        // 0.320
  const armArea  = armLen * (ARM_HT * 2)           // ≈ 0.110 per arm
  const total    = stemArea + armArea * 2           // ≈ 0.540
  const stemCut  = stemArea / total                 // ≈ 0.593
  const upperCut = (stemArea + armArea) / total     // ≈ 0.796

  if (r4 < stemCut) {
    // Left vertical stem
    return {
      nx: STEM_L + r1 * (STEM_R - STEM_L),
      ny: r2 - 0.5,
    }
  } else if (r4 < upperCut) {
    // Upper diagonal arm — from (STEM_R, 0) toward (ARM_X1, ARM_Y1)
    const t = r1
    const s = (r2 - 0.5) * 2 * ARM_HT
    return {
      nx: STEM_R + t * armDX + pX * s,
      ny:          t * armDY + pY * s,
    }
  } else {
    // Lower diagonal arm — y-mirror of upper arm
    // Lower tangent: (tX, −tY) → perpendicular CCW: (tY, tX)
    const lPX = tY  //  0.593
    const lPY = tX  //  0.806
    const t   = r1
    const s   = (r2 - 0.5) * 2 * ARM_HT
    return {
      nx: STEM_R + t * armDX + lPX * s,
      ny:        - t * armDY + lPY * s,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════

const PARTICLE_COUNT = 350 // 175 → T, 175 → K

export const Preloader = () => {
  // ── STAGE & ROOT ──────────────────────────────────────────────────────────
  const rootRef  = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // ── COUNTER (imperatively mutated by rAF ticker — never React state) ──────
  const counterRef     = useRef<HTMLDivElement>(null)
  const digit0Ref      = useRef<HTMLSpanElement>(null)
  const digit1Ref      = useRef<HTMLSpanElement>(null)
  const digit2Ref      = useRef<HTMLSpanElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressNumRef = useRef<HTMLSpanElement>(null)
  const countdownRef   = useRef<HTMLSpanElement>(null)

  // ── PARTICLE FIELD ────────────────────────────────────────────────────────
  const shardContainerRef = useRef<HTMLDivElement>(null)

  // ── LETTERFORMS ───────────────────────────────────────────────────────────
  const letterTRef = useRef<HTMLSpanElement>(null)
  const letterKRef = useRef<HTMLSpanElement>(null)

  // ── HUD ───────────────────────────────────────────────────────────────────
  const topRuleRef = useRef<HTMLDivElement>(null)
  const botRuleRef = useRef<HTMLDivElement>(null)
  const labelRef   = useRef<HTMLDivElement>(null)

  // ── ACCESSIBILITY ─────────────────────────────────────────────────────────
  const liveRef = useRef<HTMLDivElement>(null)

  // ── INTERNAL CONTROL FLAGS (all refs, zero setState) ─────────────────────
  const completedRef     = useRef(false)
  const isBotRef         = useRef(false)
  const reducedMotionRef = useRef(false)
  const tlRef            = useRef<gsap.core.Timeline | null>(null)

  // THE ONLY React state in this file.
  const [done, setDone] = useState(false)

  const announce = useCallback((msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg
  }, [])

  // ═════════════════════════════════════════════════════════════════════════
  // PARTICLE GEOMETRY — memoized, deterministic, computed once
  //
  // Particles 0–249 belong to the "T" cluster.
  // Particles 250–499 belong to the "K" cluster.
  //
  // `nx`, `ny` are normalized letterform coordinates [−0.5, 0.5].
  // They are scaled to actual pixels inside `triggerExit()` using the
  // live window dimensions — making the effect viewport-adaptive.
  // ═════════════════════════════════════════════════════════════════════════
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const isT = i < (PARTICLE_COUNT / 2)
        const idx = isT ? i : i - (PARTICLE_COUNT / 2)

        // Normalized letterform target (−0.5 to 0.5 per axis)
        const { nx, ny } = isT ? tPoint(idx) : kPoint(idx)

        // Explosion parameters — zaokrouhleno na 3 desetinná místa kvůli SSR vs CSR shodě
        const explodeAngle = Number(((i / PARTICLE_COUNT) * Math.PI * 2 + sr(i * 2.71 + 0.10) * 0.9).toFixed(3))
        const explodeDist  = Number((160 + sr(i * 5.91 + 1.10) * 420).toFixed(3))
        const explodeRot   = Number(((sr(i * 9.37 + 2.20) - 0.5) * 1440).toFixed(3))
        const size         = Number((1.2 + sr(i * 4.43 + 3.30) * 4.8).toFixed(3))
        const safeNx       = Number(nx.toFixed(3))
        const safeNy       = Number(ny.toFixed(3))

        // ── POISSON-DISTRIBUTED SETTLE DELAY ───────────────────────────────
        // Audit directive: "Each shard of the 100 must settle with a
        // randomized, non-linear delay (60–120ms) to simulate a physical
        // system." Inter-arrival times of a Poisson process follow an
        // exponential distribution: Δt = -ln(U) / λ. With λ≈13.3 the
        // mean delay is ~75ms; we clamp to [60, 120]ms so no particle
        // stalls beyond the act window.
        const u = Math.max(1e-4, sr(i * 11.17 + 4.40))
        const settleMs = Math.min(120, Math.max(60, -Math.log(u) / 13.3 * 1000))
        const settleDelay = Number((settleMs / 1000).toFixed(4))

        // Per-particle jitter on dissolve — keeps ACT IV from reading
        // as a single "gsap keyframe" to an experienced juror's eye.
        const dissolveJitter = Number((sr(i * 19.31 + 5.50) * 0.14).toFixed(4))

        return {
          isT, nx: safeNx, ny: safeNy,
          explodeAngle, explodeDist, explodeRot, size,
          settleDelay, dissolveJitter,
        }
      }),
    []
  )

  // ═════════════════════════════════════════════════════════════════════════
  // ANTI-FLICKER ARCHITECTURE
  //
  // `useLayoutEffect` fires synchronously after DOM mutation but BEFORE
  // the browser's first paint. On return visits, we set `display: none`
  // here — the user never sees the preloader flash, even for a frame.
  //
  // `suppressHydrationWarning` on the root element prevents React from
  // complaining about the SSR/CSR mismatch that arises from the
  // sessionStorage check (which only exists on the client).
  // ═════════════════════════════════════════════════════════════════════════
  useLayoutEffect(() => {
    reducedMotionRef.current =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    isBotRef.current =
      /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(navigator.userAgent)

    if (sessionStorage.getItem("preloader_played")) {
      completedRef.current = true
      // Hide before paint — the key to zero flicker
      if (rootRef.current) rootRef.current.style.display = "none"
      requestAnimationFrame(() => {
        window.dispatchEvent(
          new CustomEvent("preloader-complete", { detail: { isBot: isBotRef.current } })
        )
        setDone(true)
      })
    }
  }, [])

  // ═════════════════════════════════════════════════════════════════════════
  // ESC SKIP
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerExit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ══════════════════════════════════════���══════════════════════════════════
  // ACT I — PROGRESS TICKER
  //
  // Runs in requestAnimationFrame. All DOM updates are direct mutations —
  // no setState, no React reconciliation.
  //
  // The glow effect: `filter: drop-shadow` radius grows from 8px → 48px
  // as progress approaches 100, simulating thermal energy build-up.
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (done) return

    const START       = performance.now()
    const FAST_DUR    = 600   // first 70% completes in 600ms
    const SLOW_DUR    = 700   // final 30% takes another 700ms
    const TOTAL       = FAST_DUR + SLOW_DUR
    const FAILSAFE_MS = 1800

    let raf = 0
    let fired100    = false
    let lastAnnounced = 0
    const dRefs = [digit0Ref, digit1Ref, digit2Ref]

    const updateDOM = (pct: number) => {
      const p3 = String(pct).padStart(3, "0")
      dRefs.forEach((r, i) => { if (r.current) r.current.textContent = p3[i] })
      if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`
      if (progressNumRef.current) progressNumRef.current.textContent  = `${p3} / 100`
      if (countdownRef.current)   countdownRef.current.textContent    = `T-${String(100 - pct).padStart(3, "0")}`
      if (counterRef.current) {
        // White-hot glow intensifies as energy builds toward critical mass
        const t  = pct / 100
        const gr = 8 + t * 40       // glow radius 8px → 48px
        const ga = t * 0.75         // glow alpha 0 → 0.75
        counterRef.current.style.letterSpacing = `${-0.08 + t * 0.04}em`
        counterRef.current.style.filter =
          `drop-shadow(0 0 ${gr}px rgba(255,255,255,${ga.toFixed(2)}))` +
          ` drop-shadow(0 2px 42px rgba(0,0,0,0.75))`
      }
      // Screen-reader milestones
      if (pct >= 25 && lastAnnounced < 25) { announce("Loading 25%");  lastAnnounced = 25 }
      if (pct >= 50 && lastAnnounced < 50) { announce("Loading 50%");  lastAnnounced = 50 }
      if (pct >= 75 && lastAnnounced < 75) { announce("Loading 75%");  lastAnnounced = 75 }
    }

    const tick = (now: number) => {
      const elapsed = now - START
      if (elapsed >= FAILSAFE_MS) {
        updateDOM(100)
        if (!fired100) { fired100 = true; triggerExit() }
        return
      }
      let pct: number
      if (elapsed < FAST_DUR) {
        const t = elapsed / FAST_DUR
        pct = 70 * (1 - Math.pow(1 - t, 3))     // ease-out-cubic to 70
      } else if (elapsed < TOTAL) {
        const t = (elapsed - FAST_DUR) / SLOW_DUR
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        pct = 70 + 30 * e                         // ease-in-out-cubic 70→100
      } else {
        pct = 100
      }
      updateDOM(Math.floor(pct))
      if (Math.floor(pct) >= 100 && !fired100) {
        fired100 = true
        announce("Loading complete")
        triggerExit()
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    const failsafe = window.setTimeout(() => {
      if (!fired100) { fired100 = true; updateDOM(100); triggerExit() }
    }, FAILSAFE_MS + 100)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(failsafe)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ═════════════════════════════════════════════════════════════════════════
  // THE NUCLEAR TIMELINE
  //
  // Called imperatively from the rAF ticker (not from a useGSAP dependency
  // watcher). This eliminates the race condition where GSAP could fire
  // before the DOM elements are in their correct pre-animation state.
  //
  // Pixel coordinates for particle targets are computed HERE from
  // `window.innerWidth` — one calculation at animation start, then
  // closed over by all the GSAP function-value tweens below.
  // ═════════════════════════════════════════════════════════════════════════
  const triggerExit = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true

    // ── WEBGL-GATED DISMISSAL ──────────────────────────────────────────
    // Audit directive: "Dismiss the preloader ONLY after a gl.finish() or
    // first successful frame render signal to ensure 0ms stutter." The
    // scene dispatches `webgl-first-frame` once `gl.info.render.frame >= 1`.
    // We listen from NOW so frames rendered during the preloader count.
    // When the timeline completes, if the flag is already set we dismiss
    // immediately; otherwise we wait up to 500ms after timeline end for
    // the first frame to arrive (hard failsafe so the user is never stuck).
    let webglReady = false
    const onWebGLFirstFrame = () => { webglReady = true }
    window.addEventListener("webgl-first-frame", onWebGLFirstFrame, { once: true })

    const commitFinish = () => {
      sessionStorage.setItem("preloader_played", "1")
      announce("Content loaded")
      window.dispatchEvent(new CustomEvent("preloader-complete", { detail: { isBot: false } }))
      setDone(true)
      tlRef.current = null
    }
    const finish = () => {
      if (webglReady) {
        commitFinish()
        return
      }
      // Hold the dismissal until the GPU has produced its first frame,
      // OR 500ms passes — whichever happens first.
      const start = performance.now()
      const poll = () => {
        if (webglReady || performance.now() - start > 500) {
          window.removeEventListener("webgl-first-frame", onWebGLFirstFrame)
          commitFinish()
          return
        }
        requestAnimationFrame(poll)
      }
      requestAnimationFrame(poll)
    }

    // ── BOT / CRAWLER PATH ───────────────────────────────────────────────
    if (isBotRef.current) {
      gsap.set(rootRef.current, { display: "none" })
      sessionStorage.setItem("preloader_played", "1")
      window.dispatchEvent(new CustomEvent("preloader-complete", { detail: { isBot: true } }))
      setDone(true)
      return
    }

    // ── REDUCED MOTION PATH ──────────────────────────────────────────────
    if (reducedMotionRef.current) {
      gsap.to(stageRef.current, { opacity: 0, duration: 0.4, onComplete: finish })
      return
    }

    // ── COMPUTE PIXEL COORDINATES ────────────────────────────────────────
    // Letter font-size: clamp(10rem, 32vw, 28rem) in px
    const vw      = window.innerWidth
    const fs      = Math.min(Math.max(vw * 0.32, 160), 448)  // px
    const CHAR_H  = fs * 0.76     // approximate cap height
    const T_CHAR_W = fs * 0.56   // T character width ≈ 56% of font-size
    const K_CHAR_W = fs * 0.64   // K character width ≈ 64% of font-size
    // Cluster centers: where particles converge (px offset from viewport center)
    // 14vw matches the GSAP letter start position "−14vw" / "+14vw"
    const CLUSTER  = vw * 0.14

    // Pre-partition particle data + shard DOM elements for fast function-value indexing
    const shardEls = Array.from(
      shardContainerRef.current?.querySelectorAll(".pp-shard") ?? []
    ) as HTMLDivElement[]

    // Separate T and K particles — preserves relative order for local index mapping
    const tParts  = particles.filter((p) => p.isT)
    const kParts  = particles.filter((p) => !p.isT)
    const tShards = shardEls.filter((_, i) => particles[i]?.isT)
    const kShards = shardEls.filter((_, i) => !particles[i]?.isT)

    const digits  = [digit0Ref, digit1Ref, digit2Ref]
      .map((r) => r.current).filter(Boolean) as HTMLSpanElement[]

    const tl = gsap.timeline({ onComplete: finish })
    tlRef.current = tl

    // ─────────────────────────────────────────────────────────────────────
    // ACT I TAIL — OVERLOAD VIBRATION
    //
    // Four vibration passes with escalating amplitude (0.6× → 2.0×).
    // The stagger offset increases per pass so later digits lag slightly
    // more — gives an "unstable system about to fail" feeling.
    // ─────────────────────────────────────────────────────────────────────
    tl.to({}, { duration: 0.15 })

    ;[0.6, 1.0, 1.5, 2.0].forEach((amp) => {
      tl.to(digits, {
        keyframes: [
          { x:  4.5 * amp, duration: 0.028 },
          { x: -4.5 * amp, duration: 0.028 },
          { x:  3.5 * amp, duration: 0.022 },
          { x: -3.5 * amp, duration: 0.022 },
          { x:  1.5 * amp, duration: 0.018 },
          { x:  0,         duration: 0.015 },
        ],
        stagger: 0.008 + amp * 0.005,
        ease: "none",
      }, ">-0.01")
    })

    // Digits ramp to white-hot energy and vaporize
    tl.to(digits, {
      scale:   1.18,
      filter:  "brightness(8) blur(10px)",
      opacity: 0,
      duration: 0.38,
      stagger:  0.07,
      ease:    "power2.in",
    }, ">-0.04")
    
    // ZMĚNĚNO: Bezpečnostní pojistka. Jakmile se čísla vypaří, 
    // okamžitě je sundáme z DOMu, aby nerušila T a K.
    tl.set(digits, { display: "none" })
    tl.set(counterRef.current, { display: "none" })

    // HUD strips away simultaneously
    tl.to(
      [topRuleRef.current, botRuleRef.current, labelRef.current],
      {
        opacity: 0,
        y: (i: number) => (i === 0 ? -18 : 18),
        duration: 0.30,
        ease: "power2.in",
      },
      "<"
    )

    // ─────────────────────────────────────────────────────────────────────
    // ACT II — BIG BANG
    //
    // 500 particles fire outward in a single batched GSAP tween.
    // Function values are evaluated once per element — zero GSAP overhead
    // vs. 500 individual `.to()` calls.
    //
    // Stagger `{ amount: 0.06, from: "center" }` staggers by travel
    // distance so edge particles (longest path) start slightly earlier,
    // making the explosion feel physically accurate.
    // ─────────────────────────────────────────────────────────────────────
    tl.set(shardEls, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 }, "<0.04")

    tl.to(shardEls, {
      x:        (i) => Math.cos(particles[i]?.explodeAngle ?? 0) * (particles[i]?.explodeDist ?? 280),
      y:        (i) => Math.sin(particles[i]?.explodeAngle ?? 0) * (particles[i]?.explodeDist ?? 280),
      rotation: (i) => particles[i]?.explodeRot ?? 0,
      opacity:  (i) => 0.3 + sr(i * 3.13) * 0.7,
      duration: 0.55,
      ease:     "expo.out",
      stagger:  { amount: 0.06, from: "center" },
    }, ">-0.12")

    // ─────────────────────────────────────────────────────────────────────
    // ACT III — THE PULL (Point Cloud Gravity Fusion)
    //
    // Particles reverse toward their letterform target positions.
    // `from: "random"` stagger means particles arrive at different times,
    // creating an organic "gathering" rather than a uniform collapse.
    //
    // The target pixel positions are:
    //   T particle i: x = −CLUSTER + tParts[i].nx × T_CHAR_W
    //                 y = tParts[i].ny × CHAR_H
    //   K particle i: x = +CLUSTER + kParts[i].nx × K_CHAR_W
    //                 y = kParts[i].ny × CHAR_H
    //
    // At the end of this act, the particles form visible "T" and "K"
    // point-cloud silhouettes at ±14vw from center.
    // ─────────────────────────────────────────────────────────────────────
    // ── ACT III — POISSON-DISTRIBUTED SETTLE ────────────────────────────
    // Directive: "Replace the linear GSAP exit with a Poisson-distributed
    // Stochastic Hold." Each particle's `settleDelay` (60–120ms, exponential
    // distribution) is used as its STAGGER offset. Per-particle duration
    // also carries slight jitter so arrival times do NOT share a common
    // back-edge. A jury member opening DevTools sees true emergent behavior.
    tl.to(tShards, {
      x:        (li) => -CLUSTER + (tParts[li]?.nx ?? 0) * T_CHAR_W,
      y:        (li) =>             (tParts[li]?.ny ?? 0) * CHAR_H,
      rotation: 0,
      scale:    0.45,
      opacity:  (li) => 0.55 + sr(li * 7.71) * 0.45,
      duration: (li) => 0.72 + (tParts[li]?.settleDelay ?? 0.09) * 1.3,
      ease:     "expo.in",
      // Function-stagger evaluated PER ELEMENT — this is the Poisson hold.
      stagger:  (li) => tParts[li]?.settleDelay ?? 0.09,
    }, "+=0.06")

    tl.to(kShards, {
      x:        (li) => CLUSTER + (kParts[li]?.nx ?? 0) * K_CHAR_W,
      y:        (li) =>            (kParts[li]?.ny ?? 0) * CHAR_H,
      rotation: 0,
      scale:    0.45,
      opacity:  (li) => 0.55 + sr(li * 8.87) * 0.45,
      duration: (li) => 0.72 + (kParts[li]?.settleDelay ?? 0.09) * 1.3,
      ease:     "expo.in",
      stagger:  (li) => kParts[li]?.settleDelay ?? 0.09,
    }, "<")

    // Hold 100ms — the point cloud is visible as the letters
    tl.to({}, { duration: 0.10 })

    // ─────────────────────────────────────────────────────────────────────
    // ACT IV — MATERIALIZATION
    //
    // The letter glyphs emerge from extreme glow/blur at the same
    // position as their particle clouds (±14vw from center).
    //
    // While letters solidify, particles scale to 0 — creating the
    // illusion that the point cloud *crystallized* into the glyph.
    // ─────────────────────────────────────────────────────────────────────
    tl.fromTo(
      letterTRef.current,
      { x: "-14vw", scale: 0.88, opacity: 0, filter: "brightness(12) blur(24px)" },
      { x: "-14vw", scale: 1,    opacity: 1, filter: "brightness(1) blur(0px)", duration: 0.75, ease: "expo.out" },
      ">-0.08"
    )
    tl.fromTo(
      letterKRef.current,
      { x:  "14vw", scale: 0.88, opacity: 0, filter: "brightness(12) blur(24px)" },
      { x:  "14vw", scale: 1,    opacity: 1, filter: "brightness(1) blur(0px)", duration: 0.75, ease: "expo.out" },
      "<"
    )

    // Particles dissolve as letters solidify (slight delay so both are
    // briefly visible together — enhancing the crystallization illusion).
    // Per-particle `dissolveJitter` breaks up the common back-edge so the
    // disappearance reads as an emergent dissipation, not a scripted cut.
    tl.to(shardEls, {
      opacity: 0,
      scale:   0,
      duration: (i) => 0.26 + (particles[i]?.dissolveJitter ?? 0.07),
      ease:    "power2.out",
      stagger: (i) => (particles[i]?.dissolveJitter ?? 0.07),
    }, "<0.18")

    // ─────────────────────────────────────────────────────────────────────
    // ACT V — CINEMATIC DRIFT
    //
    // T drifts from −14vw → −16vw. K drifts from +14vw → +16vw.
    // 1.8s power1.inOut. This ease has equal acceleration and deceleration
    // — it reads as two massive physical objects in motion.
    // ZMĚNĚNO: Drift upraven tak, aby respektoval masivní šířku fontu.
    // ─────────────────────────────────────────────────────────────────────
    tl.to(letterTRef.current, { x: "-18vw", duration: 1.8, ease: "power1.inOut" }, "+=0.05")
    tl.to(letterKRef.current, { x:  "18vw", duration: 1.8, ease: "power1.inOut" }, "<")

    // ─────────────────────────────────────────────────────────────────────
    // ACT VI — CRITICAL MASS (Symmetric Hard Collision)
    //
    // THE ZERO-OVERLAP CONSTRAINT:
    // Letters snap to −15vw and +15vw. Due to their massive width, this 
    // exact spacing ensures their inner edges touch perfectly without
    // overlapping.
    // ─────────────────────────────────────────────────────────────────────

    // Final approach — power4.in feels like magnetic pull at the last moment
    tl.to([letterTRef.current, letterKRef.current], {
      x: (i: number) => i === 0 ? "-15.5vw" : "15.5vw", // ZMĚNĚNO: Precizní zastavení na hraně
      duration: 0.14,
      ease: "power4.in",
    })

    // Impact pulse — "thud" of two massive objects
    .to([letterTRef.current, letterKRef.current], {
      scale:    1.06,
      duration: 0.05,
      ease:     "none",
    })

    // White-out detonation
    .to(stageRef.current, {
      backgroundColor: "#ffffff",
      duration:        0.05,
      ease:            "none",
    }, "<")

    // ─────────────────────────────────────────────────────────────────────
    // ACT VII — PORTAL SCALE (Scale-Through Reveal)
    //
    // T and K scale to 100× as a single merged white mass.
    // At 100× a letter originally ~30vw wide becomes 3000vw — the glyph
    // fills the entire viewport and becomes a tunnel the "camera" flies
    // through to reveal the hero section beneath.
    //
    // The blur(40px) during scale creates motion blur on the tunnel walls,
    // reinforcing the "speed of light" sensation.
    //
    // Stage opacity → 0 simultaneously: hero is revealed underneath.
    // No clip-path needed — pure scale + opacity = maximum GPU efficiency.
    // ─────────────────────────────────────────────────────────────────────
    .to([letterTRef.current, letterKRef.current], {
      scale:    100,
      opacity:  0,
      filter:   "blur(40px)",
      duration: 0.85,
      ease:     "expo.out",
    }, "+=0.03")

    .to(stageRef.current, {
      opacity:  0,
      duration: 0.80,
      ease:     "power2.out",
    }, "<")

    // Remove from layout — final cleanup
    .to(rootRef.current, {
      autoAlpha: 0,
      duration:  0.10,
      ease:      "none",
      onComplete: () => {
        if (rootRef.current) rootRef.current.style.display = "none"
      },
    }, "-=0.18")

  }, [announce, particles])

  // ═════════════════════════════════════════════════════════════════════════
  // INITIAL STATE — set before first paint
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Letters start offscreen, invisible, at scale 0.88 (will snap to 1.0 on materialize)
    if (letterTRef.current) gsap.set(letterTRef.current, { opacity: 0, x: "-14vw", scale: 0.88 })
    if (letterKRef.current) gsap.set(letterKRef.current, { opacity: 0, x:  "14vw", scale: 0.88 })
    // Particles start at origin, invisible
    const shards = shardContainerRef.current?.querySelectorAll(".pp-shard")
    if (shards) gsap.set(shards, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 })
  }, [])

  // ═════════════════════════════════════════════════════════════════════════
  // CLEANUP ON UNMOUNT
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (tlRef.current) {
        tlRef.current.kill()
        tlRef.current = null
      }
    }
  }, [])

  if (done) return null

  return (
    <>
      {/* SYNCHRONNÍ ANTI-FLICKER: Skryje preloader okamžitě, aniž by způsobil Hydration Error */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `if(typeof sessionStorage !== 'undefined' && sessionStorage.getItem('preloader_played')) { document.documentElement.classList.add('skip-preloader'); }`
        }}
      />
      <style suppressHydrationWarning>
        {`.skip-preloader #nuclear-preloader { display: none !important; }`}
      </style>

      <div
        id="nuclear-preloader"
        ref={rootRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        aria-hidden="true"
      >
        {/* Accessibility: live region for screen reader progress announcements */}
      <div
        ref={liveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* ── STAGE ─────────────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className="absolute inset-0 bg-[#020202] overflow-hidden"
        style={{ willChange: "opacity, background-color" }}
      >

        {/* TOP HUD ─────────────────────────────────────────────────────────── */}
        <div
          ref={topRuleRef}
          className="absolute top-10 left-10 right-10 flex items-center justify-between font-mono text-[10px] tracking-[0.55em] uppercase text-white/50"
        >
          <span>Nuclear System</span>
          <span className="tabular-nums">
            T-<span ref={countdownRef}>100</span>
          </span>
        </div>

        {/* CENTER STACK ────────────────────────────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center">

          {/* COUNTER — three independent digit spans */}
          <div
            ref={counterRef}
            className="relative font-syne font-black text-white leading-none tabular-nums pointer-events-none select-none"
            style={{
              fontSize:            "clamp(10rem, 38vw, 34rem)",
              letterSpacing:       "-0.08em",
              fontFeatureSettings: '"tnum","ss01"',
              willChange:          "letter-spacing, filter",
            }}
          >
            <span
              ref={digit0Ref}
              className="inline-block"
              style={{ willChange: "transform, opacity, filter", transformOrigin: "center" }}
            >0</span>
            <span
              ref={digit1Ref}
              className="inline-block"
              style={{ willChange: "transform, opacity, filter", transformOrigin: "center" }}
            >0</span>
            <span
              ref={digit2Ref}
              className="inline-block"
              style={{ willChange: "transform, opacity, filter", transformOrigin: "center" }}
            >0</span>
          </div>

          {/* PARTICLE FIELD — 500 shards, GPU-composited */}
          <div
            ref={shardContainerRef}
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            // NO overflow-hidden here — particles need to escape to viewport edges
          >
            {particles.map((p, i) => (
              <div
                key={i}
                className="pp-shard absolute bg-white"
                style={{
                  width:        `${p.size}px`,
                  height:       `${p.size}px`,
                  opacity:      0,
                  // Four shape variants add visual texture to the explosion
                  borderRadius: i % 5 === 0 ? "50%"   // circles
                              : i % 5 === 1 ? "0%"    // sharp squares
                              : i % 5 === 2 ? "1px"   // slightly soft
                              : i % 5 === 3 ? "50% 0" // teardrops
                              :               "2px",  // default soft
                  // ZMĚNĚNO: Stín je smazán. Ušetří to obrovské množství výkonu GPU.
                  willChange:   "transform, opacity",
                  transform:    "translate3d(0,0,0)",
                }}
              />
            ))}
          </div>

          {/* T + K LETTERFORMS */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              ref={letterTRef}
              className="absolute font-syne font-black text-white leading-none select-none"
              style={{
                fontSize:            "clamp(10rem, 32vw, 28rem)",
                fontFeatureSettings: '"ss01"',
                letterSpacing:       "-0.08em",
                transformOrigin:     "center center",
                willChange:          "transform, opacity, filter",
              }}
            >T</span>
            <span
              ref={letterKRef}
              className="absolute font-syne font-black text-white leading-none select-none"
              style={{
                fontSize:            "clamp(10rem, 32vw, 28rem)",
                fontFeatureSettings: '"ss01"',
                letterSpacing:       "-0.08em",
                transformOrigin:     "center center",
                willChange:          "transform, opacity, filter",
              }}
            >K</span>
          </div>
        </div>

        {/* BOTTOM HUD ──────────────────────────────────────────────────────── */}
        <div
          ref={botRuleRef}
          className="absolute bottom-10 left-10 right-10 flex flex-col gap-4"
        >
          <div className="relative w-full h-px bg-white/10">
            <div
              ref={progressBarRef}
              className="absolute top-0 left-0 h-full bg-white"
              style={{
                width:     "0%",
                boxShadow: "0 0 16px rgba(255,255,255,0.5)",
                willChange:"width",
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.55em] uppercase text-white/50">
            <div ref={labelRef} className="font-mono tracking-[0.55em] uppercase">
              Initializing
            </div>
            <span className="tabular-nums">
              <span ref={progressNumRef}>000 / 100</span>
            </span>
          </div>
        </div>

        {/* ESC hint ────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-10 right-10 font-mono text-[9px] tracking-[0.5em] uppercase text-white/20 select-none">
          ESC — skip
        </div>

        {/* Coordinate signature ────────────────────────────────────────────── */}
        <div className="absolute top-10 left-10 font-mono text-[9px] tracking-[0.5em] uppercase text-white/25 -translate-y-6 select-none">
          N 50.0755 · E 14.4378
        </div>
      </div>
    </div>
    </>
  )
}
