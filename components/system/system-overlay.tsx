"use client"

/**
 * system-overlay.tsx — host for global HUD layers.
 *
 *  Mounted once near the root of the layout tree. Composes:
 *
 *    1. <FrameSystem />     — always-visible identity / coords / live HUD
 *    2. <TelemetryPanel />  — keyboard-toggleable deeper audit (`?` or ⌘T)
 *
 *  Rendered AFTER the WebGL scene + page content but BEFORE the cursor,
 *  so the cursor still floats on top. mix-blend-difference on the frame
 *  guarantees readability against any backdrop.
 */

import { FrameSystem } from "./frame-system"
import { TelemetryPanel } from "./telemetry-panel"

export const SystemOverlay = () => {
  return (
    <>
      <FrameSystem />
      <TelemetryPanel />
    </>
  )
}
