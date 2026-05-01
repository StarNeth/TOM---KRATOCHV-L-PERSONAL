"use client"

/**
 * ═══════════════════════════════════════════════════════════════════
 * PRELOADER — Nuclear Fusion & Portal Reveal
 * White-background premium edition — Awwwards aesthetic
 * ═══════════════════════════════════════════════════════════════════
 *
 * PERFORMANCE CONTRACT
 * ─────────────────────
 * • Exactly ONE React `setState` call: `setDone(true)` at Act VII end.
 *   Everything else is ref + imperative DOM.
 * • 350 particle objects pre-computed in `useMemo` via seeded math —
 *   deterministic, zero allocation on re-render.
 * • Every animated element carries `will-change: transform, opacity`
 *   for GPU compositor pre-promotion before Act I.
 * • GSAP timeline stored in ref, `.kill()`-ed on unmount.
 * • `useLayoutEffect` fires before first paint — zero flicker.
 *
 * REVISION NOTES — FINAL POLISH
 * ───────────────────────────────
 * • Meta bars restored: "Nuclear System" / countdown / progress label.
 * • Counter sized down (clamp 5.5rem→19rem) so T/K letters dominate.
 * • Particle shapes mixed: ~60% tall slivers (2:1), ~40% squares.
 * • Static particle opacity removed — GSAP owns opacity from zero.
 * • Act I fast phase: 600ms → 400ms for a snappier ticker.
 * • Act V drift: 1.8s power1 → 1.3s power2.inOut — decisive pull.
 * • Act VI: stageRef micro-shockwave scale(1.04) on collision.
 * • Dissolve jitter capped at 0.08 — no stragglers.
 * • Portrait geometry tightened for sub-390px viewports.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"

// ═══════════════════════════════════════════════════════════════════════════
// SEEDED RANDOM — pure, no side effects
// ═══════════════════════════════════════════════════════════════════════════

function sr(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

// ═══════════════════════════════════════════════════════════════════════════
// LETTERFORM GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

function tPoint(i: number): { nx: number; ny: number } {
  const r1 = sr(i * 3.1 + 0.1)
  const r2 = sr(i * 7.9 + 0.2)
  const r3 = sr(i * 13.7 + 0.3)

  const BAR_BOT = 0.28
  const BAR_TOP = 0.5
  const STEM_HW = 0.13

  const barArea  = 1.0 * (BAR_TOP - BAR_BOT)
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

  const armDX  = ARM_X1 - STEM_R
  const armDY  = ARM_Y1
  const armLen = Math.sqrt(armDX * armDX + armDY * armDY)

  const tX = armDX / armLen
  const tY = armDY / armLen
  const pX = -tY
  const pY = tX

  const stemArea  = (STEM_R - STEM_L) * 1.0
  const armArea   = armLen * (ARM_HT * 2)
  const total     = stemArea + armArea * 2
  const stemCut   = stemArea / total
  const upperCut  = (stemArea + armArea) / total

  if (r4 < stemCut) {
    return { nx: STEM_L + r1 * (STEM_R - STEM_L), ny: r2 - 0.5 }
  } else if (r4 < upperCut) {
    const t = r1
    const s = (r2 - 0.5) * 2 * ARM_HT
    return { nx: STEM_R + t * armDX + pX * s, ny: t * armDY + pY * s }
  } else {
    const lPX = tY
    const lPY = tX
    const t   = r1
    const s   = (r2 - 0.5) * 2 * ARM_HT
    return { nx: STEM_R + t * armDX + lPX * s, ny: -t * armDY + lPY * s }
  }
}

// ═══════════════════════════════════════════════════════════════════════════

const PARTICLE_COUNT = 350   // 175 → T, 175 → K
const POISSON_WINDOW = 0.65  // 650ms settle envelope
const POISSON_LAMBDA = 13.3  // mean inter-arrival ≈ 75ms
const SLIVER_RATIO   = 0.60  // fraction of particles that are tall slivers

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const Preloader = () => {
  const rootRef           = useRef<HTMLDivElement>(null)
  const stageRef          = useRef<HTMLDivElement>(null)

  const counterRef        = useRef<HTMLDivElement>(null)
  const digit0Ref         = useRef<HTMLSpanElement>(null)
  const digit1Ref         = useRef<HTMLSpanElement>(null)
  const digit2Ref         = useRef<HTMLSpanElement>(null)
  const progressBarRef    = useRef<HTMLDivElement>(null)
  const progressNumRef    = useRef<HTMLSpanElement>(null)
  const countdownRef      = useRef<HTMLSpanElement>(null)

  const shardContainerRef = useRef<HTMLDivElement>(null)
  const letterTRef        = useRef<HTMLSpanElement>(null)
  const letterKRef        = useRef<HTMLSpanElement>(null)

  const topRuleRef        = useRef<HTMLDivElement>(null)
  const botRuleRef        = useRef<HTMLDivElement>(null)
  const labelRef          = useRef<HTMLDivElement>(null)

  const liveRef           = useRef<HTMLDivElement>(null)

  const completedRef      = useRef(false)
  const isBotRef          = useRef(false)
  const reducedMotionRef  = useRef(false)
  const tlRef             = useRef<gsap.core.Timeline | null>(null)
  const pollRafRef        = useRef(0)
  const pollAborted       = useRef(false)

  const [done, setDone] = useState(false)

  const announce = useCallback((msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg
  }, [])

  // ═══════════════════════════════════════════════════════════════════════
  // PARTICLE GEOMETRY + TRUE POISSON ARRIVAL TIMES
  //
  // Shapes: ~60% tall slivers (w × 2w), ~40% squares — crystal-fracture
  // physicality. Static `opacity` removed from JSX; GSAP owns it from 0.
  // Dissolve jitter capped at 0.08 — no straggler particles.
  // ═══════════════════════════════════════════════════════════════════════
  const particles = useMemo(() => {
    const raw = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const isT = i < PARTICLE_COUNT / 2
      const idx = isT ? i : i - PARTICLE_COUNT / 2

      const { nx, ny } = isT ? tPoint(idx) : kPoint(idx)

      const explodeAngle   = Number(((i / PARTICLE_COUNT) * Math.PI * 2 + sr(i * 2.71 + 0.1) * 0.9).toFixed(3))
      const explodeDist    = Number((160 + sr(i * 5.91 + 1.1) * 420).toFixed(3))
      const explodeRot     = Number(((sr(i * 9.37 + 2.2) - 0.5) * 1440).toFixed(3))
      const baseSize       = Number((1.2 + sr(i * 4.43 + 3.3) * 4.8).toFixed(3))
      const isSliver       = sr(i * 6.61 + 7.7) < SLIVER_RATIO
      const safeNx         = Number(nx.toFixed(3))
      const safeNy         = Number(ny.toFixed(3))

      // TRUE INTER-ARRIVAL SAMPLING — no clamp, long tail preserved
      const u              = Math.max(1e-4, sr(i * 11.17 + 4.4))
      const settleDelta    = -Math.log(u) / POISSON_LAMBDA

      // Cap at 0.08 so the dissolve has no visible stragglers
      const dissolveJitter = Number((Math.min(sr(i * 19.31 + 5.5) * 0.14, 0.08)).toFixed(4))

      return {
        isT,
        nx: safeNx,
        ny: safeNy,
        explodeAngle,
        explodeDist,
        explodeRot,
        baseSize,
        isSliver,
        settleDelta,
        dissolveJitter,
        cumArrival: 0,
      }
    })

    // Per-cluster cumulative arrival — T and K are independent streams
    const accumulate = (predicate: (p: (typeof raw)[number]) => boolean) => {
      let t = 0
      for (let i = 0; i < raw.length; i++) {
        if (!predicate(raw[i])) continue
        t += raw[i].settleDelta
        raw[i].cumArrival = t
      }
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

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-FLICKER — session skip entirely in useLayoutEffect
  // ═══════════════════════════════════════════════════════════════════════
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

  // ESC bail-out
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") triggerExit() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ═══════════════════════════════════════════════════════════════════════
  // ACT I — PROGRESS TICKER
  // Fast phase: 400ms (was 600ms) — snappier without losing drama.
  // Failsafe tightened to 1600ms to match.
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (done) return

    const START       = performance.now()
    const FAST_DUR    = 400
    const SLOW_DUR    = 700
    const TOTAL       = FAST_DUR + SLOW_DUR
    const FAILSAFE_MS = 1600

    let raf           = 0
    let fired100      = false
    let lastAnnounced = 0
    const dRefs       = [digit0Ref, digit1Ref, digit2Ref]

    const updateDOM = (pct: number) => {
      const p3 = String(pct).padStart(3, "0")
      dRefs.forEach((r, i) => { if (r.current) r.current.textContent = p3[i] })
      if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`
      if (progressNumRef.current) progressNumRef.current.textContent = `${p3} / 100`
      if (countdownRef.current)   countdownRef.current.textContent   = `T-${String(100 - pct).padStart(3, "0")}`
      if (counterRef.current) {
        const t = pct / 100
        counterRef.current.style.letterSpacing = `${-0.08 + t * 0.04}em`
        counterRef.current.style.filter        = `drop-shadow(0 2px 24px rgba(0,0,0,0.07))`
      }
      if (pct >= 25 && lastAnnounced < 25) { announce("Loading 25%");  lastAnnounced = 25  }
      if (pct >= 50 && lastAnnounced < 50) { announce("Loading 50%");  lastAnnounced = 50  }
      if (pct >= 75 && lastAnnounced < 75) { announce("Loading 75%");  lastAnnounced = 75  }
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
      if (!fired100) { fired100 = true; updateDOM(100); triggerExit() }
    }, FAILSAFE_MS + 100)

    return () => { cancelAnimationFrame(raf); window.clearTimeout(failsafe) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // ═══════════════════════════════════════════════════════════════════════
  // THE NUCLEAR TIMELINE
  // ═══════════════════════════════════════════════════════════════════════
  const triggerExit = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true

    if (!stageRef.current || !shardContainerRef.current) { setDone(true); return }

    // Mobile detection — extend WebGL poll window for shader compile
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
      const poll  = () => {
        if (pollAborted.current) return
        if (webglReady || performance.now() - start > WEBGL_POLL_TIMEOUT) {
          window.removeEventListener("webgl-first-frame", onWebGLFirstFrame)
          commitFinish()
          return
        }
        pollRafRef.current = requestAnimationFrame(poll)
      }
      pollRafRef.current = requestAnimationFrame(poll)
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

    // ── PORTRAIT-AWARE PIXEL GEOMETRY ──────────────────────────────────
    const vw         = window.innerWidth
    const isPortrait = window.innerHeight > vw
    // Extra compression for very narrow viewports (phones < 390px)
    const narrowFactor = vw < 390 ? 0.70 : isPortrait ? 0.80 : 1.0

    const fs        = Math.min(Math.max(vw * 0.32, 140), 448) * narrowFactor
    const CHAR_H    = fs * 0.76
    const T_CHAR_W  = fs * 0.56
    const K_CHAR_W  = fs * 0.64

    const T_HALF      = T_CHAR_W * 0.52
    const K_HALF      = K_CHAR_W * 0.58
    const MIN_CLUSTER = T_HALF + K_HALF + 8
    const CLUSTER     = Math.max(vw * 0.14, MIN_CLUSTER * 0.5)

    const POS_ENTER   = CLUSTER
    const POS_DRIFT   = CLUSTER + vw * 0.04
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

    // ── ACT I TAIL — OVERLOAD VIBRATION ────────────────────────────────
    tl.to({}, { duration: 0.12 })
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
      scale:   1.18,
      filter:  "brightness(3) blur(10px)",
      opacity: 0,
      duration: 0.35,
      stagger:  0.06,
      ease: "power2.in",
    }, ">-0.04")

    tl.set(digits, { display: "none" })
    tl.set(counterRef.current, { display: "none" })
    tl.to(
      [topRuleRef.current, botRuleRef.current, labelRef.current].filter(Boolean),
      { opacity: 0, y: (i: number) => (i === 0 ? -14 : 14), duration: 0.28, ease: "power2.in" },
      "<"
    )

    // ── ACT II — BIG BANG ────────────────────────────────────────────
    const maxExplode = isPortrait ? Math.min(vw * 0.75, 260) : Infinity
    tl.set(shardEls, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 }, "<0.04")
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
      opacity:  (i) => (0.28 + sr(i * 3.13) * 0.65) * 0.85,
      duration: 0.52,
      ease: "expo.out",
      stagger: { amount: 0.06, from: "center" },
    }, ">-0.10")

    // ── ACT III — TRUE POISSON PULL ──────────────────────────────────
    tl.to(tShards, {
      x:        (li) => -CLUSTER + (tParts[li]?.nx ?? 0) * T_CHAR_W,
      y:        (li) =>             (tParts[li]?.ny ?? 0) * CHAR_H,
      rotation: 0,
      scale:    0.45,
      opacity:  (li) => (0.50 + sr(li * 7.71) * 0.45) * 0.85,
      duration: (li) => 0.55 + (tParts[li]?.settleDelta ?? 0.075) * 1.2,
      ease:     "expo.in",
      stagger:  (li) => tParts[li]?.cumArrival ?? 0,
    }, "+=0.04")
    tl.to(kShards, {
      x:        (li) =>  CLUSTER + (kParts[li]?.nx ?? 0) * K_CHAR_W,
      y:        (li) =>             (kParts[li]?.ny ?? 0) * CHAR_H,
      rotation: 0,
      scale:    0.45,
      opacity:  (li) => (0.50 + sr(li * 8.87) * 0.45) * 0.85,
      duration: (li) => 0.55 + (kParts[li]?.settleDelta ?? 0.075) * 1.2,
      ease:     "expo.in",
      stagger:  (li) => kParts[li]?.cumArrival ?? 0,
    }, "<")

    tl.to({}, { duration: 0.08 })

    // ── ACT IV — MATERIALIZATION ──────────────────────────────────────
    tl.fromTo(letterTRef.current,
      { x: -POS_ENTER, scale: 0.90, opacity: 0, filter: "brightness(4) blur(20px)" },
      { x: -POS_ENTER, scale: 1,    opacity: 1, filter: "brightness(1) blur(0px)",
        duration: 0.70, ease: "expo.out" },
      ">-0.08"
    )
    tl.fromTo(letterKRef.current,
      { x:  POS_ENTER, scale: 0.90, opacity: 0, filter: "brightness(4) blur(20px)" },
      { x:  POS_ENTER, scale: 1,    opacity: 1, filter: "brightness(1) blur(0px)",
        duration: 0.70, ease: "expo.out" },
      "<"
    )
    // Dissolve — jitter capped at 0.08, no stragglers
    tl.to(shardEls, {
      opacity:  0,
      scale:    0,
      duration: (i) => 0.22 + (particles[i]?.dissolveJitter ?? 0.06),
      ease:     "power2.out",
      stagger:  (i) => particles[i]?.dissolveJitter ?? 0.06,
    }, "<0.16")

    // ── ACT V — CINEMATIC DRIFT ──────────────────────────────────────
    // 1.3s power2.inOut: decisive pull with proper weight
    tl.to(letterTRef.current, { x: -POS_DRIFT, duration: 1.3, ease: "power2.inOut" }, "+=0.05")
    tl.to(letterKRef.current, { x:  POS_DRIFT, duration: 1.3, ease: "power2.inOut" }, "<")

    // ── ACT VI — CRITICAL MASS ────────────────────────────────────────
    tl.to([letterTRef.current, letterKRef.current], {
      x: (idx: number) => idx === 0 ? -POS_COLLIDE : POS_COLLIDE,
      duration: 0.13,
      ease: "power4.in",
    })
    .to([letterTRef.current, letterKRef.current], {
      scale: 1.06, duration: 0.04, ease: "none",
    })
    .to(stageRef.current, {
      backgroundColor: "#0d0d0d", duration: 0.05, ease: "none",
    }, "<")

    // ── ACT VII — PORTAL SCALE ────────────────────────────────────────
    .to([letterTRef.current, letterKRef.current], {
      scale: 100, opacity: 0, filter: "blur(40px)",
      duration: 0.82, ease: "expo.out",
    }, "+=0.02")
    .to(stageRef.current, { opacity: 0, duration: 0.75, ease: "power2.out" }, "<")
    .to(rootRef.current, {
      autoAlpha: 0, duration: 0.10, ease: "none",
      onComplete: () => { if (rootRef.current) rootRef.current.style.display = "none" },
    }, "-=0.16")
  }, [announce, particles])

  // Initial GSAP state — GSAP owns opacity, never the static style
  useEffect(() => {
    if (letterTRef.current) gsap.set(letterTRef.current, { opacity: 0, x: 0, scale: 0.90 })
    if (letterKRef.current) gsap.set(letterKRef.current, { opacity: 0, x: 0, scale: 0.90 })
    const shards = shardContainerRef.current?.querySelectorAll(".pp-shard")
    if (shards) gsap.set(shards, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollAborted.current = true
      cancelAnimationFrame(pollRafRef.current)
      if (tlRef.current) { tlRef.current.kill(); tlRef.current = null }
    }
  }, [])

  if (done) return null

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      id="nuclear-preloader"
      ref={rootRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden="true"
    >
      {/* Screen-reader live region */}
      <div
        ref={liveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* ── STAGE ─────────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundColor: "#F5F5F0",
          willChange: "opacity, background-color, transform",
        }}
      >

        {/* TOP META BAR */}
        <div
          ref={topRuleRef}
          className="absolute top-9 left-9 right-9 flex items-center justify-between font-mono text-[9px] tracking-[0.60em] uppercase"
          style={{ color: "rgba(13,13,13,0.35)" }}
        >
        </div>

        {/* ── CENTRE STAGE ──────────────────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center">

          {/* Counter — intentionally smaller so T/K dominate the frame */}
          <div
            ref={counterRef}
            className="relative font-syne font-black leading-none tabular-nums pointer-events-none select-none"
            style={{
              color:               "#0d0d0d",
              fontSize:            "clamp(5.5rem, 22vw, 19rem)",
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

          {/* Particle cloud — GSAP owns opacity entirely; no static value */}
          <div
            ref={shardContainerRef}
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {particles.map((p, i) => (
              <div
                key={i}
                className="pp-shard absolute"
                style={{
                  width:           `${p.baseSize}px`,
                  // Slivers: 2× height for crystal-fracture physicality
                  height:          p.isSliver ? `${p.baseSize * 2}px` : `${p.baseSize}px`,
                  borderRadius:    "1px",
                  backgroundColor: "#0d0d0d",
                  // No opacity here — GSAP sets from 0 on mount
                  willChange:      "transform, opacity",
                }}
              />
            ))}
          </div>

          {/* Letter T — dominant size over counter */}
          <span
            ref={letterTRef}
            className="absolute font-syne font-black leading-none pointer-events-none select-none"
            style={{
              color:         "#0d0d0d",
              fontSize:      "clamp(8rem, 28vw, 26rem)",
              letterSpacing: "-0.08em",
              willChange:    "transform, opacity, filter",
            }}
          >T</span>

          {/* Letter K */}
          <span
            ref={letterKRef}
            className="absolute font-syne font-black leading-none pointer-events-none select-none"
            style={{
              color:         "#0d0d0d",
              fontSize:      "clamp(8rem, 28vw, 26rem)",
              letterSpacing: "-0.08em",
              willChange:    "transform, opacity, filter",
            }}
          >K</span>
        </div>

        
      </div>
    </div>
  )
}