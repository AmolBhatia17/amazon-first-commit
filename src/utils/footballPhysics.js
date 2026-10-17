/**
 * Football engine (HaxBall-style, 1v1) — VERTICAL pitch: goals in the TOP and
 * BOTTOM walls. Each player sees their own goal at the bottom of the screen
 * (the guest client renders the host world rotated 180°), attacking upward.
 *
 * Board: world x=[0..W] (width), y=[0..H] (height, portrait). The goal lines sit
 * inside the canvas: TOP goal line at y=GOAL_TOP, BOTTOM goal line at y=H-GOAL_DEPTH;
 * the strips beyond them are the nets.
 * Host is side 0: red, defends the BOTTOM goal, attacks the TOP goal →
 * crossing the TOP goal line scores for the host. Guest is side 1: blue,
 * defends the TOP goal, attacks the BOTTOM goal.
 *
 * Match rule carries from the fun-request key ("football:goals-3" | "football:time-2")
 * as cfg = {mode:'goals'|'time', n}. Host-authoritative: only the host runs
 * stepMatch(); the guest receives serialized snapshots over the peer data channel.
 */

export const PITCH = {
  W: 626, // width (portrait)
  H: 1050, // height (portrait)
  GOAL_H: 194, // opening width of each goal mouth
  GOAL_DEPTH: 46, // net depth behind each goal line
  POST_R: 8, // goal post radius (static circles at the goal mouth corners)
};

export const PLAYER_R = 30;
export const BALL_R = 15;
export const KICK_RANGE = 24; // extra reach for the kick action (forgiving touch)
export const KICK_POWER = 700; // u/s applied to the ball on kick
export const KICK_COOLDOWN_MS = 260;

export const DEFAULT_RULE = { mode: 'goals', n: 3 };
export const COUNTDOWN_MS = 5000; // pre-match / kickoff countdown
export const GOAL_PAUSE_MS = 1800; // celebration pause after each goal

// Per-second physics constants (host integrates at fixed STEP = 1/120 s)
export const STEP = 1 / 120;
export const PLAYER_THRUST = 1500; // u/s^2 while input held
export const PLAYER_MAX_SPEED = 340; // u/s
export const PLAYER_DAMPING = 4.5; // v *= (1 - k*dt) per axis → terminal ≈ THRUST/k
const BALL_DAMPING = 0.8; // ball slows to ~45% speed each second
const BALL_MAX_SPEED = 900;
const WALL_E = 0.85; // wall restitution for the ball
const PB_E = 0.6; // player↔ball restitution
const PP_E = 0.3; // player↔player restitution
const PLAYER_M = 3;
const BALL_M = 1;

/** Normalize a rule object coming from the page/peer. */
export function normalizeRule(raw) {
  const mode = raw?.mode === 'time' ? 'time' : 'goals';
  let n = parseInt(raw?.n, 10);
  if (!Number.isFinite(n) || n < 1) n = mode === 'time' ? 2 : 3;
  if (mode === 'goals' && n > 10) n = 10;
  if (mode === 'time' && n > 15) n = 15;
  return { mode, n };
}

export function goalLineTop() { return PITCH.GOAL_DEPTH; }
export function goalLineBottom() { return PITCH.H - PITCH.GOAL_DEPTH; }

/**
 * Fresh match. `now` is the host's Date.now(); phases are driven by phaseLeftMs
 * which the host decrements, so the guest never needs wall-clock sync.
 */
export function createMatchState(rule = DEFAULT_RULE, now = Date.now()) {
  const r = normalizeRule(rule);
  return {
    rule: r, // {mode, n} — loop-invariant
    phase: 'countdown', // countdown | playing | goal | over
    phaseLeftMs: COUNTDOWN_MS,
    clockMs: r.mode === 'time' ? r.n * 60 * 1000 : 0, // counts only while playing/goal
    scores: [0, 0],
    lastGoalBy: null, // 0 | 1 | null — side that scored last (for the flash)
    winner: null, // 0 | 1 | null (null in time-mode also means "draw at expiry")
    players: [
      { x: PITCH.W / 2, y: PITCH.H * 0.76, vx: 0, vy: 0, kickCd: 0 }, // host, bottom
      { x: PITCH.W / 2, y: PITCH.H * 0.24, vx: 0, vy: 0, kickCd: 0 }, // guest, top
    ],
    ball: { x: PITCH.W / 2, y: PITCH.H / 2, vx: 0, vy: 0 },
  };
}

function kickoffPositions(state) {
  const p = state.players;
  p[0].x = PITCH.W / 2; p[0].y = PITCH.H * 0.76; p[0].vx = 0; p[0].vy = 0; p[0].kickCd = 0;
  p[1].x = PITCH.W / 2; p[1].y = PITCH.H * 0.24; p[1].vx = 0; p[1].vy = 0; p[1].kickCd = 0;
  state.ball.x = PITCH.W / 2; state.ball.y = PITCH.H / 2; state.ball.vx = 0; state.ball.vy = 0;
}

/** Normalize an input object: {mx,my,kick} with mx,my in [-1,1] (sender's screen frame). */
export function normalizeInput(raw) {
  let mx = Number(raw?.mx) || 0;
  let my = Number(raw?.my) || 0;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  return { mx, my, kick: !!raw?.kick };
}

const POSTS = [
  { x: PITCH.W / 2 - PITCH.GOAL_H / 2, y: goalLineTop() },
  { x: PITCH.W / 2 + PITCH.GOAL_H / 2, y: goalLineTop() },
  { x: PITCH.W / 2 - PITCH.GOAL_H / 2, y: goalLineBottom() },
  { x: PITCH.W / 2 + PITCH.GOAL_H / 2, y: goalLineBottom() },
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
 * One fixed physics step. `inputs` = [hostInput, guestInput], each normalized
 * in the SENDER'S screen frame (host = world frame, guest = mirrored).
 * Mutates and returns the same state object (host keeps it in a ref).
 */
export function stepMatch(state, inputs, dt, now = Date.now()) {
  const { phase } = state;

  // Phase machine first — it gates whether physics runs at all.
  if (phase === 'countdown' || phase === 'goal') {
    state.phaseLeftMs -= dt * 1000;
    if (state.rule.mode === 'time' && phase === 'goal') {
      state.clockMs -= dt * 1000;
      if (state.clockMs <= 0) { state.clockMs = 0; return endByClock(state); }
    }
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
  // Timed rule: the match clock keeps running through play (and goal pauses).
  if (state.rule.mode === 'time') {
    state.clockMs -= dt * 1000;
    if (state.clockMs <= 0) { state.clockMs = 0; return endByClock(state); }
  }

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
        const j = -(1 + PB_E) * rvn / (1 / BALL_M + 1 / PLAYER_M);
        ball.vx += (j * nx) / BALL_M;
        ball.vy += (j * ny) / BALL_M;
        p.vx -= (j * nx) / PLAYER_M;
        p.vy -= (j * ny) / PLAYER_M;
      }
    }
  }

  // ball ↔ walls: side walls always solid; top/bottom walls solid except the mouths
  const inMouth = Math.abs(ball.x - PITCH.W / 2) < PITCH.GOAL_H / 2;
  const topLine = goalLineTop();
  const bottomLine = goalLineBottom();
  if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * WALL_E; }
  if (ball.x + BALL_R > PITCH.W) { ball.x = PITCH.W - BALL_R; ball.vx = -Math.abs(ball.vx) * WALL_E; }
  if (!inMouth) {
    if (ball.y - BALL_R < topLine) { ball.y = topLine + BALL_R; ball.vy = Math.abs(ball.vy) * WALL_E; }
    if (ball.y + BALL_R > bottomLine) { ball.y = bottomLine - BALL_R; ball.vy = -Math.abs(ball.vy) * WALL_E; }
  } else {
    // inside a mouth the ball flies into the net strip
    if (ball.y + BALL_R < topLine) ball.y = topLine - PITCH.GOAL_DEPTH + BALL_R;
    if (ball.y - BALL_R > bottomLine) ball.y = bottomLine + PITCH.GOAL_DEPTH - BALL_R;
  }
  collidePosts(ball, true);

  // goals: ball fully past the line (host attacks TOP, guest attacks BOTTOM)
  if (ball.y + BALL_R < topLine && inMouth) {
    state.scores[0] += 1;
    state.lastGoalBy = 0;
    afterGoal(state);
  } else if (ball.y - BALL_R > bottomLine && inMouth) {
    state.scores[1] += 1;
    state.lastGoalBy = 1;
    afterGoal(state);
  }

  return state;
}

function afterGoal(state) {
  // First-to-N rule can end the game here; timed rule continues until the clock dies.
  if (state.rule.mode === 'goals') {
    if (state.scores[0] >= state.rule.n || state.scores[1] >= state.rule.n) {
      state.phase = 'over';
      state.winner = state.scores[0] >= state.rule.n ? 0 : 1;
      state.phaseLeftMs = 0;
      return;
    }
  }
  state.phase = 'goal';
  state.phaseLeftMs = GOAL_PAUSE_MS;
}

function endByClock(state) {
  state.phase = 'over';
  state.winner = state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1;
  state.phaseLeftMs = 0;
}

/**
 * Compact wire format for the 30 Hz host broadcast (rounded to 1 decimal,
 * ~170 bytes). Guest renders by blending toward the latest snapshot.
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
    cm: Math.max(0, Math.round(state.clockMs || 0)),
    lw: state.lastGoalBy === null ? -1 : state.lastGoalBy,
    w: state.winner === null ? -1 : state.winner,
  };
}

const PHASE_BY_CODE = ['countdown', 'playing', 'goal', 'over'];
const RULE_BY_CODE = ['goals', 'time'];

/** Rebuild a renderable state from a host snapshot (guest side). */
export function deserializeState(d) {
  return {
    phase: PHASE_BY_CODE[d.ph] || 'countdown',
    phaseLeftMs: d.pl || 0,
    clockMs: d.cm || 0,
    scores: [d.s?.[0] ?? 0, d.s?.[1] ?? 0],
    lastGoalBy: d.lw === -1 || d.lw === undefined ? null : d.lw,
    winner: d.w === -1 || d.w === undefined ? null : d.w,
    players: (d.p || []).map((p) => ({ x: p[0], y: p[1], vx: p[2], vy: p[3], kickCd: 0 })),
    ball: { x: d.b?.[0] ?? PITCH.W / 2, y: d.b?.[1] ?? PITCH.H / 2, vx: d.b?.[2] ?? 0, vy: d.b?.[3] ?? 0 },
  };
}

/* ── fun-request key helpers (config rides inside the relayed game string,
      since the server forwards only that field) ───────────────────────── */

const FOOTBALL_OPTIONS = [
  { key: 'football:goals-1', cfg: { mode: 'goals', n: 1 } },
  { key: 'football:goals-3', cfg: { mode: 'goals', n: 3 } },
  { key: 'football:goals-5', cfg: { mode: 'goals', n: 5 } },
  { key: 'football:time-2', cfg: { mode: 'time', n: 2 } },
  { key: 'football:time-3', cfg: { mode: 'time', n: 3 } },
  { key: 'football:time-5', cfg: { mode: 'time', n: 5 } },
];

export function isFootballOptionKey(key) {
  return FOOTBALL_OPTIONS.some((o) => o.key === key);
}

/** 'football:goals-3' → the option entry; null for anything else. */
export function parseFootballGameKey(key) {
  return FOOTBALL_OPTIONS.find((o) => o.key === key) || null;
}

/** Human label for the request card, e.g. 'Football · First to 3'. */
export function footballLabelFromKey(key) {
  const o = parseFootballGameKey(key);
  if (!o) return null;
  return o.cfg.mode === 'goals' ? `Football · First to ${o.cfg.n}` : `Football · ${o.cfg.n} minutes`;
}
