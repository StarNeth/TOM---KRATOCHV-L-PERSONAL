"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useMobile } from "@/hooks/use-mobile";

// [ ! ] OPRAVA 1: Komponenta nyní přijímá informaci o tom, zda je na mobilu
const LiquidObsidianMaterial = ({ isMobile }: { isMobile: boolean }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lenis = useLenis();
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const scrollData = useRef({ velocity: 0, progress: 0 });

  useEffect(() => {
    let lastY = window.scrollY;
    
    const handleScroll = () => {
      const currentY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      
      scrollData.current.progress = currentY / maxScroll;
      scrollData.current.velocity = (currentY - lastY) * 0.05;
      lastY = currentY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }
    };

    const handleShootEvent = (e: any) => {
      if (!materialRef.current) return;
      const clickX = (e.detail.x / window.innerWidth) * 2 - 1;
      const clickY = -(e.detail.y / window.innerHeight) * 2 + 1;
      
      materialRef.current.uniforms.uClickPos.value.set(clickX, clickY);

      gsap.fromTo(
        materialRef.current.uniforms.uClickRipple,
        { value: 0.0 },
        { value: 1.0, duration: 2.5, ease: "power3.out", overwrite: "auto" }
      );
    };

    handleScroll();
    handleResize();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("webgl-shoot", handleShootEvent);
    
    // [ ! ] OPRAVA 2: Sledování myši běží JEN na desktopu. Mobil to ignoruje.
    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("webgl-shoot", handleShootEvent);
      if (!isMobile) window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMobile]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(
      typeof window !== 'undefined' ? window.innerWidth : 1920, 
      typeof window !== 'undefined' ? window.innerHeight : 1080
    )},
    uMouse: { value: new THREE.Vector2(0, 0) },
    uScrollVelocity: { value: 0 },
    uScrollProgress: { value: 0 },
    uClickPos: { value: new THREE.Vector2(0, 0) },
    uClickRipple: { value: 1.0 }, 
  }), []);

  const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;

  // [ ! ] OPRAVA 3: Shader generujeme dynamicky. Na mobilu srazíme zátěž matematické smyčky o 60 %.
  const fragmentShader = useMemo(() => `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uScrollVelocity;
    uniform float uScrollProgress;
    uniform vec2 uClickPos;
    uniform float uClickRipple;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = -1.0 + 2.0 * uv;
      p.x *= uResolution.x / uResolution.y;

      vec2 m = uMouse;
      m.x *= uResolution.x / uResolution.y;
      
      vec2 cp = uClickPos;
      cp.x *= uResolution.x / uResolution.y;

      vec2 delta = p - m;
      float distMouse = length(delta);
      float mousePower = exp(-distMouse * 6.0); 
      
      p = m + rot(mousePower * 1.5) * delta; 
      p -= normalize(delta + vec2(0.0001)) * mousePower * 0.15;

      float distClick = length(p - cp);
      float ring = smoothstep(uClickRipple * 3.0 - 0.2, uClickRipple * 3.0, distClick) - 
                   smoothstep(uClickRipple * 3.0, uClickRipple * 3.0 + 0.2, distClick);
      float isExploding = step(uClickRipple, 0.99); 
      p += normalize(p - cp + vec2(0.0001)) * ring * (1.0 - uClickRipple) * 0.8 * isExploding;

      p.y -= uScrollVelocity * 0.2;
      p *= 1.5;

      // [ ! ] OPRAVA 3 ZDE: Na mobilu běží jen 2x, na PC 5x
      int maxIterations = ${isMobile ? 2 : 5};
      
      for(int i = 1; i <= 5; i++) { 
        if (i > maxIterations) break;
        vec2 newp = p;
        float fi = float(i);
        float phase = uTime * 0.3 + mousePower * 2.0; 
        
        newp.x += 0.6 / fi * sin(fi * p.y + phase + 0.3 * fi) + 1.0;
        newp.y += 0.6 / fi * sin(fi * p.x + phase + 0.3 * (fi + 10.0)) - 1.4;
        p = newp;
      }

      float val = sin(p.x + p.y) * 0.5 + 0.5;
      val = smoothstep(0.15, 0.85, val); 

      vec3 colHero = mix(vec3(0.01, 0.01, 0.015), vec3(0.15, 0.15, 0.18), val);
      vec3 colWork = mix(vec3(0.01, 0.03, 0.08), vec3(0.1, 0.3, 0.6), val);
      vec3 colNuke = mix(vec3(0.15, 0.02, 0.0), vec3(0.9, 0.3, 0.0), val);

      vec3 finalCol = colHero;
      
      float mixWork = smoothstep(0.1, 0.4, uScrollProgress) - smoothstep(0.6, 0.9, uScrollProgress);
      finalCol = mix(finalCol, colWork, mixWork);
      
      float mixNuke = smoothstep(0.7, 0.95, uScrollProgress);
      finalCol = mix(finalCol, colNuke, mixNuke);

      float heatFlash = (1.0 - uClickRipple) * isExploding;
      finalCol = mix(finalCol, mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.8, 0.2), val), heatFlash);

      float specular = pow(val, 3.0) * mousePower; 
      finalCol += vec3(0.5, 0.6, 0.8) * specular * 1.5;

      float grain = random(uv * 300.0 + fract(uTime)); 
      finalCol += (grain - 0.5) * 0.08; 

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `, [isMobile]);

  useFrame((state) => {
    if (!materialRef.current) return;
    const mats = materialRef.current.uniforms;
    mats.uTime.value = state.clock.elapsedTime;
    
    // Na mobilu targetMouse neaktualizujeme, interpolace běží do nulového bodu (ušetříme CPU cykly)
    if (!isMobile) {
      mats.uMouse.value.lerp(targetMouse.current, 0.1); 
    }
    
    scrollData.current.velocity *= 0.9;
    mats.uScrollVelocity.value = THREE.MathUtils.lerp(mats.uScrollVelocity.value, scrollData.current.velocity, 0.1);
    mats.uScrollProgress.value = scrollData.current.progress;
  });

  return <shaderMaterial ref={materialRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} depthWrite={false} depthTest={false} />;
};

export const WebGLScene = () => {
  const isMobile = useMobile();

  return (
    <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
      <Canvas 
        orthographic 
        camera={{ position: [0, 0, 1], left: -1, right: 1, top: 1, bottom: -1 }} 
        // [ ! ] OPRAVA 4: DPR na mobilu sraženo na 0.4. V kombinaci s ušetřenou smyčkou v shaderu získáme neskutečný boost výkonu.
        dpr={isMobile ? 0.4 : [1, 1.5]} 
        // [ ! ] OPRAVA 5: Vypínáme hloubkové buffery, které pro 2D plátno absolutně nepotřebujeme (šetříme RAM a VRAM)
        gl={{ powerPreference: "high-performance", alpha: false, antialias: false, stencil: false, depth: false }}
      >
        <mesh>
          <planeGeometry args={[2, 2]} />
          <LiquidObsidianMaterial isMobile={isMobile} />
        </mesh>
      </Canvas>
    </div>
  );
};