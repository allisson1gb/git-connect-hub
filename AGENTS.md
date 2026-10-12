<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Game lives in src/game (pure state/world/runtime logic) and src/components/game (R3F scene + DOM HUD); per-frame data stays in mutable runtime objects, React only re-renders from the throttled store — keeps 60fps on phones.
- Progress is saved locally until online play is added; move saves to Lovable Cloud with server validation when multiplayer lands — needed to prevent item/coin duplication.
