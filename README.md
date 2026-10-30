# factory

A web dashboard for a team of AI coding agents that works through your GitHub issues. Every agent is a real coding
agent (**Claude Code, Codex or OpenCode**) in a terminal of its own on your machine; the office hands out the work,
has every pull request reviewed and tested in a real browser, and merges what passes.

factory is [cubefarm](https://github.com/leonvanzyl/cubefarm) (MIT) with a professional React + shadcn/ui dashboard
in place of cubefarm's cartoon 3D office. The orchestrator is cubefarm's, unchanged: projects (cubefarm's floors),
agents, the CEO, the build → QA → fix → merge loop, previews, notifications and cloud agents. What's gone is the 3D
world: walking the floors, toys, games, photo mode and office life.

Based on cubefarm v0.3.20, upstream commit
[`157efde6532a4595fde4bd0723088d26d2e0d58a`](https://github.com/leonvanzyl/cubefarm/commit/157efde6532a4595fde4bd0723088d26d2e0d58a).

## Quick start: the demo

Demo mode fakes GitHub and the agents, so it costs nothing and changes nothing. With Node.js 22 or newer:

```bash
npm ci
npm run build
SWARM_HOME="$PWD/.swarm-home" SWARM_PORT=4600 node --import tsx server/index.ts --demo
```

Open http://localhost:4600. The banner says `DEMO MODE` and prints where the demo keeps its state.

## Running it for real

```bash
npm ci
npm run build
npm start          # the launcher: the office on http://localhost:4517
```

What you need: **git**, **the GitHub CLI** signed in (`gh auth login`), **Claude Code** signed in (it comes with the
package: `node bin/factory.js login`), and **Google Chrome** for agents that test in a browser. `node bin/factory.js
doctor` checks all of it.

Everything factory saves lives in **`~/.factory`** (state, secrets, the journal, workspaces, agents' machines, the
terminal keeper's socket, the voice cache, push keys and `last-update.json`); set `SWARM_HOME` to use another folder.

| Setting | Default | What it is |
| --- | --- | --- |
| `SWARM_HOME` | `~/.factory` | where the office keeps everything |
| `SWARM_PORT` | `4517` | the office (REST, websockets, the built dashboard) |
| `SWARM_CLIENT_PORT` | `5517` | Vite's dev server (`npm run dev`) |
| `SWARM_PREVIEW_PORT` | `6700` | project previews run on this + the project's floor, PR previews 100 above |

These are chosen to stay clear of a cubefarm office on the same machine (`~/.cubefarm`, 4317/5317, 6300+).

## The dashboard

- **Overview**: every project's pipeline and what needs you.
- **Projects**: each project's Kanban board (`/projects/<owner>/<name>`) and settings.
- **Agents**: the team, each agent's live terminal.
- **CEO**: the manager's console with the CEO, also a sheet from the top bar.
- **Settings**: the office's settings, the theme included (saved in the office, so every browser gets it).
- **⌘K** jumps to any page, project or agent.

## Credits

factory is built on [cubefarm](https://github.com/leonvanzyl/cubefarm) by Leon van Zyl, MIT licensed. Its server,
shared code, command and launcher are cubefarm's; see [LICENSE](LICENSE).
