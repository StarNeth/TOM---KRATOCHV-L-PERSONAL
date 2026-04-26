import {
  CURL_FRAG,
  DIVERGENCE_FRAG,
  PRESSURE_FRAG,
  GRADIENT_SUBTRACT_FRAG,
} from "../shaders/fluid-ops.glsl"

const checks: Array<[string, boolean]> = [
  ["CURL_FRAG.includes('vR.y - vL.y')", CURL_FRAG.includes("vR.y - vL.y")],
  ["DIVERGENCE_FRAG.includes('0.5 *')", DIVERGENCE_FRAG.includes("0.5 *")],
  ["PRESSURE_FRAG.includes('* 0.25')", PRESSURE_FRAG.includes("* 0.25")],
  ["GRADIENT_SUBTRACT_FRAG.includes('pR - pL')", GRADIENT_SUBTRACT_FRAG.includes("pR - pL")],
]

let ok = true
for (const [label, value] of checks) {
  console.log(`${label} -> ${value}`)
  if (!value) ok = false
}
process.exit(ok ? 0 : 1)
