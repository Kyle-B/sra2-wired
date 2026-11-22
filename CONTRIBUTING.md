# Contributing

## Development

### Prerequisites

- `pnpm`
- A local Foundry install
- Link `<foundry-path>/Data/systems/sra2-wired` to the `dist/` folder of this repository.

### Building

```bash
pnpm install
pnpm run build      # emit dist/
```

### Making changes

Several commands for development are avilable through `pnpm`. All of these
should be used before making a PR, they are expected to be clean for CI.

```bash
pnpm fmt            # Applies the project formatting
pnpm lint           # Runs oxlint and oxfmt --check, should be clean
pnpm check          # Runs svelte-check, should be clean
```

### Testing

```bash
pnpm run dev        # HMR dev server on :30001 (Vite reverse-proxies Foundry)
pnpm run watch      # vite build --watch (rebuild dist/ on save, no HMR)
pnpm run check      # svelte-check + tsc --noEmit
pnpm test           # vitest unit specs
```

**HMR** runs Vite on `:30001` as a reverse proxy _in front of_ a running
Foundry. Foundry must already be running, and the esmodule loads only inside an
**active world** — so there's nothing to hot-swap until you launch one:

1. Start Foundry. First time only: create a new world using `sra2-wired`
2. `pnpm run dev` (leave Foundry running).
3. Open **http://localhost:30001/game** — _not_ `:30000` — and log in.

Now editing a `.svelte` component hot-swaps in place, keeping state. Editing
`src/index.ts` (hooks/bootstrap) triggers a full page reload instead — that's
expected.

Prefer the plain bundle? `pnpm run watch` keeps the old flow: it rebuilds
`dist/` on save; browse `:30000` and reload the browser after a `.js`/`.svelte`
rebuild (Foundry hot-reloads `.hbs`/`.css`/`.json` in place, but not
esmodules).

### UI: Svelte 5 in ApplicationV2

The window is a thin `ApplicationV2` subclass; Svelte renders. `_renderHTML`
calls `mount()` into a detached element, `_replaceHTML` inserts it, `_preClose`
calls `unmount()`.

### Compendium packs (fvtt CLI)

Pack **sources** live in `packs/<name>/*.json`. `pnpm run build` compiles
every one into a LevelDB at `dist/packs/<name>` via `scripts/pack.ts`.

Edit the JSON sources, then rebuild. The `fvtt` CLI (a dev dependency) is
wrapped for manual single-pack work — close Foundry first, as it locks the
LevelDB while it runs (the `build` step skips a locked pack with a warning):

```bash
pnpm run pack   -- <pack-name> --in packs/<pack-name> --out dist/packs
pnpm run unpack -- <pack-name> --in dist/packs --out packs/<pack-name>
```

To add a pack: create `packs/<name>/`, register it under `system.json`
`"packs"` , and `pnpm run build`.

### CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request.
It guards the lockfile (`scripts/check-lockfile.ts`), installs with `pnpm ci`,
type-checks (`pnpm run check`), oxlint & oxfmt (`pnpm run lint`) , and runs the
vitest unit suite (`pnpm test`).
