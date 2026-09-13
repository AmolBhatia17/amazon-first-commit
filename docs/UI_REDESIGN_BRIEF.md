# UniTalks — Full Project & Connectivity Brief (for a UI redesign)

Purpose: give you (and any UI-generation tool such as Stitch/v0/Figma-AI) everything needed to
restyle this app **without breaking the functionality**. Section 9 is the hard contract —
anything listed there must survive the redesign. Section 12 is a paste-ready prompt.

---

## 1. What the app is

UniTalks is an **Omegle-style random 1-to-1 stranger chat** for college students, in three modes:
**text**, **voice (audio)**, **video**. Users are anonymous — no signup, no accounts, no database.

- **Frontend:** React 18 SPA, Create React App (`react-scripts` 5), `styled-components` v6,
  `react-router-dom` v6, `react-icons` (Feather/`Fi*` set), `simple-peer` (WebRTC), `chess.js`.
- **Backend:** Node + TypeScript, Express + `ws` (raw WebSocket, **not** socket.io despite the
  filename `socketService.js`), JWT for anonymous identity. All state is **in-memory** — restart
  the server and every queue/session is gone. No database exists.
- **Media:** peer-to-peer WebRTC. The server only does **signaling + matchmaking**; audio/video
  never passes through it.
- **Extras during a call ("FUN" menu):** Chess, Truth-and-Dare, and "Listen Along" synced music.

---

## 2. Running it locally

Currently running:

| Service | URL | Command |
|---|---|---|
| Frontend (CRA dev server, hot reload) | http://localhost:3000 | `npm start` |
| Backend (API + WebSocket) | http://localhost:8080 | `npm run dev` in `server/` |

`server/.env` is required or the backend refuses to boot (it throws on a missing `JWT_SECRET`):

```
PORT=8080
NODE_ENV=development
JWT_SECRET=local-dev-secret-change-me
```

Optional backend vars: `CORS_ORIGIN` (unset = allow `*`), `TURN_SECRET`, `TURN_HOST`,
`TURN_TTL_SECONDS` (default 86400).
Optional frontend vars: `REACT_APP_API_URL` (empty on localhost = auto-target `http://localhost:8080`),
`REACT_APP_WEB3FORMS_KEY`.

> Environment note: this machine's shell cannot spawn `cmd.exe`, so `npm run <script>` fails.
> Both processes were started by invoking node directly:
> `node dist/index.js` (backend, from `server/`) and
> `node node_modules\react-scripts\bin\react-scripts.js start` (frontend).
> The frontend is the real dev server, so **hot reload works** — UI edits appear instantly.
> The backend runs from its prebuilt `server/dist/`, so backend source edits need `npm run build`
> first. UI work needs no backend rebuild.

**To test matching you need two peers**: open http://localhost:3000 in two separate browser
windows (use one normal + one incognito), enter the same mode in both, and click Start Chat in each.

---

## 3. Repo map — what is live and what is dead

```
UniTalks-WebRTC-Video-Chat/
├─ public/
│  ├─ index.html          <- global CSS lives here (SEE SECTION 10 — IMPORTANT)
│  ├─ performance.css     <- reduced-motion + mobile perf overrides
│  ├─ assets/logos/       <- logo.png, favicon.png
│  └─ image/              <- win_1..win_4 (jpg/png/webp) marketing images
├─ src/
│  ├─ index.js            <- ReactDOM root + <ThemeProvider theme={theme}> + StrictMode
│  ├─ App.js              <- Router + all routes + page shell
│  ├─ config/theme.js     <- THE design token file
│  ├─ components/
│  │  ├─ layout/          <- Header.js, Footer.js            [LIVE]
│  │  ├─ pages/           <- ALL 11 routed pages             [LIVE]
│  │  ├─ ui/              <- AudioVisualizer, ChessBoard,
│  │  │                      ReportBugModal, StartChatDoodles,
│  │  │                      UniversalHamburger              [LIVE]
│  │  └─ *.js (top level) <- About/Contact/Help/Homepage/
│  │                         MaintenancePage/Privacy/
│  │                         StartChat/Terms                 [DEAD — see below]
│  └─ utils/
│     ├─ socketService.js <- WebSocket + auth token client
│     ├─ webrtcStun.js    <- STUN list + TURN fetch + getRtcConfig()
│     ├─ chessEngine.js   <- chess rules for the FUN game
│     └─ performanceOptimizations.js
└─ server/
   └─ src/
      ├─ index.ts               <- Express + WebSocketServer + all message handling
      ├─ config/{env,jwt}.ts
      ├─ routes/{auth,turn}.ts
      ├─ services/{matchmaking,stateManager}.ts
      └─ types/index.ts         <- the full WS protocol as TypeScript unions
```

### Dead duplicate files (warning)

`src/components/About.js`, `Contact.js`, `Help.js`, `Homepage.js`, `MaintenancePage.js`,
`Privacy.js`, `StartChat.js`, `Terms.js` are **older copies that nothing imports**. `App.js`
imports only from `src/components/pages/`. Editing the top-level copies changes nothing on screen
— a classic time-waster. **Always edit `src/components/pages/`.**

`MaintenancePage.js` is not routed at all in either location — it is unreachable.

### File sizes (redesign effort signal)

| File | Lines |
|---|---|
| `pages/VideoChat.js` | 3143 |
| `pages/AudioChat.js` | 2636 |
| `pages/TextChat.js` | 998 |
| `pages/Homepage.js` | 568 |
| `pages/Privacy.js` | 432 |
| `pages/About.js` | 395 |
| `pages/StartChat.js` | 289 |
| `pages/Help.js` | 231 |
| `pages/Terms.js` | 208 |
| `pages/Contact.js` | 165 |
| `layout/Header.js` | 175 |
| `layout/Footer.js` | 123 |
| `ui/StartChatDoodles.js` | 517 |
| `ui/UniversalHamburger.js` | 300 |
| `ui/ReportBugModal.js` | 217 |
| `ui/ChessBoard.js` | 190 |
| `ui/AudioVisualizer.js` | 115 |

The three chat pages are huge because **all styled-components are defined at the top of each
file** (VideoChat: ~80 styled components in lines 22–1570; logic starts ~1572). They also contain
large amounts of duplicated JSX for desktop vs mobile variants.

---

## 4. Routes

| Path | Component | Notes |
|---|---|---|
| `/` | `pages/Homepage` | Marketing landing. The only page that renders `<Footer />`. Scrollable. |
| `/start-chat` | `pages/StartChat` | Mode picker, links to `/text`, `/voice`, `/video`. Scrollable. |
| `/text` | `pages/TextChat` | Text mode. Fixed-height, no page scroll. |
| `/voice` | `pages/AudioChat` | Audio mode. Fixed-height, no page scroll. |
| `/video` | `pages/VideoChat` | Video mode. Fixed-height, no page scroll. |
| `/about` | `pages/About` | Static. |
| `/privacy` | `pages/Privacy` | Static. |
| `/terms` | `pages/Terms` | Static. |
| `/help` | `pages/Help` | Static + support form. |
| `/contact` | `pages/Contact` | Static + support form. |

`App.js` sets `overflow-y: auto` **only** for `/` and `/start-chat`; every other route is
`overflow: hidden` inside a `height: 100vh` flex column. If your redesign makes a chat page
taller than the viewport, it will be **clipped, not scrollable**, unless you also change
`App.js`'s `isScrollableRoute` logic.

Note the route/label mismatch: the audio page lives at **`/voice`** but the component is
`AudioChat` and the server mode string is **`'audio'`**. Don't "normalize" these.

---

## 5. The design system as it exists today

### Tokens — `src/config/theme.js`

Injected via `<ThemeProvider>` in `index.js`, so every styled-component can read
`${({theme}) => theme.colors.X}`.

```js
colors: {
  spotifyGreen:       '#1DB954',   // primary brand / CTA
  spotifyGreenDark:   '#19a64c',
  spotifyGreenDarker: '#12833a',
  black:      '#000000',
  appBg:      '#000000',           // page background (pure black)
  surface:    '#121212',           // cards
  surfaceAlt: '#181818',           // raised cards
  textPrimary:   '#FFFFFF',
  textSecondary: '#B3B3B3',
  border: 'rgba(255,255,255,0.08)'
}
```

Plus `alpha(hex, a)` which converts `#RRGGBB` to `rgba(...)`.

**This file is the single best lever for a restyle.** Changing these six colors re-skins most of
the app at once. Note that many components also hardcode `#1DB954` / `rgba(29,185,84,...)`
literals instead of reading the token, so a full recolor needs a find-and-replace of
`1DB954` and `29,185,84` as well.

### Typography — loaded in `public/index.html`

- **Inter** (400–900) — body/UI default.
- **Manrope** (500–800) — display/headings.
- **Press Start 2P** — retro pixel font, used for the `UniTalks` wordmark in the Header.

### Visual language today

Spotify-inspired: pure-black canvas, green accent, `linear-gradient(135deg, ...)` on nearly every
surface, pill/rounded buttons (`border-radius: 999px` or 10–14px), soft green glow shadows
(`0 8px 22px rgba(29,185,84,0.22)`), 1px translucent white borders, `translateY(-1px)` hover lift.

### Header (fixed)

`position: fixed; top: 0; height: 72px` (mobile: `min-height: 60px`), z-index 1000, hard-coded
`#000` background. Nav links: Text Chat / Voice Chat / Video Chat plus a "Report Bug" pill.
Below 768px the nav hides and `UniversalHamburger` takes over.
**Because the Header is fixed, page content needs its own top offset — don't remove existing
top padding/margin without replacing it.**

### Breakpoint

Effectively one: `@media (max-width: 768px)`. Used everywhere.

---

## 6. Backend API surface

### REST (Express, port 8080)

| Method | Path | Body | Returns | Used by |
|---|---|---|---|---|
| GET | `/health` | — | `{status:'ok', timestamp}` | ops |
| POST | `/api/auth/token` | none | `{token, expiresIn}` — anonymous JWT | `socketService.getAuthToken()` |
| GET | `/api/turn` | — | `{iceServers:[...], username, credential, ttl}`, or `{iceServers:[]}` if TURN not configured | `primeTurnCredentials()` |
| GET | `*` | — | SPA fallback to `public/index.html`, **only if a frontend build exists in `server/public`** | production |

### Warning: `/api/support` does not exist

`pages/Contact.js` (line 118) and `pages/Help.js` (line 153) both `POST /api/support`. The backend
has no such route. These two forms are **already broken before any redesign** — on localhost the
request hits the CRA dev server and 404s. Restyle the forms, but know they don't submit anywhere.
(`ui/ReportBugModal.js` is the one that *does* work — it posts directly to
`https://api.web3forms.com/submit`.)

### WebSocket

- **URL:** `ws://localhost:8080/ws?token=<JWT>` (prod: `wss://`, same origin).
- **Auth:** JWT in the `token` query param. Missing closes with code `4001`; invalid closes `4002`.
- **Framing:** one JSON object per frame, always with a `type` field.
- **Heartbeat:** server sends `{type:'ping'}` every **15 s**; `socketService` auto-replies `pong`
  transparently — never surface `ping`/`pong` in the UI.
- **Maintenance sweep:** every 30 s.

#### Client to Server

| Message | Meaning |
|---|---|
| `{type:'join', mode?:'video'\|'audio'\|'text'}` | Enter the queue. Omitted `mode` defaults to `'video'` server-side (which is why `VideoChat` sends a bare `join`). |
| `{type:'cancel'}` | Leave the queue while still searching. |
| `{type:'acknowledge'}` | Confirm the match; when **both** peers ack, the server emits `session-ready`. |
| `{type:'signal', signalType:'offer'\|'answer'\|'ice', data}` | Relay a WebRTC signal to the partner. |
| `{type:'skip'}` | Drop the partner. **Both** users are re-queued at the *end* of the queue. |
| `{type:'leave'}` | Exit entirely; partner gets `partner-left` and is re-queued. |
| `{type:'pong'}` | Heartbeat reply (handled automatically). |
| `{type:'fun-request', game}` | Invite partner to `'chess'`, `'truth-and-dare'` or `'listen-along'`. |
| `{type:'fun-accept', game}` / `{type:'fun-reject'}` / `{type:'fun-exit'}` | FUN-game handshake. |

#### Server to Client

| Message | Meaning / UI effect |
|---|---|
| `{type:'ready', userId}` | Socket authenticated. |
| `{type:'queue', position}` | You are searching; `position` is your place in line. |
| `{type:'matched', partnerId, initiator, sessionId}` | Partner found. `initiator: true` means you create the WebRTC offer. |
| `{type:'session-ready'}` | Both sides acknowledged. |
| `{type:'signal', from, signalType, data}` | Partner's WebRTC signal. |
| `{type:'partner-left'}` | Partner disconnected; show message, re-queue. |
| `{type:'partner-skipped'}` | Partner skipped you; re-queue. |
| `{type:'search-cancelled'}` | Your `cancel` was honoured. |
| `{type:'error', message}` | Show the message. |
| `{type:'ping'}` | Heartbeat (auto-handled, never render). |
| `{type:'fun-request'\|'fun-accept'\|'fun-reject'\|'fun-exit', from, game}` | FUN-game handshake. |

#### Server-side rules the UI must reflect

- **Strict FIFO** per mode. Three independent queues: video / audio / text. You can only match
  with someone in the **same mode**.
- **Queue timeout: 30 s.** `matchmaking.ts` (`QUEUE_TIMEOUT_MS = 30000`) prunes anyone who has
  been waiting longer. A user waiting alone is silently dropped from the queue after 30 seconds —
  keep a visible "searching" state and a way out, and don't design a UI that assumes searching
  lasts forever.
- **Skip limit:** 50 skips per 60 s (`stateManager.ts`), then an `error` message.
- Skipping gives you **no priority** — you go to the back of the queue like everyone else.

---

## 7. End-to-end flow (what happens when someone clicks "Start Chat")

```
 User clicks Start Chat
   |
   |- 1. getUserMedia()  -- video: {video:true,audio:true} | audio: mic only | text: none
   |        \- denied -> setError('Camera blocked...') and stop
   |- 2. socketService.connect()
   |        |- POST /api/auth/token           -> JWT
   |        |- GET  /api/turn                 -> TURN creds (never throws; falls back to STUN)
   |        \- new WebSocket(ws://.../ws?token=...)
   |- 3. send {type:'join', mode}
   |- 4. <- {type:'queue', position}          -> UI shows "searching"
   |- 5. <- {type:'matched', partnerId, initiator, sessionId}
   |        |- send {type:'acknowledge'}
   |        \- new SimplePeer({initiator, trickle:true, stream, config:getRtcConfig()})
   |- 6. signal exchange: peer.on('signal') -> send{type:'signal'} -> partner
   |                      <- {type:'signal'} -> peer.signal(data)
   |- 7. peer.on('stream'|'track'|'connect') -> setIsConnected(true), attach to <video>/<audio>
   \- 8. LIVE. Chat text + chess moves + music sync now travel over the WebRTC DATA CHANNEL.
```

Exit paths: **Skip** sends `skip`, both are re-queued, back to step 4. **Stop** sends `leave` plus
`socketService.disconnect()` and stops all local tracks. **Partner drops** produces `partner-left`
or `partner-skipped`, then `resetForRequeue()`, back to step 4.

### ICE configuration

`getRtcConfig()` returns the first **6 Google STUN servers** plus any TURN servers fetched from
the backend, with `iceCandidatePoolSize: 10`. Without TURN (the local default), users behind
symmetric NAT will match and then see a **black video** — that is expected locally, not a UI bug.

---

## 8. Two transports — do not confuse them

| Travels over the **WebSocket** (server relay) | Travels over the **WebRTC data channel** (peer-to-peer) |
|---|---|
| auth, queueing, matching | **in-call chat messages** |
| WebRTC offer/answer/ICE | chess moves (`{type:'chess-move', from, to, promotion}`) |
| skip / leave / cancel | music sync (`{type:'music-control', action, trackUrl, position, ...}`) |
| FUN invite handshake | |
| heartbeat | |

**The in-call chat is NOT sent through the server.** `sendMessage()` does
`peerConnectionRef.current.send(new TextEncoder().encode(trimmed))` and the receiver decodes in
`peer.on('data')`. A plain string is a chat message; a JSON object with a `type` is a control
message. Consequence: **chat only works after the peer connection is up** — a redesigned chat
input must stay disabled or inert until `isConnected` is true, and messages are **not** persisted
or echoed by the server (the sender appends its own bubble locally with `isOwn: true`).

Message object shape used by all three pages:

```js
{ id: Date.now(), text: string, isOwn: boolean, timestamp: Date,
  replyTo?: { id, text, isOwn } }
```

---

## 9. THE FUNCTIONALITY CONTRACT — must survive the redesign

Restyling is safe. Re-*structuring* breaks things. Keep all of the following intact.

### 9.1 Media elements (most fragile)

- `VideoChat`: `localVideoRef` and `remoteVideoRef` must stay on real `<video>` elements with
  `autoPlay` and `playsInline`. Code sets `.srcObject` and calls `.play()` directly. A `<div>`
  with a background image will not work.
- The remote video currently carries `transform: scaleX(-1)` (mirrored) and
  `visibility: isConnected ? 'visible' : 'hidden'` — the element stays mounted while hidden.
  **Never unmount the video element when disconnected**; `applyRemoteStream()` reattaches the
  stream to the existing node.
- `AudioChat`: `remoteAudioRef` must stay a real `<audio>` element.
- `musicAudioRef` (Video + Audio pages) must stay a real `<audio>` element — Listen Along drives
  `.play()`, `.pause()` and `.currentTime` on it.

### 9.2 State variables the JSX branches on

`VideoChat` / `AudioChat`: `isStarted`, `isWaiting`, `isConnected`, `hasLocalStream`,
`showRemoteBuffer`, `error`, `waitingMessage`, `audioEnabled`, `messages`, `newMessage`,
`showEmojiPicker`, `replyingTo`, `funToken`, `acceptedFunGame`, `pendingFunRequest`, `amIWhite`,
`chessState`, `isMusicHost`, `musicIsPlaying`, `musicPosition`, `musicDuration`,
`musicTrackUrl/Title/Artist/Artwork/Lyrics`, `saavnQuery`, `isLoadingTrack`.

Four distinct UI states must remain visually distinguishable: **idle** (`!isStarted`),
**searching** (`isWaiting && !isConnected`), **connected** (`isConnected`), **error** (`error`).

### 9.3 Handlers that must stay wired to something clickable

`startNewChat`, `stopChat`, `cancelSearch`, `skipPartner`, `toggleAudio`, `sendMessage`,
`handleKeyPress` (Enter to send), `toggleEmojiPicker`, `addEmoji`, `replyToMessage`,
`cancelReply`, `exitFun`, `handleChessMove`, `loadSaavnTrack`, `sendMusicControl`.

Note the **dual-purpose Stop button**: `onClick={isWaiting && !isConnected ? cancelSearch : stopChat}`.
Keep that conditional — one control means "cancel search" while searching and "stop chat" while
connected.

### 9.4 Lifecycle / effects

- The `useEffect` that registers all `socketService.on(...)` listeners **must** keep its cleanup
  calling the matching `socketService.off(...)`. Dropping cleanup gives duplicate handlers, which
  means duplicate chat messages and ghost sessions.
- `cleanupPeer()` / `cleanupStreams()` on unmount must be preserved, or the camera light stays on.
- The unmount effect sends `{type:'leave'}` and calls `socketService.disconnect()` — keep it.

### 9.5 Global singletons

`socketService` is a **module-level singleton** shared by all three chat pages. Don't instantiate
it per-component or move it into React context during a visual redesign.

### 9.6 Duplicated JSX blocks — update all copies

`VideoChat.js` renders the FUN menu in **three** places (around lines 2690, 3023, 3097) for
desktop / mobile / fullscreen variants. `AudioChat.js` has the same pattern. If you restyle one
and not the others, the UI will look inconsistent depending on viewport and mode. Ideally
de-duplicate into one component — but do that as a deliberate refactor, not by accident.

---

## 10. Landmines specific to this codebase

1. **`public/index.html` nukes every background colour.** It contains:

   ```css
   * { background-color: transparent !important; }
   div, section, article, main, aside, nav, header, footer { background-color: transparent !important; }
   ```

   So **`background-color:` is dead everywhere.** This is why the entire codebase uses
   `background: linear-gradient(...)` — gradients set `background-image`, which survives.
   For a redesign you must either (a) keep using gradients / `background-image`, or
   (b) delete those two rules from `index.html` — cleaner, but re-test every page for unexpected
   white flashes, since the rules exist to force the black theme.

2. **Form controls are force-styled in the same file:**

   ```css
   input, textarea, select, button {
     background-color: rgba(0,0,0,0.6) !important;
     color: #ffffff !important;
     border: 1px solid rgba(29,185,84,0.35) !important;
   }
   ```

   Any new input/button styling loses to this unless you edit `index.html` or override with
   `background-image` or higher-specificity `!important`.

3. **Scrollbars are globally hidden** (`::-webkit-scrollbar { width: 0 }`, `scrollbar-width: none`).
   A redesign with scrollable panels gives users no visual scroll affordance.

4. **Zoom is disabled:** `user-scalable=no, maximum-scale=1` in the viewport meta.

5. **`height: 100vh` everywhere** — on mobile browsers `100vh` includes the URL bar and causes
   clipping. `VideoChat` works around this with `keyboardHeight` / `mobileChatTop` state for the
   on-screen keyboard. Preserve that logic or the mobile chat input will be covered by the keyboard.

6. **`<React.StrictMode>` is on** — in dev, effects mount/unmount twice. Expect duplicated console
   logs and two connection attempts locally. Not a bug you introduced.

7. **`/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */`** sits at the top of all
   three chat pages. Dependency arrays are deliberately incomplete; "fixing" them can cause
   reconnect loops.

8. **`simple-peer` needs a `process` polyfill** — the small `window.process` shim at the top of
   each chat page must stay or the page crashes in the browser.

9. **Hardcoded colours bypass the theme** — `#1DB954` and `rgba(29,185,84,...)` literals appear
   throughout. A theme-only recolor will leave green fragments behind.

10. **Third-party dependencies in the UI:** JioSaavn proxy `https://saavnapi-nine.vercel.app/`
    (unofficial, can vanish) for Listen Along, and Web3Forms for the bug report modal — which has
    a **hardcoded fallback API key** in `ui/ReportBugModal.js:122`. Consider moving that key to
    `REACT_APP_WEB3FORMS_KEY` while you are in there.

---

## 11. Safe to change freely

Every visual property: colors, gradients, typography, spacing, radii, shadows, borders,
animations/keyframes, icon choice (any `react-icons` set), layout of the *static* pages
(`Homepage`, `StartChat`, `About`, `Privacy`, `Terms`, `Help`, `Contact`), `Header` / `Footer`
appearance, `theme.js` token values, the wordmark/logo treatment, empty/loading/error state
visuals, chat bubble design, button shapes and placement, and how the desktop/mobile layouts
arrange themselves — **as long as Section 9's elements, refs, state and handlers stay wired.**

Biggest-bang-for-effort order:

1. `src/config/theme.js` — 6 colour values, re-skins most of the app.
2. `public/index.html` — fonts plus the global CSS block (and the `!important` traps).
3. `layout/Header.js` + `layout/Footer.js` — visible on every page.
4. `pages/Homepage.js` + `pages/StartChat.js` — first impression, zero WebRTC risk.
5. `pages/TextChat.js` — smallest chat page, safest place to prototype the in-call look.
6. `pages/VideoChat.js` / `pages/AudioChat.js` — highest risk, do last.

---

## 12. Paste-ready prompt for Stitch (or any UI generator)

> Design a modern, premium UI for **UniTalks** — an anonymous random 1-to-1 stranger chat web app
> for college students in India, with three modes: **text**, **voice**, and **video**. Think
> Omegle's purpose with a 2025 product design standard.
>
> **Screens I need:**
> 1. **Landing page** — hero with headline plus primary CTA ("Start Chatting"), secondary links
>    "Try video" / "Try voice", three feature cards (Text / Voice / Video) that link to each mode,
>    a trust/safety section, and a footer with Privacy, Terms, About, Contact, Help.
> 2. **Mode picker** — three large selectable cards (Text Chat, Voice Chat, Video Chat), each with
>    an icon, label, one-line description and an arrow affordance.
> 3. **Video chat screen** — two video feeds (remote large, local small/PiP), a side chat panel on
>    desktop that collapses to an overlay on mobile, a bottom control bar (Start / Stop / Skip /
>    Mute / a "FUN" menu), and a "Stranger" name label on the remote feed.
> 4. **Voice chat screen** — the same shell but with an audio visualizer or avatar orb instead of
>    video.
> 5. **Text chat screen** — full-width message list plus a composer with an emoji button and a
>    reply preview.
> 6. **States for each chat screen:** *idle* (not started), *searching* (looking for a stranger,
>    with a cancel action), *connected* (live), *partner left*, and *error* (e.g. "Camera blocked").
> 7. **Modals:** an incoming "Stranger wants to play Chess / Truth-and-Dare / Listen Along" invite
>    with Accept and Reject; and a "Report Bug" form modal.
> 8. **In-call Listen Along music player panel:** search field, album artwork, title and artist,
>    a scrubber with elapsed/total time, play-pause, equalizer bars, and an optional lyrics area.
> 9. **Static pages:** About, Privacy, Terms, Help, Contact (the last two include a form).
>
> **Visual direction:** dark-first, near-black canvas, one confident accent colour, high contrast,
> generous spacing, rounded/pill controls, subtle depth (soft shadows or gradients rather than hard
> borders), clean modern sans typography with a distinct display face for headings. It should feel
> fast, friendly and safe — not edgy or sketchy. [Replace this paragraph with your own taste:
> glassmorphism, neo-brutalist, warm gradients, iOS-like, Linear-like, and so on.]
>
> **Hard constraints:**
> - Must work at **desktop and at 375px mobile width**; the single breakpoint is **768px**.
> - Chat screens are **fixed to the viewport height with no page scroll** — only the message list
>   scrolls internally.
> - A **fixed 72px top header** (60px on mobile) with the wordmark, three nav links
>   (Text/Voice/Video Chat) and a "Report Bug" pill; below 768px the nav collapses to a hamburger.
> - Video feeds must be genuine rectangular **video surfaces**, not decorative image blocks.
> - Every control must remain a real, clearly tappable button, minimum 44px touch target.
> - Give me the design as **HTML + CSS** (or React plus styled-components), using
>   **`background: linear-gradient(...)` or `background-image` instead of `background-color`**,
>   and avoid `background-color` on containers.
> - Deliver **design tokens as CSS variables or a JS object** with: primary accent, accent-dark,
>   page background, surface, surface-alt, text-primary, text-secondary, border.

---

## 13. How to land the new design without breaking things

1. **Start with tokens.** Put the new palette into `src/config/theme.js`, then sweep the
   hardcoded `#1DB954` / `rgba(29,185,84,...)` literals.
2. **Do `public/index.html` next** — swap fonts and decide what to do with the
   `background-color: transparent !important` rules. Re-check every page afterwards.
3. **Then Header and Footer**, then the static pages. Zero WebRTC risk so far.
4. **Then `TextChat.js`** as the chat-screen pilot. Verify with two browser windows that messages
   still flow before touching anything else.
5. **Then `VideoChat.js` / `AudioChat.js`** — restyle the styled-components at the top of the file
   first (lines 22–1570 in VideoChat) and leave the JSX structure alone. That alone gets you most
   of a redesign at near-zero risk. Only change JSX if you must, and re-read Section 9 first.
6. **Test after each stage, with two browsers:** start chat in both, match, confirm video/audio
   appears, send chat messages both ways, skip, re-match, stop, and confirm the camera light
   goes off.
7. Optional cleanup worth doing while you are in there: **delete the 8 dead duplicate files** in
   `src/components/` so nobody edits the wrong Homepage.
