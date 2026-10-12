import type { ReactNode } from "react";

export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-background/60 p-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex max-h-full w-full max-w-xl flex-col rounded-lg border border-border bg-popover p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wide text-popover-foreground">{title}</h2>
          <button onClick={onClose} className="rounded bg-secondary px-3 py-1 text-sm text-secondary-foreground">Fechar</button>
        </div>
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  );
}
