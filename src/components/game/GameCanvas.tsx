import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { Scene } from "./Scene";
import { HUD } from "./HUD";
import { Menu } from "./Menu";
import { keys } from "@/game/runtime";
import { load, save, useGame } from "@/game/store";

export function GameCanvas() {
  const s = useGame();
  useEffect(() => {
    load();
    const down = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; keys.add(e.code); if (e.code === "Space") e.preventDefault(); };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    const iv = setInterval(save, 10000);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { clearInterval(iv); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);
  const dpr: [number, number] = s.qualidade === "baixa" ? [0.75, 1] : s.qualidade === "media" ? [1, 1.5] : [1, 2];
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-background touch-none">
      <Canvas key={s.qualidade} shadows={s.qualidade !== "baixa"} dpr={dpr} camera={{ position: [30, 4, 6], fov: 65, near: 0.1, far: 400 }}>
        <Scene />
      </Canvas>
      {s.screen === "jogo" ? <HUD /> : <Menu />}
    </div>
  );
}
