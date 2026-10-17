/**
 * Football engine (HaxBall-style, 1v1): full 2D physics for the in-call game.
 * Board: rectangular pitch, players = circles, ball = circle, goals in the left/right
 * walls with round posts. Host-authoritative: only the host runs stepMatch(); the
 * guest receives snapshots over the WebRTC data channel and renders them.
 *
 * Coordinate convention: world x=[0..W], y=[0..H]. Host is side 0 (left half,
 * defends LEFT goal, attacks RIGHT goal). Guest is side 1 (right half, defends
 * RIGHT goal, attacks LEFT goal). scores[0] = host goals, scores[1] = guest goals.
 * The guest client renders the state rotated 180° so both players always see
 * themselves attacking to the right.
 */

export const PITCH = {
  W: 1050,
  H: 626,
  GOAL_H: 200, // opening height of each goal mouth
  GOAL_DEPTH: 46, // net depth behind the goal line (visual + score threshold)
  POST_R: 8, // goal post radius (static circles at the goal mouth corners)
};

export const PLAYER_R = 30;
export const BALL_R = 15;
export const KICK_RANGE = 8; // extra reach for the kick action
export const KICK_POWER = 700; // u/s applied to the ball on kick
export const KICK_COOLDOWN_MS = 260;

export const WIN_SCORE = 3; // first to N goals wins
export const COUNTDOWN_MS = 5000; // pre-match / kickoff countdown
export const GOAL_PAUSE_MS = 1800; // celebration pause after each goal

// Per-second physics constants (host integrates at fixed STEP = 1/120 s)
export const STEP = 1 / 120;
const PLAYER_THRUST = 1500; // u/s^2 while input held
const PLAYER_MAX_SPEED = 340; // u/s
const PLAYER_DAMPING = 4.5; // v *= (1 - k*dt) per axis → terminal ≈ THRUST/k
const BALL_DAMPING = 0.8; // ball slows to ~45% speed each second
const BALL_MAX_SPEED = 900;
const WALL_E = 0.85; // wall restitution for the ball
const PB_E = 0.6; // player↔ball restitution
const PP_E = 0.3; // player↔player restitution
const PLAYER_M = 3;
const BALL_M = 1;

/**
 * Fresh match. `now` is the host's Date.now(); phases are driven by phaseLeftMs
 * which the host decrements, so the guest never needs wall-clock sync.
 */
export function createMatchState(now = Date.now()) {
  return {
    phase: 'countdown', // countdown | playing | goal | over
    phaseLeftMs: COUNTDOWN_MS,
    scores: [0, 0],
    lastGoalBy: null, // 0 | 1 | null — side that scored last (for the flash)
    winner: null, // 0 | 1 | null
    players: [
      { x: PITCH.W * 0.25, y: PITCH.H / 2, vx: 0, vy: 0, kickCd: 0 },
      { x: PITCH.W * 0.75, y: PITCH.H / 2, vx: 0, vy: 0, kickCd: 0 },
    ],
    ball: { x: PITCH.W / 2, y: PITCH.H / 2, vx: 0, vy: 0 },
  };
}

function kickoffPositions(state) {
  const p = state.players;
  p[0].x = PITCH.W * 0.25; p[0].y = PITCH.H / 2; p[0].vx = 0; p[0].vy = 0; p[0].kickCd = 0;
  p[1].x = PITCH.W * 0.75; p[1].y = PITCH.H / 2; p[1].vx = 0; p[1].vy = 0; p[1].kickCd = 0;
  state.ball.x = PITCH.W / 2; state.ball.y = PITCH.H / 2; state.ball.vx = 0; state.ball.vy = 0;
}

/** Normalize an input object: {mx,my,kick} with mx,my in [-1,1]. */
export function normalizeInput(raw) {
  let mx = Number(raw?.mx) || 0;
  let my = Number(raw?.my) || 0;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  return { mx, my, kick: !!raw?.kick };
}

const POSTS = [
  { x: 0, y: PITCH.H / 2 - PITCH.GOAL_H / 2 },
  { x: 0, y: PITCH.H / 2 + PITCH.GOAL_H / 2 },
  { x: PITCH.W, y: PITCH.H / 2 - PITCH.GOAL_H / 2 },
  { x: PITCH.W, y: PITCH.H / 2 + PITCH.GOAL_H / 2 },
];

function collidePosts(obj, isBall) {
  for (const post of POSTS) {
    const dx = obj.x - post.x;
    const dy = obj.y - post.y;
    const minDist = (isBall ? BALL_R : PLAYER_R) + PITCH.POST_R;
    const dist = Math.hypot(dx, dy) || 0.0001;
    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      obj.x = post.x + nx * minDist;
      obj.y = post.y + ny * minDist;
      const vn = obj.vx * nx + obj.vy * ny;
      if (vn < 0) {
        obj.vx -= (1 + WALL_E) * vn * nx;
        obj.vy -= (1 + WALL_E) * vn * ny;
      }
    }
  }
}

/**
 * One fixed physics step. `inputs` = [hostInput, guestInput], each normalized.
 * Mutates and returns the same state object (host keeps it in a ref).
 */
export function stepMatch(state, inputs, dt, now = Date.now()) {
  const { phase } = state;

  // Phase machine first — it gates whether physics runs at all.
  if (phase === 'countdown' || phase === 'goal') {
    state.phaseLeftMs -= dt * 1000;
    if (state.phaseLeftMs <= 0) {
      if (phase === 'countdown') {
        state.phase = 'playing';
        state.phaseLeftMs = 0;
      } else {
        // goal celebration over → kickoff reset, straight back to play
        kickoffPositions(state);
        state.phase = 'playing';
        state.phaseLeftMs = 0;
      }
    }
    return state;
  }
  if (phase === 'over') return state;

  // ── playing ────────────────────────────────────────────────────────
  const damp = 1 - PLAYER_DAMPING * dt;
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const inp = inputs[i] || { mx: 0, my: 0, kick: false };

    p.vx += inp.mx * PLAYER_THRUST * dt;
    p.vy += inp.my * PLAYER_THRUST * dt;
    p.vx *= damp;
    p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > PLAYER_MAX_SPEED) {
      p.vx = (p.vx / sp) * PLAYER_MAX_SPEED;
      p.vy = (p.vy / sp) * PLAYER_MAX_SPEED;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kickCd > 0) p.kickCd -= dt * 1000;

    // players clamp at walls (slide, no bounce)
    if (p.x < PLAYER_R) { p.x = PLAYER_R; p.vx = Math.max(0, p.vx); }
    if (p.x > PITCH.W - PLAYER_R) { p.x = PITCH.W - PLAYER_R; p.vx = Math.min(0, p.vx); }
    if (p.y < PLAYER_R) { p.y = PLAYER_R; p.vy = Math.max(0, p.vy); }
    if (p.y > PITCH.H - PLAYER_R) { p.y = PITCH.H - PLAYER_R; p.vy = Math.min(0, p.vy); }

    collidePosts(p, false);
  }

  // player ↔ player
  const a = state.players[0];
  const b = state.players[1];
  {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = PLAYER_R * 2;
    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) / 2;
      a.x -= nx * overlap; a.y -= ny * overlap;
      b.x += nx * overlap; b.y += ny * overlap;
      const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rvn < 0) {
        const j = -(1 + PP_E) * rvn / 2;
        a.vx -= j * nx; a.vy -= j * ny;
        b.vx += j * nx; b.vy += j * ny;
      }
    }
  }

  // kick: only when close enough and off cooldown
  const ball = state.ball;
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const inp = inputs[i];
    const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
    if (inp.kick && p.kickCd <= 0 && dist <= PLAYER_R + BALL_R + KICK_RANGE) {
      const nx = (ball.x - p.x) / (dist || 0.0001);
      const ny = (ball.y - p.y) / (dist || 0.0001);
      ball.vx = nx * KICK_POWER + p.vx * 0.5;
      ball.vy = ny * KICK_POWER + p.vy * 0.5;
      p.kickCd = KICK_COOLDOWN_MS;
    }
  }

  // ball damping + speed cap + integrate
  const bd = 1 - BALL_DAMPING * dt;
  ball.vx *= bd;
  ball.vy *= bd;
  const bsp = Math.hypot(ball.vx, ball.vy);
  if (bsp > BALL_MAX_SPEED) {
    ball.vx = (ball.vx / bsp) * BALL_MAX_SPEED;
    ball.vy = (ball.vy / bsp) * BALL_MAX_SPEED;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // ball ↔ players (ball is pushed out fully; player nudged by reaction)
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = PLAYER_R + BALL_R;
    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      ball.x = p.x + nx * minDist;
      ball.y = p.y + ny * minDist;
      const rvn = (ball.vx - p.vx) * nx + (ball.vy - p.vy) * ny;
      if (rvn < 0) {
        // impulse along normal, ball takes most of it
        const j = -(1 + PB_E) * rvn / (1 / BALL_M + 1 / PLAYER_M);
        ball.vx += (j * nx) / BALL_M;
        ball.vy += (j * ny) / BALL_M;
        p.vx -= (j * nx) / PLAYER_M;
        p.vy -= (j * ny) / PLAYER_M;
      }
    }
  }

  // ball ↔ walls (goal mouths stay open)
  const inMouth = Math.abs(ball.y - PITCH.H / 2) < PITCH.GOAL_H / 2;
  if (!inMouth) {
    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * WALL_E; }
    if (ball.x + BALL_R > PITCH.W) { ball.x = PITCH.W - BALL_R; ball.vx = -Math.abs(ball.vx) * WALL_E; }
  } else {
    // inside the mouth the ball flies into the net
    if (ball.x > PITCH.W + PITCH.GOAL_DEPTH - BALL_R) ball.x = PITCH.W + PITCH.GOAL_DEPTH - BALL_R;
    if (ball.x < BALL_R - PITCH.GOAL_DEPTH) ball.x = BALL_R - PITCH.GOAL_DEPTH;
  }
  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * WALL_E; }
  if (ball.y + BALL_R > PITCH.H) { ball.y = PITCH.H - BALL_R; ball.vy = -Math.abs(ball.vy) * WALL_E; }
  collidePosts(ball, true);

  // goals: ball fully past the line
  if (ball.x - BALL_R > PITCH.W && inMouth) {
    state.scores[0] += 1; // host attacks the right goal
    state.lastGoalBy = 0;
    afterGoal(state, now);
  } else if (ball.x + BALL_R < 0 && inMouth) {
    state.scores[1] += 1; // guest attacks the left goal
    state.lastGoalBy = 1;
    afterGoal(state, now);
  }

  return state;
}

function afterGoal(state, now) {
  const winner = state.scores[0] >= WIN_SCORE ? 0 : state.scores[1] >= WIN_SCORE ? 1 : null;
  if (winner !== null) {
    state.phase = 'over';
    state.winner = winner;
    state.phaseLeftMs = 0;
  } else {
    state.phase = 'goal';
    state.phaseLeftMs = GOAL_PAUSE_MS;
  }
}

/**
 * Compact wire format for the 30 Hz host broadcast (rounded to 1 decimal,
 * ~150 bytes). Guest renders by interpolating between the last two snapshots.
 */
export function serializeState(state) {
  return {
    p: state.players.map((p) => [
      Math.round(p.x * 10) / 10,
      Math.round(p.y * 10) / 10,
      Math.round(p.vx * 10) / 10,
      Math.round(p.vy * 10) / 10,
    ]),
    b: [
      Math.round(state.ball.x * 10) / 10,
      Math.round(state.ball.y * 10) / 10,
      Math.round(state.ball.vx * 10) / 10,
      Math.round(state.ball.vy * 10) / 10,
    ],
    s: [state.scores[0], state.scores[1]],
    ph: state.phase === 'playing' ? 1 : state.phase === 'goal' ? 2 : state.phase === 'over' ? 3 : 0,
    pl: Math.max(0, Math.round(state.phaseLeftMs)),
    lw: state.lastGoalBy === null ? -1 : state.lastGoalBy,
    w: state.winner === null ? -1 : state.winner,
  };
}

const PHASE_BY_CODE = ['countdown', 'playing', 'goal', 'over'];

/** Rebuild a renderable state from a host snapshot (guest side). */
export function deserializeState(d) {
  return {
    phase: PHASE_BY_CODE[d.ph] || 'countdown',
    phaseLeftMs: d.pl || 0,
    scores: [d.s?.[0] ?? 0, d.s?.[1] ?? 0],
    lastGoalBy: d.lw === -1 || d.lw === undefined ? null : d.lw,
    winner: d.w === -1 || d.w === undefined ? null : d.w,
    players: (d.p || []).map((p) => ({ x: p[0], y: p[1], vx: p[2], vy: p[3], kickCd: 0 })),
    ball: { x: d.b?.[0] ?? PITCH.W / 2, y: d.b?.[1] ?? PITCH.H / 2, vx: d.b?.[2] ?? 0, vy: d.b?.[3] ?? 0 },
  };
}
