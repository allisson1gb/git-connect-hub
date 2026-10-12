import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "../components/game/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sobrevivência Z — Juntos até o fim" },
      { name: "description", content: "Jogo 3D de sobrevivência zumbi: explore a cidade, colete suprimentos, fabrique armas e sobreviva." },
      { property: "og:title", content: "Sobrevivência Z — Juntos até o fim" },
      { property: "og:description", content: "Jogo 3D de sobrevivência zumbi jogável no celular e no computador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameCanvas,
});
