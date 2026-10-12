import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildings, cars, trees, pads, loot, rubble, collide, lineOfSight, overlaps, rollLoot, regionAt, BLOCK, WORLD } from "@/game/world";
import { input, keys, player, zombies, ZTYPES, MAX_ZOMBIES, type Zombie, type ZType } from "@/game/runtime";
import { S, emit, addItem, addCoins, addXp, checkMissoes, toast, save, ITEMS, WEAPONS, SHOP, useGame } from "@/game/store";

const DAY = 300;
const tmp = new THREE.Vector3();

function canvasTex(draw: (c: CanvasRenderingContext2D) => void, size = 256) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function noise(c: CanvasRenderingContext2D, n: number, a: number, s: number) {
  for (let i = 0; i < n; i++) { const v = Math.random() * 255 | 0; c.fillStyle = `rgba(${v},${v},${v},${a})`; c.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 2 + Math.random() * 4); }
}

type Rig = { la: THREE.Group | null; ra: THREE.Group | null; ll: THREE.Group | null; rl: THREE.Group | null };
function Humanoid({ rig, skin, shirt, pants, zombie, weapon, pack }: { rig: React.MutableRefObject<Rig>; skin: string; shirt: string; pants: string; zombie?: boolean; weapon?: string; pack?: string | null }) {
  return (
    <group>
      <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[0.5, 0.7, 0.28]} /><meshStandardMaterial color={shirt} roughness={0.95} /></mesh>
      <mesh position={[0, 1.68, 0]} castShadow><boxGeometry args={[0.28, 0.32, 0.28]} /><meshStandardMaterial color={skin} roughness={0.8} /></mesh>
      {zombie ? (
        <>
          <mesh position={[-0.07, 1.72, 0.145]}><boxGeometry args={[0.06, 0.04, 0.01]} /><meshBasicMaterial color="#d4362a" /></mesh>
          <mesh position={[0.07, 1.72, 0.145]}><boxGeometry args={[0.06, 0.04, 0.01]} /><meshBasicMaterial color="#d4362a" /></mesh>
          <mesh position={[0.1, 1.05, 0.145]}><boxGeometry args={[0.18, 0.25, 0.01]} /><meshStandardMaterial color="#3a1512" /></mesh>
        </>
      ) : (
        <mesh position={[0, 1.86, -0.02]}><boxGeometry args={[0.3, 0.08, 0.32]} /><meshStandardMaterial color="#2a1f17" /></mesh>
      )}
      {pack && <mesh position={[0, 1.2, -0.25]} castShadow><boxGeometry args={[0.4, 0.5, 0.2]} /><meshStandardMaterial color={pack} roughness={0.9} /></mesh>}
      <group ref={(g) => { rig.current.la = g; }} position={[-0.33, 1.45, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow><boxGeometry args={[0.15, 0.62, 0.15]} /><meshStandardMaterial color={zombie ? skin : shirt} roughness={0.9} /></mesh>
        <mesh position={[0, -0.66, 0]}><boxGeometry args={[0.13, 0.13, 0.13]} /><meshStandardMaterial color={skin} /></mesh>
      </group>
      <group ref={(g) => { rig.current.ra = g; }} position={[0.33, 1.45, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow><boxGeometry args={[0.15, 0.62, 0.15]} /><meshStandardMaterial color={zombie ? skin : shirt} roughness={0.9} /></mesh>
        <mesh position={[0, -0.66, 0]}><boxGeometry args={[0.13, 0.13, 0.13]} /><meshStandardMaterial color={skin} /></mesh>
        {weapon === "taco" && <mesh position={[0, -0.7, 0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.035, 0.06, 0.8]} /><meshStandardMaterial color="#6b4a2c" roughness={0.9} /></mesh>}
        {weapon === "faca" && <mesh position={[0, -0.7, 0.32]} castShadow><boxGeometry args={[0.03, 0.08, 0.6]} /><meshStandardMaterial color="#b9bcbf" metalness={0.8} roughness={0.35} /></mesh>}
      </group>
      <group ref={(g) => { rig.current.ll = g; }} position={[-0.13, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.2, 0.8, 0.22]} /><meshStandardMaterial color={pants} roughness={0.95} /></mesh>
      </group>
      <group ref={(g) => { rig.current.rl = g; }} position={[0.13, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.2, 0.8, 0.22]} /><meshStandardMaterial color={pants} roughness={0.95} /></mesh>
      </group>
    </group>
  );
}
function animate(rig: Rig, walk: number, amt: number, zombie: boolean, attack: number) {
  const s = Math.sin(walk) * amt;
  if (rig.ll) rig.ll.rotation.x = s * 0.7;
  if (rig.rl) rig.rl.rotation.x = -s * 0.7;
  if (zombie) {
    if (rig.la) rig.la.rotation.x = -1.35 + Math.sin(walk * 0.5) * 0.12;
    if (rig.ra) rig.ra.rotation.x = -1.35 - Math.sin(walk * 0.5) * 0.12 - attack * 0.6;
  } else {
    if (rig.la) rig.la.rotation.x = -s * 0.6;
    if (rig.ra) rig.ra.rotation.x = attack > 0 ? -2.2 * Math.sin(attack * Math.PI) : s * 0.6;
  }
}

function City() {
  const wallTex = useMemo(() => canvasTex((c) => {
    c.fillStyle = "#d9d6cf"; c.fillRect(0, 0, 256, 256); noise(c, 900, 0.12, 256);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const broken = Math.random() < 0.35;
      c.fillStyle = "#3c4044"; c.fillRect(30 + i * 128, 40 + j * 128, 68, 60);
      c.fillStyle = broken ? "#101214" : "#59646b"; c.fillRect(34 + i * 128, 44 + j * 128, 60, 52);
      c.fillStyle = "rgba(60,40,20,0.35)"; c.fillRect(30 + i * 128, 100 + j * 128, 68, 22);
    }
    c.fillStyle = "rgba(40,30,20,0.25)"; c.fillRect(0, 220, 256, 36);
  }), []);
  const groundTex = useMemo(() => {
    const t = canvasTex((c) => {
      c.fillStyle = "#3a3b3d"; c.fillRect(0, 0, 256, 256); noise(c, 3000, 0.08, 256);
      c.strokeStyle = "rgba(15,15,15,0.6)"; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { c.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); }
    });
    t.repeat.set(70, 70); return t;
  }, []);
  const padTex = useMemo(() => canvasTex((c) => { c.fillStyle = "#bfbab0"; c.fillRect(0, 0, 256, 256); noise(c, 2500, 0.14, 256); c.strokeStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i <= 256; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); } }), []);
  useEffect(() => { padTex.repeat.set(8, 8); }, [padTex]);

  const bTex = useMemo(() => buildings.map((b) => { const t = wallTex.clone(); t.repeat.set(Math.max(1, b.w / 4), Math.max(1, b.h / 3.6)); t.needsUpdate = true; return t; }), [wallTex]);

  const carRef = useRef<THREE.InstancedMesh>(null), cabRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null), crownRef = useRef<THREE.InstancedMesh>(null);
  const padRef = useRef<THREE.InstancedMesh>(null), rubRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Object3D(), col = new THREE.Color();
    cars.forEach((c, i) => {
      const rot = c.w > c.d ? Math.PI / 2 : 0;
      m.position.set(c.x, 0.55, c.z); m.rotation.set(0, rot + (i % 5) * 0.06, 0); m.scale.set(1, 1, 1); m.updateMatrix();
      carRef.current!.setMatrixAt(i, m.matrix); carRef.current!.setColorAt(i, col.set(c.color));
      m.position.y = 1.25; m.scale.set(0.9, 0.7, 0.55); m.updateMatrix(); cabRef.current!.setMatrixAt(i, m.matrix);
    });
    trees.forEach((t, i) => {
      m.rotation.set(0, i, 0); m.position.set(t.x, 1.5 * t.s, t.z); m.scale.set(t.s, t.s, t.s); m.updateMatrix(); trunkRef.current!.setMatrixAt(i, m.matrix);
      m.position.y = 4.2 * t.s; m.updateMatrix(); crownRef.current!.setMatrixAt(i, m.matrix); crownRef.current!.setColorAt(i, col.setHSL(0.25 + (i % 7) * 0.012, 0.35, 0.18 + (i % 5) * 0.02));
    });
    pads.forEach((p, i) => { m.rotation.set(0, 0, 0); m.position.set(p.x, 0.07, p.z); m.scale.set(1, 1, 1); m.updateMatrix(); padRef.current!.setMatrixAt(i, m.matrix); padRef.current!.setColorAt(i, col.set(p.color)); });
    rubble.forEach((r, i) => { m.position.set(r.x, r.s * 0.3, r.z); m.rotation.set(r.r, r.r * 2, 0); m.scale.set(r.s, r.s * 0.6, r.s * 1.3); m.updateMatrix(); rubRef.current!.setMatrixAt(i, m.matrix); rubRef.current!.setColorAt(i, col.setHSL(0.08, 0.1, 0.25 + (i % 4) * 0.05)); });
    for (const r of [carRef, cabRef, trunkRef, crownRef, padRef, rubRef]) { r.current!.instanceMatrix.needsUpdate = true; if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true; }
  }, []);

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[WORLD * 2 + 80, WORLD * 2 + 80]} /><meshStandardMaterial map={groundTex} roughness={0.95} /></mesh>
      <instancedMesh ref={padRef} args={[undefined, undefined, pads.length]} receiveShadow><boxGeometry args={[BLOCK, 0.14, BLOCK]} /><meshStandardMaterial map={padTex} roughness={0.95} /></instancedMesh>
      {buildings.map((b, i) => (
        <group key={i}>
          <mesh position={[b.x, b.h / 2, b.z]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial map={bTex[i]} color={b.color} roughness={0.9} /></mesh>
          {b.roof && <mesh position={[b.x, b.h + 0.9, b.z]} rotation-y={Math.PI / 4} castShadow><coneGeometry args={[Math.max(b.w, b.d) * 0.75, 1.8, 4]} /><meshStandardMaterial color="#5b3a2c" roughness={0.9} /></mesh>}
        </group>
      ))}
      <instancedMesh ref={carRef} args={[undefined, undefined, cars.length]} castShadow receiveShadow><boxGeometry args={[1.9, 0.8, 4.2]} /><meshStandardMaterial roughness={0.7} metalness={0.4} /></instancedMesh>
      <instancedMesh ref={cabRef} args={[undefined, undefined, cars.length]} castShadow><boxGeometry args={[1.9, 0.8, 4.2]} /><meshStandardMaterial color="#1e2326" roughness={0.3} metalness={0.6} /></instancedMesh>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow><cylinderGeometry args={[0.18, 0.28, 3, 6]} /><meshStandardMaterial color="#4a3826" roughness={1} /></instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, trees.length]} castShadow><coneGeometry args={[1.8, 4.5, 7]} /><meshStandardMaterial roughness={1} /></instancedMesh>
      <instancedMesh ref={rubRef} args={[undefined, undefined, rubble.length]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={1} /></instancedMesh>
    </>
  );
}

function Crates() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => canvasTex((c) => { c.fillStyle = "#7a5a34"; c.fillRect(0, 0, 128, 128); noise(c, 300, 0.15, 128); c.strokeStyle = "#3d2a16"; c.lineWidth = 8; c.strokeRect(4, 4, 120, 120); c.beginPath(); c.moveTo(4, 4); c.lineTo(124, 124); c.stroke(); }, 128), []);
  const last = useRef("");
  useFrame((_, d) => {
    const m = new THREE.Object3D(), col = new THREE.Color(); let sig = "";
    for (const l of loot) { if (l.empty) { l.respawn -= d; if (l.respawn <= 0) l.empty = false; } sig += l.empty ? "0" : "1"; }
    if (sig === last.current) return; last.current = sig;
    loot.forEach((l, i) => {
      m.position.set(l.x, 0.4, l.z); m.rotation.set(0, i, 0); m.scale.setScalar(l.empty ? 0.75 : 1); m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix); ref.current!.setColorAt(i, col.set(l.empty ? "#555555" : l.reg === "militar" ? "#a8b07a" : "#ffffff"));
    });
    ref.current!.instanceMatrix.needsUpdate = true; if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, loot.length]} castShadow receiveShadow><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial map={tex} roughness={0.85} /></instancedMesh>;
}

const typeFor = (i: number) => (["lento", "rapido", "lento", "resistente"] as ZType[])[i % 4];
function spawnZombie(type: ZType, z?: Zombie): Zombie {
  for (let t = 0; t < 30; t++) {
    const a = Math.random() * Math.PI * 2, d = 22 + Math.random() * 40;
    const x = player.pos.x + Math.cos(a) * d, zz = player.pos.z + Math.sin(a) * d;
    if (Math.abs(x) > WORLD || Math.abs(zz) > WORLD || overlaps(x, zz, 0.6)) continue;
    const dang = regionAt(x, zz).perigo;
    const T = ZTYPES[type];
    const o: Zombie = z ?? ({} as Zombie);
    Object.assign(o, { pos: new THREE.Vector3(x, 0, zz), type, hp: T.hp * (dang >= 3 ? 1.4 : 1), max: T.hp, speed: T.speed, dmg: T.dmg * (dang >= 3 ? 1.3 : 1), state: "vagar", target: new THREE.Vector3(x, 0, zz), atkT: 0, dead: false, deadT: 0, walk: Math.random() * 6, face: 0, hitT: 0, wanderT: 0 });
    return o;
  }
  const o: Zombie = z ?? ({} as Zombie); Object.assign(o, { pos: player.pos.clone().add(new THREE.Vector3(30, 0, 30)), type, hp: 1, max: 1, speed: 1, dmg: 1, state: "vagar", target: player.pos.clone(), atkT: 0, dead: true, deadT: 2, walk: 0, face: 0, hitT: 0, wanderT: 0 }); return o;
}

function ZombieAI() {
  useFrame((_, raw) => {
    if (S.screen !== "jogo") return;
    const dt = Math.min(raw, 0.05);
    while (zombies.length < MAX_ZOMBIES) zombies.push(spawnZombie(typeFor(zombies.length)));
    const night = Math.sin(S.hora * Math.PI * 2) < 0;
    const p = player.pos;
    for (const z of zombies) {
      if (z.dead) { z.deadT -= dt; if (z.deadT <= 0) spawnZombie(z.type, z); continue; }
      const dx = p.x - z.pos.x, dz = p.z - z.pos.z, d = Math.hypot(dx, dz);
      if (d > 90) { spawnZombie(z.type, z); continue; }
      z.atkT -= dt; z.hitT -= dt;
      const range = (night ? 24 : 15) * (S.agachar ? 0.55 : 1) * (S.clima === "neblina" ? 0.7 : 1);
      if (!S.dead && d < range && (d < 4 || lineOfSight(z.pos.x, z.pos.z, p.x, p.z))) z.state = d < 1.5 ? "atacar" : "perseguir";
      else if (!S.dead && player.noise > 0 && d < 30) { z.state = "investigar"; z.target.copy(p); }
      else if (z.state === "perseguir" && d > range * 1.8) z.state = "vagar";
      let speed = 0;
      if (z.state === "atacar") {
        z.face = Math.atan2(dx, dz);
        if (d > 1.8) z.state = "perseguir";
        else if (z.atkT <= 0) { z.atkT = 1.2; if (!S.dead) { S.hp -= z.dmg; player.hurtT = 0.3; if (S.hp <= 0) { S.hp = 0; S.dead = true; } emit(); } }
      } else if (z.state === "perseguir") { z.target.copy(p); speed = z.speed * (night ? 1.25 : 1); }
      else {
        z.wanderT -= dt;
        if (z.wanderT <= 0 && z.state === "vagar") { z.wanderT = 3 + Math.random() * 5; z.target.set(z.pos.x + (Math.random() - 0.5) * 16, 0, z.pos.z + (Math.random() - 0.5) * 16); }
        speed = z.state === "investigar" ? z.speed * 0.9 : z.speed * 0.45;
        if (z.pos.distanceTo(z.target) < 1) { speed = 0; if (z.state === "investigar") z.state = "vagar"; }
      }
      if (speed > 0) {
        tmp.subVectors(z.target, z.pos).setY(0); const l = tmp.length();
        if (l > 0.5) { tmp.multiplyScalar(1 / l); z.face = Math.atan2(tmp.x, tmp.z); z.pos.addScaledVector(tmp, speed * dt); z.walk += dt * speed * 3; }
        const before = z.pos.clone(); collide(z.pos, 0.4);
        if (before.distanceTo(z.pos) > speed * dt * 0.5) { z.target.x += (Math.random() - 0.5) * 6; z.target.z += (Math.random() - 0.5) * 6; }
      }
      for (const o of zombies) if (o !== z && !o.dead) { const ox = z.pos.x - o.pos.x, oz = z.pos.z - o.pos.z, od = Math.hypot(ox, oz); if (od < 0.8 && od > 0.001) { z.pos.x += (ox / od) * (0.8 - od) * 0.5; z.pos.z += (oz / od) * (0.8 - od) * 0.5; } }
    }
    player.noise = Math.max(0, player.noise - dt);
  });
  return null;
}

function ZombieView({ i }: { i: number }) {
  const g = useRef<THREE.Group>(null); const inner = useRef<THREE.Group>(null);
  const rig = useRef<Rig>({ la: null, ra: null, ll: null, rl: null });
  const type = typeFor(i);
  const T = ZTYPES[type];
  useFrame(() => {
    const z = zombies[i]; if (!g.current) return;
    if (!z) { g.current.visible = false; return; }
    g.current.visible = true;
    g.current.position.copy(z.pos); g.current.rotation.y = z.face;
    inner.current!.rotation.x = z.dead ? -Math.min(Math.PI / 2, (4 - z.deadT) * 4) : 0;
    inner.current!.position.y = z.hitT > 0 ? 0.05 : 0;
    animate(rig.current, z.walk, z.state === "atacar" ? 0.2 : 1, true, z.atkT > 0.9 ? 1 : 0);
  });
  return (
    <group ref={g} scale={T.scale}>
      <group ref={inner}><Humanoid rig={rig} skin={type === "rapido" ? "#8e8f73" : "#6f7d5c"} shirt={T.shirt} pants="#2e2a26" zombie /></group>
    </group>
  );
}

function Player() {
  const g = useRef<THREE.Group>(null);
  const rig = useRef<Rig>({ la: null, ra: null, ll: null, rl: null });
  const { camera } = useThree();
  const s = useGame();
  const shirt = SHOP.find((x) => x.id === s.roupa)?.cor ?? "#6b6f73";
  const pack = SHOP.find((x) => x.id === s.mochila)?.cor ?? null;
  const acc = useRef(0);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (S.screen !== "jogo") return;
    // input
    let mx = input.mx, my = input.my;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    const mag = Math.min(1, Math.hypot(mx, my));
    player.yaw -= input.lookX * 0.006 * S.sens; player.pitch = Math.max(-0.5, Math.min(1.1, player.pitch + input.lookY * 0.004 * S.sens));
    input.lookX = 0; input.lookY = 0;
    const fwdX = -Math.sin(player.yaw), fwdZ = -Math.cos(player.yaw), rX = Math.cos(player.yaw), rZ = -Math.sin(player.yaw);
    const running = (S.correr || keys.has("ShiftLeft")) && S.energia > 1 && !S.agachar && mag > 0.2;
    const speed = S.dead ? 0 : (S.agachar ? 1.6 : running ? 6.5 : 3.4) * mag;
    if (mag > 0.05 && !S.dead) {
      const n = 1 / Math.hypot(mx, my); const dx = (fwdX * my + rX * mx) * n, dz = (fwdZ * my + rZ * mx) * n;
      player.pos.x += dx * speed * dt; player.pos.z += dz * speed * dt;
      const target = Math.atan2(dx, dz); let diff = target - player.face; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.face += diff * (1 - Math.exp(-12 * dt)); player.walk += dt * speed * 2.6;
      if (running) player.noise = 1;
    }
    if (S.cam === "1p") player.face = player.yaw + Math.PI;
    collide(player.pos, 0.4);
    if ((input.jump || keys.has("Space")) && player.pos.y <= 0 && !S.dead && S.energia > 5) { player.vy = 6; S.energia -= 5; }
    input.jump = false;
    player.vy -= 18 * dt; player.pos.y = Math.max(0, player.pos.y + player.vy * dt); if (player.pos.y === 0) player.vy = 0;
    // attack
    player.attackT = Math.max(0, player.attackT - dt);
    const W = WEAPONS[S.arma];
    if ((input.attack || keys.has("KeyJ")) && player.attackT <= 0 && !S.dead) {
      player.attackT = W.recarga; player.noise = 1.5; S.energia = Math.max(0, S.energia - 3);
      const fx = S.cam === "1p" ? fwdX : Math.sin(player.face), fz = S.cam === "1p" ? fwdZ : Math.cos(player.face);
      for (const z of zombies) {
        if (z.dead) continue; const dx = z.pos.x - player.pos.x, dz = z.pos.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < 2.3 && (dx * fx + dz * fz) / (d || 1) > 0.35) {
          z.hp -= W.dano * (0.9 + Math.random() * 0.2); z.hitT = 0.15; z.state = "perseguir";
          z.pos.x += (dx / d) * 0.4; z.pos.z += (dz / d) * 0.4;
          if (z.hp <= 0) { z.dead = true; z.deadT = 4; S.kills++; const rew = ZTYPES[z.type].reward; addCoins(rew, `Zumbi ${z.type}`); addXp(rew); toast(`+${rew} moedas`); checkMissoes(); save(); }
        }
      }
    }
    input.attack = false;
    // interact
    let near: (typeof loot)[number] | null = null, nd = 2.2;
    for (const l of loot) if (!l.empty) { const d = Math.hypot(l.x - player.pos.x, l.z - player.pos.z); if (d < nd) { nd = d; near = l; } }
    const prompt = near ? "Caixa de suprimentos" : null;
    if (prompt !== S.prompt) { S.prompt = prompt; emit(); }
    if ((input.interact || keys.has("KeyE")) && near && !S.dead) {
      keys.delete("KeyE");
      const items = rollLoot(near.reg); const got: string[] = [];
      for (const it of items) if (addItem(it)) got.push(ITEMS[it].nome);
      if (got.length) { near.empty = true; near.respawn = 150; S.caixas++; addXp(5); toast(`Pegou: ${got.join(", ")}`); checkMissoes(); save(); emit(); }
    }
    input.interact = false;
    // survival
    acc.current += dt;
    S.fome = Math.max(0, S.fome - dt * 0.18); S.sede = Math.max(0, S.sede - dt * 0.28);
    S.energia = running ? Math.max(0, S.energia - dt * 12) : Math.min(100, S.energia + dt * (mag < 0.1 ? 14 : 7));
    if (!S.dead && (S.fome <= 0 || S.sede <= 0)) { S.hp -= dt * 1.5; if (S.hp <= 0) { S.hp = 0; S.dead = true; } }
    if (!S.dead && S.fome > 60 && S.sede > 60 && S.hp < 100) S.hp = Math.min(100, S.hp + dt * 0.4);
    if (acc.current > 0.25) {
      acc.current = 0; const r = regionAt(player.pos.x, player.pos.z);
      S.regiao = r.nome; S.perigo = zombies.some((z) => !z.dead && (z.state === "perseguir" || z.state === "atacar"));
      emit();
    }
    // body + camera
    if (g.current) {
      g.current.position.copy(player.pos); g.current.rotation.y = player.face;
      g.current.visible = S.cam === "3p"; g.current.scale.y = S.agachar ? 0.75 : 1;
      g.current.rotation.x = S.dead ? -Math.PI / 2 : 0;
      animate(rig.current, player.walk, Math.min(1, speed / 3), false, player.attackT > 0 ? 1 - player.attackT / W.recarga : 0);
    }
    const head = player.pos.y + (S.agachar ? 1.15 : 1.6);
    if (S.cam === "3p") {
      const d = 4.6, cp = Math.cos(player.pitch);
      tmp.set(player.pos.x + Math.sin(player.yaw) * cp * d, head + Math.sin(player.pitch) * d, player.pos.z + Math.cos(player.yaw) * cp * d);
      const cpos = { x: tmp.x, z: tmp.z }; collide(cpos, 0.2); tmp.x = cpos.x; tmp.z = cpos.z; tmp.y = Math.max(0.4, tmp.y);
      camera.position.lerp(tmp, 1 - Math.exp(-14 * dt));
      camera.lookAt(player.pos.x, head, player.pos.z);
    } else {
      camera.position.set(player.pos.x, head, player.pos.z);
      camera.lookAt(player.pos.x + fwdX, head - Math.tan(player.pitch - 0.3), player.pos.z + fwdZ);
    }
  });
  return <group ref={g}><Humanoid rig={rig} skin="#c69c7a" shirt={shirt} pants="#33373b" weapon={s.arma} pack={pack} /></group>;
}

function Sky() {
  const sun = useRef<THREE.DirectionalLight>(null), hemi = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const rain = useRef<THREE.Points>(null);
  const rainGeo = useMemo(() => { const g = new THREE.BufferGeometry(); const a = new Float32Array(1500 * 3); for (let i = 0; i < a.length; i++) a[i] = (Math.random() - 0.5) * 40; g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; }, []);
  const climaT = useRef(60);
  const cols = useMemo(() => ({ day: new THREE.Color("#a9b4b5"), dusk: new THREE.Color("#b07a55"), night: new THREE.Color("#0d1219"), cur: new THREE.Color() }), []);
  useEffect(() => { scene.fog = new THREE.Fog("#a9b4b5", 20, 140); scene.background = new THREE.Color("#a9b4b5"); }, [scene]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (S.screen === "jogo") S.hora = (S.hora + dt / DAY) % 1;
    climaT.current -= dt;
    if (climaT.current <= 0) { climaT.current = 70 + Math.random() * 80; const r = Math.random(); S.clima = r < 0.5 ? "limpo" : r < 0.75 ? "neblina" : "chuva"; }
    const a = S.hora * Math.PI * 2, sy = Math.sin(a), sx = Math.cos(a);
    const dayAmt = THREE.MathUtils.smoothstep(sy, -0.15, 0.25);
    const duskAmt = Math.max(0, 1 - Math.abs(sy) * 4) * 0.7;
    cols.cur.copy(cols.night).lerp(cols.day, dayAmt).lerp(cols.dusk, duskAmt * dayAmt);
    if (S.clima !== "limpo") cols.cur.lerp(new THREE.Color("#6b7377"), 0.4 * dayAmt);
    (scene.background as THREE.Color).copy(cols.cur);
    const fog = scene.fog as THREE.Fog; fog.color.copy(cols.cur);
    fog.far = (S.clima === "neblina" ? 55 : S.clima === "chuva" ? 90 : 150) * (0.55 + dayAmt * 0.45); fog.near = S.clima === "neblina" ? 4 : 15;
    if (sun.current) {
      sun.current.position.set(player.pos.x + sx * 40, Math.max(8, sy * 60), player.pos.z + 25);
      sun.current.target.position.copy(player.pos); sun.current.target.updateMatrixWorld();
      sun.current.intensity = dayAmt * (S.clima === "limpo" ? 2.2 : 1.1);
      sun.current.color.set(duskAmt > 0.3 ? "#ffb27a" : "#fff1dc");
    }
    if (hemi.current) hemi.current.intensity = 0.35 + dayAmt * 0.7;
    if (rain.current) {
      rain.current.visible = S.clima === "chuva";
      if (rain.current.visible) { const p = rainGeo.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - 28 * dt; if (y < -20) y += 40; p.setY(i, y); } p.needsUpdate = true; rain.current.position.set(player.pos.x, player.pos.y + 15, player.pos.z); }
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#c9d4dc", "#3a3328", 0.8]} />
      <directionalLight ref={sun} castShadow intensity={2} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={150} shadow-bias={-0.0005} />
      <points ref={rain} geometry={rainGeo}><pointsMaterial color="#aab8c4" size={0.08} transparent opacity={0.6} /></points>
    </>
  );
}

function Flashlight() {
  const l = useRef<THREE.PointLight>(null);
  useFrame(() => { if (!l.current) return; const night = Math.sin(S.hora * Math.PI * 2) < 0.05; l.current.intensity = night ? 18 : 0; l.current.position.set(player.pos.x, 2.2, player.pos.z); });
  return <pointLight ref={l} distance={14} decay={1.6} color="#ffd9a0" />;
}

export function Scene() {
  return (
    <>
      <Sky />
      <Flashlight />
      <Environment resolution={64}>
        <Lightformer intensity={1.2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={0.6} color="#c9b89a" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <City />
      <Crates />
      <ZombieAI />
      {Array.from({ length: MAX_ZOMBIES }, (_, i) => <ZombieView key={i} i={i} />)}
      <Player />
    </>
  );
}
