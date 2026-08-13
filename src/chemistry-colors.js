/**
 * Stable offline atom palette for molecular teaching models.
 *
 * Values follow the familiar CPK/Jmol family of conventions. When the bundled
 * PubChem element record exposes a CPK color, `atomColor` prefers that exact
 * bundled value so the WebGL scene and miniature cards remain identical.
 */
export const CPK_FALLBACK = Object.freeze({
  H: "#f3f1eb",
  He: "#d9ffff",
  Li: "#cc80ff",
  B: "#ffb5b5",
  C: "#383c43",
  N: "#365cc9",
  O: "#d94d45",
  F: "#72bc65",
  Ne: "#b3e3f5",
  Na: "#8a74d6",
  Mg: "#8ac66e",
  Al: "#b7a4a4",
  Si: "#d89b72",
  P: "#e8883e",
  S: "#dfb83e",
  Cl: "#68ad58",
  Ar: "#9bd6e5",
  Fe: "#bb714e",
  Br: "#9e473e",
  I: "#76519b",
  U: "#4d9a79",
});

export function atomColor(symbol, elementMap) {
  const bundled = elementMap?.get?.(symbol)?.cpkHexColor;
  if (/^[0-9a-f]{6}$/i.test(bundled ?? "")) return `#${bundled}`;
  return CPK_FALLBACK[symbol] ?? "#7890ad";
}

export const PARTICLE_COLORS = Object.freeze({
  proton: "#dc554c",
  neutron: "#3559c7",
  electron: "#78a8ea",
});
