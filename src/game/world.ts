import type { ItemId } from "./store";

function mulberry(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = mulberry(1337);
const pick = <T,>(a: T[]): T => a[Math.floor(R() * a.length)] as T;

export type Box = { x: number; z: number; w: number; d: number; h: number; color: string; roof?: boolean };
export const BLOCK = 34, ROAD = 12, N = 3, CELL = BLOCK + ROAD;
export const WORLD = (N + 0.5) * CELL;

export type RegId = "central" | "resid" | "comercial" | "industrial" | "militar" | "floresta";
type Reg = { id: RegId; nome: string; pad: string; perigo: number };
export const REGIOES: Record<RegId, Reg> = {
  central: { id: "central", nome: "Cidade Central", pad: "#55575a", perigo: 2 },
  resid: { id: "resid", nome: "Bairro Residencial", pad: "#4a5639", perigo: 1 },
  comercial: { id: "comercial", nome: "Zona Comercial", pad: "#615d55", perigo: 2 },
  industrial: { id: "industrial", nome: "Zona Industrial", pad: "#48443f", perigo: 2 },
  militar: { id: "militar", nome: "Base Militar", pad: "#474a35", perigo: 3 },
  floresta: { id: "floresta", nome: "Floresta Selvagem", pad: "#34452a", perigo: 1 },
};
function regionOf(bx: number, bz: number): Reg {
  if (bx >= 2 && bz <= -2) return REGIOES.militar;
  if (bx <= -2) return REGIOES.floresta;
  if (bx >= 2) return REGIOES.industrial;
  if (bz >= 2) return REGIOES.resid;
  if (bz <= -2) return REGIOES.comercial;
  return REGIOES.central;
}
export function regionAt(x: number, z: number) {
  const bx = Math.max(-N, Math.min(N, Math.round(x / CELL))), bz = Math.max(-N, Math.min(N, Math.round(z / CELL)));
  return regionOf(bx, bz);
}

export const buildings: Box[] = [];
export const cars: Box[] = [];
export const trees: { x: number; z: number; s: number }[] = [];
export const pads: { x: number; z: number; color: string }[] = [];
export type Loot = { x: number; z: number; reg: RegId; empty: boolean; respawn: number };
export const loot: Loot[] = [];
export const rubble: { x: number; z: number; s: number; r: number }[] = [];

const PAL: Record<RegId, string[]> = {
  central: ["#8d8a83", "#6f7377", "#9a8f7e", "#7c7468"],
  resid: ["#b3a68c", "#9c8f7a", "#a88d78", "#8e9a8c"],
  comercial: ["#a39b8a", "#8b8e86", "#a07f62"],
  industrial: ["#6e655c", "#7b6f62", "#5f6262"],
  militar: ["#5a5e45", "#646a4c"],
  floresta: ["#6b4e33"],
};

for (let bx = -N; bx <= N; bx++) for (let bz = -N; bz <= N; bz++) {
  const cx = bx * CELL, cz = bz * CELL, reg = regionOf(bx, bz);
  pads.push({ x: cx, z: cz, color: reg.pad });
  const add = (x: number, z: number, w: number, d: number, h: number, roof = false) => buildings.push({ x: cx + x, z: cz + z, w, d, h, color: pick(PAL[reg.id]), roof });
  if (reg.id === "central") {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (R() < 0.85) add((i - 0.5) * 16, (j - 0.5) * 16, 11 + R() * 3, 11 + R() * 3, 16 + R() * 30);
  } else if (reg.id === "resid") {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (R() < 0.8) add(i * 11, j * 11, 6.5, 6.5, 3.5 + R() * 2, true);
  } else if (reg.id === "comercial") {
    add(0, -8, 28, 11, 6 + R() * 4); add(0, 9, 22 + R() * 6, 10, 5 + R() * 5);
  } else if (reg.id === "industrial") {
    add(-3, 0, 22, 18, 9 + R() * 3); add(12, -11, 6, 6, 5); if (R() < 0.6) add(12, 10, 7, 9, 6);
  } else if (reg.id === "militar") {
    for (let i = -1; i <= 1; i++) add(i * 10, -4, 7, 11, 3.6);
    for (const [x, z, w, d] of [[-10, -16, 14, 0.8], [10, -16, 14, 0.8], [-16, 0, 0.8, 30], [16, 0, 0.8, 30]] as const) buildings.push({ x: cx + x, z: cz + z, w, d, h: 2.6, color: "#6b6b5f" });
  } else {
    for (let k = 0; k < 22; k++) trees.push({ x: cx + (R() - 0.5) * BLOCK, z: cz + (R() - 0.5) * BLOCK, s: 0.8 + R() * 0.7 });
    if (R() < 0.7) add((R() - 0.5) * 14, (R() - 0.5) * 14, 5, 5, 3.2, true);
  }
}

export const colliders: Box[] = [];
colliders.push(...buildings);
for (const t of trees) colliders.push({ x: t.x, z: t.z, w: 0.7, d: 0.7, h: 6, color: "" });

for (let k = 0; k < 70; k++) {
  const line = (Math.floor(R() * 2 * N) - N + 0.5) * CELL;
  const along = (R() - 0.5) * 2 * N * CELL, lat = (R() < 0.5 ? -1 : 1) * (2 + R() * 2.5);
  const horiz = R() < 0.5;
  const c: Box = horiz ? { x: along, z: line + lat, w: 4.2, d: 1.9, h: 1.5, color: "" } : { x: line + lat, z: along, w: 1.9, d: 4.2, h: 1.5, color: "" };
  c.color = pick(["#6a3b26", "#5c5f52", "#7b6a4b", "#3f4b55", "#7a2f25", "#8a8578"]);
  if (Math.hypot(c.x - CELL / 2, c.z) < 8) continue;
  cars.push(c); colliders.push(c);
}

export function overlaps(x: number, z: number, r: number) {
  for (const b of colliders) if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true;
  return false;
}

for (const b of buildings) {
  if (b.h < 3) continue;
  const n = b.w * b.d > 200 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const side = R() < 0.5 ? -1 : 1;
    const x = R() < 0.5 ? b.x + side * (b.w / 2 + 1.1) : b.x + (R() - 0.5) * b.w * 0.7;
    const z = Math.abs(x - b.x) > b.w / 2 ? b.z + (R() - 0.5) * b.d * 0.6 : b.z + side * (b.d / 2 + 1.1);
    if (!overlaps(x, z, 0.6)) loot.push({ x, z, reg: regionAt(x, z).id, empty: false, respawn: 0 });
  }
}
for (let k = 0; k < 400; k++) {
  const x = (R() - 0.5) * 2 * WORLD, z = (R() - 0.5) * 2 * WORLD;
  if (!overlaps(x, z, 0.3)) rubble.push({ x, z, s: 0.15 + R() * 0.5, r: R() * 3 });
}

const TABELA: Record<RegId, [ItemId, number][]> = {
  central: [["agua", 3], ["comida", 3], ["curativo", 2], ["pano", 2], ["sucata", 1]],
  resid: [["comida", 4], ["agua", 4], ["pano", 3], ["madeira", 2]],
  comercial: [["comida", 4], ["agua", 4], ["curativo", 2], ["pano", 2]],
  industrial: [["sucata", 5], ["madeira", 3], ["combustivel", 2], ["taco", 1]],
  militar: [["curativo", 4], ["faca", 2], ["sucata", 2], ["comida", 2]],
  floresta: [["madeira", 6], ["agua", 2], ["pano", 1]],
};
export function rollLoot(reg: RegId): ItemId[] {
  const t = TABELA[reg], tot = t.reduce((a, [, w]) => a + w, 0);
  const n = 1 + Math.floor(Math.random() * (REGIOES[reg].perigo >= 3 ? 3 : 2)), out: ItemId[] = [];
  for (let i = 0; i < n; i++) { let r = Math.random() * tot; for (const [id, w] of t) { r -= w; if (r <= 0) { out.push(id); break; } } }
  return out;
}

export function collide(p: { x: number; z: number }, r: number) {
  for (const b of colliders) {
    const hx = b.w / 2, hz = b.d / 2;
    if (Math.abs(p.x - b.x) > hx + r || Math.abs(p.z - b.z) > hz + r) continue;
    const qx = Math.max(b.x - hx, Math.min(p.x, b.x + hx)), qz = Math.max(b.z - hz, Math.min(p.z, b.z + hz));
    const dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 < 1e-6) {
      const ox = hx - Math.abs(p.x - b.x) + r, oz = hz - Math.abs(p.z - b.z) + r;
      if (ox < oz) p.x += Math.sign(p.x - b.x || 1) * ox; else p.z += Math.sign(p.z - b.z || 1) * oz;
    } else { const d = Math.sqrt(d2); p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d); }
  }
  p.x = Math.max(-WORLD, Math.min(WORLD, p.x)); p.z = Math.max(-WORLD, Math.min(WORLD, p.z));
}

export function lineOfSight(ax: number, az: number, bx: number, bz: number) {
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const x = ax + ((bx - ax) * i) / steps, z = az + ((bz - az) * i) / steps;
    for (const b of buildings) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return false;
  }
  return true;
}
