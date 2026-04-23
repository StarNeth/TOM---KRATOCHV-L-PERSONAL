"use client"

/**
 * WebGLErrorBoundary — Director's surgical patch for REGRESSION 01.
 *
 * If the WebGL Canvas throws AFTER mount (e.g. iOS Safari kills the context
 * due to thermal budget exhaustion), this boundary catches the synchronous
 * error, prevents it from propagating to the Next.js page-level error UI,
 * and degrades gracefully to the CSS fallback gradient.
 */

import { Component, type ReactNode } from "react"
import { CSSFallbackGradient } from "./css-fallback-gradient"

interface State {
  crashed: boolean
}

export class WebGLErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  render() {
    return this.state.crashed ? <CSSFallbackGradient /> : this.props.children
  }
}