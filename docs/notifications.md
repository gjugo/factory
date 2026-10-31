# Notifications and the installable app

factory tells you when something needs you, even with the dashboard closed: in the browser, by Web Push on your
phone or computer, or in the ntfy app. The dashboard also installs as an app.

## What you hear about

Open **Settings → Notifications** and pick the events:

- a pull request needs you (stuck, and the CEO has handed it to you)
- a message from the CEO
- a team change waits for your decision
- an agent has been stuck in an error for over 10 minutes
- Claude's usage limit pauses the office, or a usage warning paces it
- every merge (off unless you turn it on)

You get at most one notification of each kind a minute. Whatever else of that kind happens in that minute arrives
together as one summary ("🔀 9 more merges"), so a burst of merges is two notifications, not ten.

Clicking a notification opens the page it's about, in a dashboard tab that's already open (or a new one):

| Event | Opens |
| --- | --- |
| A pull request needs you | its card on the project's board (`/projects/<owner>/<name>?card=pr-<n>`) |
| A CEO message, a team change | the CEO (`/ceo`) |
| An agent stuck in an error | the agent's page (`/agents/<id>`) |
| Usage paused or pacing | the overview (`/`) |
| A merge | the project's board |

A summary of several notes opens what they all share: PRs on one project open its board, several agents the agents
list.

Every channel has an **On** switch and a **Test** button. Settings save as you change them, for every browser, and
show live in the office's other tabs. A demo office (`--demo`) sends nothing: it starts with a fake ntfy topic and
prints what each channel would get in the server's log.

### Desktop

Any browser with the dashboard open in a background tab shows notifications, once you click **Allow in this
browser**. A tab you're looking at doesn't: it shows the toast instead.

### Web Push

Push reaches a device even when the dashboard isn't open on it. On each phone or computer, open the office over
HTTPS (or as `localhost` on the office's own computer), go to **Settings → Notifications** and click **Push to this
device**, then **Test**. **Stop on this device** signs it off again; the settings show how many devices get push.

On an iPhone (iOS 16.4 or later), add the office to the Home Screen first (Safari: **Share → Add to Home Screen**)
and turn push on from the installed app: Safari only allows Web Push there.

The office signs its pushes with its own VAPID key pair, made the first time a device signs up and kept in
`<SWARM_HOME>/push.json` with the devices' subscriptions (owner-only file permissions). Messages are encrypted for
each device (RFC 8291) and go through the browser maker's push service (Google, Mozilla, Apple), which can't read
them. A device that unsubscribes, or whose browser data is cleared, is dropped the next time a push to it fails.

### ntfy

[ntfy](https://ntfy.sh) pushes to its own phone app with no account. Anyone who knows a topic's name can read it, so
pick a long random one.

1. In the ntfy app, subscribe to a topic such as `factory-7f3k9q2m`.
2. Enter `https://ntfy.sh/factory-7f3k9q2m` (or your own ntfy server's topic URL) under **ntfy**. For a topic with
   access control, add its access token (`tk_…`). **Save**, then **Test**.

With an **office address for links** set, tapping an ntfy notification opens the page it's about there.

### Where the secrets live

The ntfy topic and token are kept in `<SWARM_HOME>/secrets.json` (`~/.factory/secrets.json` by default), the VAPID
keys and push subscriptions in `<SWARM_HOME>/push.json`: owner-only file permissions, never in `state.json`, never
logged, never sent to a browser (the settings show the last 4 characters of the topic) and never given to agents.
**Remove** deletes them. A demo office keeps its own `demo-secrets.json` and `demo-push.json`.

## Install the app

The dashboard is an installable web app: Chrome and Edge offer **Install** in the address bar (Settings → **Install
app** offers it too, when the browser does; on Android: ⋮ → **Add to Home screen**), and Safari on iPhone has **Share
→ Add to Home Screen**. Installing needs the office to be served over HTTPS, or opened as `localhost` on its own
computer (see below).

The app's service worker (`/sw.js`, from `server/pwa.ts`) caches only the app shell: the page, its scripts and
styles, the icons and the manifest. It never caches the office's data (`/api`, the websockets): everything you see
comes live from the office, and the page itself always comes from the office first, with the cached copy only while
the office can't be reached. Every office build gets a new worker version, which replaces the old worker and drops
its cache, so the app never runs stale code.

## Reach the office from your phone

The office listens on `127.0.0.1` only, on purpose: it can start agents that run commands on your computer, so it
must never be open to your network or the internet as it is. To use it from your phone, put something that
authenticates you in front of it:

- **Tailscale Serve (recommended).** Install [Tailscale](https://tailscale.com) on the office's computer and your
  phone, signed in to the same tailnet. On the computer run:

  ```
  tailscale serve --bg 4517
  ```

  (4517 is factory's default port; use `SWARM_PORT` if you changed it.) It prints an address such as
  `https://office-pc.your-tailnet.ts.net`, with a real HTTPS certificate, reachable only from your own devices.
  Open it on your phone: installing and push both work. Put the same address in **Office address for links**.
  `tailscale serve reset` stops it. Don't use `tailscale funnel`, which publishes the office to the whole internet.
- **Cloudflare Tunnel with Cloudflare Access**, or another tunnel that makes you sign in before anything reaches the
  office, also works. A tunnel without its own sign-in is not safe.

Over plain `http://` on your LAN browsers refuse service workers and push, so there's no install and no push:
another reason to use HTTPS.
