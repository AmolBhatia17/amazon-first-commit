/**
 * Football game UI (HaxBall-style 1v1, VERTICAL pitch) over the peer data channel.
 * Self-contained like ChessBoard: the page passes amHost + cfg + callbacks; all
 * simulation, input, rendering and overlays live here.
 *
 * Contract with the page:
 *   <FootballGame ref={footballRef} amHost={isInitiator} cfg={rule} sendViaPeer={fn} onExit={fn} />
 *   page peer.on('data') dispatches obj.type starting with 'football' to
 *   footballRef.current.onPeerMessage(obj).
 *
 * Netcode (host-authoritative):
 *   host → guest : { type:'football-state', d:<serializeState()> } @30Hz
 *   guest → host : { type:'football-input', mx, my, kick } on change, in the
 *                  guest's SCREEN frame — the host negates it to world frame,
 *                  because the guest view is rendered 180°-rotated.
 *   either       : { type:'football-rematch' } guest proposes, host resets
 */
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import styled from 'styled-components';
import { FiZap } from 'react-icons/fi';
import {
  PITCH, PLAYER_R, PLAYER_THRUST, PLAYER_MAX_SPEED, PLAYER_DAMPING,
  BALL_R, STEP, COUNTDOWN_MS,
  DEFAULT_RULE, normalizeRule,
  createMatchState, stepMatch, normalizeInput, serializeState, deserializeState,
} from '../../utils/footballPhysics';

const BROADCAST_HZ = 45;
const INTERP_DELAY_MS = 60; // render this far behind realtime for smooth interpolation
const MAX_EXTRAPOLATE_MS = 90; // dead-reckoning cap when packets run late
const PREDICT_SNAP_DIST = 130; // authoritative jump bigger than this → teleport-snap
const PREDICT_CORRECT = 0.35; // per-packet spring correction toward the authoritative pos
const STREAM_STALL_MS = 400; // host stream idle longer than this → its window is hidden/throttled
const STREAM_RESEED_MS = 700; // stall gap longer than this → treat resume as a clean reseed

const PHASE_CODE_TO_NAME = ['countdown', 'playing', 'goal', 'over'];

const GameWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 4px 10px 10px;
  gap: 8px;
  position: relative;
`;

/* ── Score card, one per person (you always read left) ─────────────── */
const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
`;

const ScoreCard = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
`;

const TeamBead = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  flex-shrink: 0;
`;

const ScoreName = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ink};
`;

const ScoreNum = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.ink};
  min-width: 14px;
  text-align: center;
`;

const MatchTag = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.muted};
  white-space: nowrap;
`;

/* ── Pitch canvas (portrait, height-driven so it reads big) ────────── */
const PitchFrame = styled.div`
  position: relative;
  height: min(58vh, 540px);
  aspect-ratio: ${({ $w, $h }) => `${$w} / ${$h}`};
  max-width: 100%;
  border: 2px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  background: ${({ theme }) => theme.colors.paper};
  overflow: hidden;
  flex-shrink: 0;
  touch-action: none; /* joystick drags must not scroll the page */

  @media (max-width: 768px) {
    height: min(46vh, 420px);
  }
`;

const PitchCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
`;

/* ── Overlays ──────────────────────────────────────────────────────── */
const CenterOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: ${({ $dim }) => ($dim ? 'rgba(28, 28, 30, 0.42)' : 'transparent')};
  pointer-events: none;
`;

const CountdownNum = styled.span`
  font-size: clamp(48px, 12vw, 84px);
  font-weight: 800;
  color: ${({ theme }) => theme.colors.ink};
  letter-spacing: -0.04em;
  text-shadow: 0 3px 0 ${({ theme }) => theme.colors.paper};
`;

const GoalFlash = styled.span`
  font-size: clamp(24px, 6vw, 40px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.paper};
  background: ${({ theme }) => theme.colors.ink};
  border: 2px solid ${({ theme }) => theme.colors.paper};
  padding: 8px 22px;
  border-radius: ${({ theme }) => theme.radii.bubble};
  animation: goalPop 0.34s cubic-bezier(0.34, 1.4, 0.64, 1);
  text-align: center;

  @keyframes goalPop {
    from { transform: scale(0.7); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;

const ReadyHint = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.sunDeep};
  padding: 6px 14px;
  border-radius: 999px;
  text-align: center;
`;

/* ── End-of-match card ─────────────────────────────────────────────── */
const EndCard = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(28, 28, 30, 0.72);
  pointer-events: auto;
`;

const EndTitle = styled.span`
  font-size: clamp(22px, 5vw, 36px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.paper};
  text-align: center;
`;

const EndScore = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.sunTint};
`;

const EndActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

const EndButton = styled.button`
  height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  border: 1.5px solid ${({ theme }) => theme.colors.paper};

  &.primary {
    background: ${({ theme }) => theme.colors.sun};
    color: ${({ theme }) => theme.colors.ink};
  }
  &.ghost {
    background: transparent;
    color: ${({ theme }) => theme.colors.paper};
  }
  &:active { transform: scale(0.97); }
`;

/* ── Touch controls (mobile) ───────────────────────────────────────── */
const JoystickBase = styled.div`
  position: absolute;
  left: 14px;
  bottom: 12px;
  width: 96px;
  height: 96px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  border: 1.5px solid rgba(28, 28, 30, 0.55);
  pointer-events: none;
`;

const JoystickKnob = styled.div`
  position: absolute;
  width: 44px;
  height: 44px;
  left: 50%;
  top: 50%;
  transform: translate(calc(-50% + ${({ $dx }) => $dx}px), calc(-50% + ${({ $dy }) => $dy}px));
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.paper};
  pointer-events: none;
`;

const KickButton = styled.button`
  position: absolute;
  right: 14px;
  bottom: 16px;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: ${({ theme }) => theme.colors.sun};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  pointer-events: auto;
  &:active { transform: scale(0.92); }
`;

const UiRef = forwardRef(function UiRefFootballGame({ amHost, cfg, sendViaPeer, onExit }, ref) {
  /* my side in world coords: host = 0 (red, bottom), guest = 1 (blue, top) */
  const mySide = amHost ? 0 : 1;

  /* ── authoritative sim (host only) ───────────────────────────────── */
  const simRef = useRef(null);          // world state the host mutates
  const inputRef = useRef({ mx: 0, my: 0, kick: false });   // kick flag shared by touch
  const remoteInputRef = useRef({ mx: 0, my: 0, kick: false });
  const accRef = useRef(0);
  const lastFrameRef = useRef(0);
  const netAccRef = useRef(0);
  const cfgRef = useRef(normalizeRule(cfg || DEFAULT_RULE));

  /* ── guest-side netcode ─────────────────────────────────────────── */
  const snapRef = useRef([]);            // ring of {d, at} host snapshots (12 deep ≈ 265ms)
  const predRef = useRef(null);          // client-side prediction of my own disc (now-clock)
  const predHistRef = useRef([]);        // ring of {x,y,vx,vy,at} so the disc can render on the SAME delayed clock as the world
  const predClockRef = useRef(0);        // performance.now of last prediction tick
  const netPhaseRef = useRef('countdown'); // latest authoritative phase (packet clock, un-delayed)
  const otherDiscRef = useRef(null);     // {x,y} of the opponent, packet clock, for prediction clamps
  const ballRef = useRef(null);          // {x,y,vx,vy,at} of the ball, packet clock, for prediction clamps
  const lastPacketAtRef = useRef(0);     // arrival time of the newest host packet
  const stalledRef = useRef(false);      // host stream down (its window hidden/throttled)

  /* ── render state mirrored to React at low frequency ────────────── */
  const [ui, setUi] = useState({
    scores: [0, 0],
    phase: 'countdown',
    phaseLeftMs: COUNTDOWN_MS,
    clockSecond: -1,
    lastGoalBy: null,
    winner: null,
    waitingRematch: false,
    stalled: false,
  });

  const canvasRef = useRef(null);

  const postUi = (state) => {
    setUi((prev) => {
      const clockSecond = Math.ceil((state.clockMs || 0) / 1000);
      if (
        prev.scores[0] === state.scores[0] &&
        prev.scores[1] === state.scores[1] &&
        prev.phase === state.phase &&
        prev.lastGoalBy === state.lastGoalBy &&
        prev.winner === state.winner &&
        prev.clockSecond === clockSecond &&
        Math.ceil(prev.phaseLeftMs / 1000) === Math.ceil(state.phaseLeftMs / 1000)
      ) {
        return prev;
      }
      return {
        scores: [state.scores[0], state.scores[1]],
        phase: state.phase,
        phaseLeftMs: state.phaseLeftMs,
        clockSecond,
        lastGoalBy: state.lastGoalBy,
        winner: state.winner,
        waitingRematch: state.phase === 'over' ? prev.waitingRematch : false,
      };
    });
  };

  const hostReset = () => {
    simRef.current = createMatchState(cfgRef.current);
    netAccRef.current = 0;
    accRef.current = 0;
    postUi(simRef.current);
  };

  /* ── page → game bridge ─────────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    onPeerMessage(obj) {
      if (!obj) return;
      if (obj.type === 'football-state' && obj.d) {
        // guest receives host truth: buffer it + reconcile my own-disc prediction
        const now = performance.now();
        const buf = snapRef.current;
        buf.push({ d: obj.d, at: now });
        if (buf.length > 12) buf.shift(); // 12 deep @45Hz ≈ 265ms — keeps the interp window interior under jitter

        const mine = obj.d.p[mySide]; // [x, y, vx, vy] from the server
        const phase = PHASE_CODE_TO_NAME[obj.d.ph] || 'playing';
        const other = obj.d.p[1 - mySide];
        otherDiscRef.current = other ? { x: other[0], y: other[1] } : otherDiscRef.current;
        ballRef.current = obj.d.b
          ? { x: obj.d.b[0], y: obj.d.b[1], vx: obj.d.b[2], vy: obj.d.b[3], at: now }
          : ballRef.current;

        // host stream came back after a stall (its window was hidden) —
        // reseed cleanly instead of spring-snapping the disc across the pitch
        const gap = now - lastPacketAtRef.current;
        const wasStalled = stalledRef.current;
        if (wasStalled && gap > STREAM_RESEED_MS) {
          snapRef.current = [{ d: obj.d, at: now }];
          if (mine) {
            predRef.current = { x: mine[0], y: mine[1], vx: mine[2], vy: mine[3] };
            predHistRef.current = [{ x: mine[0], y: mine[1], vx: mine[2], vy: mine[3], at: now }];
          }
          stalledRef.current = false;
          setUi((prev) => ({ ...prev, stalled: false }));
        } else if (stalledRef.current) {
          stalledRef.current = false;
          setUi((prev) => ({ ...prev, stalled: false }));
        }
        lastPacketAtRef.current = now;

        if (mine) {
          if (predRef.current) {
            const pr = predRef.current;
            const errX = mine[0] - pr.x;
            const errY = mine[1] - pr.y;
            const hardSnap = Math.hypot(errX, errY) > PREDICT_SNAP_DIST;
            if (hardSnap || phase !== 'playing') {
              // kickoff/goal/reset or big divergence → lock to the server, drop history
              pr.x = mine[0]; pr.y = mine[1];
              pr.vx = mine[2]; pr.vy = mine[3];
              snapRef.current = [{ d: obj.d, at: now }];
              predHistRef.current = [{ x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, at: now }];
            } else {
              // spring correction; keep most of my local velocity so control feels live
              pr.x += errX * PREDICT_CORRECT;
              pr.y += errY * PREDICT_CORRECT;
              pr.vx = mine[2] * 0.4 + pr.vx * 0.6;
              pr.vy = mine[3] * 0.4 + pr.vy * 0.6;
            }
          } else {
            predRef.current = { x: mine[0], y: mine[1], vx: mine[2], vy: mine[3] };
            predHistRef.current = [{ x: mine[0], y: mine[1], vx: mine[2], vy: mine[3], at: now }];
          }
        }

        // phase transition → the offsets of the world timeline are discontinuous
        if (phase !== netPhaseRef.current) {
          netPhaseRef.current = phase;
          if (phase === 'countdown' || phase === 'goal' || phase === 'over') {
            predRef.current = mine
              ? { x: mine[0], y: mine[1], vx: mine[2], vy: mine[3] }
              : predRef.current;
            snapRef.current = [{ d: obj.d, at: now }];
            predHistRef.current = mine
              ? [{ x: mine[0], y: mine[1], vx: mine[2], vy: mine[3], at: now }]
              : predHistRef.current;
          }
        }

        postUi(deserializeState(obj.d));
        return;
      }
      if (obj.type === 'football-input') {
        // guest input arrives in the guest's screen frame; the guest view is
        // 180°-rotated, so world input = negated screen input.
        remoteInputRef.current = {
          mx: -(Number(obj.mx) || 0),
          my: -(Number(obj.my) || 0),
          kick: !!obj.kick,
        };
        return;
      }
      if (obj.type === 'football-rematch' && amHost) {
        hostReset();
      }
    },
  }));

  useEffect(() => {
    if (amHost) hostReset();
    // guest waits for the first football-state; a local kickoff state covers the first frames
    else simRef.current = createMatchState(normalizeRule(cfg || DEFAULT_RULE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── my input: keyboard + touch, all in MY SCREEN frame ─────────── */
  const sendRef = useRef(false);
  const keysRef = useRef(new Set());
  useEffect(() => {
    const isTypingTarget = (e) => {
      const t = e.target;
      const tag = t && t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable);
    };
    const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const SCROLLING_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
    const onDown = (e) => {
      if (isTypingTarget(e)) return;
      const k = e.key.toLowerCase();
      if (SCROLLING_KEYS.includes(k) || MOVE_KEYS.includes(k) || k === 'x') {
        if (SCROLLING_KEYS.includes(k)) e.preventDefault();
        keysRef.current.add(k);
        sendRef.current = true;
        // kick presses go out immediately (no rAF wait) for snappy kicks
        if (k === ' ' || k === 'x') {
          try { sendViaPeer && sendViaPeer({ type: 'football-input', ...computeMyInput() }); } catch (_) {}
        }
      }
    };
    const onUp = (e) => {
      const k = e.key.toLowerCase();
      if (keysRef.current.delete(k)) {
        sendRef.current = true;
        if (k === ' ' || k === 'x') {
          try { sendViaPeer && sendViaPeer({ type: 'football-input', ...computeMyInput() }); } catch (_) {}
        }
      }
    };
    // Losing focus (alt-tab / notification press) can leave keys stuck down
    // forever on the host — rAF is throttled while hidden, so send zero input
    // immediately instead of flagging the next frame.
    const sendZero = () => {
      try { sendViaPeer && sendViaPeer({ type: 'football-input', mx: 0, my: 0, kick: false }); } catch (_) {}
    };
    const onBlur = () => {
      if (keysRef.current.size === 0) return;
      keysRef.current.clear();
      sendZero();
    };
    const onVis = () => { if (document.hidden) onBlur(); };
    // Global pointer release: a touch drag that ends outside the pitch would
    // otherwise keep the disc pushed toward the last direction.
    const onGlobalUp = (e) => {
      if (!touchRef.current.active || e.pointerId !== touchRef.current.id) return;
      touchRef.current.active = false;
      setKnob({ dx: 0, dy: 0, active: false });
      inputRef.current.mx = 0;
      inputRef.current.my = 0;
      sendZero();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('pointercancel', onGlobalUp);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalUp);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /* joystick (touch) */
  const touchRef = useRef({ active: false, id: null, ox: 0, oy: 0 });
  const [knob, setKnob] = useState({ dx: 0, dy: 0, active: false });
  const [kickHeld, setKickHeld] = useState(false);
  const isTouch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches,
    []
  );

  // Input is always computed from refs, so a first-render closure stays valid.
  // Touchscreen laptops count as keyboard devices: only (pointer: coarse) —
  // tablets/phones — get the joystick and its kick button.
  const computeMyInput = () => {
    const k = keysRef.current;
    let mx = 0;
    let my = 0;
    if (k.has('a') || k.has('arrowleft')) mx -= 1;
    if (k.has('d') || k.has('arrowright')) mx += 1;
    if (k.has('w') || k.has('arrowup')) my -= 1;
    if (k.has('s') || k.has('arrowdown')) my += 1;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    // touch joystick overrides keyboard while dragging
    if (isTouch && touchRef.current.active) {
      mx = inputRef.current.mx;
      my = inputRef.current.my;
    }
    const kick = (isTouch ? inputRef.current.kick : false) || k.has(' ') || k.has('x');
    return { mx, my, kick };
  };

  /* joystick + kick (touch devices only — pointer: coarse) */
  const onPointerDown = (e) => {
    if (!isTouch) return;
    touchRef.current = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY };
    setKnob({ dx: 0, dy: 0, active: true });
    sendRef.current = true;
  };
  const onPointerMove = (e) => {
    if (!isTouch || !touchRef.current.active || e.pointerId !== touchRef.current.id) return;
    const maxR = 42;
    let dx = e.clientX - touchRef.current.ox;
    let dy = e.clientY - touchRef.current.oy;
    const len = Math.hypot(dx, dy);
    if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
    setKnob({ dx, dy, active: true });
    inputRef.current.mx = dx / maxR;
    inputRef.current.my = dy / maxR;
    sendRef.current = true;
  };
  const onPointerUp = (e) => {
    if (!isTouch || e.pointerId !== touchRef.current.id) return;
    touchRef.current.active = false;
    setKnob({ dx: 0, dy: 0, active: false });
    inputRef.current.mx = 0;
    inputRef.current.my = 0;
    sendRef.current = true;
  };
  const onTouchKickDown = () => { inputRef.current.kick = true; setKickHeld(true); sendRef.current = true; };
  const onTouchKickUp = () => { inputRef.current.kick = false; setKickHeld(false); sendRef.current = true; };

  /* ── host sim + broadcast on the WORKER clock ─────────────────────
     Chrome freezes/throttles rAF of any window that is not in the
     foreground, which used to stop the host's simulation and its 45Hz
     state stream — the guest's world froze and then spring-snapped on
     resume ("automatically glitches to the starting position"). Worker
     timers are NOT visibility-throttled, so the host keeps simulating
     and streaming no matter which window is on top. */
  const simClockRef = useRef(0);
  const hostTick = () => {
    const nowMs = performance.now();
    const last = simClockRef.current || nowMs;
    simClockRef.current = nowMs;
    let dt = (nowMs - last) / 1000;
    if (dt > 0.25) dt = 0.25; // tab-sleep / worker-hiccup guard
    if (dt <= 0) return;

    accRef.current += dt;
    const myInput = computeMyInput();
    while (accRef.current >= STEP) {
      stepMatch(simRef.current, [myInput, remoteInputRef.current], STEP);
      accRef.current -= STEP;
    }

    netAccRef.current += dt;
    if (netAccRef.current >= 1 / BROADCAST_HZ) {
      netAccRef.current = 0;
      try { sendViaPeer && sendViaPeer({ type: 'football-state', d: serializeState(simRef.current) }); } catch (_) {}
    }
    postUi(simRef.current);
  };

  useEffect(() => {
    if (!amHost) return undefined;
    let worker = null;
    let url = null;
    try {
      const src = "setInterval(function(){ postMessage(0); }, 25);"; // ~40Hz clock
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = hostTick;
    } catch (_) {
      // Worker unavailable (ancient browser): setInterval fallback, still not rAF
      const id = setInterval(hostTick, 25);
      return () => clearInterval(id);
    }
    return () => {
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amHost]);

  /* ── main frame loop ─────────────────────────────────────────────── */
  useEffect(() => {
    let raf = 0;
    const lastSentInputRef = { mx: 0, my: 0, kick: false };

    const sendViaPeerSafe = (obj) => {
      try { sendViaPeer && sendViaPeer(obj); } catch (_) {}
    };

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      const now = ts;

      if (amHost) {
        // the sim + broadcast run on the WORKER clock (hostTick) — visible
        // even when this window is hidden/throttled by Chrome. rAF here
        // only draws.
        postUi(simRef.current);
      } else {
        // guest: host-stream watchdog — if the host window is hidden/throttled
        // its rAF loop pauses and the state stream stops. We freeze our world
        // (no readahead, no prediction) and show a waiting state; on resume we
        // reseed cleanly (handled in onPeerMessage) instead of snap-backs.
        const nowMs = performance.now();
        const idle = lastPacketAtRef.current ? nowMs - lastPacketAtRef.current : 0;
        const shouldStall = idle > STREAM_STALL_MS && lastPacketAtRef.current > 0;
        if (shouldStall !== stalledRef.current) {
          stalledRef.current = shouldStall;
          setUi((prev) => ({ ...prev, stalled: shouldStall }));
        }

        // advance my own-disc prediction with the SAME physics constants
        // (instant response; the host stays authoritative via spring correction)
        const last = predClockRef.current || nowMs;
        predClockRef.current = nowMs;
        let pdt = (nowMs - last) / 1000;
        if (pdt > 0.1) pdt = 0.1;
        if (predRef.current && pdt > 0 && netPhaseRef.current === 'playing' && !stalledRef.current) {
          const pr = predRef.current;
          const myInput = computeMyInput();
          // Prediction runs in WORLD frame; the guest's screen is the world
          // rotated 180°, so screen input must be negated to move the disc
          // the way the player sees it (same transform the host applies).
          const worldIn = amHost
            ? { mx: myInput.mx, my: myInput.my }
            : { mx: -myInput.mx, my: -myInput.my };
          const damp = 1 - PLAYER_DAMPING * pdt;
          pr.vx += worldIn.mx * PLAYER_THRUST * pdt;
          pr.vy += worldIn.my * PLAYER_THRUST * pdt;
          pr.vx *= damp;
          pr.vy *= damp;
          const sp = Math.hypot(pr.vx, pr.vy);
          if (sp > PLAYER_MAX_SPEED) {
            pr.vx = (pr.vx / sp) * PLAYER_MAX_SPEED;
            pr.vy = (pr.vy / sp) * PLAYER_MAX_SPEED;
          }
          pr.x += pr.vx * pdt;
          pr.y += pr.vy * pdt;
          // field bounds (players clamp, slide — mirrors the engine)
          if (pr.x < PLAYER_R) { pr.x = PLAYER_R; pr.vx = Math.max(0, pr.vx); }
          if (pr.x > PITCH.W - PLAYER_R) { pr.x = PITCH.W - PLAYER_R; pr.vx = Math.min(0, pr.vx); }
          if (pr.y < PLAYER_R) { pr.y = PLAYER_R; pr.vy = Math.max(0, pr.vy); }
          if (pr.y > PITCH.H - PLAYER_R) { pr.y = PITCH.H - PLAYER_R; pr.vy = Math.min(0, pr.vy); }

          // Keep the predicted disc out of the ball and the opponent so the
          // on-screen disc never visually occupies them between packets.
          // (Display-level constraint; authority is still the host.)
          const nowMs = performance.now();
          const deadReckon = (pos, vel, at) => {
            const k = Math.min(Math.max(nowMs - at, 0), MAX_EXTRAPOLATE_MS) / 1000 * 0.9;
            return { x: pos.x + (vel?.x ?? 0) * k, y: pos.y + (vel?.y ?? 0) * k };
          };
          const pushOut = (cx, cy, minDist) => {
            const dx = pr.x - cx;
            const dy = pr.y - cy;
            const dist = Math.hypot(dx, dy) || 0.0001;
            if (dist < minDist) {
              const nx = dx / dist;
              const ny = dy / dist;
              pr.x = cx + nx * minDist;
              pr.y = cy + ny * minDist;
              const vn = pr.vx * nx + pr.vy * ny;
              if (vn < 0) { pr.vx -= vn * nx; pr.vy -= vn * ny; }
            }
          };
          if (ballRef.current) {
            const b = deadReckon(ballRef.current, { x: ballRef.current.vx, y: ballRef.current.vy }, ballRef.current.at);
            pushOut(b.x, b.y, PLAYER_R + BALL_R);
          }
          if (otherDiscRef.current) {
            pushOut(otherDiscRef.current.x, otherDiscRef.current.y, PLAYER_R * 2);
          }
        } else if (predRef.current && netPhaseRef.current !== 'playing') {
          // outside play the host freezes the world; the disc must not free-fly
          const pr = predRef.current;
          pr.vx *= 0.9; pr.vy *= 0.9;
        }

        // history ring so the disc can be sampled on the SAME delayed clock
        // as the world (fixes the on-screen disc/ball clock mismatch)
        if (predRef.current) {
          const pr = predRef.current;
          const hist = predHistRef.current;
          const nowMs = performance.now();
          const last = hist[hist.length - 1];
          if (!last || nowMs - last.at >= 8) {
            hist.push({ x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, at: nowMs });
            if (hist.length > 14) hist.shift();
          } else {
            // refresh the head in place to keep the ring tight
            last.x = pr.x; last.y = pr.y; last.vx = pr.vx; last.vy = pr.vy;
          }
        }

        // guest: only relay its screen-frame input
        const myInput = computeMyInput();
        const prev = lastSentInputRef;
        if (
          sendRef.current ||
          Math.abs(myInput.mx - prev.mx) > 0.05 ||
          Math.abs(myInput.my - prev.my) > 0.05 ||
          myInput.kick !== prev.kick
        ) {
          lastSentInputRef.mx = myInput.mx;
          lastSentInputRef.my = myInput.my;
          lastSentInputRef.kick = myInput.kick;
          sendRef.current = false;
          sendViaPeerSafe({
            type: 'football-input',
            mx: Math.round(myInput.mx * 100) / 100,
            my: Math.round(myInput.my * 100) / 100,
            kick: myInput.kick,
          });
        }
      }

      draw(now);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || PITCH.W;
      const cssH = canvas.clientHeight || Math.round((cssW * PITCH.H) / PITCH.W);
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }
      const ctx = canvas.getContext('2d');

      const theme = {
        paper: '#ffffff', paperAlt: '#f7f7f8', ink: '#1c1c1e', line: '#e5e5ea',
        blue: '#2d7ff9', red: '#ff3b30', sun: '#f9c74a', muted: '#8a8a8e',
      };

      // guest view: rotate world 180° so I always attack upward
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pxW, pxH);
      ctx.save();
      if (!amHost) {
        ctx.translate(pxW, pxH);
        ctx.rotate(Math.PI);
      }
      ctx.scale(pxW / PITCH.W, pxH / PITCH.H);

      // outer run-off strips (paper) along the sides; playing field tinted paperAlt
      ctx.fillStyle = theme.paper;
      ctx.fillRect(0, 0, PITCH.W, PITCH.H);
      ctx.fillStyle = theme.paperAlt;
      ctx.fillRect(26, 34, PITCH.W - 52, PITCH.H - 68);
      ctx.strokeStyle = theme.line;
      ctx.lineWidth = 3;
      ctx.strokeRect(26, 34, PITCH.W - 52, PITCH.H - 68);

      // centre line (horizontal) + centre circle + dot
      ctx.beginPath();
      ctx.moveTo(26, PITCH.H / 2);
      ctx.lineTo(PITCH.W - 26, PITCH.H / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PITCH.W / 2, PITCH.H / 2, 64, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PITCH.W / 2, PITCH.H / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = theme.line;
      ctx.fill();

      // goal mouths top/bottom (openings in the horizontal walls) + nets
      const mouthX1 = PITCH.W / 2 - PITCH.GOAL_H / 2;
      const mouthX2 = PITCH.W / 2 + PITCH.GOAL_H / 2;
      const drawGoal = (top) => {
        const yLine = top ? PITCH.GOAL_DEPTH : PITCH.H - PITCH.GOAL_DEPTH;
        // net strip beyond the line (inside the world)
        ctx.fillStyle = 'rgba(28,28,30,0.08)';
        ctx.fillRect(mouthX1, top ? 0 : yLine, PITCH.GOAL_H, PITCH.GOAL_DEPTH);
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = 2;
        for (let gx = mouthX1 + 10; gx < mouthX2; gx += 12) {
          ctx.beginPath();
          ctx.moveTo(gx, top ? 2 : yLine + 2);
          ctx.lineTo(gx, top ? PITCH.GOAL_DEPTH - 2 : PITCH.H - 2);
          ctx.stroke();
        }
        // goal line across the mouth
        ctx.beginPath();
        ctx.moveTo(mouthX1, yLine);
        ctx.lineTo(mouthX2, yLine);
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 4;
        ctx.stroke();
        // posts at the mouth corners
        for (const px of [mouthX1, mouthX2]) {
          ctx.beginPath();
          ctx.arc(px, yLine, PITCH.POST_R, 0, Math.PI * 2);
          ctx.fillStyle = theme.ink;
          ctx.fill();
        }
      };
      drawGoal(true);
      drawGoal(false);

      // resolve what we render
      let players;
      let ball;
      if (amHost) {
        players = simRef.current.players;
        ball = simRef.current.ball;
      } else {
        // ── guest render resolution ──────────────────────────────────
        // ONE clock for everything: both the world and my own disc are
        // sampled at rt = now − INTERP_DELAY_MS, so on-screen contact
        // geometry matches the host's simulation geometry.
        const buf = snapRef.current;
        const hist = predHistRef.current;
        const rt = performance.now() - INTERP_DELAY_MS;
        const lerp = (a, b, t) => a + (b - a) * t;
        const seg = (s1, s2, alpha) => ({
          players: s1.p.map((p, i) => ({
            x: lerp(p[0], s2.p[i]?.[0] ?? p[0], alpha),
            y: lerp(p[1], s2.p[i]?.[1] ?? p[1], alpha),
            vx: s2.p[i]?.[2] ?? 0,
            vy: s2.p[i]?.[3] ?? 0,
          })),
          ball: { x: lerp(s1.b[0], s2.b?.[0] ?? s1.b[0], alpha), y: lerp(s1.b[1], s2.b?.[1] ?? s1.b[1], alpha), vx: s2.b?.[2] ?? 0, vy: s2.b?.[3] ?? 0 },
        });
        const extrap = (s, overMs) => {
          const k = Math.min(Math.max(overMs, 0), MAX_EXTRAPOLATE_MS) / 1000 * 0.9;
          return {
            players: s.p.map((p) => ({ x: p[0] + p[2] * k, y: p[1] + p[3] * k, vx: p[2], vy: p[3] })),
            ball: { x: s.b[0] + s.b[2] * k, y: s.b[1] + s.b[3] * k, vx: s.b[2], vy: s.b[3] },
          };
        };

        let world = null;
        if (buf.length === 1) {
          world = extrap(buf[0].d, performance.now() - buf[0].at);
        } else if (buf.length >= 2) {
          if (rt < buf[0].at) {
            // render time precedes the oldest kept snapshot (packet bunching
            // after a stall). The ring is 12-deep (~265ms) so this is rare;
            // hold the oldest frame instead of freezing forever.
            world = extrap(buf[0].d, 0);
          } else {
            let idx = -1;
            for (let i = 0; i < buf.length - 1; i++) {
              if (rt >= buf[i].at && rt < buf[i + 1].at) { idx = i; break; }
            }
            if (idx >= 0) {
              const s1 = buf[idx].d;
              const s2 = buf[idx + 1].d;
              const span = Math.max(buf[idx + 1].at - buf[idx].at, 1);
              world = seg(s1, s2, (rt - buf[idx].at) / span);
            } else {
              // rt beyond the newest snapshot → dead-reckon forward from it
              const lastS = buf[buf.length - 1];
              world = extrap(lastS.d, rt - lastS.at);
            }
          }
        }

        if (world) {
          players = world.players;
          ball = world.ball;
          // my own disc: sampled from prediction history at the SAME rt that
          // drives the world — keeps on-screen contact == simulated contact
          if (hist.length > 0 && predRef.current) {
            let mine = null;
            if (rt <= hist[0].at) {
              const h = hist[0];
              mine = { x: h.x, y: h.y, vx: h.vx, vy: h.vy };
            } else {
              let matched = false;
              for (let i = 0; i < hist.length - 1; i++) {
                if (rt >= hist[i].at && rt < hist[i + 1].at) {
                  const a = hist[i];
                  const b3 = hist[i + 1];
                  const span = Math.max(b3.at - a.at, 1);
                  const alpha = (rt - a.at) / span;
                  mine = {
                    x: lerp(a.x, b3.x, alpha),
                    y: lerp(a.y, b3.y, alpha),
                    vx: b3.vx, vy: b3.vy,
                  };
                  matched = true;
                  break;
                }
              }
              if (!matched) {
                // rt beyond the newest history point → extrapolate from it
                const h = hist[hist.length - 1];
                const k = Math.min(rt - h.at, MAX_EXTRAPOLATE_MS) / 1000 * 0.9;
                mine = { x: h.x + h.vx * k, y: h.y + h.vy * k, vx: h.vx, vy: h.vy };
              }
            }
            players[mySide] = mine;
          } else if (predRef.current) {
            const pr = predRef.current;
            players[mySide] = { x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy };
          }

          // display-level safety: my disc never visually overlaps ball/opponent
          const mine = players[mySide];
          const pushOut = (cx, cy, minDist) => {
            const dx = mine.x - cx;
            const dy = mine.y - cy;
            const dist = Math.hypot(dx, dy) || 0.0001;
            if (dist < minDist) {
              const nx = dx / dist;
              const ny = dy / dist;
              mine.x = cx + nx * minDist;
              mine.y = cy + ny * minDist;
            }
          };
          pushOut(world.ball.x, world.ball.y, PLAYER_R + BALL_R);
          pushOut(world.players[1 - mySide]?.x ?? -1000, world.players[1 - mySide]?.y ?? -1000, PLAYER_R * 2);
        } else {
          // no snapshots yet → static kickoff view
          players = simRef.current.players;
          ball = simRef.current.ball;
        }
      }

      // players: [0]=host red bottom half, [1]=guest blue top half (world)
      const colors = [theme.red, theme.blue];
      players.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
        ctx.fillStyle = colors[i];
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = theme.ink;
        ctx.stroke();
        // facing dot
        const sp = Math.hypot(p.vx, p.vy);
        const fx = sp > 5 ? p.vx / sp : 0;
        const fy = sp > 5 ? p.vy / sp : (i === 0 ? -1 : 1);
        ctx.beginPath();
        ctx.arc(p.x + fx * PLAYER_R * 0.48, p.y + fy * PLAYER_R * 0.48, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      });

      // ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = theme.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = theme.ink;
      ctx.fill();

      // dev-only debug probe (dead-code-eliminated in production builds):
      // lets external CDP tests verify world positions
      if (process.env.NODE_ENV !== 'production') {
        window.__fb = window.__fb || {};
        window.__fb.players = players.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
        window.__fb.ball = { x: Math.round(ball.x), y: Math.round(ball.y) };
        window.__fb.stalled = !!stalledRef.current;
      }

      ctx.restore();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amHost]);

  /* ── derived UI values ───────────────────────────────────────────── */
  const rule = normalizeRule(cfg || DEFAULT_RULE);
  const myScore = ui.scores[mySide];
  const theirScore = ui.scores[1 - mySide];
  const countdown = Math.ceil(ui.phaseLeftMs / 1000);

  const matchTag = rule.mode === 'time'
    ? `${Math.floor(ui.clockSecond / 60)}:${String(Math.max(ui.clockSecond, 0) % 60).padStart(2, '0')} left`
    : `first to ${rule.n}`;

  const onRematch = () => {
    if (amHost) {
      hostReset();
    } else {
      try { sendViaPeer && sendViaPeer({ type: 'football-rematch' }); } catch (_) {}
      setUi((prev) => ({ ...prev, waitingRematch: true }));
    }
  };

  const drawText = ui.winner === null ? 'Draw 🤝' : (ui.winner === mySide ? 'You win! 🏆' : 'Stranger wins');

  return (
    <GameWrap>
      <ScoreRow>
        <ScoreCard>
          <TeamBead $color={amHost ? '#FF3B30' : '#2D7FF9'} />
          <ScoreName>You</ScoreName>
          <ScoreNum>{myScore}</ScoreNum>
        </ScoreCard>
        <MatchTag>{matchTag}</MatchTag>
        <ScoreCard>
          <ScoreNum>{theirScore}</ScoreNum>
          <ScoreName>Stranger</ScoreName>
          <TeamBead $color={amHost ? '#2D7FF9' : '#FF3B30'} />
        </ScoreCard>
      </ScoreRow>

      <PitchFrame $w={PITCH.W} $h={PITCH.H}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <PitchCanvas ref={canvasRef} tabIndex={-1} />

        {ui.phase === 'countdown' && (
          <CenterOverlay $dim>
            <CountdownNum>{Math.max(countdown, 1)}</CountdownNum>
            <ReadyHint>Get ready — WASD / arrows to move, Space to kick</ReadyHint>
          </CenterOverlay>
        )}
        {ui.phase === 'goal' && (
          <CenterOverlay $dim>
            <GoalFlash>
              {ui.lastGoalBy === mySide ? 'GOAL! You scored 🎉' : 'Goal by Stranger'}
            </GoalFlash>
          </CenterOverlay>
        )}
        {ui.stalled && ui.phase !== 'over' && (
          <CenterOverlay $dim>
            <ReadyHint>Partner's window is hidden — waiting…</ReadyHint>
          </CenterOverlay>
        )}
        {ui.phase === 'over' && (
          <EndCard>
            <EndTitle>{drawText}</EndTitle>
            <EndScore>{myScore} – {theirScore}</EndScore>
            <EndActions>
              {!ui.waitingRematch && (
                <EndButton className="primary" onClick={onRematch}>Play Again</EndButton>
              )}
              {ui.waitingRematch && <ReadyHint>Waiting for stranger…</ReadyHint>}
              <EndButton className="ghost" onClick={onExit}>Exit</EndButton>
            </EndActions>
          </EndCard>
        )}

        {isTouch && ui.phase !== 'over' && (
          <>
            <JoystickBase>
              <JoystickKnob $dx={knob.dx} $dy={knob.dy} />
            </JoystickBase>
            <KickButton
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onTouchKickDown(); }}
              onPointerUp={(e) => { e.stopPropagation(); onTouchKickUp(); }}
              onPointerCancel={onTouchKickUp}
            >
              <FiZap />
            </KickButton>
          </>
        )}
      </PitchFrame>
    </GameWrap>
  );
});

export default UiRef;
