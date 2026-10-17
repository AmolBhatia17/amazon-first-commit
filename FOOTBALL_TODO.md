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

## Notes / gotchas found during work

- `forwardRef(function FootballGame(...))` — the inner name is NOT visible outside; `export default UiRef;` is the correct export (caught by eslint build, fixed).
- Chat messages over the data channel are raw text; only `chess-move`, `music-control`, and now `football-*` JSON types are intercepted before the "render as chat bubble" fallback — the `type.indexOf('football-') === 0` guard must stay ahead of that fallback.
- VideoChat's `$chessMode` prop is declared on the styled ChatBox but unused in its CSS; extended it to football anyway for parity.
