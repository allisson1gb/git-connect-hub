import { useSyncExternalStore } from "react";

export type ItemId = "agua" | "comida" | "curativo" | "madeira" | "sucata" | "pano" | "taco" | "faca" | "combustivel";

export const ITEMS: Record<ItemId, { nome: string; peso: number; raridade: "Comum" | "Incomum" | "Raro"; cat: string; desc: string }> = {
  agua: { nome: "Garrafa de água", peso: 1, raridade: "Comum", cat: "Bebidas", desc: "+35 sede" },
  comida: { nome: "Enlatado", peso: 1, raridade: "Comum", cat: "Alimentos", desc: "+35 fome" },
  curativo: { nome: "Curativo", peso: 0.5, raridade: "Incomum", cat: "Medicamentos", desc: "+30 vida" },
  madeira: { nome: "Madeira", peso: 2, raridade: "Comum", cat: "Recursos", desc: "Material de fabricação" },
  sucata: { nome: "Sucata", peso: 1.5, raridade: "Comum", cat: "Recursos", desc: "Material de fabricação" },
  pano: { nome: "Tecido", peso: 0.3, raridade: "Comum", cat: "Recursos", desc: "Material de fabricação" },
  taco: { nome: "Taco com pregos", peso: 3, raridade: "Incomum", cat: "Armas", desc: "Dano 35" },
  faca: { nome: "Facão", peso: 2, raridade: "Raro", cat: "Armas", desc: "Dano 55, rápido" },
  combustivel: { nome: "Galão de combustível", peso: 4, raridade: "Incomum", cat: "Veículos", desc: "Para veículos (em breve)" },
};

export const WEAPONS = { punhos: { dano: 14, recarga: 0.45 }, taco: { dano: 35, recarga: 0.6 }, faca: { dano: 55, recarga: 0.4 } };

export type ShopItem = { id: string; nome: string; cat: string; preco: number; raridade: string; cor: string; slot: "roupa" | "mochila"; bonus?: number };
export const SHOP: ShopItem[] = [
  { id: "cam_cinza", nome: "Camiseta Cinza", cat: "Camisetas", preco: 0, raridade: "Comum", cor: "#6b6f73", slot: "roupa" },
  { id: "cam_vermelha", nome: "Camiseta Desbotada", cat: "Camisetas", preco: 60, raridade: "Comum", cor: "#8a3a32", slot: "roupa" },
  { id: "jaq_couro", nome: "Jaqueta de Couro", cat: "Jaquetas", preco: 150, raridade: "Incomum", cor: "#4a3122", slot: "roupa" },
  { id: "tatica", nome: "Roupa Tática", cat: "Roupas táticas", preco: 320, raridade: "Raro", cor: "#3f4a33", slot: "roupa" },
  { id: "laranja", nome: "Colete de Resgate", cat: "Roupas raras", preco: 600, raridade: "Raro", cor: "#d0711f", slot: "roupa" },
  { id: "moch_peq", nome: "Mochila Escolar", cat: "Mochilas", preco: 120, raridade: "Comum", cor: "#2f4f6a", slot: "mochila", bonus: 10 },
  { id: "moch_tat", nome: "Mochila Tática", cat: "Mochilas", preco: 400, raridade: "Raro", cor: "#3a3a2a", slot: "mochila", bonus: 25 },
];

export const RECEITAS: { id: ItemId; custo: Partial<Record<ItemId, number>> }[] = [
  { id: "curativo", custo: { pano: 2 } },
  { id: "taco", custo: { madeira: 2, sucata: 1 } },
  { id: "faca", custo: { sucata: 4, pano: 1 } },
];

export const MISSOES = [
  { id: "m1", titulo: "Abra 3 caixas de suprimentos", meta: 3, prog: () => S.caixas, rec: 40 },
  { id: "m2", titulo: "Elimine 5 zumbis", meta: 5, prog: () => S.kills, rec: 60 },
  { id: "m3", titulo: "Fabrique um item", meta: 1, prog: () => S.fabricados, rec: 40 },
  { id: "m4", titulo: "Elimine 20 zumbis", meta: 20, prog: () => S.kills, rec: 200 },
  { id: "m5", titulo: "Abra 15 caixas", meta: 15, prog: () => S.caixas, rec: 150 },
];

type Panel = null | "inv" | "craft" | "missoes";
export const S = {
  screen: "menu" as "menu" | "jogo",
  hp: 100, fome: 100, sede: 100, energia: 100,
  moedas: 50, xp: 0, nivel: 1, kills: 0, caixas: 0, fabricados: 0,
  inv: { agua: 1, comida: 1 } as Partial<Record<ItemId, number>>,
  arma: "punhos" as keyof typeof WEAPONS,
  owned: ["cam_cinza"] as string[], roupa: "cam_cinza", mochila: null as string | null,
  missoesFeitas: [] as string[],
  historico: [] as { t: string; v: number }[],
  cam: "3p" as "3p" | "1p", sens: 1, qualidade: "media" as "baixa" | "media" | "alta",
  correr: false, agachar: false,
  prompt: null as string | null, regiao: "", perigo: false,
  toasts: [] as { id: number; t: string }[],
  dead: false, panel: null as Panel, hora: 0.3, clima: "limpo" as "limpo" | "neblina" | "chuva",
};

let version = 0;
const ls = new Set<() => void>();
export function emit() { version++; ls.forEach((l) => l()); }
export function useGame() {
  useSyncExternalStore((cb) => { ls.add(cb); return () => ls.delete(cb); }, () => version, () => version);
  return S;
}

let tid = 0;
export function toast(t: string) {
  const id = ++tid; S.toasts = [...S.toasts.slice(-3), { id, t }]; emit();
  setTimeout(() => { S.toasts = S.toasts.filter((x) => x.id !== id); emit(); }, 2600);
}

export function peso() { return Object.entries(S.inv).reduce((a, [k, n]) => a + ITEMS[k as ItemId].peso * (n || 0), 0); }
export function pesoMax() { return 25 + (SHOP.find((s) => s.id === S.mochila)?.bonus ?? 0); }

export function addItem(id: ItemId, n = 1) {
  if (peso() + ITEMS[id].peso * n > pesoMax()) { toast("Mochila cheia! Descarte algo."); return false; }
  S.inv[id] = (S.inv[id] || 0) + n; return true;
}
export function removeItem(id: ItemId, n = 1) {
  const c = S.inv[id] || 0; if (c < n) return false;
  if (c - n <= 0) delete S.inv[id]; else S.inv[id] = c - n;
  if ((id === "taco" || id === "faca") && S.arma === id && !S.inv[id]) S.arma = "punhos";
  return true;
}
export function useItem(id: ItemId) {
  if (id === "agua") S.sede = Math.min(100, S.sede + 35);
  else if (id === "comida") S.fome = Math.min(100, S.fome + 35);
  else if (id === "curativo") S.hp = Math.min(100, S.hp + 30);
  else if (id === "taco" || id === "faca") { S.arma = S.arma === id ? "punhos" : id; save(); emit(); return; }
  else return;
  removeItem(id); toast(`Usou ${ITEMS[id].nome}`); save(); emit();
}
export function craft(id: ItemId) {
  const r = RECEITAS.find((x) => x.id === id)!;
  for (const [k, n] of Object.entries(r.custo)) if ((S.inv[k as ItemId] || 0) < (n || 0)) { toast("Materiais insuficientes"); return; }
  for (const [k, n] of Object.entries(r.custo)) removeItem(k as ItemId, n);
  if (!addItem(id)) { for (const [k, n] of Object.entries(r.custo)) S.inv[k as ItemId] = (S.inv[k as ItemId] || 0) + (n || 0); return; }
  S.fabricados++; toast(`Fabricou ${ITEMS[id].nome}`); checkMissoes(); save(); emit();
}
export function addCoins(v: number, motivo: string) {
  S.moedas += v; S.historico = [{ t: motivo, v }, ...S.historico].slice(0, 30);
}
export function addXp(v: number) {
  S.xp += v; const need = S.nivel * 100;
  if (S.xp >= need) { S.xp -= need; S.nivel++; addCoins(25, `Nível ${S.nivel}`); toast(`Subiu para o nível ${S.nivel}!`); }
}
export function checkMissoes() {
  for (const m of MISSOES) if (!S.missoesFeitas.includes(m.id) && m.prog() >= m.meta) {
    S.missoesFeitas.push(m.id); addCoins(m.rec, `Missão: ${m.titulo}`); addXp(50); toast(`Missão concluída! +${m.rec} moedas`);
  }
}
export function missaoAtual() { return MISSOES.find((m) => !S.missoesFeitas.includes(m.id)); }

export function buy(item: ShopItem) {
  if (S.owned.includes(item.id)) return;
  if (S.moedas < item.preco) { toast("Moedas insuficientes"); return; }
  S.moedas -= item.preco; S.owned = [...S.owned, item.id];
  S.historico = [{ t: `Compra: ${item.nome}`, v: -item.preco }, ...S.historico].slice(0, 30);
  toast(`Comprou ${item.nome}`); save(); emit();
}
export function equip(item: ShopItem, on: boolean) {
  if (!S.owned.includes(item.id)) return;
  if (item.slot === "roupa") S.roupa = on ? item.id : "cam_cinza";
  else S.mochila = on ? item.id : null;
  save(); emit();
}

const KEY = "sobrevivencia-z-save-v1";
const PERSIST = ["hp", "fome", "sede", "moedas", "xp", "nivel", "kills", "caixas", "fabricados", "inv", "arma", "owned", "roupa", "mochila", "missoesFeitas", "historico", "cam", "sens", "qualidade"] as const;
export function save() {
  try { const o: Record<string, unknown> = {}; for (const k of PERSIST) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ignore */ }
}
export function load() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return; Object.assign(S, JSON.parse(raw)); emit(); } catch { /* corrupted save ignored */ }
}
