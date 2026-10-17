# Football (HaxBall-style) Integration — TODO

Branch: `feature/football-game`
Decisions (confirmed): First to 3 goals · push + kick · Video + Voice pages · touch joystick on mobile · host-authoritative netcode (session initiator = host, physics only on host, guest sends inputs) · zero server changes.

## Fan-out tasks

- [x] Create branch `feature/football-game`
- [x] TODO tracking file (this file)
- [x] `src/utils/footballPhysics.js` — pure engine: pitch/ball/player consts, `createMatchState()`, `stepMatch(state, inputs, dt)` (fixed-step physics: accel/friction/collisions/posts/walls), goal detect → reset, score, first-to-3 win, phases (countdown/playing/goal/over).
- [x] `src/components/ui/FootballGame.js` — canvas UI: Amber Paper tokens, score card (your spec), 5s countdown, GOAL flash, winner banner + Play Again/Exit, guest 180° orientation flip, WASD/arrows + Space/X kick, touch joystick + kick button; host sim loop + guest snapshot interp; imperative handle `onPeerMessage` (football-state/input/rematch).
- [x] `VideoChat.js` — menu item Football (desktop + mobile popovers); label map; accept-branch (generic acceptedFunGame); host election via `amMatchInitiator` set in `handleMatch`; side panel render + `$chessMode` shrink; data-channel dispatch `football-*` → `footballRef.onPeerMessage`; `sendFootballMsg` pipe.
- [x] `AudioChat.js` — identical wiring (import, state, match flag, dispatch, relay, both popovers, label, panel, ChatBox flag).
- [x] Data-protocol safety — `football-*` messages intercepted before the chat-bubble fallback in both pages' `peer.on('data')`.
- [x] Verify backend has zero diffs — `git diff --stat main -- server/` shows only `server/package-lock.json` (pre-existing install churn from the local `npm install --prefix server`; server source untouched).
- [x] CRA production build passes — `react-scripts build` compiled successfully (151.52 kB gzip) after fixing the forwardRef export bug (inner named fn scoped, exported `UiRef` instead).

## Verification matrix (two windows: 1 normal + 1 incognito)

- [ ] Video page: countdown → move → push ball → kick → goal both sides → score cards update both ends → first-to-3 banner → Play Again (host resets, guest follows) → Exit.
- [ ] Skip mid-game → panel unmounts, both requeue (partner-skipped).
- [ ] Close window mid-game → partner-left → partner requeues.
- [ ] fun-request → fun-reject → no panel; re-request works.
- [ ] Audio page: same flow on /voice.
- [ ] Mobile (devtools emulate): joystick drag + kick button; portrait pitch fits; keyboard ignored.
- [ ] Existing games regression: Chess still plays, Listen Along music still syncs, chat/reply/emoji unaffected.
- [ ] Text page untouched: no regressions there.

## Log

- Branch created from `main`, package-lock files dirty (from earlier install) — will not commit them.
- Commit `12524d9` on `feature/football-game`: engine + UI game + Video/Audio wiring, TODO ledger. Server untouched by design.
- Commit `7d2c70c`: TODO updates after first build pass.
- **Round 2 (in progress):**
  - Pitch flipped to VERTICAL (626×1050): goals top/bottom, both players see own goal at bottom attacking up; guest view still 180°-rotated. Height-driven CSS (58vh/540px desktop, 46vh/420px mobile) so it reads bigger in the Live Chat column.
  - FIXED guest input mirroring bug: guest screen-frame input is now negated by the host (180° view = world input negation). Without this, guest pressed right → moved left.
  - Initiator rule picker: Fun → Play Along → Football expands to First to 1/3/5 goals · 2/3/5 minutes. Config rides in the relayed `game` key string (`football:goals-3` / `football:time-2`) — zero server changes since the WS relay forwards only that field. Request card label resolves to e.g. "Football · First to 3".
  - Engine gained `rule {mode,n}` + `clockMs`: timed matches count down through play AND goal pauses, expire → over; leader wins, tie = Draw 🤝 (draws only possible in time mode). Rematch replays with the same rule.
  - Build verified green (round 2): had to fix a JSX-syntax slip from the option-list generator (`{)}` → `)}` in 4 popover blocks; eslint caught it).
- Rule options live inside each Play Along submenu: Football toggles an options sub-list (so no new top-level popover state beyond `showFootballOptions`).

## Notes / gotchas found during work

- `forwardRef(function FootballGame(...))` — the inner name is NOT visible outside; `export default UiRef;` is the correct export (caught by eslint build, fixed).
- Chat messages over the data channel are raw text; only `chess-move`, `music-control`, and now `football-*` JSON types are intercepted before the "render as chat bubble" fallback — the `type.indexOf('football-') === 0` guard must stay ahead of that fallback.
- VideoChat's `$chessMode` prop is declared on the styled ChatBox but unused in its CSS; extended it to football anyway for parity.

## Guest glitch hunt (round 3) — root causes found & fixed

1. **Fake interpolation (primary):** guest blended `prev→latest` with a *fixed* 85% factor EVERY rAF frame between identical packets → jump-then-freeze stutter; 15% of every packet's motion was permanently discarded → draggy world.
2. **No client prediction:** guest's own disc waited a full data-channel RTT (~80–150ms) before moving on-screen → input bursts.
3. **No dead-reckoning:** late packets froze the whole guest view in place.
4. **Stuck inputs:** alt-tab away while holding a key → `keyup` lost → disc drifted forever on the host (rAF throttling also blocked the "send next frame" path).
5. **Touch drag escaping the pitch** kept pushing the disc in the last direction.

Fixes (all guest-side, host unchanged except tick 30→45Hz):
**Round-4 root cause & fix (guest keyboard "wrong direction" + "snap back to start" + "ball untouchable"):** the round-3 client prediction advanced the guest's own disc with raw SCREEN-frame input while prediction state lives in WORLD frame (guest renders the world rotated 180°) — predicted disc ran mirrored and fought the host's authoritative spring correction every packet: keys felt inverted, the displayed disc never occupied the host's real position (contact zone never matched what you see → ball untouchable), and divergence crossed the 90u snap threshold → periodic teleport back to the authoritative (≈ kickoff) position.
- Fix: prediction negates guest screen input to world frame; snap threshold 90→130u; spring correction 0.30→0.35; KICK_RANGE 8→24 for forgiving touch.

**Round-4 verification (real e2e over the running app):** headless Chromium ×2 tabs via raw CDP (no Chrome channel for the Playwright MCP), synthetic clicks + window KeyboardEvents, `window.__fb` world-probe in draw() (dev-only, tree-shaken in prod builds).
- Role auto-detection: the session initiator is whoever queued first — NOT necessarily the request sender; tests find the host by whose disc moves on its own keypresses.
- t1 guest→host input: guest ArrowRight → host world players[1].x 313→49/30 (world −x, correct mirror) = PASS
- t2 guest prediction direction: guest render players[1].x → ~30 under ArrowRight = PASS
- t3 ball contact: guest disc swept through ball after re-centering (|dx|≤35) → ball (313,525)→(467,674) = PASS
- Both-end screenshots confirm orientation (own disc bottom, attack up, matching team beads).
- Harness lessons: Page.navigate not evaluate(location.reload()); headless needs --use-fake-ui-for-media-stream --use-fake-device-for-media-stream (startVideo() gates everything); first t3 failures were test geometry (dx≈48 vs contact 45), which motivated KICK_RANGE.
- Snapshot ring buffer of 4 packets with `performance.now()` arrival times; render at `now − 60ms` inside the buffer window with true per-frame interpolation.
- Dead-reckoning (velocity extrapolation, ≤90ms cap, 0.9 factor) when `rt` runs past the newest snapshot.
- Client-side prediction of my own disc using the SAME sim constants (thrust 1500, damping 4.5, max 340 — now exported from the engine): instant local response; per-packet spring correction (30% pos, 40/60 velocity blend) toward authority; hard snap if divergence > 90u (kickoff reset).
- Blur / visibilitychange → immediately send zero input (not frame-flagged); global pointerup/pointercancel listener releases an escaped joystick drag and sends zero.
