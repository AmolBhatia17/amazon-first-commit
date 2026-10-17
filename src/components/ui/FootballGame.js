/**
 * Football game UI (HaxBall-style 1v1) over the peer data channel.
 * Self-contained like ChessBoard: the page only passes amHost + callbacks;
 * all simulation, input, rendering and overlays live here.
 *
 * Contract with the page:
 *   <FootballGame ref={footballRef} amHost={isInitiator} sendViaPeer={fn} onExit={fn} />
 *   page peer.on('data') dispatches obj.type starting with 'football' to
 *   footballRef.current.onPeerMessage(obj).
 *
 * Netcode (host-authoritative):
 *   host → guest : { type:'football-state', d:<serializeState()> } @30Hz
 *   guest → host : { type:'football-input', mx, my, kick } on change
 *   either       : { type:'football-rematch' } guest proposes, host resets
 */
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import styled from 'styled-components';
import { FiZap } from 'react-icons/fi';
import {
  PITCH, PLAYER_R, BALL_R, STEP, WIN_SCORE,
  createMatchState, stepMatch, normalizeInput, serializeState, deserializeState,
} from '../../utils/footballPhysics';

const BROADCAST_HZ = 30;

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
  max-width: 640px;
  justify-content: center;
`;

const ScoreCard = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px;
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
`;

/* ── Pitch canvas ──────────────────────────────────────────────────── */
const PitchFrame = styled.div`
  position: relative;
  width: min(100%, 640px);
  border: 2px solid ${({ theme }) => theme.colors.ink};
  border-radius: ${({ theme }) => theme.radii.panel};
  background: ${({ theme }) => theme.colors.paper};
  overflow: hidden;
  flex-shrink: 0;
  touch-action: none; /* joystick drags must not scroll the page */
`;

const PitchCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: auto;
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
  font-size: clamp(30px, 7vw, 52px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.paper};
  background: ${({ theme }) => theme.colors.ink};
  border: 2px solid ${({ theme }) => theme.colors.paper};
  padding: 8px 26px;
  border-radius: ${({ theme }) => theme.radii.bubble};
  animation: goalPop 0.34s cubic-bezier(0.34, 1.4, 0.64, 1);

  @keyframes goalPop {
    from { transform: scale(0.7); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;

const ReadyHint = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.sunTint};
  border: 1.5px solid ${({ theme }) => theme.colors.sunDeep};
  padding: 6px 14px;
  border-radius: 999px;
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
  font-size: clamp(24px, 5vw, 40px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.paper};
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

const UiRef = forwardRef(function FootballGame({ amHost, sendViaPeer, onExit }, ref) {
  /* my side in world coords: host = 0 (left), guest = 1 (right) */
  const mySide = amHost ? 0 : 1;

  /* ── authoritative sim (host only) ───────────────────────────────── */
  const simRef = useRef(null);          // world state the host mutates
  const inputRef = useRef({ mx: 0, my: 0, kick: false });   // my input
  const remoteInputRef = useRef({ mx: 0, my: 0, kick: false });
  const accRef = useRef(0);
  const lastFrameRef = useRef(0);
  const netAccRef = useRef(0);

  /* ── guest-side snapshot buffer ─────────────────────────────────── */
  const snapRef = useRef({ prev: null, prevAt: 0, latest: null, latestAt: 0 });

  /* ── render state mirrored to React at low frequency ────────────── */
  const [ui, setUi] = useState({
    scores: [0, 0],
    phase: 'countdown',
    phaseLeftMs: 5000,
    lastGoalBy: null,
    winner: null,
    waitingRematch: false,
  });

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const phaseRef = useRef('countdown');
  phaseRef.current = ui.phase;

  const postUi = (state) => {
    setUi((prev) => {
      if (
        prev.scores[0] === state.scores[0] &&
        prev.scores[1] === state.scores[1] &&
        prev.phase === state.phase &&
        prev.lastGoalBy === state.lastGoalBy &&
        prev.winner === state.winner &&
        Math.ceil(prev.phaseLeftMs / 1000) === Math.ceil(state.phaseLeftMs / 1000)
      ) {
        return prev;
      }
      return {
        scores: [state.scores[0], state.scores[1]],
        phase: state.phase,
        phaseLeftMs: state.phaseLeftMs,
        lastGoalBy: state.lastGoalBy,
        winner: state.winner,
        waitingRematch: state.phase === 'over' ? prev.waitingRematch : false,
      };
    });
  };

  const hostReset = () => {
    simRef.current = createMatchState();
    netAccRef.current = 0;
    accRef.current = 0;
  };

  /* ── page → game bridge ─────────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    onPeerMessage(obj) {
      if (!obj) return;
      if (obj.type === 'football-state' && obj.d) {
        // guest receives host truth
        const now = performance.now();
        const snap = snapRef.current;
        snap.prev = snap.latest;
        snap.prevAt = snap.latestAt;
        snap.latest = obj.d;
        snap.latestAt = now;
        if (snap.prev === null) { snap.prev = obj.d; snap.prevAt = now - 33; }
        postUi(deserializeState(obj.d));
        return;
      }
      if (obj.type === 'football-input') {
        remoteInputRef.current = normalizeInput(obj);
        return;
      }
      if (obj.type === 'football-rematch' && amHost) {
        hostReset();
        return;
      }
    },
  }));

  useEffect(() => {
    if (amHost) hostReset();
    // guest waits for the first football-state; keep a local kickoff state for the frame before it arrives
    else simRef.current = createMatchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── my input: keyboard ─────────────────────────────────────────── */
  const sendRef = useRef(false);
  const lastSentInputRef = useRef({ mx: 0, my: 0, kick: false });
  const keysRef = useRef(new Set());
  useEffect(() => {
    const isTypingTarget = (e) => {
      const t = e.target;
      const tag = t && t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable);
    };
    const onDown = (e) => {
      if (isTypingTarget(e)) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) || k === 'x' || k === 'w' || k === 'a' || k === 's' || k === 'd') {
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
        keysRef.current.add(k);
        sendRef.current = true;
      }
    };
    const onUp = (e) => {
      keysRef.current.delete(e.key.toLowerCase());
      sendRef.current = true;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /* joystick (touch) */
  const touchRef = useRef({ active: false, id: null, ox: 0, oy: 0 });
  const [knob, setKnob] = useState({ dx: 0, dy: 0, active: false });
  const [kickHeld, setKickHeld] = useState(false);
  const isTouch = useMemo(() => typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0), []);

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

  /* ── main frame loop ─────────────────────────────────────────────── */
  useEffect(() => {
    let raf = 0;
    const computeKeyboard = () => {
      const k = keysRef.current;
      let mx = 0;
      let my = 0;
      if (k.has('a') || k.has('arrowleft')) mx -= 1;
      if (k.has('d') || k.has('arrowright')) mx += 1;
      if (k.has('w') || k.has('arrowup')) my -= 1;
      if (k.has('s') || k.has('arrowdown')) my += 1;
      const len = Math.hypot(mx, my);
      if (len > 1) { mx /= len; my /= len; }
      // touch overrides keyboard while dragging
      if (touchRef.current.active) {
        mx = inputRef.current.mx;
        my = inputRef.current.my;
      }
      // joystick + keyboard can never kick; desktop kick keys live here
      const kick = isTouch ? inputRef.current.kick || k.has(' ') || k.has('x') : !!k.has(' ') || !!k.has('x');
      return { mx, my, kick };
    };

    const broadcast = () => {
      const d = serializeState(simRef.current);
      sendViaPeerSafe({ type: 'football-state', d });
    };

    const sendViaPeerSafe = (obj) => {
      try { sendViaPeer && sendViaPeer(obj); } catch (_) {}
    };

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      const now = ts;

      if (amHost) {
        // fixed-step simulation
        const last = lastFrameRef.current || now;
        lastFrameRef.current = now;
        let dt = (now - last) / 1000;
        if (dt > 0.25) dt = 0.25;
        accRef.current += dt;

        const myInput = computeKeyboard();
        inputRef.current = myInput;
        while (accRef.current >= STEP) {
          stepMatch(simRef.current, [myInput, remoteInputRef.current], STEP);
          accRef.current -= STEP;
        }

        // 30Hz broadcast
        netAccRef.current += dt;
        if (netAccRef.current >= 1 / BROADCAST_HZ) {
          netAccRef.current = 0;
          broadcast();
        }
        postUi(simRef.current);
      } else {
        // guest: advance nothing; render interpolates snapshots (done in draw)
        const myInput = computeKeyboard();
        const prev = lastSentInputRef.current;
        if (
          sendRef.current ||
          Math.abs(myInput.mx - prev.mx) > 0.05 ||
          Math.abs(myInput.my - prev.my) > 0.05 ||
          myInput.kick !== prev.kick
        ) {
          lastSentInputRef.current = { mx: myInput.mx, my: myInput.my, kick: myInput.kick };
          sendRef.current = false;
          sendViaPeerSafe({ type: 'football-input', mx: Math.round(myInput.mx * 100) / 100, my: Math.round(myInput.my * 100) / 100, kick: myInput.kick });
        }
      }

      draw(now);
    };

    const draw = (now) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || PITCH.W;
      const cssH = Math.round((cssW * PITCH.H) / PITCH.W);
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }
      const ctx = canvas.getContext('2d');
      const s = pxW / PITCH.W; // world → pixels

      const theme = {
        paper: '#ffffff', paperAlt: '#f7f7f8', ink: '#1c1c1e', line: '#e5e5ea',
        blue: '#2d7ff9', red: '#ff3b30', sun: '#f9c74a', muted: '#8a8a8e',
      };

      // guest view: rotate world 180° so I always attack to the right
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pxW, pxH);
      ctx.save();
      if (!amHost) {
        ctx.translate(pxW, pxH);
        ctx.rotate(Math.PI);
      }
      ctx.scale(s, s);

      // pitch base + centre line/markings
      ctx.fillStyle = theme.paperAlt;
      ctx.fillRect(0, 0, PITCH.W, PITCH.H);
      // outer run-off strip in paper
      ctx.fillStyle = theme.paper;
      ctx.fillRect(0, 0, PITCH.W, 26);
      ctx.fillRect(0, PITCH.H - 26, PITCH.W, 26);
      ctx.strokeStyle = theme.line;
      ctx.lineWidth = 3;
      ctx.strokeRect(26, 26, PITCH.W - 52, PITCH.H - 52);
      ctx.beginPath();
      ctx.moveTo(PITCH.W / 2, 26);
      ctx.lineTo(PITCH.W / 2, PITCH.H - 26);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PITCH.W / 2, PITCH.H / 2, 64, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PITCH.W / 2, PITCH.H / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = theme.line;
      ctx.fill();

      // goal mouths (openings in the side walls) + nets
      const goalY1 = PITCH.H / 2 - PITCH.GOAL_H / 2;
      const goalY2 = PITCH.H / 2 + PITCH.GOAL_H / 2;
      const drawGoal = (side) => {
        // side: 0 = left, 1 = right
        const xLine = side === 0 ? 0 : PITCH.W;
        const dir = side === 0 ? -1 : 1;
        ctx.fillStyle = 'rgba(28,28,30,0.08)';
        ctx.fillRect(side === 0 ? -PITCH.GOAL_DEPTH : PITCH.W, goalY1, PITCH.GOAL_DEPTH, PITCH.GOAL_H);
        // net hatch
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = 2;
        for (let gx = 0; gx < PITCH.GOAL_DEPTH; gx += 12) {
          ctx.beginPath();
          ctx.moveTo(xLine + dir * gx, goalY1);
          ctx.lineTo(xLine + dir * gx, goalY2);
          ctx.stroke();
        }
        // posts
        for (const py of [goalY1, goalY2]) {
          ctx.beginPath();
          ctx.arc(xLine, py, PITCH.POST_R, 0, Math.PI * 2);
          ctx.fillStyle = theme.ink;
          ctx.fill();
        }
      };
      drawGoal(0);
      drawGoal(1);

      // resolve what we render
      let players;
      let ball;
      if (amHost) {
        players = simRef.current.players;
        ball = simRef.current.ball;
      } else {
        // interpolate toward the latest snapshot (85% blend keeps motion smooth at 30Hz)
        const snap = snapRef.current;
        if (!snap.latest) {
          players = simRef.current.players;
          ball = simRef.current.ball;
        } else {
          const a = deserializeState(snap.prev);
          const b2 = deserializeState(snap.latest);
          const mix = (va, vb) => va + (vb - va) * 0.85;
          players = b2.players.map((p, i) => ({
            x: mix(a.players[i].x, p.x),
            y: mix(a.players[i].y, p.y),
            vx: p.vx, vy: p.vy,
          }));
          ball = {
            x: mix(a.ball.x, b2.ball.x),
            y: mix(a.ball.y, b2.ball.y),
          };
        }
      }

      // players: [0]=host red on left half, [1]=guest blue on right half (world)
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
        const fx = sp > 5 ? p.vx / sp : (i === 0 ? 1 : -1);
        const fy = sp > 5 ? p.vy / sp : 0;
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
      // ball pentagon dot (classic)
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = theme.ink;
      ctx.fill();

      ctx.restore();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amHost]);

  /* ── derived UI values ───────────────────────────────────────────── */
  const myScore = ui.scores[mySide];
  const theirScore = ui.scores[1 - mySide];
  const countdown = Math.ceil(ui.phaseLeftMs / 1000);

  const onRematch = () => {
    if (amHost) {
      hostReset();
    } else {
      try { sendViaPeer && sendViaPeer({ type: 'football-rematch' }); } catch (_) {}
      setUi((prev) => ({ ...prev, waitingRematch: true }));
    }
  };

  return (
    <GameWrap ref={wrapRef}>
      <ScoreRow>
        <ScoreCard>
          <TeamBead $color={amHost ? '#FF3B30' : '#2D7FF9'} />
          <ScoreName>You</ScoreName>
          <ScoreNum>{myScore}</ScoreNum>
        </ScoreCard>
        <MatchTag>first to {WIN_SCORE}</MatchTag>
        <ScoreCard>
          <ScoreNum>{theirScore}</ScoreNum>
          <ScoreName>Stranger</ScoreName>
          <TeamBead $color={amHost ? '#2D7FF9' : '#FF3B30'} />
        </ScoreCard>
      </ScoreRow>

      <PitchFrame
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
        {ui.phase === 'over' && (
          <EndCard>
            <EndTitle>{ui.winner === mySide ? 'You win! 🏆' : 'Stranger wins'}</EndTitle>
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
              $held={kickHeld}
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
