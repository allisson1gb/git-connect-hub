import { useState } from "react";
import { S, emit, useGame, SHOP, buy, equip, save } from "@/game/store";
import { Panel } from "./ui";

type Tela = null | "loja" | "personagem" | "config" | "sala" | "codigo";

export function Menu() {
  const s = useGame();
  const [tela, setTela] = useState<Tela>(null);
  const [cat, setCat] = useState("Todos");
  const jogar = () => { S.screen = "jogo"; emit(); };
  const cats = ["Todos", ...Array.from(new Set(SHOP.map((x) => x.cat)))];
  return (
    <div className="absolute inset-0 z-20 flex items-center bg-gradient-to-r from-background via-background/80 to-transparent">
      <div className="flex h-full w-full max-w-md flex-col justify-center gap-3 px-6 py-4 sm:px-10">
        <div>
          <h1 className="font-display text-5xl leading-none tracking-wide text-foreground sm:text-7xl">SOBREVIVÊNCIA <span className="text-primary">Z</span></h1>
          <p className="mt-1 text-sm uppercase tracking-[0.35em] text-muted-foreground">Juntos até o fim</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={jogar} className="z-btn col-span-2 bg-primary text-primary-foreground">JOGAR SOZINHO</button>
          <button onClick={() => setTela("sala")} className="z-btn">CRIAR SALA</button>
          <button onClick={() => setTela("codigo")} className="z-btn">ENTRAR COM CÓDIGO</button>
          <button onClick={() => setTela("loja")} className="z-btn">LOJA</button>
          <button onClick={() => setTela("personagem")} className="z-btn">PERSONAGEM</button>
          <button onClick={() => setTela("config")} className="z-btn col-span-2">CONFIGURAÇÕES</button>
        </div>
        <p className="text-xs text-muted-foreground">Nível {s.nivel} · {s.moedas} moedas · {s.kills} zumbis eliminados</p>
      </div>

      {(tela === "sala" || tela === "codigo") && (
        <Panel title={tela === "sala" ? "Criar sala" : "Entrar com código"} onClose={() => setTela(null)}>
          <p className="text-sm text-muted-foreground">O modo online com amigos (salas com código, até 8 jogadores) é a próxima etapa do jogo. Por enquanto, jogue no modo solo — seu progresso, moedas e roupas já ficam salvos.</p>
        </Panel>
      )}

      {tela === "loja" && (
        <Panel title={`Loja · ${s.moedas} moedas`} onClose={() => setTela(null)}>
          <div className="mb-2 flex flex-wrap gap-1">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded px-2 py-1 text-xs ${cat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{c}</button>)}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHOP.filter((x) => cat === "Todos" || x.cat === cat).map((it) => {
              const tem = s.owned.includes(it.id), eq = s.roupa === it.id || s.mochila === it.id;
              return (
                <div key={it.id} className="rounded-md border border-border bg-card p-2">
                  <div className="mb-1 h-12 rounded" style={{ background: it.cor }} />
                  <p className="text-sm font-semibold text-card-foreground">{it.nome}</p>
                  <p className="text-xs text-muted-foreground">{it.raridade} · {it.preco} moedas{it.bonus ? ` · +${it.bonus} kg` : ""}</p>
                  {!tem ? <button onClick={() => buy(it)} className="mt-1 w-full rounded bg-primary py-1 text-xs font-bold text-primary-foreground">COMPRAR</button>
                    : <button onClick={() => equip(it, !eq)} className="mt-1 w-full rounded bg-secondary py-1 text-xs font-bold text-secondary-foreground">{eq ? "DESEQUIPAR" : "EQUIPAR"}</button>}
                </div>
              );
            })}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">Histórico</h3>
          <ul className="max-h-24 overflow-auto text-xs text-muted-foreground">{s.historico.length === 0 ? <li>Nada ainda.</li> : s.historico.map((h, i) => <li key={i}>{h.v > 0 ? "+" : ""}{h.v} · {h.t}</li>)}</ul>
        </Panel>
      )}

      {tela === "personagem" && (
        <Panel title="Personagem" onClose={() => setTela(null)}>
          <p className="text-sm text-foreground">Nível {s.nivel} · XP {s.xp}/{s.nivel * 100}</p>
          <p className="text-sm text-muted-foreground">Roupa: {SHOP.find((x) => x.id === s.roupa)?.nome} · Mochila: {SHOP.find((x) => x.id === s.mochila)?.nome ?? "nenhuma"}</p>
          <p className="mt-2 text-sm text-foreground">Câmera</p>
          <div className="mt-1 flex gap-2">
            {(["3p", "1p"] as const).map((c) => <button key={c} onClick={() => { S.cam = c; save(); emit(); }} className={`rounded px-3 py-2 text-sm ${s.cam === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{c === "3p" ? "Terceira pessoa" : "Primeira pessoa"}</button>)}
          </div>
        </Panel>
      )}

      {tela === "config" && (
        <Panel title="Configurações" onClose={() => setTela(null)}>
          <p className="text-sm text-foreground">Gráficos</p>
          <div className="mt-1 flex gap-2">
            {(["baixa", "media", "alta"] as const).map((q) => <button key={q} onClick={() => { S.qualidade = q; save(); emit(); }} className={`rounded px-3 py-2 text-sm capitalize ${s.qualidade === q ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{q === "media" ? "Média" : q}</button>)}
          </div>
          <p className="mt-3 text-sm text-foreground">Sensibilidade da câmera: {s.sens.toFixed(1)}</p>
          <input type="range" min={0.3} max={2.5} step={0.1} value={s.sens} onChange={(e) => { S.sens = +e.target.value; save(); emit(); }} className="w-full accent-primary" />
          <button onClick={() => { if (confirm("Apagar todo o progresso?")) { localStorage.removeItem("sobrevivencia-z-save-v1"); location.reload(); } }} className="mt-3 rounded bg-destructive px-3 py-2 text-sm text-destructive-foreground">Apagar progresso</button>
        </Panel>
      )}
    </div>
  );
}
