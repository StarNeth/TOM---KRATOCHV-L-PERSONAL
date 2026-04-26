'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { createDerivedMaterial } from 'troika-three-text'
import { coreStateBus } from '@/lib/core-state-bus'

// ─── GLSL: FBM displacement — IDENTICAL rotation matrix to scene.tsx ──────
// DO NOT MODIFY THE ROTATION MATRIX. DO NOT MODIFY THE OCTAVE COUNT.
// These values are calibrated. They are physics, not aesthetics.

const VERTEX_DEFS = /* glsl */`
  uniform float uTurbulence;
  uniform float uCursorEnergy;
  uniform float uTime;

  // Simplex noise helpers
  vec3 _mod289(vec3 x){return x - floor(x*(1./289.))*289.;}
  vec4 _mod289(vec4 x){return x - floor(x*(1./289.))*289.;}
  vec4 _permute(vec4 x){return _mod289(((x*34.)+1.)*x);}
  vec4 _taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}

  float snoise3(vec3 v){
    const vec2 C = vec2(1./6., 1./3.);
    const vec4 D = vec4(0., 0.5, 1., 2.);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = _mod289(i);
    vec4 p = _permute(
               _permute(
                 _permute(i.z + vec4(0., i1.z, i2.z, 1.))
               + i.y + vec4(0., i1.y, i2.y, 1.))
             + i.x + vec4(0., i1.x, i2.x, 1.));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j   = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_  = floor(j * ns.z);
    vec4 y_  = floor(j - 7.0 * x_);
    vec4 x   = x_ * ns.x + ns.yyyy;
    vec4 y   = y_ * ns.x + ns.yyyy;
    vec4 h   = 1.0 - abs(x) - abs(y);
    vec4 b0  = vec4(x.xy, y.xy);
    vec4 b1  = vec4(x.zw, y.zw);
    vec4 s0  = floor(b0)*2.0 + 1.0;
    vec4 s1  = floor(b1)*2.0 + 1.0;
    vec4 sh  = -step(h, vec4(0.));
    vec4 a0  = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1  = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0  = vec3(a0.xy, h.x);
    vec3 p1  = vec3(a0.zw, h.y);
    vec3 p2  = vec3(a1.xy, h.z);
    vec3 p3  = vec3(a1.zw, h.w);
    vec4 norm = _taylorInvSqrt(
      vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(
      dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.);
    m = m * m;
    return 42.0 * dot(m*m,
      vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // FBM — rotation matrix matches scene.tsx sacred values EXACTLY
  float fbmDisplace(vec3 p){
    float v = 0.0;
    float a = 0.5;
    mat3 R = mat3(
       0.500, 0.870, 0.000,
      -0.870, 0.500, 0.000,
       0.000, 0.000, 1.000
    );
    for(int i = 0; i < 4; i++){
      v += a * snoise3(p);
      p  = R * p * 2.0;
      a *= 0.5;
    }
    return v;
  }
`

// vertexMainOutro runs AFTER troika has computed `transformed` (the
// displaced position in local space). We add our fbm on top of it.
// normal is available at this point. uTurbulence drives amplitude.
const VERTEX_OUTRO = /* glsl */`
  {
    float n = fbmDisplace(vec3(
      position.xy * 0.28 + uTime * 0.07,
      uTime * 0.038
    ));
    float energy = uTurbulence * 0.14 + uCursorEnergy * 0.07;
    float wave   = sin(position.x * 1.8 + uTime * 1.1) * 0.5 + 0.5;
    transformed += normal * n * energy * (0.6 + wave * 0.4);
  }
`

// ─── Derived material cache ───────────────────────────────────────────────
// createDerivedMaterial is called once per unique base material.
// The cache prevents re-creating on every render.
const derivedMaterialCache = new WeakMap<THREE.Material, THREE.Material>()

function getDerivedMaterial(base: THREE.Material): THREE.Material {
  if (derivedMaterialCache.has(base)) {
    return derivedMaterialCache.get(base)!
  }
  const derived = createDerivedMaterial(base, {
    uniforms: {
      uTurbulence:  { value: 0.0 },
      uCursorEnergy:{ value: 0.0 },
      uTime:        { value: 0.0 },
    },
    vertexDefs:      VERTEX_DEFS,
    vertexMainOutro: VERTEX_OUTRO,
  })
  derivedMaterialCache.set(base, derived)
  return derived
}

// ─── Single text mesh ─────────────────────────────────────────────────────
interface HeroTextMeshProps {
  children: string
  position: [number, number, number]
  fontSize: number
}

function HeroTextMesh({ children, position, fontSize }: HeroTextMeshProps) {
  // troika exposes the underlying THREE.Mesh via ref
  const meshRef = useRef<any>(null)

  // Track whether we've applied the derived material
  const materialApplied = useRef(false)
  const derivedMat      = useRef<THREE.Material | null>(null)

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return

    // Troika syncs its geometry asynchronously after mount.
    // Poll each frame until mesh.material exists, then inject once.
    if (!materialApplied.current && mesh.material) {
      // mesh.material at this point is troika's SDF-aware MeshBasicMaterial.
      // createDerivedMaterial wraps it, preserving the SDF fragment shader
      // while injecting our vertex displacement.
      derivedMat.current = getDerivedMaterial(mesh.material)
      mesh.material = derivedMat.current
      materialApplied.current = true
    }

    // Update uniforms every frame from coreStateBus (zero React overhead)
    if (derivedMat.current) {
      const u = (derivedMat.current as any).uniforms
      if (!u) return
      // Smooth lerp toward bus values — prevents jitter on uniform writes
      u.uTurbulence.value  += (coreStateBus.turbulence - u.uTurbulence.value)  * 0.08
      u.uCursorEnergy.value += (coreStateBus.intensity  - u.uCursorEnergy.value) * 0.12
      u.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <Text
      ref={meshRef}
      font="/fonts/Syne-Black.ttf"
      fontSize={fontSize}
      letterSpacing={-0.055}
      lineHeight={0.8}
      position={position}
      anchorX="center"
      anchorY="middle"
      // maxWidth constrains layout — set wide enough for longest word
      maxWidth={12}
      // Disable troika's built-in outline — our displacement IS the effect
      outlineWidth={0}
      // Depth-write true so letters occlude the fluid correctly at z=0.1
      depthWrite={true}
    >
      {children}
    </Text>
  )
}

// ─── Public export: mount this inside the R3F Canvas ─────────────────────
export function HeroText() {
  return (
    <group>
      {/* z=0.1 places text 0.1 units in FRONT of the fluid plane (z=0) */}
      {/* Adjust Y positions to match your scene's camera framing       */}
      <HeroTextMesh position={[0,  0.75, 0.1]} fontSize={2.0}>
        TOMÁŠ
      </HeroTextMesh>
      <HeroTextMesh position={[0, -0.75, 0.1]} fontSize={2.0}>
        KRATOCHVÍL
      </HeroTextMesh>
    </group>
  )
}
