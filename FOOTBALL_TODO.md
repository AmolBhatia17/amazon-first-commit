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
- [ ] Verify backend has zero diffs (fun-request already relays arbitrary `game` values, server/src/index.ts:398-432).
- [ ] CRA production build passes (react-scripts build running in background on this branch).

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

## Notes / gotchas found during work

- (fill as discovered; keep permanent record)
