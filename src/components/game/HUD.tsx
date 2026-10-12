import { useEffect, useRef } from "react";
import { S, emit, useGame, ITEMS, RECEITAS, MISSOES, missaoAtual, useItem, removeItem, craft, peso, pesoMax, save, type ItemId } from "@/game/store";
import { input, player, zombies } from "@/game/runtime";
import { buildings, loot } from "@/game/world";
import { Panel } from "./ui";

function Bar({ label, v, cls }: { label: string; v: number; cls: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 text-[10px] font-bold uppercase text-hud-foreground">{label}</span>
      <div className="h-2 w-24 overflow-hidden rounded-sm bg-hud sm:w-32"><div className={`h-full ${cls}`} style={{ width: `${Math.max(0, v)}%` }} /></div>
    </div>
  );
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null), id = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`; input.mx = dx / R; input.my = -dy / R;
  };
  const end = () => { id.current = null; input.mx = 0; input.my = 0; if (knob.current) knob.current.style.transform = ""; };
  return (
    <div ref={base} className="pointer-events-auto absolute bottom-6 left-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-hud-foreground/30 bg-hud/50"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); id.current = e.pointerId; move(e); }}
      onPointerMove={(e) => { if (id.current === e.pointerId) move(e); }} onPointerUp={end} onPointerCancel={end}>
      <div ref={knob} className="h-14 w-14 rounded-full bg-hud-foreground/70" />
    </div>
  );
}

function LookPad() {
  const last = useRef<{ id: number; x: number; y: number } | null>(null);
  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 w-3/5"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; }}
      onPointerMove={(e) => { const l = last.current; if (!l || l.id !== e.pointerId) return; input.lookX += e.clientX - l.x; input.lookY += e.clientY - l.y; l.x = e.clientX; l.y = e.clientY; }}
      onPointerUp={() => (last.current = null)} onPointerCancel={() => (last.current = null)} />
  );
}

function Btn({ label, onDown, active, size = "h-14 w-14", cls = "" }: { label: string; onDown: () => void; active?: boolean; size?: string; cls?: string }) {
  return (
    <button onPointerDown={(e) => { e.stopPropagation(); onDown(); }}
      className={`pointer-events-auto ${size} rounded-full border-2 text-[11px] font-bold uppercase active:scale-95 ${active ? "border-primary bg-primary text-primary-foreground" : "border-hud-foreground/30 bg-hud/70 text-hud-foreground"} ${cls}`}>{label}</button>
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const iv = setInterval(() => {
      const c = ref.current?.getContext("2d"); if (!c) return; const W = 110, sc = W / 120, px = player.pos.x, pz = player.pos.z;
      c.clearRect(0, 0, W, W); c.fillStyle = "rgba(20,22,20,0.75)"; c.fillRect(0, 0, W, W);
      const tx = (x: number) => W / 2 + (x - px) * sc, tz = (z: number) => W / 2 + (z - pz) * sc;
      c.fillStyle = "#6d6a63"; for (const b of buildings) if (Math.abs(b.x - px) < 80 && Math.abs(b.z - pz) < 80) c.fillRect(tx(b.x - b.w / 2), tz(b.z - b.d / 2), b.w * sc, b.d * sc);
      c.fillStyle = "#d9a441"; for (const l of loot) if (!l.empty && Math.abs(l.x - px) < 60 && Math.abs(l.z - pz) < 60) c.fillRect(tx(l.x) - 1.5, tz(l.z) - 1.5, 3, 3);
      c.fillStyle = "#d4362a"; for (const z of zombies) if (!z.dead) { c.beginPath(); c.arc(tx(z.pos.x), tz(z.pos.z), 2.2, 0, 7); c.fill(); }
      c.save(); c.translate(W / 2, W / 2); c.rotate(-player.face + Math.PI); c.fillStyle = "#f2efe6"; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 5); c.lineTo(-4, 5); c.fill(); c.restore();
    }, 150);
    return () => clearInterval(iv);
  }, []);
  return <canvas ref={ref} width={110} height={110} className="rounded-md border border-hud-foreground/30" />;
}

export function HUD() {
  const s = useGame();
  const m = missaoAtual();
  const night = Math.sin(s.hora * Math.PI * 2) < 0;
  const h = Math.floor((s.hora * 24 + 6) % 24);
  const set = (p: typeof S.panel) => { S.panel = S.panel === p ? null : p; emit(); };
  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-hud-foreground">
      <LookPad />
      {s.perigo && <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(170,30,20,0.55)]" />}
      <div className="absolute left-3 top-3 space-y-1 rounded-md bg-hud/60 p-2">
        <Bar label="Vida" v={s.hp} cls="bg-destructive" />
        <Bar label="Fome" v={s.fome} cls="bg-primary" />
        <Bar label="Sede" v={s.sede} cls="bg-sky-500" />
        <Bar label="Energia" v={s.energia} cls="bg-lime-500" />
        <p className="pt-1 text-[10px]">{s.regiao} · {String(h).padStart(2, "0")}h {night ? "· NOITE" : ""} · {s.clima}</p>
        {m && <p className="max-w-[12rem] text-[10px] text-primary">Objetivo: {m.titulo} ({Math.min(m.meta, m.prog())}/{m.meta})</p>}
      </div>
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
        <Minimap />
        <p className="rounded bg-hud/70 px-2 py-0.5 text-xs font-bold">{s.moedas} moedas · Nv {s.nivel}</p>
        <p className="rounded bg-hud/70 px-2 py-0.5 text-[10px]">Arma: {s.arma === "punhos" ? "Punhos" : ITEMS[s.arma].nome}</p>
      </div>
      <div className="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 gap-1">
        {([["inv", "Mochila"], ["craft", "Fabricar"], ["missoes", "Missões"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => set(k)} className="rounded bg-hud/70 px-2 py-1 text-[11px] font-bold">{l}</button>
        ))}
        <button onClick={() => { save(); S.screen = "menu"; S.panel = null; emit(); }} className="rounded bg-hud/70 px-2 py-1 text-[11px] font-bold">Menu</button>
      </div>

      <div className="absolute left-1/2 top-14 flex -translate-x-1/2 flex-col items-center gap-1">
        {s.toasts.map((t) => <p key={t.id} className="rounded bg-hud/80 px-3 py-1 text-xs">{t.t}</p>)}
      </div>

      <Joystick />
      <div className="absolute bottom-40 left-8"><Btn label={s.correr ? "Correndo" : "Correr"} active={s.correr} onDown={() => { S.correr = !S.correr; if (S.correr) S.agachar = false; emit(); }} size="h-11 w-24 rounded-md" /></div>

      <div className="absolute bottom-5 right-5 grid grid-cols-3 items-end gap-2">
        <Btn label="Câm" onDown={() => { S.cam = S.cam === "3p" ? "1p" : "3p"; save(); emit(); }} size="h-11 w-11" />
        <Btn label="Agachar" active={s.agachar} onDown={() => { S.agachar = !S.agachar; if (S.agachar) S.correr = false; emit(); }} />
        <Btn label="Pular" onDown={() => (input.jump = true)} />
        <div />
        {s.prompt ? <Btn label="Pegar" onDown={() => (input.interact = true)} active cls="animate-pulse" /> : <div />}
        <Btn label="Atacar" onDown={() => (input.attack = true)} size="h-20 w-20" cls="border-destructive" />
      </div>
      {s.prompt && <p className="absolute bottom-1/3 left-1/2 -translate-x-1/2 rounded bg-hud/80 px-3 py-1 text-sm">{s.prompt} — toque em PEGAR (E)</p>}
      <p className="absolute bottom-1 left-1/2 hidden -translate-x-1/2 text-[10px] opacity-60 md:block">WASD mover · arraste p/ olhar · Shift correr · Espaço pular · J atacar · E pegar</p>

      {s.panel === "inv" && (
        <Panel title={`Mochila · ${peso().toFixed(1)}/${pesoMax()} kg`} onClose={() => set(null)}>
          {Object.keys(s.inv).length === 0 && <p className="text-sm text-muted-foreground">Vazia. Procure caixas perto dos prédios.</p>}
          <ul className="space-y-1">
            {(Object.entries(s.inv) as [ItemId, number][]).map(([id, n]) => (
              <li key={id} className="flex items-center justify-between gap-2 rounded bg-card px-2 py-1.5 text-card-foreground">
                <span className="text-sm">{ITEMS[id].nome} ×{n} <span className="text-xs text-muted-foreground">· {ITEMS[id].cat} · {ITEMS[id].raridade} · {ITEMS[id].desc}</span></span>
                <span className="flex gap-1">
                  {["agua", "comida", "curativo", "taco", "faca"].includes(id) && <button onClick={() => useItem(id)} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">{id === "taco" || id === "faca" ? (s.arma === id ? "Desequipar" : "Equipar") : "Usar"}</button>}
                  <button onClick={() => { removeItem(id); save(); emit(); }} className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">Descartar</button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {s.panel === "craft" && (
        <Panel title="Fabricação" onClose={() => set(null)}>
          <ul className="space-y-1">
            {RECEITAS.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded bg-card px-2 py-1.5 text-card-foreground">
                <span className="text-sm">{ITEMS[r.id].nome} <span className="text-xs text-muted-foreground">· {Object.entries(r.custo).map(([k, n]) => `${n} ${ITEMS[k as ItemId].nome} (tem ${s.inv[k as ItemId] || 0})`).join(", ")}</span></span>
                <button onClick={() => craft(r.id)} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Fabricar</button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {s.panel === "missoes" && (
        <Panel title="Missões" onClose={() => set(null)}>
          <ul className="space-y-1">{MISSOES.map((mm) => <li key={mm.id} className="rounded bg-card px-2 py-1.5 text-sm text-card-foreground">{s.missoesFeitas.includes(mm.id) ? "✓ " : ""}{mm.titulo} — {Math.min(mm.meta, mm.prog())}/{mm.meta} · {mm.rec} moedas</li>)}</ul>
        </Panel>
      )}
      {s.dead && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80">
          <h2 className="font-display text-6xl text-destructive">VOCÊ MORREU</h2>
          <p className="text-sm text-muted-foreground">Você perde 20% das moedas e os itens da mochila.</p>
          <button className="z-btn bg-primary text-primary-foreground" onClick={() => {
            S.moedas = Math.floor(S.moedas * 0.8); S.inv = { agua: 1 }; S.arma = "punhos"; S.hp = 100; S.fome = 80; S.sede = 80; S.energia = 100; S.dead = false;
            player.pos.set(23, 0, 0); for (const z of zombies) { z.dead = true; z.deadT = 3; } save(); emit();
          }}>RENASCER</button>
        </div>
      )}
    </div>
  );
}
