"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type WebGLSupportLevel = "unknown" | "checking" | "full" | "limited" | "none";

interface WebGLSupportResult {
  level: WebGLSupportLevel;
  isReady: boolean;
  canUseWebGL: boolean;
  failureReason?: string;
  triggerFallback: () => void;
}

/**
 * Robust WebGL capability detection with performance monitoring.
 * Returns support level and triggers fallback if shader compilation fails or FPS is too low.
 */
export function useWebGLSupport(): WebGLSupportResult {
  const [level, setLevel] = useState<WebGLSupportLevel>("unknown");
  const [failureReason, setFailureReason] = useState<string | undefined>();
  const hasChecked = useRef(false);

  const triggerFallback = useCallback(() => {
    setLevel("none");
    setFailureReason("Manual fallback triggered");
  }, []);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    setLevel("checking");

    // Check WebGL availability
    const checkWebGL = (): WebGLSupportLevel => {
      try {
        const canvas = document.createElement("canvas");
        
        // Try WebGL2 first, then WebGL1
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        
        if (!gl) {
          setFailureReason("WebGL context not available");
          return "none";
        }

        // Check for critical extensions
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          
          // Detect software renderers (SwiftShader, Mesa, llvmpipe)
          const isSoftwareRenderer = 
            /swiftshader|software|mesa|llvmpipe/i.test(renderer) ||
            /swiftshader|software|mesa|llvmpipe/i.test(vendor);
          
          if (isSoftwareRenderer) {
            setFailureReason("Software renderer detected");
            return "limited";
          }
        }

        // Test shader compilation with a simple shader
        const testShaderCompilation = (): boolean => {
          try {
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            
            if (!vertexShader || !fragmentShader) return false;

            gl.shaderSource(vertexShader, `
              attribute vec4 a_position;
              void main() { gl_Position = a_position; }
            `);
            gl.shaderSource(fragmentShader, `
              precision mediump float;
              uniform float uTime;
              void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }
            `);

            gl.compileShader(vertexShader);
            gl.compileShader(fragmentShader);

            const vertSuccess = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
            const fragSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);

            // Cleanup
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            return vertSuccess && fragSuccess;
          } catch {
            return false;
          }
        };

        if (!testShaderCompilation()) {
          setFailureReason("Shader compilation failed");
          return "none";
        }

        // Check max texture size as a proxy for GPU capability
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (maxTextureSize < 2048) {
          setFailureReason("GPU texture limit too low");
          return "limited";
        }

        // All checks passed
        return "full";
      } catch (error) {
        setFailureReason(`WebGL check error: ${error}`);
        return "none";
      }
    };

    // Use requestIdleCallback if available for non-blocking check
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        const result = checkWebGL();
        setLevel(result);
      }, { timeout: 500 });
    } else {
      // Fallback: delay check to not block main thread
      setTimeout(() => {
        const result = checkWebGL();
        setLevel(result);
      }, 100);
    }
  }, []);

  return {
    level,
    isReady: level !== "unknown" && level !== "checking",
    canUseWebGL: level === "full" || level === "limited",
    failureReason,
    triggerFallback,
  };
}
