import * as THREE from "three";
import { CELL } from "./world";

export const input = { mx: 0, my: 0, lookX: 0, lookY: 0, jump: false, attack: false, interact: false };
export const keys = new Set<string>();

export const player = { pos: new THREE.Vector3(CELL / 2, 0, 0), vy: 0, yaw: 0, pitch: 0.3, face: 0, attackT: 0, walk: 0, moving: 0, noise: 0, hurtT: 0 };

export type ZType = "lento" | "rapido" | "resistente";
export type Zombie = {
  pos: THREE.Vector3; type: ZType; hp: number; max: number; speed: number; dmg: number;
  state: "vagar" | "investigar" | "perseguir" | "atacar"; target: THREE.Vector3; atkT: number;
  dead: boolean; deadT: number; walk: number; face: number; hitT: number; wanderT: number;
};
export const ZTYPES: Record<ZType, { hp: number; speed: number; dmg: number; scale: number; reward: number; shirt: string }> = {
  lento: { hp: 60, speed: 1.1, dmg: 8, scale: 1, reward: 8, shirt: "#5a5248" },
  rapido: { hp: 45, speed: 3.6, dmg: 6, scale: 0.95, reward: 14, shirt: "#6b2e2a" },
  resistente: { hp: 200, speed: 1.4, dmg: 18, scale: 1.3, reward: 35, shirt: "#3c4230" },
};
export const MAX_ZOMBIES = 16;
export const zombies: Zombie[] = [];
