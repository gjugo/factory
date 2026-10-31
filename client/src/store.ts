import { create } from 'zustand';
import { toast } from 'sonner';
import { CEO_ID, DEFAULT_DOG_NAME, DEFAULT_MAX_AGENTS, type AgentView, type CeoInfo, type CliView, type CloudView, type DoctorFinding, type HireRequestView, type LogLine, type NotifyChannelsView, type OfficeUpdateView, type OpsView, type PhoneMessage, type PongRow, type PrPreviewView, type QaView, type RepoView, type ServerEvent, type SwarmSettings, type TickerItem, type UsageView, type VisitorView, type VoiceCacheView, type WorldSnapshot } from '../../shared/types';
import { blockers } from '../../shared/issues';
import { latestListed } from '../../shared/watch';
import { DEFAULT_WEATHER, DEFAULT_WORLD_EVENTS, EMPTY_WEATHER_VIEW, type WeatherView } from '../../shared/outside';
import { DEFAULT_NOTIFY } from '../../shared/notify';
import { DEFAULT_CLOUD, EMPTY_CLOUD } from '../../shared/cloud';
import { DEFAULT_UI } from '../../shared/ui';
import type { ProgressView } from '../../shared/progress';
import { showDesktopNote } from './notifications';
import { EMPTY_OPS } from './ops';
import { needsManager, qaCardNote, type CardTone } from './qaCard';
import { countWatch } from './watch';
import { markdownToPlainText } from './lib/plain-text';
import { audioUnlocked } from './voice/audio';
import { claimVoice } from './voice/claim';
import { speakable } from './voice/voiceQueue';

// The office as this tab knows it: the server's snapshot, then every ServerEvent folded in by apply(). cubefarm's
// store without the 3D world: no floors to walk, sounds or presence poses, only state the pages read. CEO messages
// are read aloud from here (voice/speaker.ts, loaded on the first one).

export type Agent = Omit<AgentView, 'log'>;

export type ToastLevel = 'info' | 'success' | 'error';

interface State {
  connected: boolean;
  loaded: boolean;
  user: string | null;
  ghReady: boolean;
  ghError?: string;
  demo: boolean;
  machinesRoot: string;
  settings: SwarmSettings;
  clis: CliView[]; // the coding-agent CLIs installed where the office runs
  repos: RepoView[];
  agents: Record<string, Agent>;
  logs: Record<string, LogLine[]>; // only for the agents this tab watches (shared/watch.ts): its project and open panels
  latest: Record<string, LogLine>; // everyone's latest line worth listing, for the workers list
  screens: Record<string, number>; // agentId -> screenshot timestamp (cache buster)
  qa: Record<string, QaView>; // `${repoId}#${prNumber}`
  prPreviews: Record<string, PrPreviewView>; // the PR theatre's previews, `${repoId}#${pr}`
  requests: HireRequestView[];
  ceo: CeoInfo;
  messages: PhoneMessage[];
  phoneReadAt: number;
  version?: string; // the version the server runs
  officeCommit?: string | null; // undefined: the server can't update itself
  officeUpdate?: OfficeUpdateView;
  usage: UsageView; // Claude's subscription usage: normal, pacing after a warning, or paused at the limit
  ops: OpsView; // mission control: every project's numbers and what needs the manager
  doctor: DoctorFinding[]; // the office doctor's findings (server/watchdog.ts)
  voiceKeySet: boolean; // an ElevenLabs key is saved on the server
  voiceKeyHint: string; // its last 4 characters
  voiceCache: VoiceCacheView;
  voiceSpeaking: number | null; // the message being read aloud in this tab (voice/speaker.ts)
  progress: ProgressView;
  weather: WeatherView;
  ticker: TickerItem[]; // the projects' recent activity lines, oldest first
  notifyChannels: NotifyChannelsView; // which chat apps have a webhook saved (hints only) and how many devices get push
  cloud: CloudView; // Settings → Cloud agents: the Upstash account and what cloud agents sign in with (never a key)
  pong: Record<string, PongRow[]>;
  restarting: boolean; // the connection dropped because the office is restarting to update
  visitors: VisitorView[];

  // What this tab watches (watch.ts): the route's project floor, the agents pages have open, workers lists out.
  floor: number;
  watched: Record<string, number>;
  workers: number;
  /** The CEO chat sheet is open. */
  ceoOpen: boolean;
  /** CEO threads on screen (the sheet's or the CEO page's): while any is, CEO messages are being read and don't toast. */
  chatViews: number;

  /** Folds an event into the state. */
  apply(ev: ServerEvent): void;
  setConnected(v: boolean): void;
  setRestarting(v: boolean): void;
  setOfficeUpdate(u: OfficeUpdateView): void;
  setFloor(floor: number): void;
  /** Count agents in (+1) or out (-1) of the watch: useWatchAgents. */
  watchAgents(ids: readonly string[], by: 1 | -1): void;
  /** A workers list opened (+1) or closed (-1): useWorkersWatch. */
  watchWorkers(by: 1 | -1): void;
  setCeoOpen(v: boolean): void;
  /** A CEO thread mounted (+1) or unmounted (-1). */
  watchChat(by: 1 | -1): void;
  pushToast(level: ToastLevel, text: string): void;
}

const LOG_KEEP = 600;
const TICKER_KEEP = 120; // ticker lines kept across every project

export const useStore = create<State>((set, get) => ({
  connected: false,
  loaded: false,
  user: null,
  ghReady: true,
  demo: false,
  machinesRoot: '',
  // Until the server's snapshot arrives; setupDone stays true so the setup page doesn't flash while loading.
  settings: {
    sessionLimit: 0,
    defaultModel: 'claude-opus-5-5',
    defaultEffort: 'medium',
    runtime: 'terminal',
    defaultCli: 'claude',
    scaling: 'approve',
    maxAgents: DEFAULT_MAX_AGENTS,
    ceoHeartbeatMin: 60,
    managerName: '',
    companyName: '',
    dogName: DEFAULT_DOG_NAME,
    projectsDir: '',
    setupDone: true,
    tutorialStep: -1,
    pacingSessions: 3,
    trimIdleDesksMin: 120,
    voice: { provider: 'off', voiceId: '', voiceName: '', model: '', speakOffice: false, keepDays: 7 },
    themes: { mode: 'auto', disabled: [], birthday: null },
    weather: DEFAULT_WEATHER,
    worldEvents: DEFAULT_WORLD_EVENTS,
    listen: { provider: 'off', autoSend: false, handsFree: false },
    notify: DEFAULT_NOTIFY,
    cloud: DEFAULT_CLOUD,
    ui: DEFAULT_UI,
  },
  clis: [],
  repos: [],
  agents: {},
  logs: {},
  latest: {},
  screens: {},
  qa: {},
  prPreviews: {},
  requests: [],
  ceo: { queue: [], job: null, lastReviewAt: null, nextReviewAt: null },
  messages: [],
  phoneReadAt: 0,
  usage: { state: 'normal', until: null, warning: null },
  ops: EMPTY_OPS,
  doctor: [],
  voiceKeySet: false,
  voiceKeyHint: '',
  voiceCache: { clips: 0, bytes: 0, saved: [] },
  voiceSpeaking: null,
  progress: { floors: {}, achievements: [], coffees: 0, merges: 0 },
  weather: EMPTY_WEATHER_VIEW,
  ticker: [],
  notifyChannels: { webhooks: { ntfy: { set: false, hint: '' } }, pushDevices: 0 },
  cloud: EMPTY_CLOUD,
  pong: {},
  restarting: false,
  visitors: [],

  floor: -1,
  watched: {},
  workers: 0,
  ceoOpen: false,
  chatViews: 0,

  apply(ev) {
    // Toasts for news compare the old state with the new; snapshots (page load, reconnect) never toast.
    const live = get().loaded;
    switch (ev.type) {
      case 'snapshot': {
        const d: WorldSnapshot = ev.data;
        const agents: Record<string, Agent> = {};
        const logs: Record<string, LogLine[]> = {};
        const screens: Record<string, number> = {};
        for (const { log, ...a } of d.agents) {
          agents[a.id] = a;
          logs[a.id] = log;
          if (a.screenshotAt) screens[a.id] = a.screenshotAt;
        }
        const qa: Record<string, QaView> = {};
        for (const q of d.qa) qa[qaKey(q.repoId, q.prNumber)] = q;
        const prPreviews: Record<string, PrPreviewView> = {};
        for (const p of d.prPreviews ?? []) prPreviews[qaKey(p.repoId, p.pr)] = p;
        set({
          loaded: true,
          user: d.user,
          ghReady: d.ghReady,
          ghError: d.ghError,
          demo: d.demo,
          machinesRoot: d.machinesRoot,
          settings: d.settings,
          repos: d.repos.sort((a, b) => a.floor - b.floor),
          agents,
          logs,
          latest: {},
          screens,
          qa,
          prPreviews,
          requests: d.requests,
          ceo: d.ceo,
          messages: d.messages,
          phoneReadAt: d.phoneReadAt,
          version: d.version,
          officeCommit: d.officeCommit,
          officeUpdate: d.officeUpdate,
          usage: d.usage,
          ops: d.ops ?? EMPTY_OPS,
          doctor: d.doctor ?? [],
          clis: d.clis ?? [],
          voiceKeySet: d.voiceKeySet ?? false,
          voiceKeyHint: d.voiceKeyHint ?? '',
          voiceCache: d.voiceCache ?? { clips: 0, bytes: 0, saved: [] },
          weather: d.weather ?? EMPTY_WEATHER_VIEW,
          ticker: d.ticker ?? [],
          notifyChannels: d.notifyChannels ?? get().notifyChannels,
          cloud: d.cloud ?? EMPTY_CLOUD,
          progress: d.progress ?? { floors: {}, achievements: [], coffees: 0, merges: 0 },
          pong: d.pong ?? {},
          restarting: false,
        });
        break;
      }
      case 'repo':
      case 'repos': {
        // one project in full, or a batch of projects' changes (server/outbox.ts)
        let repos = get().repos;
        for (const patch of ev.type === 'repo' ? [ev.repo] : ev.repos) {
          const before = repos.find((r) => r.id === patch.id);
          if (!before && patch.fullName === undefined) continue; // a change to a project this tab no longer has
          const next = { ...before, ...patch } as RepoView;
          repos = [...repos.filter((r) => r.id !== next.id), next];
        }
        set({ repos: repos.sort((a, b) => a.floor - b.floor) });
        break;
      }
      case 'repoRemoved':
        set({ repos: get().repos.filter((r) => r.id !== ev.repoId) });
        break;
      case 'agent':
        set({ agents: { ...get().agents, [ev.agent.id]: ev.agent } });
        break;
      case 'agents': {
        // a batch of changes (server/outbox.ts): one update for all of them
        const agents = { ...get().agents };
        for (const patch of ev.agents) {
          const prev = agents[patch.id];
          if (!prev && patch.name === undefined) continue; // a change to someone this tab no longer has
          agents[patch.id] = { ...prev, ...patch } as Agent;
        }
        set({ agents });
        break;
      }
      case 'agentRemoved': {
        const { [ev.agentId]: _gone, ...agents } = get().agents;
        set({ agents });
        break;
      }
      case 'logs': {
        const logs = { ...get().logs };
        const latest = { ...get().latest };
        for (const [id, lines] of Object.entries(ev.tails)) {
          // a catch-up replaces the buffer; live lines it already had (sent again after one) are skipped
          const prev = ev.catchUp ? [] : (logs[id] ?? []);
          const last = prev.length ? prev[prev.length - 1].id : -1;
          const fresh = ev.catchUp ? lines : lines.filter((l) => l.id > last);
          if (!fresh.length && !ev.catchUp) continue;
          const next = prev.concat(fresh);
          logs[id] = next.length > LOG_KEEP ? next.slice(-LOG_KEEP) : next;
          const listed = latestListed(fresh, 80);
          if (listed) latest[id] = listed;
        }
        set({ logs, latest });
        break;
      }
      case 'latest':
        set({ latest: { ...get().latest, ...ev.lines } });
        break;
      case 'screen': {
        const a = get().agents[ev.agentId];
        set({
          screens: { ...get().screens, [ev.agentId]: ev.at },
          agents: a ? { ...get().agents, [ev.agentId]: { ...a, hasScreenshot: true, screenshotAt: ev.at, browserUrl: ev.url ?? a.browserUrl } } : get().agents,
        });
        break;
      }
      case 'qa':
        set({ qa: { ...get().qa, [qaKey(ev.qa.repoId, ev.qa.prNumber)]: ev.qa } });
        break;
      case 'qaRemoved': {
        const { [qaKey(ev.repoId, ev.prNumber)]: _gone, ...qa } = get().qa;
        set({ qa });
        break;
      }
      case 'prPreview':
        set({ prPreviews: { ...get().prPreviews, [qaKey(ev.preview.repoId, ev.preview.pr)]: ev.preview } });
        break;
      case 'prPreviewRemoved': {
        const { [qaKey(ev.repoId, ev.pr)]: _gone, ...prPreviews } = get().prPreviews;
        set({ prPreviews });
        break;
      }
      case 'settings':
        set({ settings: ev.settings });
        break;
      case 'clis':
        set({ clis: ev.clis });
        break;
      case 'request': {
        const requests = get().requests.filter((r) => r.id !== ev.request.id);
        requests.push(ev.request);
        set({ requests: requests.sort((a, b) => a.createdAt - b.createdAt) });
        break;
      }
      case 'ceo':
        set({ ceo: ev.ceo });
        break;
      case 'message': {
        set({ messages: [...get().messages.slice(-199), ev.message] });
        // Read aloud, in this tab or another (claim.ts); a tab nobody has clicked in yet can't make sound.
        if (live && audioUnlocked() && speakable(ev.message, get().settings.voice, Date.now())) {
          const arrived = Date.now();
          const wait = claimVoice(ev.message.id);
          void import('./voice/speaker').then((v) => v.speakMessage(ev.message, arrived, wait));
        }
        if (live && ev.message.from === 'ceo' && !get().ceoOpen && !get().chatViews) {
          const ceo = get().agents[CEO_ID]?.name ?? 'CEO';
          const text = markdownToPlainText(ev.message.text);
          toast(`${ceo}: ${text.length > 110 ? `${text.slice(0, 109)}…` : text}`, {
            id: `ceo-${ev.message.id}`,
            action: { label: 'Open chat', onClick: () => set({ ceoOpen: true }) },
          });
        }
        break;
      }
      case 'phoneRead':
        set({ phoneReadAt: Math.max(get().phoneReadAt, ev.at) });
        break;
      case 'toast':
        get().pushToast(ev.level, ev.text);
        break;
      case 'officeUpdate':
        set({ officeUpdate: ev.officeUpdate });
        break;
      case 'usage':
        set({ usage: ev.usage });
        break;
      case 'ops':
        set({ ops: ev.ops });
        break;
      case 'doctor':
        set({ doctor: ev.doctor });
        break;
      case 'voiceKey':
        set({ voiceKeySet: ev.voiceKeySet, voiceKeyHint: ev.voiceKeyHint });
        break;
      case 'voiceCache':
        set({ voiceCache: ev.voiceCache });
        break;
      case 'weather':
        set({ weather: ev.weather });
        break;
      case 'ticker':
        set({ ticker: [...get().ticker.slice(-(TICKER_KEEP - 1)), ev.item] });
        break;
      case 'notifyChannels':
        set({ notifyChannels: ev.notifyChannels });
        break;
      case 'cloud':
        set({ cloud: ev.cloud });
        break;
      case 'notify':
        // This tab shows it only while it's hidden (notifications.ts); a visible dashboard toasts already.
        showDesktopNote(ev.note, get().settings.notify?.channels.desktop !== false);
        break;
      case 'visitors':
        set({ visitors: ev.visitors });
        break;
      case 'progress':
        set({ progress: ev.progress });
        break;
      case 'pong':
        set({ pong: { ...get().pong, [ev.repoId]: ev.board } });
        break;
      // The 3D office's live presence and rewards: nothing to show here.
      case 'visitorPose':
      case 'visitorEmote':
      case 'visitorPing':
      case 'reward':
        break;
    }
  },

  setConnected: (connected) => set({ connected }),
  setRestarting: (restarting) => set({ restarting }),
  setOfficeUpdate: (officeUpdate) => set({ officeUpdate }),
  setFloor: (floor) => {
    if (floor !== get().floor) set({ floor });
  },
  watchAgents: (ids, by) => set({ watched: countWatch(get().watched, ids, by) }),
  watchWorkers: (by) => set({ workers: Math.max(0, get().workers + by) }),
  setCeoOpen: (ceoOpen) => set({ ceoOpen }),
  watchChat: (by) => set({ chatViews: Math.max(0, get().chatViews + by) }),
  pushToast(level, text) {
    if (level === 'error') toast.error(text, { duration: 9000 });
    else if (level === 'success') toast.success(text);
    else toast(text);
  },
}));

// ---------- derived helpers ----------

export const qaKey = (repoId: string, prNumber: number) => `${repoId}#${prNumber}`;

export const repoOnFloor = (repos: RepoView[], floor: number) => repos.find((r) => r.floor === floor) ?? null;

export const agentsOnRepo = (agents: Record<string, Agent>, repoId: string) =>
  Object.values(agents)
    .filter((a) => a.repoId === repoId)
    .sort((a, b) => a.desk - b.desk);

export const isBusy = (a: Agent) => a.status === 'preparing' || a.status === 'working';

/** CEO messages the manager hasn't seen yet (proposals are counted by pendingRequests instead). */
export const unreadMessages = (messages: PhoneMessage[], readAt: number) => messages.filter((m) => m.from === 'ceo' && !m.requestId && m.at > readAt).length;

export const pendingRequests = (requests: HireRequestView[]) => requests.filter((r) => r.status === 'pending');

/** The CEO chat's badge: decisions waiting on the manager plus unread messages. */
export function useCeoBadge() {
  const requests = useStore((s) => s.requests);
  const messages = useStore((s) => s.messages);
  const readAt = useStore((s) => s.phoneReadAt);
  return pendingRequests(requests).length + unreadMessages(messages, readAt);
}

export interface KanbanCard {
  key: string;
  number: number;
  title: string;
  url?: string;
  agent?: Agent;
  note?: string;
  tone?: CardTone;
  prNumber?: number;
  qa?: QaView;
}

export interface KanbanColumns {
  backlog: KanbanCard[];
  progress: KanbanCard[];
  qa: KanbanCard[];
  ready: KanbanCard[];
  merged: KanbanCard[];
}

/**
 * Sort a project's GitHub state and QA pipeline into the five Kanban columns. With `usage`, backlog issues
 * auto-assign would start but Claude's usage holds back say so ("⏸ paced").
 */
export function kanbanFor(repo: RepoView, agents: Agent[], qaRecords: Record<string, QaView>, usage?: Pick<UsageView, 'state'>): KanbanColumns {
  const openPulls = repo.pulls.filter((p) => p.state === 'OPEN');
  const byId = new Map(agents.map((a) => [a.id, a]));
  const workers = agents.filter((a) => a.role !== 'ceo');
  // While testing, an agent's prNumber is the PR under test, not one of theirs.
  const authors = workers.filter((a) => a.task !== 'qa');
  const authorOf = (n: number, head: string) => authors.find((a) => a.prNumber === n) ?? authors.find((a) => a.branch && a.branch === head);

  const progress: KanbanCard[] = [];
  for (const a of workers) {
    if (a.issueNumber == null || a.task !== 'issue' || a.status === 'idle') continue;
    // Their PR's card is the work now; once it's closed or merged there is no card ("finished · no PR" was wrong).
    if (a.prNumber != null) continue;
    const note =
      a.status === 'preparing' ? 'setting up' : a.status === 'working' ? 'working' : a.status === 'error' ? 'needs help' : a.status === 'stopped' ? 'stopped' : 'finished · no PR';
    progress.push({
      key: `a-${a.id}`,
      number: a.issueNumber,
      title: a.issueTitle ?? '',
      agent: a,
      note,
      tone: a.status === 'error' ? 'bad' : a.status === 'stopped' || a.status === 'done' ? 'warn' : undefined,
    });
  }

  const qa: KanbanCard[] = [];
  const ready: KanbanCard[] = [];
  for (const p of openPulls) {
    const rec = qaRecords[qaKey(repo.id, p.number)];
    const dev = (rec?.devAgentId ? byId.get(rec.devAgentId) : undefined) ?? authorOf(p.number, p.headRefName);
    const tester = rec?.qaAgentId ? byId.get(rec.qaAgentId) : undefined;
    const base = { key: `pr-${p.number}`, number: p.number, prNumber: p.number, title: p.title, url: p.url, qa: rec };
    const card = { ...base, ...qaCardNote(rec, p, repo.autoMerge) };
    if (rec?.status === 'passed') ready.push({ ...card, agent: dev });
    else qa.push({ ...card, agent: rec?.status === 'testing' ? tester : dev });
  }

  const claimed = new Set<number>([...progress.map((c) => c.number), ...openPulls.flatMap((p) => p.closesIssues)]);
  const open = new Set(repo.issues.map((i) => i.number));
  const held = new Map((repo.held ?? []).map((h) => [h.issue, h.pr]));
  const paced = repo.autoAssign && usage && usage.state !== 'normal' ? (usage.state === 'paused' ? '⏸ paused' : '⏸ paced') : '';
  const backlog: KanbanCard[] = repo.issues
    .filter((i) => !claimed.has(i.number))
    .map((i) => {
      const waits = blockers(i.body, open);
      const labels = i.labels.slice(0, 2).join(', ');
      const card = { key: `i-${i.number}`, number: i.number, title: i.title, url: i.url };
      // Its PR was closed: it waits for the manager rather than going back to auto-assign.
      if (held.has(i.number)) return { ...card, note: `⏸ PR #${held.get(i.number)} closed · assign by hand`, tone: 'warn' as const };
      return { ...card, note: (waits.length ? `⏳ after #${waits.join(', #')}` : [paced, labels].filter(Boolean).join(' · ')) || undefined };
    });

  const merged: KanbanCard[] = repo.pulls
    .filter((p) => p.state === 'MERGED')
    .sort((a, b) => (b.mergedAt ?? '').localeCompare(a.mergedAt ?? ''))
    .map((p) => ({ key: `m-${p.number}`, number: p.number, prNumber: p.number, title: p.title, url: p.url, agent: authorOf(p.number, p.headRefName) }));

  return { backlog, progress, qa, ready, merged };
}

export interface FloorPrCounts {
  /** Open PRs in the Kanban's In QA column: queued, testing, failed, fixing, needs-human and untested ones. */
  inQa: number;
  /** Open PRs that passed QA (the Ready to merge column). */
  ready: number;
  /** Open PRs waiting on the manager (needs-human, and the CEO isn't triaging them); also counted in inQa. */
  needsYou: number;
}

/**
 * A project's PR counts, matching kanbanFor's columns. Only open PRs count: QA records outlive their PR's merge or
 * close, so counting records instead drifts further from the board with every merge.
 */
export function floorPrCounts(repo: RepoView, qaRecords: Record<string, QaView>): FloorPrCounts {
  const counts: FloorPrCounts = { inQa: 0, ready: 0, needsYou: 0 };
  for (const p of repo.pulls) {
    if (p.state !== 'OPEN') continue;
    const rec = qaRecords[qaKey(repo.id, p.number)];
    if (rec?.status === 'passed') counts.ready++;
    else counts.inQa++;
    if (needsManager(rec)) counts.needsYou++;
  }
  return counts;
}

/**
 * What needs the manager on a project: open PRs waiting on them plus its agents who are stuck in an error, from
 * mission control's alarms when there are any for it (they also cover what the server sees that the board doesn't).
 */
export function needsYouCount(repo: RepoView, qaRecords: Record<string, QaView>, ops: OpsView): number {
  const alarms = ops.alarms.filter((a) => a.repoId === repo.id).length;
  return Math.max(alarms, floorPrCounts(repo, qaRecords).needsYou);
}

/** Everything waiting on the manager across the office: alarms, else needs-human PRs, plus pending team changes. */
export function totalNeedsYou(repos: RepoView[], qaRecords: Record<string, QaView>, ops: OpsView, requests: HireRequestView[]): number {
  return repos.reduce((n, r) => n + needsYouCount(r, qaRecords, ops), 0) + pendingRequests(requests).length;
}

/** A project's status dot: error (something failed or waits on you), busy (agents working), idle, or setting up. */
export type ProjectHealth = 'attention' | 'busy' | 'idle' | 'setup';

export function projectHealth(repo: RepoView, agents: Agent[], needsYou: number): ProjectHealth {
  if (repo.cloneStatus === 'error' || repo.syncError || needsYou > 0 || agents.some((a) => a.status === 'error')) return 'attention';
  if (repo.cloneStatus !== 'ready') return 'setup';
  return agents.some(isBusy) ? 'busy' : 'idle';
}
