// components/providers/velocity-driver.tsx
"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/components/providers/lenis-provider"
import { velocityBus } from "@/lib/velocity-bus"
import { coreStateBus, type SystemHandshakeState } from "@/lib/core-state-bus"

/**
 * VelocityDriver — single global producer for both signal buses.
 *
 *  ① reads Lenis's pre-smoothed scrollStore each frame and pushes raw
 *     velocity + progress into velocityBus,
 *  ② derives high-level state (depth, vNorm, vIntensity, progress, section,
 *     handshake) and writes it into coreStateBus,
 *  ③ owns the section IntersectionObserver — section index is event-driven,
 *     never derived from raw scroll math, so it can never drift,
 *  ④ owns the handshake state machine
 *       BOOT → IDLE → NAVIGATING → SECTION_LOCK ↘
 *                                                CONTACT_ARMED (section 04)
 *  ⑤ owns the click-pulse counter (subscribed via the WebGL "shoot" event
 *     so any surface that already dispatches it gets pulse counting for free).
 *
 *  Hero, scene, capabilities, header HUD, frame system — all read from
 *  these two buses. There is exactly ONE producer.
 */

const SECTION_IDS = ["about", "work", "capabilities", "contact"]
const NAV_THRESHOLD = 0.03 // |vNorm| above this = NAVIGATING
const SETTLE_MS     = 280  // sit-quiet duration before NAVIGATING releases

export const VelocityDriver = () => {
  const rafId = useRef(0)

  useEffect(() => {
    let raf = 0

    // ── HANDSHAKE state machine local closure ──
    let handshake: SystemHandshakeState = "BOOT"
    let lastVAbs = 0
    let releaseAt = 0
    let sectionIdx = 0

    const setHandshake = (next: SystemHandshakeState) => {
      if (next === handshake) return
      handshake = next
      coreStateBus.set({ handshake: next })
    }

    // ── SECTION OBSERVER ──
    const sectionEls = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    const setSectionIdx = (next: number) => {
      if (next === sectionIdx) return
      sectionIdx = next
      coreStateBus.set({
        section: next,
        sectionChangedAt: performance.now(),
      })
      // CONTACT_ARMED whenever the contact section is dominant.
      if (next === 4) setHandshake("CONTACT_ARMED")
      else if (handshake === "CONTACT_ARMED") setHandshake("SECTION_LOCK")
    }

    let io: IntersectionObserver | null = null
    if (sectionEls.length > 0) {
      io = new IntersectionObserver(
        (entries) => {
          let bestIdx = -1
          let bestRatio = 0
          for (const e of entries) {
            if (!e.isIntersecting) continue
            if (e.intersectionRatio > bestRatio && e.intersectionRatio > 0.35) {
              bestRatio = e.intersectionRatio
              bestIdx = SECTION_IDS.indexOf(e.target.id) + 1
            }
          }
          if (bestIdx < 0 && window.scrollY < window.innerHeight * 0.8) {
            setSectionIdx(0)
          } else if (bestIdx > 0) {
            setSectionIdx(bestIdx)
          }
        },
        { threshold: [0.35, 0.55, 0.75] },
      )
      sectionEls.forEach((el) => io!.observe(el))
    }

    // ── CLICK-PULSE counter ──
    // Listens to the existing global event the projects/capabilities surfaces
    // already dispatch. Bumping a monotonic counter (rather than tracking a
    // boolean) lets consumers diff to detect new events without timestamp
    // arithmetic.
    let pulseCount = 0
    const onShoot = (e: Event) => {
      const ev = e as CustomEvent<{ x: number; y: number }>
      pulseCount += 1
      coreStateBus.set({
        clickX: ev.detail?.x ?? -1,
        clickY: ev.detail?.y ?? -1,
        clickPulse: pulseCount,
      })
    }
    window.addEventListener("webgl-shoot", onShoot as EventListener)

    // ── PAGE CLICK → also fires a system pulse (any anywhere-click counts) ──
    // Distinct from webgl-shoot: this counts every primary click, NOT just
    // ones that asked for a shader ripple. Audit/telemetry consumers care
    // about both signals in different ways. We only update the pulse on
    // pointerdown (mousedown also works) so dblclick doesn't double-count.
    const onPointer = (e: PointerEvent) => {
      if (e.button !== 0) return
      pulseCount += 1
      coreStateBus.set({
        clickX: e.clientX,
        clickY: e.clientY,
        clickPulse: pulseCount,
      })
    }
    window.addEventListener("pointerdown", onPointer, { passive: true })

    // ── PER-FRAME LOOP ──
    const tick = (now: number) => {
      // ① Push Lenis-smoothed scroll into velocityBus.
      velocityBus.set(scrollStore.velocity, scrollStore.progress)
      velocityBus.decay()

      // ② Derive high-level state for coreStateBus.
      const v = velocityBus.get()
      const depth = window.scrollY / Math.max(1, window.innerHeight)

      coreStateBus.set({
        depth,
        vNorm: v.normalized,
        vIntensity: v.intensity,
        progress: v.progress,
      })

      // ③ Handshake transitions, velocity-driven.
      // The Preloader's Act VII portal collapse is the AUTHORITATIVE source
      // of BOOT → IDLE. We only fall back here if the user has actually
      // scrolled (vAbs > 0) — that way a session with the preloader
      // session-storage flag set still gets out of BOOT, but the preloader
      // itself can't be raced to IDLE before its own onComplete fires.
      const vAbs = Math.abs(v.normalized)
      if (handshake === "BOOT" && vAbs > 0) setHandshake("IDLE")
      if (vAbs > NAV_THRESHOLD && lastVAbs <= NAV_THRESHOLD) {
        setHandshake("NAVIGATING")
        releaseAt = 0
      }
      if (vAbs <= NAV_THRESHOLD && handshake === "NAVIGATING") {
        if (releaseAt === 0) releaseAt = now + SETTLE_MS
        else if (now >= releaseAt) {
          setHandshake(sectionIdx === 4 ? "CONTACT_ARMED" : "SECTION_LOCK")
        }
      }
      lastVAbs = vAbs

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    rafId.current = raf

    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
      window.removeEventListener("webgl-shoot", onShoot as EventListener)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [])

  return null
}
