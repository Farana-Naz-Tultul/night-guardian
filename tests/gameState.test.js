import test from "node:test";
import assert from "node:assert/strict";
import { BALANCE } from "../src/game/balance.js";
import { createInitialGame, gameReducer, canPerformAction, canDraft, isCalm, isSafe, dangerRatePerSecond } from "../src/game/gameState.js";

const noEvents = { window: 0.5, draft: 0.99, ghost: 0.99 };
const send = (state, type, extra = {}) => gameReducer(state, { type, runId: state.runId, ...extra });
const act = (state, kind, random = 0.5) => send(state, "action", { kind, random });
const frame = (elapsedMs, random = noEvents) => ({ elapsedMs, random });
function advance(state, milliseconds, rolls = noEvents) {
  const frames = [];
  for (let at = state.elapsedMs + BALANCE.tickMs; at <= state.elapsedMs + milliseconds; at += BALANCE.tickMs) {
    frames.push(frame(at, typeof rolls === "function" ? rolls(at) : rolls));
  }
  return send(state, "tick", { frames });
}
// Isolate rate/action boundaries from scheduled events in unit fixtures only.
const fixture = (overrides = {}) => ({ ...createInitialGame(), nextWindowAtMs: 200000, nextDraftCheckAtMs: 200000, ...overrides });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
function darkness() {
  return advance(createInitialGame(), 12000, { ...noEvents, draft: 0 });
}
function encounter() {
  return advance(darkness(), 2000, { ...noEvents, ghost: 0 });
}

test("initial state: zero meters, safe room, fixed first deadlines, 180-second goal", () => {
  const state = createInitialGame();
  assert.equal(state.danger, 0);
  assert.equal(state.wakefulness, 0);
  assert.equal(isSafe(state), true);
  assert.equal(isCalm(state), true);
  assert.equal(state.nextWindowAtMs, 8000);
  assert.equal(state.nextDraftCheckAtMs, 12000);
  assert.equal(state.nextGhostCheckAtMs, null);
  assert.equal(BALANCE.winSeconds, 180);
  for (const kind of ["gentleClose", "slam", "relight", "steadyLight", "flare", "calmGhost"]) {
    assert.equal(canPerformAction(state, kind), false);
    assert.equal(act(state, kind), state);
  }
});

test("all danger rates are per second, additive, and fractional at 100 ms", () => {
  for (const windowOpen of [false, true]) for (const candleLit of [false, true]) for (const ghostVisible of [false, true]) {
    const start = fixture({ danger: 30, windowOpen, candleLit, ghostVisible });
    const expectedRate = !windowOpen && candleLit && !ghostVisible ? -10
      : (windowOpen ? 2 : 0) + (!candleLit ? 1 : 0) + (ghostVisible ? 3 : 0);
    assert.equal(dangerRatePerSecond(start), expectedRate);
    near(advance(start, 100).danger, 30 + expectedRate * 0.1);
    near(advance(start, 1000).danger, 30 + expectedRate);
  }
  near(advance(fixture({ candleLit: false }), 100).danger, 0.1);
});

test("fractional accumulation reaches the exact loss boundary without an extra tick", () => {
  let state = advance(fixture({ candleLit: false }), 99900);
  assert.equal(state.status, "playing");
  near(state.danger, 99.9);
  state = advance(state, 100);
  assert.equal(state.danger, 100);
  assert.equal(state.status, "lost");
});

test("duplicate, old, and out-of-order clock frames never double-count danger", () => {
  const start = fixture({ windowOpen: true });
  const message = { frames: [frame(100)] };
  let state = send(start, "tick", message);
  near(state.danger, 0.2);
  for (let i = 0; i < 25; i++) assert.equal(send(state, "tick", message), state);
  assert.equal(send(state, "tick", { frames: [frame(300)] }), state);
  state = send(state, "tick", { frames: [frame(100), frame(200)] });
  near(state.danger, 0.4);
  assert.equal(state.elapsedMs, 200);
});

test("batched real-time catchup matches individual ticks with no extra rate application", () => {
  const start = fixture({ windowOpen: true, candleLit: false, ghostVisible: true });
  let sequential = start;
  for (let i = 0; i < 20; i++) sequential = advance(sequential, 100);
  assert.deepEqual(advance(start, 2000), sequential);
  near(sequential.danger, 12);
});

test("safe Danger recovery begins immediately and is independent of calm/action recovery", () => {
  let state = act(fixture({ windowOpen: true, danger: 30 }), "slam");
  state = advance(state, 100);
  near(state.danger, 29);
  near(state.wakefulness, 20);
  assert.equal(state.calmMs, 100);
  near(advance(state, 3000).danger, 0);
  // Even if a safe state contains an action, it must not gate Danger recovery.
  near(advance(fixture({ danger: 30, activeAction: { kind: "gentleClose", elapsedMs: 0 } }), 100).danger, 29);
});

test("the first window opens at exactly 8s and cannot reopen while already open", () => {
  let state = advance(createInitialGame(), 7900);
  assert.equal(state.windowOpen, false);
  state = advance(state, 100);
  assert.equal(state.windowOpen, true);
  assert.equal(state.nextWindowAtMs, null);
  state = advance(state, 3000);
  assert.equal(state.windowOpen, true);
  assert.equal(state.nextWindowAtMs, null);
});

test("both closures schedule an independent next window 12–18s later", () => {
  for (const random of [0, 0.5, 1]) for (const kind of ["gentleClose", "slam"]) {
    let state = act(advance(createInitialGame(), 8000), kind, random);
    if (kind === "gentleClose") state = advance(state, 2000, { ...noEvents, window: random });
    const delay = 12000 + random * 6000;
    assert.equal(state.nextWindowAtMs, state.elapsedMs + delay);
    state = advance(state, delay - 100);
    assert.equal(state.windowOpen, false);
    state = advance(state, 100);
    assert.equal(state.windowOpen, true);
  }
});

test("drafts first check at 12s, then every 4s, never on intervening ticks", () => {
  let state = advance(createInitialGame(), 11900, { ...noEvents, draft: 0 });
  assert.equal(state.candleLit, true);
  state = advance(state, 100, noEvents); // Unsuccessful check.
  assert.equal(state.candleLit, true);
  assert.equal(state.nextDraftCheckAtMs, 16000);
  state = advance(state, 3900, { ...noEvents, draft: 0 });
  assert.equal(state.candleLit, true);
  state = advance(state, 100, { ...noEvents, draft: 0 });
  assert.equal(state.candleLit, false);
  assert.equal(state.darknessStartedAtMs, 16000);
});

test("draft chance is 20% closed or 40% open, without high-danger acceleration", () => {
  for (const danger of [0, 61]) for (const windowOpen of [false, true]) {
    const chance = windowOpen ? 0.4 : 0.2;
    const start = fixture({ danger, windowOpen, nextDraftCheckAtMs: 100 });
    assert.equal(advance(start, 100, { ...noEvents, draft: chance }).candleLit, true);
    assert.equal(advance(start, 100, { ...noEvents, draft: chance - 0.001 }).candleLit, false);
    assert.equal(advance(start, 100, { ...noEvents, draft: 0.3 }).candleLit, !windowOpen);
  }
});

test("draft eligibility guards lit candle, relighting, encounter, protection and grace", () => {
  assert.equal(canDraft(createInitialGame()), true);
  for (const override of [
    { candleLit: false }, { activeAction: { kind: "relight", elapsedMs: 0 } },
    { ghostVisible: true }, { draftProtectedUntilMs: 6000 }, { safeGraceUntilMs: 6000 }, { status: "lost" },
  ]) {
    const state = fixture({ ...override, nextDraftCheckAtMs: 100 });
    assert.equal(canDraft(state), false);
    assert.equal(advance(state, 100, { ...noEvents, draft: 0 }).candleLit, state.candleLit);
  }
});

test("darkness waits 2s for a 35% ghost roll, then retries every 2s, not guaranteed", () => {
  let state = darkness();
  assert.equal(state.ghostVisible, false);
  assert.equal(state.darknessStartedAtMs, 12000);
  assert.equal(state.nextGhostCheckAtMs, 14000);
  state = advance(state, 1900, { ...noEvents, ghost: 0 });
  assert.equal(state.ghostVisible, false);
  state = advance(state, 100, { ...noEvents, ghost: 0.35 });
  assert.equal(state.ghostVisible, false);
  assert.equal(state.nextGhostCheckAtMs, 16000);
  state = advance(state, 1900, { ...noEvents, ghost: 0 });
  assert.equal(state.ghostVisible, false);
  state = advance(state, 100, { ...noEvents, ghost: 0.349 });
  assert.equal(state.ghostVisible, true);
  assert.equal(state.candleLit, false);
  assert.equal(state.darknessStartedAtMs, 12000);
  assert.equal(state.nextGhostCheckAtMs, null);
});

test("unsuccessful darkness checks can continue without a ghost", () => {
  const state = advance(darkness(), 9000, { ...noEvents, ghost: 0.99 });
  assert.equal(state.ghostVisible, false);
  assert.equal(state.nextGhostCheckAtMs, 22000);
});

test("prompt relighting clears the darkness episode and all future ghost checks", () => {
  let state = act(darkness(), "relight");
  state = advance(state, 3000);
  assert.equal(state.candleLit, true);
  assert.equal(state.darknessStartedAtMs, null);
  assert.equal(state.nextGhostCheckAtMs, null);
  assert.equal(state.draftProtectedUntilMs, 21000);
  state = advance(state, 5000, { ...noEvents, ghost: 0 });
  assert.equal(state.ghostVisible, false);
  // An obsolete detached ghost callback has no handler to mutate the new episode.
  assert.equal(send(state, "ghost-event", { random: 0 }), state);
});

test("relight completion on a manifestation deadline cancels that check", () => {
  let state = advance(darkness(), 1000);
  state = advance(act(state, "relight"), 2900); // First check at 14s fails.
  assert.equal(state.nextGhostCheckAtMs, 16000);
  assert.equal(state.candleLit, false);
  state = advance(state, 100, { ...noEvents, ghost: 0 }); // Both due at 16s.
  assert.equal(state.candleLit, true);
  assert.equal(state.ghostVisible, false);
  assert.equal(state.nextGhostCheckAtMs, null);
});

test("Relight starts, repeated clicks, cancellation, and switching cannot postpone darkness checks", () => {
  let state = act(darkness(), "relight");
  state = advance(state, 500);
  for (let i = 0; i < 20; i++) assert.equal(act(state, "relight"), state);
  state = send(state, "cancel");
  state = advance(act(state, "relight"), 500);
  state = advance(act(state, "gentleClose"), 500);
  state = act(state, "relight");
  assert.equal(state.darknessStartedAtMs, 12000);
  assert.equal(state.nextGhostCheckAtMs, 14000);
  assert.equal(state.activeAction.elapsedMs, 0);
  state = advance(state, 500, { ...noEvents, ghost: 0 });
  assert.equal(state.ghostVisible, true);
  assert.equal(state.activeAction, null);
  assert.equal(state.candleLit, false);
});

test("failed manifestation roll during Relight preserves progress and permits completion", () => {
  let state = advance(act(darkness(), "relight"), 2000, { ...noEvents, ghost: 0.35 });
  assert.equal(state.activeAction.elapsedMs, 2000);
  assert.equal(state.ghostVisible, false);
  assert.equal(state.candleLit, false);
  assert.equal(state.nextGhostCheckAtMs, 16000);
  state = advance(state, 1000, { ...noEvents, ghost: 0 });
  assert.equal(state.candleLit, true);
  assert.equal(state.nextGhostCheckAtMs, null);
});

test("catchup processes an earlier manifestation before a later Relight completion", () => {
  const start = act(darkness(), "relight");
  const rolls = { ...noEvents, ghost: 0 };
  const batched = advance(start, 3000, rolls);
  let sequential = start;
  for (let i = 0; i < 30; i++) sequential = advance(sequential, 100, rolls);
  assert.deepEqual(batched, sequential);
  assert.equal(batched.ghostVisible, true);
  assert.equal(batched.candleLit, false);
  assert.equal(batched.activeAction, null);
  assert.match(batched.lastEvent, /smothered/);
});

test("a ghost appearing during Gentle Close preserves its progress and completion", () => {
  let state = advance(darkness(), 1000);
  state = advance(act(state, "gentleClose"), 1000, { ...noEvents, ghost: 0 });
  assert.equal(state.ghostVisible, true);
  assert.deepEqual(state.activeAction, { kind: "gentleClose", elapsedMs: 1000 });
  assert.doesNotMatch(state.lastEvent, /smothered/);
  state = advance(state, 1000, { ...noEvents, ghost: 0 });
  assert.equal(state.windowOpen, false);
  assert.equal(state.ghostVisible, true);
  assert.equal(state.candleLit, false);
});

test("each new darkness episode can interrupt once, with no stale checks between episodes", () => {
  let state = advance(act(darkness(), "relight"), 2000, { ...noEvents, ghost: 0 });
  assert.equal(state.activeAction, null);
  state = advance(act(state, "relight"), 3000, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.candleLit, true);
  state = advance(state, 6900, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.candleLit, true);
  assert.equal(state.ghostVisible, false);
  state = advance(state, 100, { ...noEvents, draft: 0, ghost: 0 }); // New draft at 24s.
  assert.equal(state.darknessStartedAtMs, 24000);
  assert.equal(state.nextGhostCheckAtMs, 26000);
  state = advance(act(state, "relight"), 2000, { ...noEvents, ghost: 0 });
  assert.equal(state.candleLit, false);
  assert.equal(state.ghostVisible, true);
  assert.equal(state.activeAction, null);
  assert.match(state.lastEvent, /smothered/);
});

test("Flare overrides a retry without a late completion refreshing protection", () => {
  let state = advance(act(darkness(), "relight"), 2000, { ...noEvents, ghost: 0 });
  state = advance(act(state, "relight"), 1000);
  state = act(state, "flare");
  const protectedUntil = state.draftProtectedUntilMs;
  assert.equal(state.activeAction, null);
  assert.equal(state.candleLit, true);
  assert.equal(state.ghostVisible, false);
  assert.equal(state.wakefulness, 25);
  state = advance(state, 3000, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.draftProtectedUntilMs, protectedUntil);
  assert.equal(state.ghostVisible, false);
});

test("obsolete candle actions and free ghost-removal callbacks are rejected", () => {
  for (const candleLit of [false, true]) {
    const state = fixture({ candleLit, ghostVisible: true });
    for (const kind of ["steadyLight", "lightAndHold", "calmGhost"]) {
      assert.equal(canPerformAction(state, kind), false);
      assert.equal(act(state, kind), state);
    }
  }
});

test("lit rooms have no independent ghost-spawning system", () => {
  const state = advance(createInitialGame(), 20000, { ...noEvents, ghost: 0 });
  assert.equal(state.candleLit, true);
  assert.equal(state.ghostVisible, false);
  assert.equal(state.nextGhostCheckAtMs, null);
});

test("repeated drafts in darkness cannot reset its start or delay manifestation", () => {
  let state = advance(darkness(), 4000, { ...noEvents, draft: 0 });
  assert.equal(state.darknessStartedAtMs, 12000);
  assert.equal(state.nextGhostCheckAtMs, 18000);
  state = advance(state, 2000, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.ghostVisible, true);
  assert.equal(state.darknessStartedAtMs, 12000);
});

test("ghost/draft attempts cannot duplicate or reset an active encounter", () => {
  let state = encounter();
  const startedAt = state.darknessStartedAtMs;
  state = advance(state, 4000, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.ghostVisible, true);
  assert.equal(state.darknessStartedAtMs, startedAt);
  assert.equal(state.nextGhostCheckAtMs, null);
  assert.equal(send(state, "candle-event", { random: 0 }), state);
  assert.equal(send(state, "ghost-event", { random: 0 }), state);
});

test("Relight takes exactly 3s with or without a ghost, then lights and banishes together", () => {
  for (const ghostVisible of [false, true]) {
    let state = fixture({ candleLit: false, ghostVisible, danger: 20, nextDraftCheckAtMs: 100 });
    state = advance(act(state, "relight"), 2900, { ...noEvents, draft: 0, ghost: 0 });
    assert.equal(state.candleLit, false);
    assert.equal(state.ghostVisible, ghostVisible);
    assert.equal(state.activeAction.elapsedMs, 2900);
    assert.equal(state.draftProtectedUntilMs, 0);
    assert.equal(state.safeGraceUntilMs, 0);
    state = advance(state, 100, { ...noEvents, draft: 0, ghost: 0 });
    assert.equal(state.ghostVisible, false);
    assert.equal(state.candleLit, true);
    assert.equal(state.activeAction, null);
    assert.equal(state.draftProtectedUntilMs, 9000);
    assert.equal(state.safeGraceUntilMs, 9000);
    assert.equal(state.wakefulness, 0);
    near(state.danger, 20 + (ghostVisible ? 4 : 1) * 3);
    near(advance(state, 100).danger, state.danger - 1);
  }
});

test("manifestation interrupts Relight once, explains the reset, and requires a fresh click", () => {
  let state = act(act(darkness(), "slam"), "relight");
  state = advance(state, 1900, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.activeAction.elapsedMs, 1900);
  assert.ok(state.disturbance);
  state = advance(state, 100, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.ghostVisible, true);
  assert.equal(state.candleLit, false);
  assert.equal(state.activeAction, null);
  assert.equal(state.disturbance, null); // Interruption explanation takes priority.
  assert.equal(state.lastEvent, "A ghost smothered the spark! Relight again.");
  assert.equal(canPerformAction(state, "relight"), true);
  assert.equal(state.draftProtectedUntilMs, 0);
  assert.equal(state.safeGraceUntilMs, 0);
  assert.equal(state.nextGhostCheckAtMs, null);
  state = advance(state, 3000, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.activeAction, null); // No automatic retry.
  assert.equal(state.candleLit, false);
  assert.equal(state.ghostVisible, true);
  assert.equal(canDraft(state), false);
  state = act(state, "relight");
  assert.deepEqual(state.activeAction, { kind: "relight", elapsedMs: 0 });
  state = advance(state, 2900, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(state.activeAction.elapsedMs, 2900);
  assert.equal(state.ghostVisible, true);
  state = advance(state, 100, { ...noEvents, draft: 0, ghost: 0 });
  assert.equal(isSafe(state), true);
  assert.equal(state.activeAction, null);
});

test("window can open during Relight without cancelling it; completion leaves the window open", () => {
  let state = fixture({ candleLit: false, ghostVisible: true, nextWindowAtMs: 1000, nextDraftCheckAtMs: 1000 });
  state = advance(act(state, "relight"), 1000, { ...noEvents, draft: 0 });
  assert.equal(state.windowOpen, true);
  assert.equal(state.candleLit, false);
  assert.equal(state.activeAction.kind, "relight");
  near(advance(state, 100).danger - state.danger, 0.6);
  state = advance(state, 2000, { ...noEvents, draft: 0 });
  assert.equal(state.ghostVisible, false);
  assert.equal(state.windowOpen, true);
  assert.equal(state.candleLit, true);
});

test("ghost can appear while window is open; window + ghost + darkness is 6/sec", () => {
  const state = encounter();
  assert.equal(state.windowOpen, true);
  assert.equal(state.ghostVisible, true);
  assert.equal(state.candleLit, false);
  near(advance(state, 1000).danger - state.danger, 6);
  const lit = advance(act(state, "relight"), 3000);
  near(advance(lit, 1000).danger - lit.danger, 2);
});

test("Flare works in darkness, relights, removes ghost, and grants fresh protection", () => {
  const state = act(encounter(), "flare");
  assert.equal(state.candleLit, true);
  assert.equal(state.ghostVisible, false);
  assert.equal(state.nextGhostCheckAtMs, null);
  assert.equal(state.darknessStartedAtMs, null);
  assert.equal(state.wakefulness, 25);
  assert.equal(state.draftProtectedUntilMs, 20000);
  assert.equal(state.safeGraceUntilMs, 0); // Window is still open.
});

test("post-relight protection lasts 6s, skips checks, and does not release a draft backlog", () => {
  let state = advance(act(darkness(), "relight"), 3000, { ...noEvents, draft: 0 });
  state = advance(state, 6000, { ...noEvents, draft: 0 });
  assert.equal(state.candleLit, true); // 16s and 20s skipped; next actual check is 24s.
  assert.equal(state.nextDraftCheckAtMs, 24000);
  state = advance(state, 2900, { ...noEvents, draft: 0 });
  assert.equal(state.candleLit, true);
  state = advance(state, 100, { ...noEvents, draft: 0 });
  assert.equal(state.candleLit, false);
  assert.equal(state.darknessStartedAtMs, 24000);
});

test("grace starts only when the last threat resolves, not for partial repairs", () => {
  let state = act(encounter(), "slam");
  assert.equal(state.safeGraceUntilMs, 0);
  state = advance(act(state, "relight"), 2900);
  assert.equal(state.safeGraceUntilMs, 0);
  state = advance(state, 100);
  assert.equal(state.safeGraceUntilMs, state.elapsedMs + 6000);
  assert.equal(isSafe(state), true);
});

test("safe grace defers a nearer window, skips drafts, and preserves a later deadline", () => {
  for (const nextWindowAtMs of [1000, 16000]) {
    let state = act(fixture({ ghostVisible: true, nextWindowAtMs, nextDraftCheckAtMs: 1000 }), "flare");
    assert.equal(state.safeGraceUntilMs, 6000);
    assert.equal(state.nextWindowAtMs, Math.max(nextWindowAtMs, 6000));
    state = advance(state, 5900, { ...noEvents, draft: 0 });
    assert.equal(isSafe(state), true);
    assert.equal(state.nextDraftCheckAtMs, 9000);
    state = advance(state, 100, { ...noEvents, draft: 0 });
    assert.equal(state.windowOpen, nextWindowAtMs < 6000);
    assert.equal(state.candleLit, true);
  }
});

test("safe grace neither removes unresolved threats nor stops their danger", () => {
  let state = act(encounter(), "flare");
  assert.equal(state.windowOpen, true);
  assert.equal(state.safeGraceUntilMs, 0);
  near(advance(state, 1000).danger - state.danger, 2);
  state = act(state, "slam");
  assert.equal(state.safeGraceUntilMs, state.elapsedMs + 6000);
  near(advance(state, 100).danger, state.danger - 1);
});

test("Gentle Close stays dangerous for 2 seconds, advances night, and adds no Wakefulness", () => {
  let state = advance(act(fixture({ windowOpen: true }), "gentleClose"), 1900);
  assert.equal(state.windowOpen, true);
  near(state.danger, 3.8);
  assert.equal(state.activeAction.elapsedMs, 1900);
  state = advance(state, 100);
  assert.equal(state.windowOpen, false);
  assert.equal(state.elapsedMs, 2000);
  near(state.danger, 4);
  assert.equal(state.wakefulness, 0);
});

test("Slam and Flare cancel sustained progress immediately and only charge once", () => {
  for (const [threat, sustained, instant, cost] of [
    [{ windowOpen: true }, "gentleClose", "slam", 20],
    [{ candleLit: false, ghostVisible: true }, "relight", "flare", 25],
  ]) {
    let state = advance(act(fixture(threat), sustained), 500);
    state = act(state, instant);
    assert.equal(state.activeAction, null);
    assert.equal(state.wakefulness, cost);
    for (let i = 0; i < 25; i++) assert.equal(act(state, instant, i / 25), state);
  }
});

test("invalid/repeated actions cannot extend grace, protection, or window cooldowns", () => {
  for (const state of [act(encounter(), "flare"), act(fixture({ windowOpen: true }), "slam"), advance(act(darkness(), "relight"), 3000)]) {
    for (const kind of ["flare", "relight", "steadyLight", "calmGhost"]) {
      if (!canPerformAction(state, kind)) for (let i = 0; i < 20; i++) assert.equal(act(state, kind), state);
    }
    assert.equal(send(state, "cancel"), state);
  }
  let state = advance(act(fixture({ windowOpen: true }), "gentleClose"), 1000);
  for (let i = 0; i < 20; i++) assert.equal(act(state, "gentleClose"), state);
  state = advance(state, 1000);
  assert.equal(state.windowOpen, false);
  const later = advance(state, 1000);
  assert.equal(act(later, "slam"), later);
  assert.equal(act(later, "gentleClose"), later);
  assert.equal(later.safeGraceUntilMs, state.safeGraceUntilMs);
});

test("switching sustained actions loses progress without lighting or removing the ghost", () => {
  let state = fixture({ windowOpen: true, candleLit: false, ghostVisible: true });
  state = advance(act(state, "gentleClose"), 1000);
  state = act(state, "relight");
  assert.deepEqual(state.activeAction, { kind: "relight", elapsedMs: 0 });
  state = advance(state, 1000);
  assert.equal(state.windowOpen, true);
  state = advance(act(state, "gentleClose"), 4000);
  assert.equal(state.windowOpen, false);
  assert.equal(state.ghostVisible, true);
  assert.equal(state.candleLit, false);
  assert.equal(state.draftProtectedUntilMs, 0);
  assert.equal(state.safeGraceUntilMs, 0);
});

test("switching to Relight cancels a closure; invalid actions never interrupt", () => {
  let state = fixture({ windowOpen: true, candleLit: false });
  state = advance(act(state, "gentleClose"), 1000);
  assert.equal(act(state, "flare"), state);
  state = advance(act(state, "relight"), 3000);
  assert.equal(state.candleLit, true);
  assert.equal(state.windowOpen, true);
});

test("explicit cancellation never completes later or extinguishes the candle", () => {
  for (const [overrides, kind, property] of [
    [{ windowOpen: true }, "gentleClose", "windowOpen"],
    [{ candleLit: false, ghostVisible: true }, "relight", "ghostVisible"],
    [{ candleLit: false }, "relight", "candleLit"],
  ]) {
    let state = advance(act(fixture(overrides), kind), 500);
    state = advance(send(state, "cancel"), 5000);
    assert.equal(state.activeAction, null);
    assert.equal(state[property], overrides[property]);
    if (kind === "relight") assert.equal(state.candleLit, false);
    assert.equal(state.draftProtectedUntilMs, 0);
    assert.equal(state.safeGraceUntilMs, 0);
  }
});

test("Wakefulness recovers separately after 3 uninterrupted calm seconds", () => {
  let state = act(fixture({ windowOpen: true }), "slam");
  state = advance(state, 3000);
  near(state.wakefulness, 20);
  assert.equal(state.disturbance, null);
  assert.doesNotMatch(state.lastEvent, /Wakefulness|startled/);
  state = advance(state, 100);
  near(state.wakefulness, 19.7);
  state = advance(state, 900);
  near(state.wakefulness, 17);
  assert.equal(advance(state, 10000).wakefulness, 0);
});

test("a new threat/action or disturbance resets calm, without delaying Danger recovery", () => {
  let state = fixture({ wakefulness: 20, nextWindowAtMs: 2900 });
  state = advance(state, 2900);
  assert.equal(state.calmMs, 0);
  assert.equal(state.wakefulness, 20);
  state = advance(act(state, "gentleClose"), 2000);
  assert.equal(state.calmMs, 0);
  state = advance(state, 3000);
  assert.equal(state.wakefulness, 20);
  near(advance(state, 1000).wakefulness, 17);
  assert.equal(act(fixture({ windowOpen: true, calmMs: 2900 }), "slam").calmMs, 0);
});

test("random events cannot overwrite a brief disturbance notice", () => {
  let state = act(fixture({ windowOpen: true, ghostVisible: true }), "slam");
  const notice = state.disturbance.message;
  state = advance(state, 1000);
  assert.equal(state.disturbance.message, notice);
  assert.equal(advance(state, 2000).disturbance, null);
});

test("Danger loss clamps to 100, cancels pending action/schedules, and freezes gameplay", () => {
  let state = advance(act(fixture({ danger: 99.9, windowOpen: true }), "gentleClose"), 100);
  assert.equal(state.status, "lost");
  assert.equal(state.lossReason, "danger");
  assert.equal(state.danger, 100);
  assert.equal(state.activeAction, null);
  assert.equal(state.windowOpen, true);
  assert.equal(state.nextWindowAtMs, null);
  assert.equal(state.nextDraftCheckAtMs, null);
  assert.equal(state.nextGhostCheckAtMs, null);
  assert.equal(advance(state, 10000), state);
  assert.equal(act(state, "slam"), state);
});

test("Wakefulness loss is immediate at 100, distinct from Danger, and freezes gameplay", () => {
  let state = act(act(fixture({ wakefulness: 80, windowOpen: true }), "gentleClose"), "slam");
  assert.equal(state.status, "lost");
  assert.equal(state.lossReason, "wakefulness");
  assert.equal(state.wakefulness, 100);
  assert.equal(state.danger, 0);
  assert.equal(state.activeAction, null);
  assert.equal(advance(state, 10000), state);
  state = act(fixture({ wakefulness: 90, ghostVisible: true, candleLit: false }), "flare");
  assert.equal(state.wakefulness, 100);
  assert.equal(state.lossReason, "wakefulness");
});

test("180s victory clears a pending action and schedules; later ticks/actions are ignored", () => {
  let state = fixture({ elapsedMs: 179000, windowOpen: true });
  state = advance(act(state, "gentleClose"), 1000);
  assert.equal(state.status, "won");
  assert.equal(state.elapsedMs, 180000);
  assert.equal(state.activeAction, null);
  assert.equal(state.windowOpen, true);
  assert.equal(state.nextDraftCheckAtMs, null);
  assert.equal(advance(state, 10000), state);
  assert.equal(act(state, "slam"), state);
});

test("Danger loss and dawn cancel an unfinished Relight without lighting or banishing", () => {
  for (const [overrides, expected] of [[{ danger: 99.9 }, "lost"], [{ elapsedMs: 179900 }, "won"]]) {
    let state = act(fixture({ ...overrides, candleLit: false, ghostVisible: true }), "relight");
    state = advance(state, 100);
    assert.equal(state.status, expected);
    assert.equal(state.activeAction, null);
    assert.equal(state.candleLit, false);
    assert.equal(state.ghostVisible, true);
    assert.equal(state.draftProtectedUntilMs, 0);
    assert.equal(state.nextGhostCheckAtMs, null);
    assert.equal(advance(state, 5000), state);
  }
});

test("deterministic full nights use real schedules and normal actions for all 180 seconds", () => {
  for (let seed = 1; seed <= 5; seed++) {
    let value = seed;
    const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 2 ** 32; };
    let state = createInitialGame();
    let windows = 0;
    let drafts = 0;
    for (let i = 0; i < 1800 && state.status === "playing"; i++) {
      if (!state.activeAction) {
        if (!state.candleLit) { state = act(state, "relight", random()); drafts++; }
        else if (state.windowOpen) { state = act(state, "gentleClose", random()); windows++; }
      }
      state = advance(state, 100, { window: random(), draft: random(), ghost: random() });
    }
    assert.equal(state.status, "won", `seed ${seed}`);
    assert.equal(state.elapsedMs, 180000);
    assert.ok(windows > 0);
    assert.ok(drafts > 0);
  }
});

test("Danger loss takes precedence on the dawn tick", () => {
  const state = advance(fixture({ elapsedMs: 179900, danger: 99.9, windowOpen: true }), 100);
  assert.equal(state.status, "lost");
  assert.equal(state.lossReason, "danger");
});

test("restart resets all threats/actions/deadlines/protection and rejects stale callbacks", () => {
  for (const status of ["playing", "lost", "won"]) {
    const previous = { ...encounter(), status, lossReason: "danger", wakefulness: 65,
      activeAction: { kind: "relight", elapsedMs: 2900 }, calmMs: 2000,
      draftProtectedUntilMs: 50000, safeGraceUntilMs: 50000,
      disturbance: { message: "Old notice", remainingMs: 2000 } };
    let state = send(previous, "restart");
    assert.deepEqual(state, createInitialGame(1));
    for (const type of ["tick", "window-event", "candle-event", "ghost-event", "action", "cancel"]) {
      assert.equal(gameReducer(state, { type, runId: 0, kind: "slam", random: 0, frames: [frame(100)] }), state);
    }
    state = advance(state, 7900, { ...noEvents, draft: 0, ghost: 0 });
    assert.equal(isSafe(state), true);
    state = advance(state, 100);
    assert.equal(state.windowOpen, true);
    assert.equal(state.candleLit, true);
  }
});
