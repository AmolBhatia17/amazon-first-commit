/**
 * Tests for the football engine (src/utils/footballPhysics.js).
 *
 * The engine is deterministic physics at a fixed STEP, so every scenario below
 * builds a state (or places the ball/players directly) and steps it a known
 * number of times. Float math uses toBeCloseTo; everything else is exact.
 */
import {
  PITCH,
  PLAYER_R,
  BALL_R,
  KICK_RANGE,
  KICK_POWER,
  KICK_COOLDOWN_MS,
  DEFAULT_RULE,
  COUNTDOWN_MS,
  GOAL_PAUSE_MS,
  STEP,
  PLAYER_MAX_SPEED,
  normalizeRule,
  goalLineTop,
  goalLineBottom,
  createMatchState,
  normalizeInput,
  stepMatch,
  serializeState,
  deserializeState,
  isFootballOptionKey,
  parseFootballGameKey,
  footballLabelFromKey,
} from '../src/utils/footballPhysics';

const ZERO = { mx: 0, my: 0, kick: false };
const NO_KICK = [ZERO, ZERO];

/** Run `n` fixed steps of stepMatch. */
function steps(state, n, inputs = NO_KICK) {
  for (let i = 0; i < n; i++) stepMatch(state, inputs, STEP);
  return state;
}

/** A playing state with the ball parked at (x, y) and zero velocities. */
function playingState(rule, ball) {
  const s = createMatchState(rule);
  s.phase = 'playing';
  s.phaseLeftMs = 0;
  if (ball) {
    s.ball.x = ball.x;
    s.ball.y = ball.y;
    s.ball.vx = ball.vx || 0;
    s.ball.vy = ball.vy || 0;
  }
  return s;
}

describe('normalizeRule', () => {
  it('keeps valid goals/time rules', () => {
    expect(normalizeRule({ mode: 'goals', n: 3 })).toEqual({ mode: 'goals', n: 3 });
    expect(normalizeRule({ mode: 'time', n: 2 })).toEqual({ mode: 'time', n: 2 });
  });

  it('falls back to goals mode for unknown modes', () => {
    expect(normalizeRule({ mode: 'bogus', n: 5 })).toEqual({ mode: 'goals', n: 5 });
  });

  it('defaults n when missing, invalid, or below 1', () => {
    expect(normalizeRule({})).toEqual({ mode: 'goals', n: 3 });
    expect(normalizeRule({ mode: 'goals', n: 0 })).toEqual({ mode: 'goals', n: 3 });
    expect(normalizeRule({ mode: 'goals', n: -2 })).toEqual({ mode: 'goals', n: 3 });
    expect(normalizeRule({ mode: 'time', n: 0 })).toEqual({ mode: 'time', n: 2 });
    expect(normalizeRule({ mode: 'time', n: NaN })).toEqual({ mode: 'time', n: 2 });
  });

  it('caps n at the mode maximum', () => {
    expect(normalizeRule({ mode: 'goals', n: 99 })).toEqual({ mode: 'goals', n: 10 });
    expect(normalizeRule({ mode: 'time', n: 99 })).toEqual({ mode: 'time', n: 15 });
  });

  it('accepts numeric strings', () => {
    expect(normalizeRule({ mode: 'goals', n: '5' })).toEqual({ mode: 'goals', n: 5 });
  });

  it('handles null/undefined input', () => {
    expect(normalizeRule(null)).toEqual({ mode: 'goals', n: 3 });
    expect(normalizeRule(undefined)).toEqual({ mode: 'goals', n: 3 });
  });

  it('exports the default rule as first-to-3 goals', () => {
    expect(DEFAULT_RULE).toEqual({ mode: 'goals', n: 3 });
  });
});

describe('goal lines', () => {
  it('sit one net depth inside each end of the pitch', () => {
    expect(goalLineTop()).toBe(PITCH.GOAL_DEPTH);
    expect(goalLineBottom()).toBe(PITCH.H - PITCH.GOAL_DEPTH);
  });
});

describe('createMatchState', () => {
  it('starts in countdown with fresh kickoff positions', () => {
    const s = createMatchState(DEFAULT_RULE);
    expect(s.phase).toBe('countdown');
    expect(s.phaseLeftMs).toBe(COUNTDOWN_MS);
    expect(s.scores).toEqual([0, 0]);
    expect(s.lastGoalBy).toBeNull();
    expect(s.winner).toBeNull();
    // host defends the bottom, guest the top, ball at centre
    expect(s.players[0]).toMatchObject({ x: PITCH.W / 2, y: PITCH.H * 0.76, vx: 0, vy: 0 });
    expect(s.players[1]).toMatchObject({ x: PITCH.W / 2, y: PITCH.H * 0.24, vx: 0, vy: 0 });
    expect(s.ball).toMatchObject({ x: PITCH.W / 2, y: PITCH.H / 2, vx: 0, vy: 0 });
  });

  it('normalizes the rule and sets the time-mode clock to n minutes', () => {
    expect(createMatchState({ mode: 'time', n: 3 }).clockMs).toBe(3 * 60 * 1000);
    expect(createMatchState({ mode: 'goals', n: 3 }).clockMs).toBe(0);
  });
});

describe('normalizeInput', () => {
  it('clamps vectors longer than 1', () => {
    expect(normalizeInput({ mx: 3, my: 4, kick: true })).toEqual({ mx: 0.6, my: 0.8, kick: true });
  });

  it('keeps unit-length vectors as-is', () => {
    expect(normalizeInput({ mx: 0.6, my: 0.8 })).toEqual({ mx: 0.6, my: 0.8, kick: false });
  });

  it('coerces kick to a boolean', () => {
    expect(normalizeInput({ kick: 1 }).kick).toBe(true);
    expect(normalizeInput({ kick: 'x' }).kick).toBe(true);
    expect(normalizeInput({ kick: 0 }).kick).toBe(false);
  });

  it('falls back to neutral for garbage input', () => {
    expect(normalizeInput({})).toEqual({ mx: 0, my: 0, kick: false });
    expect(normalizeInput({ mx: 'abc', my: null })).toEqual({ mx: 0, my: 0, kick: false });
    expect(normalizeInput(null)).toEqual({ mx: 0, my: 0, kick: false });
  });
});

describe('stepMatch — phase machine', () => {
  it('gates physics during countdown (input does nothing)', () => {
    const s = createMatchState(DEFAULT_RULE);
    steps(s, 10, [{ mx: 1, my: 1, kick: true }, { mx: 1, my: 1, kick: true }]);
    expect(s.players[0].x).toBe(PITCH.W / 2);
    expect(s.players[0].y).toBe(PITCH.H * 0.76);
    expect(s.ball.x).toBe(PITCH.W / 2);
    expect(s.ball.y).toBe(PITCH.H / 2);
    expect(s.phase).toBe('countdown');
  });

  it('transitions countdown → playing after COUNTDOWN_MS', () => {
    const s = createMatchState(DEFAULT_RULE);
    // COUNTDOWN_MS at STEP per tick is exactly COUNTDOWN_MS/1000/STEP steps
    const needed = Math.ceil(COUNTDOWN_MS / 1000 / STEP);
    steps(s, needed + 1);
    expect(s.phase).toBe('playing');
    expect(s.phaseLeftMs).toBe(0);
  });

  it('returns to play with kickoff positions once the goal pause ends', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1); // host scores → goal pause
    expect(s.phase).toBe('goal');
    expect(s.scores).toEqual([1, 0]);
    const needed = Math.ceil(GOAL_PAUSE_MS / 1000 / STEP);
    steps(s, needed + 1);
    expect(s.phase).toBe('playing');
    expect(s.scores).toEqual([1, 0]); // score kept
    expect(s.players[0]).toMatchObject({ x: PITCH.W / 2, y: PITCH.H * 0.76, vx: 0, vy: 0 });
    expect(s.players[1]).toMatchObject({ x: PITCH.W / 2, y: PITCH.H * 0.24, vx: 0, vy: 0 });
    expect(s.ball).toMatchObject({ x: PITCH.W / 2, y: PITCH.H / 2, vx: 0, vy: 0 });
  });

  it('freezes once the match is over', () => {
    const s = playingState({ mode: 'goals', n: 1 }, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
    const before = JSON.stringify(s);
    steps(s, 30, [{ mx: 1, my: 1, kick: true }, { mx: -1, my: -1, kick: true }]);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('stepMatch — players', () => {
  it('accelerates along the input direction', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2 });
    const before = s.players[0].x;
    steps(s, 1, [{ mx: 1, my: 0 }, ZERO]);
    expect(s.players[0].x).toBeGreaterThan(before);
    expect(s.players[0].vx).toBeGreaterThan(0);
    expect(s.players[0].y).toBe(PITCH.H * 0.76);
  });

  it('caps player speed', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2 });
    s.players[0].vx = 500;
    s.players[0].x = PITCH.W / 2; // room to move
    steps(s, 1);
    expect(s.players[0].vx).toBeCloseTo(PLAYER_MAX_SPEED, 6);
  });

  it('slides along walls instead of passing them', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2 });
    s.players[0].x = PITCH.W - PLAYER_R - 1;
    s.players[0].vx = 1000;
    steps(s, 1);
    expect(s.players[0].x).toBe(PITCH.W - PLAYER_R);
    expect(s.players[0].vx).toBe(0);
  });

  it('separates overlapping players and bounces them apart', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2 });
    const [a, b] = s.players;
    a.x = 200; a.y = 470; a.vx = 0; a.vy = 100;
    b.x = 200; b.y = 520; b.vx = 0; b.vy = -100; // overlapping (50 < 2*PLAYER_R)
    steps(s, 1);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    expect(dist).toBeGreaterThanOrEqual(PLAYER_R * 2 - 0.001);
    expect(a.vy).toBeLessThan(0); // host pushed back up
    expect(b.vy).toBeGreaterThan(0); // guest pushed back down
  });
});

describe('stepMatch — kick and ball', () => {
  it('applies KICK_POWER along the ball direction when in range', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2 + 60, y: PITCH.H * 0.76 });
    const [host] = s.players;
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    // ball sits 60u to the host's right → kicked rightward at full power (after one damping tick)
    expect(s.ball.vx).toBeCloseTo(KICK_POWER * (1 - 0.8 * STEP), 1);
    expect(s.ball.vy).toBe(0);
    expect(host.kickCd).toBe(KICK_COOLDOWN_MS);
  });

  it('kicks along the direction the ball lies in, not a fixed way', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H * 0.76 + 50 });
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    expect(s.ball.vy).toBeCloseTo(KICK_POWER * (1 - 0.8 * STEP), 1);
    expect(s.ball.vx).toBe(0);
  });

  it('ignores kick while on cooldown', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2 + 60, y: PITCH.H * 0.76 });
    const [host] = s.players;
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    const vxAfterKick = s.ball.vx;
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    expect(host.kickCd).toBeGreaterThan(0); // still cooling down
    // only the passive damping tick applied, no second impulse
    expect(s.ball.vx).toBeCloseTo(vxAfterKick * (1 - 0.8 * STEP), 1);
    expect(s.ball.vx).toBeLessThan(vxAfterKick);
  });

  it('does nothing when the ball is out of kick range', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2 + PLAYER_R + BALL_R + KICK_RANGE + 1, y: PITCH.H * 0.76 });
    const [host] = s.players;
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    expect(s.ball.vx).toBe(0);
    expect(s.ball.vy).toBe(0);
    expect(host.kickCd).toBe(0);
  });

  it('caps ball speed', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2, vx: 2000, vy: 0 });
    steps(s, 1);
    expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeCloseTo(900, 1); // BALL_MAX_SPEED
  });

  it('bounces off side walls with wall restitution', () => {
    const s = playingState(DEFAULT_RULE, { x: 10, y: PITCH.H / 2, vx: -500, vy: 0 });
    steps(s, 1);
    expect(s.ball.x).toBe(BALL_R);
    expect(s.ball.vx).toBeCloseTo(500 * (1 - 0.8 * STEP) * 0.85, 1);
    expect(s.ball.vx).toBeGreaterThan(0);
  });

  it('bounces off the end wall when outside the goal mouth', () => {
    const s = playingState(DEFAULT_RULE, { x: 50, y: goalLineBottom(), vx: 0, vy: 500 });
    steps(s, 1);
    expect(s.ball.y).toBe(goalLineBottom() - BALL_R);
    expect(s.ball.vy).toBeLessThan(0);
    expect(s.scores).toEqual([0, 0]);
    expect(s.phase).toBe('playing');
  });
});

describe('stepMatch — scoring and rules', () => {
  it('scores for the host when the ball fully crosses the top line inside the mouth', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1);
    expect(s.scores).toEqual([1, 0]);
    expect(s.lastGoalBy).toBe(0);
    expect(s.lastGoalOwn).toBe(false); // no touch recorded → normal goal
    expect(s.phase).toBe('goal');
    expect(s.phaseLeftMs).toBe(GOAL_PAUSE_MS);
  });

  it('scores for the guest at the bottom line', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: goalLineBottom() + 20 });
    steps(s, 1);
    expect(s.scores).toEqual([0, 1]);
    expect(s.lastGoalBy).toBe(1);
    expect(s.phase).toBe('goal');
  });

  it('does not score when the ball crosses outside the mouth', () => {
    const s = playingState(DEFAULT_RULE, { x: 50, y: goalLineTop() - 20 });
    steps(s, 1);
    expect(s.scores).toEqual([0, 0]);
    expect(s.phase).toBe('playing');
  });

  it('ends a first-to-N match when either side reaches n', () => {
    const s = playingState({ mode: 'goals', n: 1 }, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1);
    expect(s.scores).toEqual([1, 0]);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
    expect(s.phaseLeftMs).toBe(0);

    const t = playingState({ mode: 'goals', n: 1 }, { x: PITCH.W / 2, y: goalLineBottom() + 20 });
    t.scores = [0, 0];
    steps(t, 1);
    expect(t.phase).toBe('over');
    expect(t.winner).toBe(1);
  });

  it('continues a first-to-N match below the threshold', () => {
    const s = playingState({ mode: 'goals', n: 2 }, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1);
    expect(s.scores).toEqual([1, 0]);
    expect(s.phase).toBe('goal'); // celebration, not over
  });

  it('ends a timed match when the clock expires — leader wins', () => {
    const s = createMatchState({ mode: 'time', n: 2 });
    s.phase = 'playing';
    s.phaseLeftMs = 0;
    s.clockMs = 5; // expires on the next step
    s.scores = [1, 0];
    steps(s, 1);
    expect(s.clockMs).toBe(0);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
  });

  it('a drawn timed match ends with no winner', () => {
    const s = createMatchState({ mode: 'time', n: 2 });
    s.phase = 'playing';
    s.phaseLeftMs = 0;
    s.clockMs = 5;
    steps(s, 1);
    expect(s.phase).toBe('over');
    expect(s.winner).toBeNull();
  });

  it('counts the clock down during play', () => {
    const s = createMatchState({ mode: 'time', n: 2 });
    s.phase = 'playing';
    s.phaseLeftMs = 0;
    const before = s.clockMs;
    steps(s, 1);
    expect(before - s.clockMs).toBeCloseTo(1000 * STEP, 3);
  });

  it('keeps the clock running through a goal celebration', () => {
    const s = createMatchState({ mode: 'time', n: 2 });
    s.phase = 'playing';
    s.phaseLeftMs = 0;
    s.scores = [1, 0];
    s.clockMs = 5;
    s.ball = { x: PITCH.W / 2, y: goalLineTop() - 20, vx: 0, vy: 0 };
    steps(s, 1); // goal → straight to 'over' via the expired clock
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
  });
});

describe('stepMatch — own goals', () => {
  it("flags an own goal when the defender's kick sends it into their own net", () => {
    // host kicks straight down into their own (bottom) goal
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H * 0.76 + 50 });
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    expect(s.lastTouchBy).toBe(0);
    steps(s, 60); // ball flies into the bottom mouth
    expect(s.scores).toEqual([0, 1]);
    expect(s.lastGoalBy).toBe(1);
    expect(s.lastGoalOwn).toBe(true);
    expect(s.phase).toBe('goal');
  });

  it('does not flag a goal scored by the attacking side', () => {
    // host kicks up the middle into the top goal; clear the guest's path
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H * 0.76 - 50 });
    s.players[1].x = 100;
    steps(s, 1, [{ mx: 0, my: 0, kick: true }, ZERO]);
    expect(s.lastTouchBy).toBe(0);
    steps(s, 300); // ball flies up into the top mouth (~260 steps with per-step damping)
    expect(s.scores).toEqual([1, 0]);
    expect(s.lastGoalBy).toBe(0);
    expect(s.lastGoalOwn).toBe(false);
  });

  it('counts a bump as a touch', () => {
    // ball starts overlapping the host disc → pushed out, touch attributed
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2 + 40, y: PITCH.H * 0.76 });
    steps(s, 1);
    expect(s.lastTouchBy).toBe(0);
  });

  it('clears the toucher on kickoff', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1); // goal → celebration
    const needed = Math.ceil(GOAL_PAUSE_MS / 1000 / STEP);
    steps(s, needed + 1); // kickoff reset
    expect(s.lastTouchBy).toBeNull();
    expect(s.lastGoalOwn).toBe(false);
  });
});

describe('serializeState / deserializeState', () => {
  it('round-trips a fresh match snapshot', () => {
    const s = createMatchState(DEFAULT_RULE);
    const d = deserializeState(serializeState(s));
    expect(d.phase).toBe('countdown');
    expect(d.phaseLeftMs).toBe(COUNTDOWN_MS);
    expect(d.clockMs).toBe(0);
    expect(d.scores).toEqual([0, 0]);
    expect(d.lastGoalBy).toBeNull();
    expect(d.winner).toBeNull();
    expect(d.players).toHaveLength(2);
    expect(d.players[0]).toMatchObject({ x: PITCH.W / 2, y: PITCH.H * 0.76, kickCd: 0 });
    expect(d.ball).toMatchObject({ x: PITCH.W / 2, y: PITCH.H / 2, vx: 0, vy: 0 });
  });

  it('encodes phases, scores and goal/winner sides', () => {
    const s = createMatchState({ mode: 'time', n: 2 });
    s.phase = 'goal';
    s.phaseLeftMs = 1234.6;
    s.clockMs = 60000;
    s.scores = [2, 1];
    s.lastGoalBy = 0;
    const d = deserializeState(serializeState(s));
    expect(d.phase).toBe('goal');
    expect(d.phaseLeftMs).toBe(1235); // rounded to whole ms
    expect(d.clockMs).toBe(60000);
    expect(d.scores).toEqual([2, 1]);
    expect(d.lastGoalBy).toBe(0);
    expect(d.winner).toBeNull(); // -1 → null
  });

  it('maps null lastGoalBy/winner to -1 on the wire and back', () => {
    const wire = serializeState(playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2 }));
    expect(wire.lw).toBe(-1);
    expect(wire.w).toBe(-1);
    const d = deserializeState(wire);
    expect(d.lastGoalBy).toBeNull();
    expect(d.winner).toBeNull();
  });

  it('round-trips the own-goal flag', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: goalLineTop() - 20 });
    steps(s, 1);
    expect(s.lastGoalOwn).toBe(false);
    let d = deserializeState(serializeState(s));
    expect(d.lastGoalBy).toBe(0);
    expect(d.lastGoalOwn).toBe(false);
    s.lastGoalOwn = true;
    d = deserializeState(serializeState(s));
    expect(d.lastGoalOwn).toBe(true);
  });

  it('never emits a negative phaseLeftMs or clockMs', () => {
    const s = playingState(DEFAULT_RULE, { x: PITCH.W / 2, y: PITCH.H / 2 });
    s.phaseLeftMs = -3;
    s.clockMs = -9;
    const wire = serializeState(s);
    expect(wire.pl).toBe(0);
    expect(wire.cm).toBe(0);
  });

  it('falls back to safe defaults for a degenerate snapshot', () => {
    const d = deserializeState({});
    expect(d.phase).toBe('countdown');
    expect(d.scores).toEqual([0, 0]);
    expect(d.players).toEqual([]);
    expect(d.ball).toMatchObject({ x: PITCH.W / 2, y: PITCH.H / 2, vx: 0, vy: 0 });
    expect(d.lastGoalBy).toBeNull();
    expect(d.lastGoalOwn).toBe(false);
    expect(d.winner).toBeNull();
  });
});

describe('fun-request key helpers', () => {
  it('recognizes exactly the six offered options', () => {
    expect(isFootballOptionKey('football:goals-1')).toBe(true);
    expect(isFootballOptionKey('football:goals-3')).toBe(true);
    expect(isFootballOptionKey('football:goals-5')).toBe(true);
    expect(isFootballOptionKey('football:time-2')).toBe(true);
    expect(isFootballOptionKey('football:time-3')).toBe(true);
    expect(isFootballOptionKey('football:time-5')).toBe(true);
    expect(isFootballOptionKey('football:goals-2')).toBe(false);
    expect(isFootballOptionKey('chess')).toBe(false);
    expect(isFootballOptionKey(null)).toBe(false);
    expect(isFootballOptionKey(undefined)).toBe(false);
  });

  it('parses an option key to its rule config', () => {
    expect(parseFootballGameKey('football:goals-3')).toEqual({ key: 'football:goals-3', cfg: { mode: 'goals', n: 3 } });
    expect(parseFootballGameKey('football:time-5')).toEqual({ key: 'football:time-5', cfg: { mode: 'time', n: 5 } });
    expect(parseFootballGameKey('football:goals-4')).toBeNull();
    expect(parseFootballGameKey('')).toBeNull();
  });

  it('builds human labels for the request card', () => {
    expect(footballLabelFromKey('football:goals-3')).toBe('Football · First to 3');
    expect(footballLabelFromKey('football:time-2')).toBe('Football · 2 minutes');
    expect(footballLabelFromKey('football:goals-4')).toBeNull();
  });
});
