# Parity with cubefarm

Every part of cubefarm's UI is mapped here to where factory has it (issue #25): each panel, tab, button, field, setting,
shortcut, notification and empty or error state in cubefarm's `client/` (the 2D panels, every settings section and
`pocket/`), plus every REST route its client calls. Both offices were run in demo mode. The inventory comes from
cubefarm's source, and each row was matched against factory's source and its running demo. Every "fixed" row was tried
in factory's demo with real clicks.

Status:

- ✅ same: factory has it, sometimes in a different place (the "Factory" column says where)
- ✅ fixed: missing before, added in this PR
- ❌ missing: not in factory yet; the bigger ones have a short spec under [Missing: needs its own issue](#missing-needs-its-own-issue)
- — dropped: on purpose. These are 3D-only things (walking, camera, the building, sounds) and office life (presence,
  ping-pong, coins/decor/achievements, weather/world events, the dog, holiday themes). #24 removed the office-life
  features from the server; agents' careers stay.

Where a cubefarm panel has its own empty or error state, factory's matching page has one too. Those are listed only
where they differ.

## Board (cubefarm `KanbanView`, `CardView`, the console's Issues tab)

| cubefarm | factory | status |
| --- | --- | --- |
| Board panel per floor, title `owner/repo` | `/projects/:owner/:name`, the Board tab | ✅ same |
| "GitHub ↗" link to the repo | Board header: external-link button "owner/name on GitHub" | ✅ fixed |
| "+ New issue" form: title, description, "Who works on it" (backlog or a free agent now), File issue | Board → New issue dialog (title, description with Preview, Assign to) | ✅ same |
| Console Issues tab: floor select + the same form | Each board's New issue; the project switcher picks the floor | ✅ same |
| Auto-assign / auto-merge checkboxes on the board | Project → Settings → Automation switches | ✅ same |
| "🖥️ View app" | Project nav → App | ✅ same |
| "Synced HH:MM" / "Syncing…", "⟳ Sync" | Board toolbar: "Synced …", Sync now | ✅ same |
| Repo sync error banner | Board "Sync failed" notice | ✅ same |
| Columns Backlog / In progress / In QA / Ready to merge / Merged, with counts and empty texts | Backlog, Building, QA, Fixing, To merge / Needs you, Recently merged (tabs on phones) | ✅ same |
| Backlog card "Assign to…" select; "Everyone is busy" | Card → Assign dialog (agent, note, wait for dependencies); "Everyone is busy" | ✅ same |
| Issue list: assignee chip or Assign, "Close" (not planned, confirm) | Card → Assign / Close issue (confirm) | ✅ same |
| In-progress card: agent chip, note, Terminal | Card: agent link (→ terminal), note | ✅ same |
| QA card: "QA report ↗", Send to QA / Retry QA, Send back for a fix (note), Merge anyway (confirm), Close (confirm) | Card sheet: Report comment link, Send to QA / Retry QA (tester pick), Send back (note), Merge anyway, Close PR | ✅ same |
| PR card "Preview": the app viewer on that PR | Card sheet → Preview (`/app?pr=N`) | ✅ fixed |
| Ready card: +/− lines, Merge (squash, confirm, disabled on drafts), Close | Card: line counts; Merge (squash, confirm, disabled on drafts), Close PR | ✅ same |
| Merged card: agent chip | Recently merged column, agent link | ✅ same |
| "QA" tag on the agent testing a card | Agent link "· QA" on the card | ✅ same |
| Card view (whiteboard sticky): column/note tags, "waits for #…", "#… wait(s) for this", labels, who has it, "Closes #n" + description, QA round/summary/checks, CI state, conflicts, draft, failed/running checks, GitHub + QA report links | Card sheet (`?card=issue-N` / `pr-N`): all of these | ✅ same |
| "That card isn't on the board any more." | Card sheet "gone" state with links to the issue | ✅ same |
| Drag a sticky to a desk (assign / test) | Assign dialog, agent page Assign | — dropped (3D) |

## Mission control (cubefarm `MissionConsole`, HUD chips, lobby wall)

| cubefarm | factory | status |
| --- | --- | --- |
| Usage card: state, meter, limit, resets, explanation | Overview → Claude usage card; top-bar usage chip | ✅ same |
| "⏩ Resume full speed" (confirm) | Usage card → Resume full speed | ✅ same |
| Demo: simulate a usage warning / the limit | Usage card demo buttons | ✅ same |
| 🚨 Needs you list with badge; "All clear" | Overview → Needs you card; top-bar bell with count | ✅ same |
| PR alarm: Open the Kanban, Retry QA, Send back for a fix, PR on GitHub | Alarm links to its board card; Retry QA, Send back for a fix | ✅ same |
| Agent alarm: Terminal, Clear desk | Alarm links to the agent; Clear desk | ✅ same |
| "Visit floor N" | — | — dropped (3D travel) |
| 🩺 Office doctor: findings, fixes (Clear desk / Stop / Requeue / Retry QA / Send back / Close issue), Terminal, Ignore, empty state | Overview → Office doctor card, same fixes and Ignore | ✅ same |
| Doctor demo: restart, stuck session, 10 minutes later, issue left open | Doctor card demo buttons | ✅ same |
| HUD "🩺 N to check" chip → the doctor | Top bar: "N to check" chip → Overview's doctor card | ✅ fixed |
| HUD "⚙️ running/limit sessions" pill | Top bar: "N/limit sessions" chip | ✅ fixed |
| HUD office-update chip, usage chip | Banners (update, pacing/paused) and the usage chip | ✅ same |
| HUD GitHub error banner (`ghError`) | Shell banner "GitHub isn't ready: …" on every page | ✅ fixed |
| HUD DEMO / live / reconnecting / restarting / replay pills | Live/Offline chip, reconnecting and restarting banners, REPLAY badge; demo shown in Settings → Environment | ✅ same |
| "The numbers" table, per floor and All floors: Ready … To merge, Needs you (+ triage), Merged today, Lead time, Team | Pipeline tiles (+ CEO triage), projects table (Pipeline, Today, Lead, QA pass, Team, Alarms) | ✅ same |
| The numbers per floor: QA wait, CI, Cost today | Office-wide only (Flow and Team and cost cards) | ❌ missing |
| Opening the console on an alarm's card scrolls to it | `links.overview('needs-you' / 'office-doctor')` scrolls to the card; alarms link to their board card | ✅ same |

## Manager's console: Floors & repos, Team (cubefarm `ManagerConsole`, `ProjectPicker`, `FloorList`)

| cubefarm | factory | status |
| --- | --- | --- |
| Office row: running commit, update status, Update now / Later, no-launcher note, "Update automatically" | Overview → Office update card; Settings → Office update + "Update the office automatically" | ✅ same |
| Floor row: repo link, summary, counts, default branch, clone status | Projects table (summary, checkout, team) and the board header | ✅ same |
| 📁 checkout path, folder-sync state, "⟳ Sync now" | Projects table: Checkout, Folder sync columns; ⋯ → Sync folder | ✅ same |
| Clone / sync errors | Checkout badge "Clone failed"; "Failed: …" sync column | ✅ same |
| Floor colour picker | — | — dropped (3D: colours the floor in the building; factory uses theme tokens) |
| Visit | — | — dropped (3D travel) |
| Auto-assign, Auto-merge, Browser testing toggles | Project → Settings → Automation | ✅ same |
| Disconnect (confirm) | Projects ⋯ → Disconnect; Project settings → Disconnect | ✅ same |
| "Agents here may read" links | Project settings → Linked projects | ✅ same |
| App preview details: status, command, settings, Open the app viewer | Project settings → Preview card; App tab | ✅ same |
| "No floors yet" | Projects "No projects yet" | ✅ same |
| ➕ Add a project: Folder / GitHub repo / Something new | Projects → Add a project dialog with the same three tabs | ✅ same |
| Picker: brief textarea, "Start work automatically" | Same fields in the dialog | ✅ same |
| Folder mode: directory + Look here, "Use {root} instead", filter, status chips, Add floor, Publish to GitHub (confirm) | Folder tab: same | ✅ same |
| GitHub mode: filter, org + List, Add floor, type owner/name | GitHub tab: same | ✅ same |
| New mode: name, description, Private/Public, Create project, path preview | New tab: same | ✅ same |
| Team tab: per-floor "N of max agents" | Agents page: "n / max agents" per project | ✅ same |
| "+ Agent" row: name, coding agent, model, effort; disabled at the max | Add agent dialog (also Works on); disabled at the max with a tooltip | ✅ same |
| Agent row: name input (rename) | Agent → Settings → Name | ✅ fixed |
| Agent row: coding agent, model, effort inputs | Agent → Settings | ✅ same |
| Agent row: status, task, ☁ cloud badge, Sign in, Terminal, Let go (confirm) | Agents table (status, task, machine); agent page Sign in, Terminal, Let go | ✅ same |
| 🎨 look toggle: Drawn as, LookEditor | — | — dropped (3D look) |
| TeamStats careers table | Each agent's Record tab | — dropped (office life: careers); the stats stay per agent |
| FloorList (accessible list view): floor select, Kanban, App, people table, Terminal / Sign in | Agents page filtered by project; project nav | ✅ same |
| FloorList / Elevator "Go there" | — | — dropped (3D travel) |

## CEO (cubefarm console CEO tab, `Phone`, `Interview`)

| cubefarm | factory | status |
| --- | --- | --- |
| CEO tab header: name input, status, model, effort | `/agents/ceo` → Settings (Name, Model, Effort); CEO page status | ✅ fixed (rename), ✅ same (model, effort) |
| Now / Up next / next review | CEO page → Work queue card; Overview → CEO card | ✅ same |
| "What they're told" | `/agents/ceo` → Prompt | ✅ same |
| CEO live terminal / log | `/agents/ceo` → Terminal | ✅ same |
| Message input, mic, Send | CEO page chat and the top-bar CEO sheet: composer, mic, hands-free, Send | ✅ same |
| ■ Stop while working | `/agents/ceo` → Stop | ✅ same |
| 🔎 Review the company now | CEO status → Review now; Overview CEO card → Review now | ✅ same |
| 📱 Open the phone | Top-bar CEO chat button (sheet) | ✅ same |
| Team changes list with badge; "Recent decisions" | CEO page → Team changes; sheet → Approvals ("Recent decisions") | ✅ same |
| Project briefs: Re-study, brief + Save brief, Ask the CEO to plan it, QA brief | Project settings → Brief card (Onboard, Save brief, Ask the CEO to plan) and Profile card (summary, QA brief) | ✅ same |
| Phone tabs: Chat (unread), Team (pending), Company | CEO sheet tabs Chat / Approvals / Status; Overview for Company | ✅ same |
| Phone 🎮 Games | — | — dropped (office life) |
| Phone status bar clock, HolidayStrip | — | — dropped (3D / holiday themes) |
| Chat: read marks, presence line, hands-free toggle, "Say hi", bubbles (Markdown, office notes, time, ▶ replay), inline request card, typing indicator | Same in the chat panel; plus day groups, a "New" divider and a jump-to-latest button | ✅ same |
| Chat quick chips: "What's everyone working on?", "Should a team grow?", "Plan the next milestone…" | Chips above the composer while it's empty | ✅ fixed |
| Team tab demo: Grow a floor / Shrink a floor | Approvals → Propose a hire / Propose a let-go | ✅ same |
| Resume card: avatar, reason, setup line + Change (name, coding agent, model, effort, Works on), Decline/Keep with a reason, Hire / Let go, outcome and "Your note" | Request card: same | ✅ same |
| Interview overlay (lobby candidate, let-go envelope) | Request card | ✅ same |
| Phone footer hints, LobbyNudge "Meet them" | — | — dropped (3D) |
| Company tab tiles: projects, open issues, PRs, staff, working | Overview tiles and tables | ✅ same |
| Company tab "Today's report" sentences | Overview → Today's report card | ✅ fixed |
| Company tab shortcuts nav (Console, Kanban, Floor list, Help, Accessibility) | Sidebar, ⌘K | ✅ same |
| Company tab projects list with Go | Sidebar Projects; Overview projects table | ✅ same |

## Terminals and agents (cubefarm `TerminalView`, `LiveTerminal`, `MessageBox`, `WorkersPanel`, `AgentCard`, `AgentSettings`)

| cubefarm | factory | status |
| --- | --- | --- |
| Terminal panel header: name, coding agent, status, needs sign-in, current tool | Agent page header and facts | ✅ same |
| 🎥 Follow | — | — dropped (3D camera) |
| 🏅 Career | Record tab | ✅ same |
| ⚙️ Setup | Settings tab | ✅ same |
| Meta row: issue / PR links, QA status and round, QA report, model · effort, elapsed, turns, cost | Facts: Task (issue/PR links), Activity, Cost · turns; setup line | ✅ same |
| Meta row: branch name | — | ❌ missing |
| Last-error banner | Agent page last-error box | ✅ same |
| Sign-in note, ↻ Start over | Sign-in banner: Sign in / Start over | ✅ same |
| Live terminal: keystrokes to the agent, links, Esc to the CLI, reconnect, footer states | LiveTerminal: same, plus Esc confirm and Shift+Esc to leave | ✅ same |
| SDK log view, "(no output yet)" | LogView, "No output yet." | ✅ same |
| Browser pane: URL, latest screenshot | Screen tab | ✅ same |
| Message box: Enter / Shift+Enter, mic, Send, state placeholders | Agent message box: same | ✅ same |
| ■ Stop; pick an issue or PR → Start issue / Test PR; ↺ Clear desk; Let go | Agent actions: Stop, Assign (issue or PR), Reset, Let go | ✅ same |
| "That agent has left the building." | "Agent not found" | ✅ same |
| Who's working list (L): groups, latest line, how long, click → terminal, streams latest lines | Agents page (table/cards/terminal grid, Latest column), `useWorkersWatch` | ✅ same |
| L key toggles the list | L opens Agents | ✅ fixed |
| VisitorsList | — | — dropped (presence) |
| AgentCard (aim at an agent): task, activity, last steps, cost | Agents table and the terminal grid | — dropped (3D aim); the facts are on the Agents page |
| Settings: Name | Settings tab → Name | ✅ fixed |
| Settings: Drawn as, LookEditor | — | — dropped (3D look) |
| Settings: Coding agent, Works on (confirm move, disabled reasons), Model, Effort, "applies from their next task" | Settings tab: same | ✅ same |
| "What they're told" | Prompt tab | ✅ same |

## App viewer (cubefarm `AppViewer`, the big screen)

| cubefarm | factory | status |
| --- | --- | --- |
| Title, status, ref · commit | App viewer meta line | ✅ same |
| Channel bar: default branch + each open PR with a status light; empty text | Channel bar: same, with QA badges | ✅ same |
| Heartbeat (which PR is on screen) | `watchPreview` heartbeat | ✅ same |
| Restart / Stop / Start | Toolbar: same, plus "Run a PR's code" on main | ✅ same |
| ⇆ Compare with main; Path + Open on both; Sync scrolling; side labels | Compare toggle and compare view: same | ✅ same |
| Reload, Desktop / Phone width, 📋 QA toggle, Open in new tab | Toolbar: same | ✅ same |
| Stage states: running (12 s hint), starting checklist + log, error + Try again + Run settings, unconfigured + settings, stopped + Start | Preview stage: same; unconfigured links to Project settings → Preview | ✅ same |
| Preview settings: run command, environment, validation, size warning, Save, Undo | Project settings → Preview card: same | ✅ same |
| QA panel: PR, +/−, checks, draft, failed checks, QA status, summary, checks, screenshots, Full report; empty states | QA panel: same, plus Board card | ✅ same |

## Time-lapse (cubefarm `TimeLapse`, `replay.ts`)

| cubefarm | factory | status |
| --- | --- | --- |
| Day list, loading / "Nothing recorded yet" | Time-lapse page: same | ✅ same |
| "Since I was last here" + ▶ Catch up | Same card and button | ✅ same |
| Day row: span, size, counts, mini timeline, ▶ Replay | Same | ✅ same |
| Speeds 30× / 120× / 600× | Speed radio | ✅ same |
| "While it plays" explainer | Same card | ✅ same |
| Demo: make a sample day | Write a sample day | ✅ same |
| Replay bar: frame, badge, play/pause, scrubber (←/→), speeds, Live (Esc), notes | Replay bar: same (also ↑/↓, PageUp/PageDown) | ✅ same |
| Everything blocked during a replay, with a toast | Replay guard: same | ✅ same |
| The 3D office replayed | The dashboard replayed | ✅ same |

## Setup and start (cubefarm `SetupWizard`, `StartScreen`, `Tutorial`)

| cubefarm | factory | status |
| --- | --- | --- |
| Five steps with dots | `/setup`, five steps | ✅ same |
| Step 0: intro, GitHub error, DEMO, Let's set up, Skip | Same | ✅ same |
| Step 1: your name, company name | Same | ✅ same |
| 🎲 company name suggestion | Dice button | ✅ fixed |
| Step 2: CEO name | Same | ✅ same |
| 🎲 CEO name suggestion | Dice button | ✅ fixed |
| Step 2: CEO portrait, She/He, tie colour | — | — dropped (3D look) |
| Team-changes radios | Step 3 | ✅ same |
| First project step (ProjectPicker) | Finish → "Add your first project" opens the Add a project dialog | ✅ same |
| Ready: summary, Enter the office | Summary, Go to the overview / Add your first project | ✅ same |
| Start screen: company, welcome, summary, Enter the office, DEMO, version | Overview; version in Settings → Environment | ✅ same |
| Start screen: Pocket mode link | — | — dropped (factory is responsive; no separate mode) |
| Tutorial (9 steps about walking the office), Replay the tour | — | — dropped (3D tour) |

## Pocket mode (cubefarm `pocket/`)

| cubefarm | factory | status |
| --- | --- | --- |
| Mode pick (`?pocket=`, saved choice, small screens) | One responsive dashboard; the sidebar is a sheet below `md` | — dropped (no second mode) |
| Header: company, connection dot, paused / pacing chip, ⚙️ | Top bar and banners | ✅ same |
| Bottom tabs Company / CEO / Kanban / Team / Approvals with badges | Sidebar (CEO badge), CEO sheet, boards, Agents, Approvals tab | ✅ same |
| `?tab=` and tapped notifications open a tab | `links.ts` URLs; notification clicks navigate | ✅ same |
| Company tab: banners, "N decisions waiting", CEO card, per-floor pipeline with Board / Team | Overview | ✅ same |
| Kanban tab: floor chips + board | Sidebar projects / switcher + board | ✅ same |
| Team tab: CEO card with Stop; agent cards with Sign in, Stop, pick + Start / Test, Clear desk, Message, Terminal | Agents page + agent page | ✅ same |
| Approvals: team changes; PRs that need you (Retry QA, Send back, Merge anyway, Close); Ready to merge (Merge, Close) | CEO approvals; Needs you card; board QA / To merge columns | ✅ same |
| ⚙️ panel: notifications, accessibility | Settings page | ✅ same (accessibility: see below) |
| "Open the 3D office" | — | — dropped (3D) |
| Last two toasts | Toaster | ✅ same |

## Settings (cubefarm console ⚙️ Settings, ♿ Accessibility, Help, each settings section)

| cubefarm | factory | status |
| --- | --- | --- |
| Agents: default coding agent, default model, default effort, session limit, sessions while pacing, most agents per floor | Settings → Agents; Team and CEO; Usage and housekeeping | ✅ same |
| The CEO: team changes radio, company review every N minutes | Settings → Team and CEO | ✅ same |
| How agents run: Real terminals / Agent SDK | Settings → Agents → Runtime | ✅ same |
| Company: your name, company name, projects folder, free idle desks after | Settings → Company; Usage and housekeeping | ✅ same |
| Company: the office dog's name | — | — dropped (the dog) |
| Replay the tour | — | — dropped (3D tour) |
| Environment: version, commit, GitHub user, demo, agents' machines | Settings → Environment (plus installed coding agents) and Office update (commit) | ✅ same |
| Profile (visitor name, colour, appear to others) | — | — dropped (presence) |
| Cloud: Upstash key (save, replace, remove), Boxes counts, Test, Delete orphans, where new agents work, Box size, Box limit, GitHub / Anthropic / OpenAI tokens, subscription-token help, demo Expire sign-ins | Settings → Cloud agents: same | ✅ same |
| Voice: provider, ElevenLabs key, voice search / list / preview, browser voice, speak office alerts, Test, keep clips N days, clear clips | Settings → Read aloud: same, plus model and volume | ✅ same |
| Talk instead of type: provider, send automatically, hands-free | Settings → Talk instead of type: same | ✅ same |
| Notifications: events, office address for links, desktop (allow, test), push (this device, stop, test), ntfy (topic, token, test, replace, remove) | Settings → Notifications: same, plus Install app | ✅ same |
| Outside: weather, city, world events | — | — dropped (weather / world events) |
| Themes: holiday themes, birthday | Settings → Appearance (light / dark / system) | — dropped (holiday themes) |
| Accessibility: captions, colour-blind status palettes, shapes beside status colours, UI scale, dyslexia font, high contrast, reset | — | ❌ missing |
| Accessibility: Motion (FOV, head bob, sway, reduce motion, centre dot) | — | — dropped (3D camera) |
| Accessibility: keyboard and screen readers note, list view | Keyboard shortcuts dialog; every page is a list | ✅ same |
| Help: The office (long help with embedded settings) | Keyboard shortcuts dialog; docs | — dropped (the help is about the 3D office) |
| Help: Sound controls, chatter, day cycle, graphics, performance report, instant replay | — | — dropped (sounds, office life, 3D) |
| Controls: rebind every action (2 slots), mouse, gamepad, reset | — | — dropped (3D) for moving, mouse and gamepad |
| Controls: rebinding the 2D keys (P, L, M, H, V) | Fixed keys | ❌ missing |

## Keyboard shortcuts (cubefarm `keymap.ts`, `Player.tsx`)

| cubefarm | factory | status |
| --- | --- | --- |
| P: phone | P: open the CEO chat | ✅ fixed |
| L: who's working | L: Agents | ✅ fixed |
| M: mute | M: stop reading aloud (factory has no other sound) | ✅ fixed |
| H: help | H or ?: the keyboard shortcuts dialog (also in ⌘K) | ✅ fixed |
| V: hold to talk | V: hold to talk | ✅ same |
| Esc: close a panel, leave a replay; in a terminal it goes to the CLI | Esc: close dialogs / sheets, back to live, terminal interrupt (Shift+Esc leaves) | ✅ same |
| Enter / Shift+Enter in message boxes; Enter in confirms | Same | ✅ same |
| Replay scrubber ←/→ | Same, plus ↑/↓ and PageUp/PageDown | ✅ same |
| — | ⌘K / Ctrl+K: jump to a page, project or agent | (factory only) |
| W/A/S/D, arrows, Shift run | — | — dropped (3D walking) |
| E use, F throw, G drop, R reload, −/= jukebox | — | — dropped (3D hands / office life) |
| Tab overview, Q/E turn | — | — dropped (3D camera) |
| T emote, X ping | — | — dropped (presence) |
| K photo mode, I instant replay | — | — dropped (3D) |
| Elevator G/0, R, 1–9 | Sidebar projects, ⌘K | — dropped (3D travel) |
| Phone games keys, Space off a perch | — | — dropped (office life) |
| Gamepad | — | — dropped (3D) |

## Notifications and toasts

| cubefarm | factory | status |
| --- | --- | --- |
| Toast stack (errors 9 s, announced; others 5 s; click to dismiss) | Sonner toaster with close button; errors 9 s | ✅ same |
| Failed API call → error toast (quiet calls show inline errors) | Same | ✅ same |
| Replay: "live actions are off" | Replay hint toast | ✅ same |
| CEO message toast while the chat is closed (+ chirp) | Toast with "Open chat" | ✅ same (the chirp: — dropped, sounds) |
| Server `toast` events | Same | ✅ same |
| Doctor demo result | Same | ✅ same |
| Voice and mic toasts | Same | ✅ same |
| Desktop notifications, Web Push, ntfy | Same, from Settings → Notifications | ✅ same |
| Confirm dialog (tones, Enter/Esc) | `confirmDialog()` | ✅ same |
| 3D toasts (joined floor N, sticky handovers, mute, gamepad, follow-cam, coffee, decor…) | — | — dropped (3D / office life) |

## REST routes the cubefarm client calls

Every route factory's client calls goes through `client/src/api.ts`, the same file as cubefarm's.

| route | cubefarm caller | factory caller | status |
| --- | --- | --- | --- |
| `GET /api/github/repos` | ProjectPicker GitHub | Add a project → GitHub | ✅ same |
| `POST /api/repos` | ProjectPicker Add floor | Add a project → GitHub | ✅ same |
| `POST /api/repos/new` | ProjectPicker New | Add a project → New | ✅ same |
| `GET /api/folders` | ProjectPicker Folder | Add a project → Folder | ✅ same |
| `POST /api/folders/connect` | ProjectPicker Folder | Add a project → Folder | ✅ same |
| `POST /api/folders/publish` | ProjectPicker Publish | Add a project → Folder | ✅ same |
| `POST /api/setup` | SetupWizard | `/setup` | ✅ same |
| `PATCH /api/repos/:id` | FloorRow, FloorBrief, Kanban, PreviewSettings | Project settings, preview card | ✅ same (the `color` field: — dropped) |
| `POST/DELETE /api/repos/:id/preview` | AppViewer | App viewer, preview card | ✅ same |
| `POST/DELETE /api/repos/:id/pr-previews/:n` | AppViewer, theatre | App viewer | ✅ same |
| `POST /api/previews/watch` | theatre heartbeat | `lib/theatre.ts` | ✅ same |
| `POST /api/repos/:id/preview/sync` | CompareView | Compare view | ✅ same |
| `DELETE /api/repos/:id` | FloorRow Disconnect | Projects, project settings | ✅ same |
| `POST /api/repos/:id/sync` | Kanban Sync | Board, projects | ✅ same |
| `POST /api/repos/:id/sync-folder` | FloorRow Sync now | Projects ⋯ Sync folder | ✅ same |
| `POST /api/repos/:id/issues` | IssueForm | New issue dialog | ✅ same |
| `POST /api/repos/:id/issues/:n/close` | Issues tab | Card actions | ✅ same |
| `POST /api/repos/:id/plan` | FloorBrief | Brief card | ✅ same |
| `POST /api/repos/:id/onboard` | FloorBrief Re-study | Brief card Onboard | ✅ same |
| `POST /api/repos/:id/pulls/:n/merge` | Kanban, pocket | Card actions | ✅ same |
| `POST /api/repos/:id/pulls/:n/close` | Kanban, pocket | Card actions | ✅ same |
| `POST /api/repos/:id/pulls/:n/qa` | Kanban, alarms, TerminalView, pocket | Card actions, agent actions, Needs you | ✅ same |
| `POST /api/repos/:id/pulls/:n/fix` | Kanban, alarms, pocket | Card actions, Needs you | ✅ same |
| `GET /api/repos/:id/pulls/:n/qa-shots/:i` | QA screenshots | Card sheet, QA panel | ✅ same |
| `POST /api/repos/:id/agents` | Team + Agent, empty desk | Add agent dialog | ✅ same |
| `PATCH /api/agents/:id` | AgentSettings (name, setup, look) | Agent Settings tab (name, setup) | ✅ same (name: ✅ fixed; look/style: — dropped) |
| `DELETE /api/agents/:id` | Let go | Agent actions | ✅ same |
| `POST /api/agents/:id/assign` | Kanban, Issues, TerminalView, pocket, stickies | Card Assign, agent Assign | ✅ same |
| `POST /api/agents/:id/stop` | TerminalView, CEO tab, pocket | Agent actions | ✅ same |
| `POST /api/agents/:id/reset` | TerminalView, alarms, pocket | Agent actions, Needs you | ✅ same |
| `POST /api/agents/:id/message` | TerminalView, pocket | Agent message box | ✅ same |
| `POST /api/agents/:id/sign-in` | TerminalView | Sign-in banner | ✅ same |
| `GET /api/agents/:id/prompt` | What they're told | Prompt tab | ✅ same |
| `GET /api/agents/:id/screen` | Browser pane | Screen tab | ✅ same |
| `PATCH /api/settings` | Settings, cloud, notify, voice, mic, picker, wizard, tutorial | Settings, cloud, notify, voice, mic, add project, setup, sidebar, theme | ✅ same |
| `POST /api/office/update` | Office row | Office update cards | ✅ same |
| `POST /api/usage/resume`, `/api/usage/simulate` | Mission usage | Usage card | ✅ same |
| `POST /api/doctor/fix`, `/ignore`, `/demo` | Mission doctor | Doctor card | ✅ same |
| `POST /api/ceo/message` | CEO tab, phone, quick chips | Chat panel, quick chips | ✅ same |
| `POST /api/ceo/review` | CEO tab | CEO status, CEO card | ✅ same |
| `POST /api/phone/read` | Chat | Chat panel | ✅ same |
| `POST /api/requests/:id/approve`, `/reject` | Resume, Interview | Request card | ✅ same |
| `POST /api/demo/proposals` | Phone Team demo | Approvals demo | ✅ same |
| `PUT /api/voice/key`, `GET /api/voice/voices`, `GET /api/voice/sample`, `DELETE /api/voice/cache` | VoiceSettings | Voice settings | ✅ same |
| `POST /api/voice/transcribe` | mic | mic | ✅ same |
| `GET /api/voice/standup` | standup ritual | — | — dropped (office life) |
| `GET /api/journal/days`, `/events`, `POST /api/journal/sample` | Time-lapse, replay | Time-lapse, replay | ✅ same |
| `PUT /api/notify/webhooks/:channel`, `POST /api/notify/test` | NotifySettings | Notifications card | ✅ same |
| `GET /api/notify/push/key`, `POST/DELETE /api/notify/push/devices` | pwa.ts | pwa.ts | ✅ same |
| `PUT /api/cloud/key`, `PUT /api/cloud/token`, `POST /api/cloud/test`, `/orphans`, `/demo-expire` | CloudSettings | Cloud agents card | ✅ same |
| `POST /api/repos/:id/pong` | ping-pong | — | — dropped (ping-pong) |
| `POST /api/repos/:id/decor/buy`, `/decor/place`, `/api/progress/coffee`, `/api/progress/demo` | Catalogue, decor, coffee, dev probe | — | — dropped (coins/decor) |
| `/ws` (snapshot, events, watch) | net.ts | net.ts | ✅ same |
| `/ws/term` | LiveTerminal | LiveTerminal | ✅ same |
| `/preview/sw.js` (PR previews off the office's machine) | AppViewer | App viewer | ✅ same |

## Counts

Rows by status, counted from the tables above (a row with two statuses counts under its first; the ⌘K row is factory's
own and isn't counted):

| status | rows |
| --- | --- |
| ✅ same | 190 |
| ✅ fixed in this PR | 17 |
| ❌ missing | 4 |
| — dropped on purpose | 40 |

The 17 fixed rows come from ten changes: the board's GitHub link, the PR card's Preview, the office-doctor chip, the
sessions chip, the GitHub banner, renaming agents (and the CEO), the CEO chat's quick questions, Today's report, the 🎲
name suggestions in setup, and the P / L / M / H-? keys with their shortcuts dialog.

## Missing: needs its own issue

1. **Accessibility settings.** Settings → a new Accessibility card, client only (saved per browser, or in `settings.ui`
   through `shared/ui.ts`): UI scale (80–150 %), dyslexia-friendly font, high-contrast theme, colour-blind status
   palettes (deuteranopia / protanopia / tritanopia) with shapes beside status dots, captions for what's read aloud
   (size and background), and Reset. Touches `index.css` tokens, `lib/status.ts` and `StatusDot`/`StatusBadge`. No
   server routes (unless kept in `settings.ui`: `PATCH /api/settings`, plus a field in `uiSettings`).
2. **Per-project QA wait, CI and cost today.** Overview → projects table: three more sortable columns (hidden on small
   screens), QA wait, CI pass and Cost today, from what each `OpsFloor` in the snapshot already carries (`qaWaitMs`,
   `ciPass` / `ciRuns`, `costToday`). Client only (`pages/overview/overview.ts` sort keys, `projects-table.tsx`); no new
   routes. Left out to keep this PR at about ten fixes.
3. **Rebindable keys.** Settings → a Keyboard card: rebind P, L, M, H and the talk key V (two slots each, Esc cancels,
   clash warning, reset), saved per browser like cubefarm's `controls.ts`. `lib/shortcuts.ts` and `voice/micKeys.ts`
   take the bindings. No server routes.
4. **The agent's branch.** Agent page → Facts: the branch they work on (`AgentView.branch`), copyable. Small, client only;
   left out to keep this PR at about ten fixes.
