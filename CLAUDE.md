# factory

cubefarm's orchestrator (a Node server that runs one coding-agent session, Claude Code, Codex or OpenCode, per agent,
plus the CEO, working through GitHub issues) with a professional web dashboard (React + shadcn/ui + Tailwind) in place
of cubefarm's cartoon 3D office. Projects are cubefarm's floors. README.md is the quick start.

## SAFETY (read first)

- **Two live offices may run on this machine.** The cubefarm office uses `~/.cubefarm`, ports 4317 (server) and 5317
  (Vite) and previews from 6300. factory's defaults, `~/.factory`, 4517 / 5517 and previews from 6700, belong to the
  manager's real factory office. Never read or write `~/.cubefarm` or `~/.factory` directly, and never use any of those
  ports.
- Test only in demo mode (fake GitHub, fake agents, no Claude usage), with a temp `SWARM_HOME` and your reserved
  `SWARM_PORT` (from your job instructions):

  ```bash
  npm ci
  npm run build
  SWARM_HOME="$PWD/.swarm-home" SWARM_PORT=<your port> SWARM_PREVIEW_PORT=<your port + 1000> node --import tsx server/index.ts --demo
  ```
  Then open `http://localhost:<your port>` (the server serves the built `dist/`). The startup banner must say
  `DEMO MODE` and print a `state:` path inside your `SWARM_HOME`. Stop it when done; don't commit `.swarm-home`.
- Never real mode (no `--demo`), and never `npm run dev` / `npm run demo` / `npm start` / `node bin/factory.js`: they
  default to the real office's ports and home. `dev`/`demo`/`start` run `scripts/office.mjs`, the launcher, which also
  updates its own folder (git fetch + merge, npm install, build) when the office asks for it.
- Agents are ordinary coding-agent CLI sessions on the manager's own setup, unsandboxed, by the manager's choice. The
  office's workflow rules (no pushes to the default branch, no merging, QA leaves GitHub alone) live in their prompts,
  not in enforcement: don't add hooks, permission rules or sandboxes that refuse tool calls. `ANTHROPIC_*` /
  `CLAUDE_*` are stripped from agent and preview env.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` over client, server, shared, the `.ts` in scripts and the configs |
| `npm test` | Vitest, once (`npm run test:watch` to re-run on edits) |
| `npm run build` | typecheck, `vite build` to `dist/`, then the server bundled into `dist-server/` (`scripts/build-server.mjs`) |
| `node scripts/smoke-package.mjs` | after a build: packs the package, installs it into a temp folder and boots its demo |
| `node --import tsx server/index.ts --demo` | a demo office (see SAFETY for the env it needs) |

CI (`.github/workflows/ci.yml`): Node 24, `npm ci` → `typecheck` → `test` → `build` → package smoke test, for every PR
and push to `main`, with a throwaway `SWARM_HOME` and `SWARM_PORT=0`, on `ubuntu-latest` and `macos-latest`. Locally,
`typecheck`, `test` and `build` must pass before you open a PR. If your change shows in the dashboard, boot your own
demo office, check it in a real browser with the Playwright tools (desktop and 390×844, light and dark), and put
screenshots in the PR.

## Code map

Server (`server/`) and shared (`shared/`) started as cubefarm's. The 3D office's life (visitors and presence, ping-pong,
coins, decorations and achievements, weather and world events, the dog, holiday themes) was removed (#24), so they now
diverge from upstream: port cubefarm changes by hand. Agents' careers stay (`server/ledger.ts`, `shared/careers.ts`).
An older state file's removed fields are dropped on load (`legacySettings` in `shared/journal.ts`, `loadLedger`).
- `server/index.ts`: entry; the real or demo backend, REST under `/api`, the `/ws` and `/ws/term` websockets, serves `dist/`.
- `server/config.ts`: `SWARM_PORT` (4517), `SWARM_HOST`, `SWARM_HOME` (`~/.factory`), `SWARM_PREVIEW_PORT` (6700), `--demo`.
- `server/swarm.ts`: the orchestrator (projects, agents, scheduling, build → QA → fix → merge, the CEO's jobs,
  messages, settings, persistence in `state.json` / `demo-state.json`, websocket fan-out through `outbox.ts`).
- `server/demo.ts`: the fake backend for `--demo`. Every new `Backend` method or capability gets a fake here.
- The rest (runners, terminals, previews, notifications, cloud agents, the journal) is mapped in cubefarm's CLAUDE.md;
  each file starts with a comment on its role.
- `shared/types.ts`: the REST/websocket contract (`WorldSnapshot`, `ServerEvent`, `SwarmSettings`, views).
- `shared/ui.ts`: the dashboard's own settings (`settings.ui`: theme, sidebar), validated by `uiSettings`.
- `shared/watch.ts`: which terminal lines a tab gets.

`bin/factory.js`: the command (checks the machine, starts `dist-server/index.js`, `login`, `doctor`).
`scripts/office.mjs`: the launcher (`npm run dev` / `demo` / `start`), its pure decisions in `scripts/officeSteps.mjs`.

Client (`client/`, the Vite root; React 19, React Router, Tailwind v4, shadcn/ui, zustand):
- `src/store.ts`: the snapshot plus `apply(ServerEvent)`; selectors (`kanbanFor`, `agentsOnRepo`, `floorPrCounts`,
  `needsYouCount`, `projectHealth`, `pendingRequests`, `unreadMessages`…). Server `toast` events go to sonner.
- `src/net.ts`: the `/ws` connection with reconnect; it sends the tab's watch (`src/watch.ts`) as it changes.
- `src/watch.ts`: the watch derived from the route's project floor plus what pages ask for: `useWatchAgents(ids)`
  and `useWorkersWatch()` in `src/hooks/use-watch.ts`.
- `src/api.ts`: REST commands; errors become toasts. `ops.ts`, `qaCard.ts`, `officeUpdate.ts`, `notifications.ts`:
  cubefarm's pure helpers.
- `src/voice/`: read aloud and talk instead of type (docs in cubefarm's `docs/voice.md`): `speaker.ts` (lazy), `claim.ts`
  (one tab per message), `audio.ts` (sound after the first gesture), `mic.ts`, and the pure, tested rules
  (`voiceQueue`, `micSilence`, `handsFree`, `micKeys`, `micText`, `voicePicker`). QA probes: `window.__swarmVoice`,
  `window.__swarmMic` (`fake()`, `say()`). Its components are in `src/components/voice/`.
- `src/lib/links.ts`: every URL (pages, boards, board cards `?card=issue-12` / `?card=pr-34`). Never hand-write a path.
- `src/lib/theme.ts`: light/dark/system from `settings.ui.theme`; localStorage is only the first-paint cache.
- `src/components/ui/`: shadcn/ui components (add more with `npx shadcn@latest add <name>`; don't hand-edit them
  beyond imports). `src/components/shared/`: StatusBadge, RelativeTime, Markdown, EmptyState, ConfirmDialog
  (`confirmDialog()`), PageHeader. `src/components/shell/`: the sidebar, top bar, banners, ⌘K menu, CEO sheet.
- `src/pages/<screen>/index.tsx`: one folder per screen (overview, projects, board, project-settings, agents, agent,
  ceo, settings, setup, not-found). A screen's own components live in its folder. The CEO sheet's content is
  `CeoChatPanel` from `pages/ceo/`.

## Conventions

- ESM TypeScript everywhere, strict, `noUnusedLocals`/`Parameters`. The server imports with `.ts` extensions; client
  files import without them, through the `@/` alias (`client/src`).
- Comments are sparse and say why: a short header comment per file, `/** */` on exports when the name isn't enough.
- UI state comes from the server: a `snapshot`, then typed `ServerEvent`s handled in `store.ts`'s `apply`. REST is for
  commands, not polling. New state goes in `shared/types.ts`, the snapshot and an event.
- REST errors: throw `HttpError(4xx, message)`. Validate request bodies by hand at the route or in the swarm.
- Demo parity: anything new on the server works in `--demo` with no GitHub, git or Claude usage.
- UI: shadcn/ui components and theme tokens only (`bg-background`, `text-muted-foreground`, `text-destructive`,
  `bg-success/10`…), no raw colours and no inline styles; visible focus on everything interactive; both themes; at
  390 px wide nothing scrolls sideways (tables hide columns, the sidebar is a sheet below `md`).
- Paths with `path.join`, args as arrays (`execFile`), never shell strings; the office may run on Windows too.

## Tests

- Vitest, `*.test.ts` next to the code under `client/`, `server/`, `shared/` or `scripts/`. Config: `vitest.config.ts`
  points `SWARM_HOME` at a temp folder and `SWARM_PORT` at 0.
- Test pure functions directly; extract logic into pure helpers rather than mocking. No network, no `gh`, no Claude.
- Don't hardcode `/` or `\` in expected paths.

## Pull requests

- One issue per PR, `Closes #<n>` in the body. Keep the diff on-topic; many PRs merge in parallel.
- Before opening it: `typecheck`, `test` and `build`. Say how you verified it and list your assumptions.
- Never push to `main`, never force-push, never merge your own PR.
