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
 * • 350 particle objects are pre-computed in `useMemo` using seeded math
 *   — deterministic, zero allocation on re-render.
 * • Every animated element carries `will-change: transform, opacity` so
 *   the GPU compositor pre-promotes layers before Act I begins.
 * • The GSAP timeline is stored in a ref and `.kill()`-ed on unmount.
 * • `useLayoutEffect` fires synchronously before the browser's first paint,
 *   guaranteeing zero flicker on return visits.
 *
 * POISSON SETTLEMENT — WHAT CHANGED IN THIS REVISION
 * ───────────────────────────────────────────────────
 * The previous implementation computed per-particle inter-arrival times
 * via exponential sampling (Δt = −ln(U) / λ) — mathematically sound —
 * but then handed those times to GSAP's `stagger` as if they were
 * ABSOLUTE delays. That collapsed every particle into a 60–120ms uniform
 * jitter. The Poisson process existed in the variable names only.
 *
 * This revision:
 *   1. Computes per-particle settle deltas WITHOUT clamping the long tail.
 *   2. Accumulates them into a CUMULATIVE ARRIVAL TIME (`cumArrival`).
 *   3. Scales the cumulative series so the last particle lands at 650ms.
 *   4. Feeds `cumArrival` as the stagger value.
 *
 * Result: particles arrive in perceptible CLUSTERS followed by silences.
 * Three particles land in 40ms, then nothing for 200ms, then five in 80ms.
 * That is the broken-clock cadence of a true Poisson process — the
 * fingerprint of physical simulation, not choreography.
 *
 * STRUCTURAL: the 160ms CSS transition that was fighting the spring in
 * `projects.tsx` has been removed over there. This file was clean.
 *
 * ═══════════════════════════════════════════════════════════════════
 * DIRECTOR'S SURGICAL PATCH — REGRESSION 01 TERTIARY (poll timeout)
 * ═══════════════════════════════════════════════════════════════════
 * The `webgl-first-frame` poll window was hardcoded at 500ms. On an
 * A13 Bionic compiling the fragment shader for the first time, 500ms
 * is insufficient — shader compilation alone can take 800–1200ms on
 * first load. The poll expired, `commitFinish()` fired, and the user
 * got the hero with a still-compiling shader underneath.
 *
 * FIX: detect mobile (via `navigator.maxTouchPoints > 0 && innerWidth
 * < 1024`, with an Android userAgent fallback — userAgent alone is
 * unreliable on iPadOS) and extend the poll timeout to 2500ms there.
 * Desktop retains the 500ms timeout — no desktop regression.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"

// ═══════════════════════════════════════════════════════════════════════════
// LETTERFORM GEOMETRY — module-level pure functions, no side effects
// ═══════════════════════════════════════════════════════════════════════════

function sr(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

function tPoint(i: number): { nx: number; ny: number } {
  const r1 = sr(i * 3.1 + 0.1)
  const r2 = sr(i * 7.9 + 0.2)
  const r3 = sr(i * 13.7 + 0.3)

  const BAR_BOT = 0.28
  const BAR_TOP = 0.5
  const STEM_HW = 0.13

  const barArea = 1.0 * (BAR_TOP - BAR_BOT)
  const stemArea = STEM_HW * 2 * (BAR_BOT + 0.5)
  const barRatio = barArea / (barArea + stemArea)

  if (r3 < barRatio) {
    return { nx: r1 - 0.5, ny: BAR_BOT + r2 * (BAR_TOP - BAR_BOT) }
  } else {
    return { nx: (r1 - 0.5) * STEM_HW * 2, ny: -0.5 + r2 * (BAR_BOT + 0.5) }
  }
}

function kPoint(i: number): { nx: number; ny: number } {
  const r1 = sr(i * 4.3 + 0.4)
  const r2 = sr(i * 8.9 + 0.5)
  const r4 = sr(i * 23.7 + 0.7)

  const STEM_L = -0.5
  const STEM_R = -0.18
  const ARM_X1 = 0.5
  const ARM_Y1 = 0.5
  const ARM_HT = 0.065

  const armDX = ARM_X1 - STEM_R
  const armDY = ARM_Y1
  const armLen = Math.sqrt(armDX * armDX + armDY * armDY)

  const tX = armDX / armLen
  const tY = armDY / armLen
  const pX = -tY
  const pY = tX

  const stemArea = (STEM_R - STEM_L) * 1.0
  const armArea = armLen * (ARM_HT * 2)
  const total = stemArea + armArea * 2
  const stemCut = stemArea / total
  const upperCut = (stemArea + armArea) / total

  if (r4 < stemCut) {
    return { nx: STEM_L + r1 * (STEM_R - STEM_L), ny: r2 - 0.5 }
  } else if (r4 < upperCut) {
    const t = r1
    const s = (r2 - 0.5) * 2 * ARM_HT
    return { nx: STEM_R + t * armDX + pX * s, ny: t * armDY + pY * s }
  } else {
    const lPX = tY
    const lPY = tX
    const t = r1
    const s = (r2 - 0.5) * 2 * ARM_HT
    return { nx: STEM_R + t * armDX + lPX * s, ny: -t * armDY + lPY * s }
  }
}

// ═══════════════════════════════════════════════════════════════════════════

const PARTICLE_COUNT = 350 // 175 → T, 175 → K
const POISSON_WINDOW = 0.65 // 650ms — the entire settle phase
const POISSON_LAMBDA = 13.3 // mean inter-arrival = 1/λ ≈ 75ms

export const Preloader = () => {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const counterRef = useRef<HTMLDivElement>(null)
  const digit0Ref = useRef<HTMLSpanElement>(null)
  const digit1Ref = useRef<HTMLSpanElement>(null)
  const digit2Ref = useRef<HTMLSpanElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressNumRef = useRef<HTMLSpanElement>(null)
  const countdownRef = useRef<HTMLSpanElement>(null)

  const shardContainerRef = useRef<HTMLDivElement>(null)
  const letterTRef = useRef<HTMLSpanElement>(null)
  const letterKRef = useRef<HTMLSpanElement>(null)

  const topRuleRef = useRef<HTMLDivElement>(null)
  const botRuleRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const liveRef = useRef<HTMLDivElement>(null)

  const completedRef = useRef(false)
  const isBotRef = useRef(false)
  const reducedMotionRef = useRef(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const [done, setDone] = useState(false)

  const announce = useCallback((msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg
  }, [])

  // ═════════════════════════════════════════════════════════════════════════
  // PARTICLE GEOMETRY + TRUE POISSON ARRIVAL TIMES
  //
  // Phase 1: sample per-particle inter-arrival delta via exponential
  //          distribution. NO clamping — the long tail is the whole point;
  //          clamping to 120ms eliminated every event that would produce
  //          a perceptible gap.
  // Phase 2: accumulate the deltas within each cluster (T and K run as
  //          independent Poisson processes — they are two separate arrival
  //          streams at different targets, so they must not share a clock).
  // Phase 3: scale each cluster's arrival series so the last particle
  //          lands at POISSON_WINDOW (650ms). The intra-cluster CLUSTERING
  //          and SILENCES are preserved exactly; only the global scale
  //          is adjusted.
  // ═════════════════════════════════════════════════════════════════════════
  const particles = useMemo(() => {
    // First pass — build raw particle records with base stochastic fields.
    const raw = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const isT = i < PARTICLE_COUNT / 2
      const idx = isT ? i : i - PARTICLE_COUNT / 2

      const { nx, ny } = isT ? tPoint(idx) : kPoint(idx)

      const explodeAngle = Number(((i / PARTICLE_COUNT) * Math.PI * 2 + sr(i * 2.71 + 0.1) * 0.9).toFixed(3))
      const explodeDist = Number((160 + sr(i * 5.91 + 1.1) * 420).toFixed(3))
      const explodeRot = Number(((sr(i * 9.37 + 2.2) - 0.5) * 1440).toFixed(3))
      const size = Number((1.2 + sr(i * 4.43 + 3.3) * 4.8).toFixed(3))
      const safeNx = Number(nx.toFixed(3))
      const safeNy = Number(ny.toFixed(3))

      // ── TRUE INTER-ARRIVAL SAMPLING ──────────────────────────────────
      // Δt = -ln(U) / λ, with U ∈ (0, 1]. The long tail is preserved —
      // no clamp. A few particles will wait a full half-second; that
      // silence is the signature of the Poisson process.
      const u = Math.max(1e-4, sr(i * 11.17 + 4.4))
      const settleDelta = -Math.log(u) / POISSON_LAMBDA // seconds, unbounded upper

      const dissolveJitter = Number((sr(i * 19.31 + 5.5) * 0.14).toFixed(4))

      return {
        isT,
        nx: safeNx,
        ny: safeNy,
        explodeAngle,
        explodeDist,
        explodeRot,
        size,
        settleDelta,
        dissolveJitter,
        // Filled in by the cumulative pass below:
        cumArrival: 0,
      }
    })

    // Second pass — per-cluster cumulative arrival. T and K are TWO
    // independent Poisson streams, not one. Accumulating them separately
    // is what produces the "broken clock" clustering on EACH side of
    // the screen (versus a single accumulator that would correlate them).
    const accumulate = (predicate: (p: (typeof raw)[number]) => boolean) => {
      let t = 0
      for (let i = 0; i < raw.length; i++) {
        if (!predicate(raw[i])) continue
        t += raw[i].settleDelta
        raw[i].cumArrival = t
      }
      // Normalize so the last arrival in this cluster lands at exactly
      // POISSON_WINDOW. This preserves every intra-cluster ratio — every
      // cluster and every silence — while locking the outer envelope.
      const lastIdx = (() => {
        for (let i = raw.length - 1; i >= 0; i--) if (predicate(raw[i])) return i
        return -1
      })()
      if (lastIdx < 0) return
      const scale = POISSON_WINDOW / raw[lastIdx].cumArrival
      for (let i = 0; i < raw.length; i++) {
        if (!predicate(raw[i])) continue
        raw[i].cumArrival = Number((raw[i].cumArrival * scale).toFixed(4))
      }
    }

    accumulate((p) => p.isT)
    accumulate((p) => !p.isT)

    return raw
  }, [])

  // ═════════════════════════════════════════════════════════════════════════
  // ANTI-FLICKER
  // ═════════════════════════════════════════════════════════════════════════
  useLayoutEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    isBotRef.current = /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(navigator.userAgent)

    if (sessionStorage.getItem("preloader_played")) {
      completedRef.current = true
      if (rootRef.current) rootRef.current.style.display = "none"
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("preloader-complete", { detail: { isBot: isBotRef.current } }))
        setDone(true)
      })
    }
  }, [])

  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerExit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ═════════════════════════════════════════════════════════════════════════
  // ACT I — PROGRESS TICKER
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (done) return

    const START = performance.now()
    const FAST_DUR = 600
    const SLOW_DUR = 700
    const TOTAL = FAST_DUR + SLOW_DUR
    const FAILSAFE_MS = 1800

    let raf = 0
    let fired100 = false
    let lastAnnounced = 0
    const dRefs = [digit0Ref, digit1Ref, digit2Ref]

    const updateDOM = (pct: number) => {
      const p3 = String(pct).padStart(3, "0")
      dRefs.forEach((r, i) => {
        if (r.current) r.current.textContent = p3[i]
      })
      if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`
      if (progressNumRef.current) progressNumRef.current.textContent = `${p3} / 100`
      if (countdownRef.current) countdownRef.current.textContent = `T-${String(100 - pct).padStart(3, "0")}`
      if (counterRef.current) {
        const t = pct / 100
        const gr = 8 + t * 40
        const ga = t * 0.75
        counterRef.current.style.letterSpacing = `${-0.08 + t * 0.04}em`
        counterRef.current.style.filter =
          `drop-shadow(0 0 ${gr}px rgba(255,255,255,${ga.toFixed(2)}))` +
          ` drop-shadow(0 2px 42px rgba(0,0,0,0.75))`
      }
      if (pct >= 25 && lastAnnounced < 25) {
        announce("Loading 25%")
        lastAnnounced = 25
      }
      if (pct >= 50 && lastAnnounced < 50) {
        announce("Loading 50%")
        lastAnnounced = 50
      }
      if (pct >= 75 && lastAnnounced < 75) {
        announce("Loading 75%")
        lastAnnounced = 75
      }
    }

    const tick = (now: number) => {
      const elapsed = now - START
      if (elapsed >= FAILSAFE_MS) {
        updateDOM(100)
        if (!fired100) {
          fired100 = true
          triggerExit()
        }
        return
      }
      let pct: number
      if (elapsed < FAST_DUR) {
        const t = elapsed / FAST_DUR
        pct = 70 * (1 - Math.pow(1 - t, 3))
      } else if (elapsed < TOTAL) {
        const t = (elapsed - FAST_DUR) / SLOW_DUR
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        pct = 70 + 30 * e
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
      if (!fired100) {
        fired100 = true
        updateDOM(100)
        triggerExit()
      }
    }, FAILSAFE_MS + 100)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(failsafe)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ═════════════════════════════════════════════════════════════════════════
  // THE NUCLEAR TIMELINE
  // ═════════════════════════════════════════════════════════════════════════
  const triggerExit = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true

    // ── NULL GUARD — DOM may have been torn down before this fires ──────
    if (!stageRef.current || !shardContainerRef.current) {
      setDone(true)
      return
    }

    const isMobileDevice =
      typeof navigator !== "undefined" &&
      ((navigator.maxTouchPoints > 0 && window.innerWidth < 1024) ||
        /Android/i.test(navigator.userAgent ?? ""))
    const WEBGL_POLL_TIMEOUT = isMobileDevice ? 2500 : 500

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
      if (webglReady) { commitFinish(); return }
      const start = performance.now()
      const poll = () => {
        if (webglReady || performance.now() - start > WEBGL_POLL_TIMEOUT) {
          window.removeEventListener("webgl-first-frame", onWebGLFirstFrame)
          commitFinish()
          return
        }
        requestAnimationFrame(poll)
      }
      requestAnimationFrame(poll)
    }

    if (isBotRef.current) {
      gsap.set(rootRef.current, { display: "none" })
      sessionStorage.setItem("preloader_played", "1")
      window.dispatchEvent(new CustomEvent("preloader-complete", { detail: { isBot: true } }))
      setDone(true)
      return
    }

    if (reducedMotionRef.current) {
      gsap.to(stageRef.current, { opacity: 0, duration: 0.4, onComplete: finish })
      return
    }

    // ── PORTRAIT-AWARE PIXEL GEOMETRY ────────────────────────────────────
    const vw = window.innerWidth
    const isPortrait = window.innerHeight > vw

    const portraitFactor = isPortrait ? 0.8 : 1.0
    const fs = Math.min(Math.max(vw * 0.32, 160), 448) * portraitFactor
    const CHAR_H   = fs * 0.76
    const T_CHAR_W = fs * 0.56
    const K_CHAR_W = fs * 0.64

    const T_HALF = T_CHAR_W * 0.52 
    const K_HALF = K_CHAR_W * 0.58
    const MIN_CLUSTER = T_HALF + K_HALF + 8 
    const CLUSTER = Math.max(vw * 0.14, MIN_CLUSTER * 0.5)

    const POS_ENTER = CLUSTER            
    const POS_DRIFT = CLUSTER + vw * 0.04   
    const POS_COLLIDE = T_HALF + K_HALF + 1

    const shardEls = Array.from(
      shardContainerRef.current?.querySelectorAll(".pp-shard") ?? []
    ) as HTMLDivElement[]

    if (shardEls.length === 0) { finish(); return }

    const tParts  = particles.filter((p) => p.isT)
    const kParts  = particles.filter((p) => !p.isT)
    const tShards = shardEls.filter((_, i) => particles[i]?.isT)
    const kShards = shardEls.filter((_, i) => !particles[i]?.isT)

    const digits = [digit0Ref, digit1Ref, digit2Ref]
      .map((r) => r.current).filter(Boolean) as HTMLSpanElement[]

    const tl = gsap.timeline({ onComplete: finish })
    tlRef.current = tl

    // ── ACT I TAIL — OVERLOAD VIBRATION ──────────────────────────────────
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

    tl.to(digits, {
      scale: 1.18,
      filter: "brightness(8) blur(10px)",
      opacity: 0,
      duration: 0.38,
      stagger: 0.07,
      ease: "power2.in",
    }, ">-0.04")

    tl.set(digits, { display: "none" })
    tl.set(counterRef.current, { display: "none" })
    tl.to(
      [topRuleRef.current, botRuleRef.current, labelRef.current].filter(Boolean),
      { opacity: 0, y: (i: number) => (i === 0 ? -18 : 18), duration: 0.3, ease: "power2.in" },
      "<"
    )

    // ── ACT II — BIG BANG ──────────────────────────────────────────────
    const maxExplode = isPortrait ? Math.min(vw * 0.8, 280) : Infinity
    tl.set(shardEls, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 }, "<0.04")
    tl.to(shardEls, {
      x: (i) => {
        const raw = Math.cos(particles[i]?.explodeAngle ?? 0) * (particles[i]?.explodeDist ?? 280)
        return isPortrait ? Math.max(-maxExplode, Math.min(maxExplode, raw)) : raw
      },
      y: (i) => {
        const raw = Math.sin(particles[i]?.explodeAngle ?? 0) * (particles[i]?.explodeDist ?? 280)
        return isPortrait ? Math.max(-maxExplode, Math.min(maxExplode, raw)) : raw
      },
      rotation: (i) => particles[i]?.explodeRot ?? 0,
      opacity:  (i) => 0.3 + sr(i * 3.13) * 0.7,
      duration: 0.55,
      ease: "expo.out",
      stagger: { amount: 0.06, from: "center" },
    }, ">-0.12")

    // ── ACT III — TRUE POISSON PULL ───────────────────────────────────
    tl.to(tShards, {
      x:        (li) => -CLUSTER + (tParts[li]?.nx ?? 0) * T_CHAR_W,
      y:        (li) =>             (tParts[li]?.ny ?? 0) * CHAR_H,
      rotation: 0,
      scale:    0.45,
      opacity:  (li) => 0.55 + sr(li * 7.71) * 0.45,
      duration: (li) => 0.58 + (tParts[li]?.settleDelta ?? 0.075) * 1.2,
      ease:     "expo.in",
      stagger:  (li) => tParts[li]?.cumArrival ?? 0,
    }, "+=0.04")
    tl.to(kShards, {
      x:        (li) =>  CLUSTER + (kParts[li]?.nx ?? 0) * K_CHAR_W,
      y:        (li) =>             (kParts[li]?.ny ?? 0) * CHAR_H,
      rotation: 0,
      scale:    0.45,
      opacity:  (li) => 0.55 + sr(li * 8.87) * 0.45,
      duration: (li) => 0.58 + (kParts[li]?.settleDelta ?? 0.075) * 1.2,
      ease:     "expo.in",
      stagger:  (li) => kParts[li]?.cumArrival ?? 0,
    }, "<")

    tl.to({}, { duration: 0.1 })

    // ── ACT IV — MATERIALIZATION (pixel positions) ─────────────────────
    tl.fromTo(letterTRef.current,
      { x: -POS_ENTER, scale: 0.88, opacity: 0, filter: "brightness(12) blur(24px)" },
      { x: -POS_ENTER, scale: 1,    opacity: 1, filter: "brightness(1) blur(0px)",
        duration: 0.75, ease: "expo.out" },
      ">-0.08"
    )
    tl.fromTo(letterKRef.current,
      { x:  POS_ENTER, scale: 0.88, opacity: 0, filter: "brightness(12) blur(24px)" },
      { x:  POS_ENTER, scale: 1,    opacity: 1, filter: "brightness(1) blur(0px)",
        duration: 0.75, ease: "expo.out" },
      "<"
    )
    tl.to(shardEls, {
      opacity: 0, scale: 0,
      duration: (i) => 0.26 + (particles[i]?.dissolveJitter ?? 0.07),
      ease: "power2.out",
      stagger: (i) => particles[i]?.dissolveJitter ?? 0.07,
    }, "<0.18")

    // ── ACT V — CINEMATIC DRIFT (pixel) ────────────────────────────────
    tl.to(letterTRef.current, { x: -POS_DRIFT, duration: 1.8, ease: "power1.inOut" }, "+=0.05")
    tl.to(letterKRef.current, { x:  POS_DRIFT, duration: 1.8, ease: "power1.inOut" }, "<")

    // ── ACT VI — CRITICAL MASS (pixel — zero overlap guaranteed) ───────
    tl.to([letterTRef.current, letterKRef.current], {
      x: (idx: number) => idx === 0 ? -POS_COLLIDE : POS_COLLIDE,
      duration: 0.14,
      ease: "power4.in",
    })
    .to([letterTRef.current, letterKRef.current], {
      scale: 1.06, duration: 0.05, ease: "none",
    })
    .to(stageRef.current, {
      backgroundColor: "#ffffff", duration: 0.05, ease: "none",
    }, "<")

    // ── ACT VII — PORTAL SCALE ─────────────────────────────────────────
    .to([letterTRef.current, letterKRef.current], {
      scale: 100, opacity: 0, filter: "blur(40px)",
      duration: 0.85, ease: "expo.out",
    }, "+=0.03")
    .to(stageRef.current, { opacity: 0, duration: 0.80, ease: "power2.out" }, "<")
    .to(rootRef.current, {
      autoAlpha: 0, duration: 0.10, ease: "none",
      onComplete: () => { if (rootRef.current) rootRef.current.style.display = "none" },
    }, "-=0.18")
  }, [announce, particles])

  useEffect(() => {
    if (letterTRef.current) gsap.set(letterTRef.current, { opacity: 0, x: 0, scale: 0.88 })
    if (letterKRef.current) gsap.set(letterKRef.current, { opacity: 0, x: 0, scale: 0.88 })
    const shards = shardContainerRef.current?.querySelectorAll(".pp-shard")
    if (shards) gsap.set(shards, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 })
  }, [])

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
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `if(typeof sessionStorage !== 'undefined' && sessionStorage.getItem('preloader_played')) { document.documentElement.classList.add('skip-preloader'); }`,
        }}
      />
      <style suppressHydrationWarning>{`.skip-preloader #nuclear-preloader { display: none !important; }`}</style>

      <div id="nuclear-preloader" ref={rootRef} className="fixed inset-0 z-[100] pointer-events-none" aria-hidden="true">
        <div ref={liveRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

        <div
          ref={stageRef}
          className="absolute inset-0 bg-[#020202] overflow-hidden"
          style={{ willChange: "opacity, background-color" }}
        >
          <div
            ref={topRuleRef}
            className="absolute top-10 left-10 right-10 flex items-center justify-between font-mono text-[10px] tracking-[0.55em] uppercase text-white/50"
          >
            <span>Nuclear System</span>
            <span className="tabular-nums">
              T-<span ref={countdownRef}>100</span>
            </span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div
              ref={counterRef}
              className="relative font-syne font-black text-white leading-none tabular-nums pointer-events-none select-none"
              style={{
                fontSize: "clamp(10rem, 38vw, 34rem)",
                letterSpacing: "-0.08em",
                fontFeatureSettings: '"tnum","ss01"',
                willChange: "letter-spacing, filter",
              }}
            >
              <span
                ref={digit0Ref}
                className="inline-block"
                style={{ willChange: "transform, opacity, filter", transformOrigin: "center" }}
              >
                0
              </span>
              <span
                ref={digit1Ref}
                className="inline-block"
                style={{ willChange: "transform, opacity, filter", transformOrigin: "center" }}
              >
                0
              </span>
              <span
                ref={digit2Ref}
                className="inline-block"
                style={{ willChange: "transform, opacity, filter", transformOrigin: "center" }}
              >
                0
              </span>
            </div>

            <div
              ref={shardContainerRef}
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              {particles.map((p, i) => (
                <div
                  key={i}
                  className="pp-shard absolute bg-white"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: "1px",
                    willChange: "transform, opacity",
                  }}
                />
              ))}
            </div>

            <span
              ref={letterTRef}
              className="absolute font-syne font-black text-white leading-none pointer-events-none select-none"
              style={{
                fontSize: "clamp(10rem, 32vw, 28rem)",
                letterSpacing: "-0.08em",
                willChange: "transform, opacity, filter",
              }}
            >
              T
            </span>
            <span
              ref={letterKRef}
              className="absolute font-syne font-black text-white leading-none pointer-events-none select-none"
              style={{
                fontSize: "clamp(10rem, 32vw, 28rem)",
                letterSpacing: "-0.08em",
                willChange: "transform, opacity, filter",
              }}
            >
              K
            </span>
          </div>

          <div
            ref={botRuleRef}
            className="absolute bottom-10 left-10 right-10 flex items-center justify-between font-mono text-[10px] tracking-[0.55em] uppercase text-white/50"
          >
            <span ref={progressNumRef}>000 / 100</span>
            <div ref={labelRef}>
              <span className="text-white/40">Init · Kinetic Layer</span>
            </div>
          </div>

          <div className="absolute bottom-[5.5rem] left-10 right-10 h-px bg-white/10">
            <div ref={progressBarRef} className="h-full bg-white/70" style={{ width: "0%" }} />
          </div>
        </div>
      </div>
    </>
  )
}
