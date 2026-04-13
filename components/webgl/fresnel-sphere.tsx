"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CubeCamera } from "@react-three/drei";
import * as THREE from "three";
import { scrollStore } from "@/components/providers/lenis-provider";

// Mouse position store
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

// Fresnel shader for refraction effect
const fresnelVertexShader = `
  varying vec3 vReflect;
  varying vec3 vRefract[3];
  varying float vReflectionFactor;
  
  uniform float uRefractionRatio;
  uniform float uFresnelBias;
  uniform float uFresnelScale;
  uniform float uFresnelPower;
  
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    
    vec3 worldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);
    vec3 I = worldPosition.xyz - cameraPosition;
    
    vReflect = reflect(I, worldNormal);
    vRefract[0] = refract(normalize(I), worldNormal, uRefractionRatio);
    vRefract[1] = refract(normalize(I), worldNormal, uRefractionRatio * 0.99);
    vRefract[2] = refract(normalize(I), worldNormal, uRefractionRatio * 0.98);
    
    vReflectionFactor = uFresnelBias + uFresnelScale * pow(1.0 + dot(normalize(I), worldNormal), uFresnelPower);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fresnelFragmentShader = `
  uniform samplerCube uEnvMap;
  
  varying vec3 vReflect;
  varying vec3 vRefract[3];
  varying float vReflectionFactor;
  
  void main() {
    vec4 reflectedColor = textureCube(uEnvMap, vec3(-vReflect.x, vReflect.yz));
    
    vec4 refractedColor = vec4(1.0);
    refractedColor.r = textureCube(uEnvMap, vec3(-vRefract[0].x, vRefract[0].yz)).r;
    refractedColor.g = textureCube(uEnvMap, vec3(-vRefract[1].x, vRefract[1].yz)).g;
    refractedColor.b = textureCube(uEnvMap, vec3(-vRefract[2].x, vRefract[2].yz)).b;
    
    gl_FragColor = mix(refractedColor, reflectedColor, clamp(vReflectionFactor, 0.0, 1.0));
  }
`;

function Sphere({ envMap }: { envMap: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();

  const uniforms = useMemo(
    () => ({
      uEnvMap: { value: envMap },
      uRefractionRatio: { value: 0.98 },
      uFresnelBias: { value: 0.1 },
      uFresnelScale: { value: 2.0 },
      uFresnelPower: { value: 1.0 },
    }),
    [envMap]
  );

  // Update env map when it changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uEnvMap.value = envMap;
    }
  }, [envMap]);

  const state = useRef({ time: 0, velocity: 0 });

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    state.current.time += delta;
    const t = state.current.time;

    // Smooth mouse interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.03;
    mouse.y += (mouse.targetY - mouse.y) * 0.03;

    // Smooth scroll velocity
    const rawVel = Math.abs(scrollStore.velocity) * 0.03;
    state.current.velocity += (Math.min(rawVel, 0.3) - state.current.velocity) * 0.02;
    const vel = state.current.velocity;

    // Position - subtle mouse tracking
    meshRef.current.position.x += (mouse.x * 0.3 - meshRef.current.position.x) * 0.015;
    meshRef.current.position.y += (mouse.y * 0.3 - meshRef.current.position.y) * 0.015;

    // Rotation - slow and smooth
    meshRef.current.rotation.y += delta * 0.05;
    meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.02;

    // Scale based on viewport
    const baseScale = Math.min(size.width, size.height) * 0.0018;
    const scaleY = baseScale * (1 + vel * 0.8);
    const scaleXZ = baseScale * (1 - vel * 0.05);
    meshRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={fresnelVertexShader}
        fragmentShader={fresnelFragmentShader}
      />
    </mesh>
  );
}

export function FresnelSphere({ children }: { children: React.ReactNode }) {
  // Initialize mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <CubeCamera resolution={256} frames={Infinity} near={0.1} far={100}>
      {(texture) => (
        <>
          {children}
          <Sphere envMap={texture} />
        </>
      )}
    </CubeCamera>
  );
}
