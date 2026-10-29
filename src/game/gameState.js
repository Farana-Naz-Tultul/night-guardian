import { BALANCE, SUSTAINED_ACTIONS } from "./balance.js";

export function createInitialGame(runId = 0) {
  return {
    runId,
    status: "playing",
    lossReason: null,
    windowOpen: false,
    candleLit: true,
    ghostVisible: false,
    danger: 0,
    wakefulness: 0,
    elapsedMs: 0,
    calmMs: 0,
    activeAction: null,
    disturbance: null,
    nextWindowAtMs: BALANCE.firstWindowMs,
    nextDraftCheckAtMs: BALANCE.firstDraftCheckMs,
    darknessStartedAtMs: null,
    nextGhostCheckAtMs: null,
    draftProtectedUntilMs: 0,
    safeGraceUntilMs: 0,
    lastEvent: "The room is quiet.",
  };
}

// Snap only floating-point noise at the bounds, never round ordinary fractions.
// Repeated 0.1 additions can otherwise leave 100 represented as 99.9999999999986.
const clampMeter = (value) => value >= BALANCE.meterMax - 1e-9
  ? BALANCE.meterMax : value <= 1e-9 ? 0 : value;

export function isSafe(state) {
  return !state.windowOpen && state.candleLit && !state.ghostVisible;
}

export function isCalm(state) {
  return isSafe(state) && !state.activeAction;
}

export function dangerRatePerSecond(state) {
  if (isSafe(state)) return -BALANCE.safeDangerRecoveryPerSecond;
  return (state.windowOpen ? BALANCE.openWindowDangerPerSecond : 0) +
    (!state.candleLit ? BALANCE.darknessDangerPerSecond : 0) +
    (state.ghostVisible ? BALANCE.ghostDangerPerSecond : 0);
}

export function canDraft(state) {
  return state.status === "playing" && state.candleLit && !state.ghostVisible &&
    state.activeAction?.kind !== "relight" &&
    state.elapsedMs >= state.draftProtectedUntilMs &&
    state.elapsedMs >= state.safeGraceUntilMs;
}

export function canPerformAction(state, kind) {
  if (state.status !== "playing") return false;
  switch (kind) {
    case "gentleClose":
    case "slam": return state.windowOpen;
    case "relight": return !state.candleLit;
    case "flare": return state.ghostVisible;
    default: return false;
  }
}

function finish(state, status, lossReason = null) {
  return {
    ...state, status, lossReason, activeAction: null,
    nextWindowAtMs: null, nextDraftCheckAtMs: null, nextGhostCheckAtMs: null,
    disturbance: null,
    lastEvent: status === "won"
      ? "Morning has come. You kept the sleeper safe."
      : lossReason === "wakefulness"
        ? "The sleeper woke in fright. Too much disturbance ended the night."
        : "Danger overwhelmed the room. The nightmares reached the sleeper.",
  };
}

function grantSafeGrace(previous, next) {
  // Only a real unsafe -> safe transition grants grace. Never pull a later
  // window deadline forward; drafts keep their cadence and skip blocked checks.
  if (next.status !== "playing" || isSafe(previous) || !isSafe(next)) return next;
  const safeGraceUntilMs = next.elapsedMs + BALANCE.safeRoomGraceMs;
  return {
    ...next, safeGraceUntilMs,
    nextWindowAtMs: Math.max(next.nextWindowAtMs, safeGraceUntilMs),
  };
}

function closeWindow(state, random) {
  return {
    ...state, windowOpen: false,
    nextWindowAtMs: state.elapsedMs + BALANCE.windowDelayMinMs +
      random * (BALANCE.windowDelayMaxMs - BALANCE.windowDelayMinMs),
  };
}

function lightCandle(state) {
  return {
    ...state, candleLit: true, ghostVisible: false,
    darknessStartedAtMs: null, nextGhostCheckAtMs: null,
    draftProtectedUntilMs: state.elapsedMs + BALANCE.draftProtectionMs,
  };
}

function disturb(state, cost, message) {
  const next = {
    ...state, activeAction: null, calmMs: 0,
    wakefulness: clampMeter(state.wakefulness + cost),
    disturbance: { message, remainingMs: BALANCE.disturbanceMessageMs },
  };
  return next.wakefulness >= BALANCE.meterMax ? finish(next, "lost", "wakefulness") : next;
}

function startAction(state, kind, random) {
  // Invalid/repeated clicks cannot reset progress, schedules, or protection.
  if (!canPerformAction(state, kind) || state.activeAction?.kind === kind) return state;
  if (kind === "slam") {
    return grantSafeGrace(state, disturb(
      { ...closeWindow(state, random), lastEvent: "You slammed the window shut." },
      BALANCE.slamWakefulness,
      `The slam startled the sleeper. +${BALANCE.slamWakefulness} Wakefulness.`,
    ));
  }
  if (kind === "flare") {
    return grantSafeGrace(state, disturb(
      lightCandle({ ...state, lastEvent: "The flare repelled the ghost and lit the candle." }),
      BALANCE.flareWakefulness,
      `The flare disturbed the sleeper. +${BALANCE.flareWakefulness} Wakefulness.`,
    ));
  }
  const cancelled = state.activeAction
    ? `${SUSTAINED_ACTIONS[state.activeAction.kind].label} cancelled. ` : "";
  return {
    ...state, activeAction: { kind, elapsedMs: 0 }, calmMs: 0,
    lastEvent: `${cancelled}${SUSTAINED_ACTIONS[kind].label} started.`,
  };
}

function advanceAction(state, deltaMs, random) {
  if (!state.activeAction) return state;
  const { kind, elapsedMs } = state.activeAction;
  const progressMs = elapsedMs + deltaMs;
  if (progressMs < SUSTAINED_ACTIONS[kind].durationMs) {
    return { ...state, activeAction: { kind, elapsedMs: progressMs } };
  }
  let next = { ...state, activeAction: null };
  if (kind === "gentleClose") {
    next = { ...closeWindow(next, random), lastEvent: "You gently closed the window." };
  } else if (kind === "relight") {
    next = { ...lightCandle(next), lastEvent: state.ghostVisible
      ? "You relit the candle. Its flame banished the ghost."
      : "You relit the candle. Draft protection renewed." };
  }
  return grantSafeGrace(state, next);
}

function advanceEvents(state, random) {
  let next = state;
  // These independent schedules allow window, darkness, and ghost to coexist.
  if (!next.windowOpen && next.nextWindowAtMs !== null &&
      next.elapsedMs >= Math.max(next.nextWindowAtMs, next.safeGraceUntilMs)) {
    next = { ...next, windowOpen: true, nextWindowAtMs: null, calmMs: 0,
      lastEvent: "A cold wind pushes the window open..." };
  }
  if (next.nextDraftCheckAtMs !== null && next.elapsedMs >= next.nextDraftCheckAtMs) {
    const chance = next.windowOpen ? BALANCE.openWindowDraftChance : BALANCE.closedWindowDraftChance;
    if (canDraft(next) && random.draft < chance) {
      next = { ...next, candleLit: false, calmMs: 0,
        darknessStartedAtMs: next.elapsedMs,
        nextGhostCheckAtMs: next.elapsedMs + BALANCE.firstGhostCheckDelayMs,
        lastEvent: "A draft extinguished the candle. Relight before a ghost finds the darkness." };
    }
    // Consume every scheduled check, even if ineligible. Nothing is queued.
    next = { ...next, nextDraftCheckAtMs: next.elapsedMs + BALANCE.draftCheckIntervalMs };
  }
  if (!next.candleLit && !next.ghostVisible && next.nextGhostCheckAtMs !== null &&
      next.elapsedMs >= next.nextGhostCheckAtMs) {
    if (random.ghost < BALANCE.ghostChance) {
      // Only the no-ghost -> ghost transition can interrupt Relight. Clearing
      // the deadline stops further rolls until a new darkness episode begins.
      const interruptsRelight = next.activeAction?.kind === "relight";
      next = { ...next, ghostVisible: true, nextGhostCheckAtMs: null, calmMs: 0,
        activeAction: interruptsRelight ? null : next.activeAction,
        // Give the explanation priority over an earlier disturbance notice.
        disturbance: interruptsRelight ? null : next.disturbance,
        lastEvent: interruptsRelight
          ? "A ghost smothered the spark! Relight again."
          : "A ghost found the darkness. Relight to banish it, or use Flare." };
    } else {
      next = { ...next, nextGhostCheckAtMs: next.elapsedMs + BALANCE.ghostCheckIntervalMs };
    }
  }
  return next;
}

function tick(state, frame) {
  // Absolute, ordered timestamps make duplicate/old ticks harmless. Each frame
  // represents precisely tickMs; rendering never adds Danger or rolls events.
  if (frame.elapsedMs !== state.elapsedMs + BALANCE.tickMs) return state;
  const deltaMs = frame.elapsedMs - state.elapsedMs;
  let next = { ...state, elapsedMs: frame.elapsedMs };
  // The ONLY danger calculation: per-second rate * elapsed seconds. Keep
  // fractions internally; an unfinished action still contributes its threat.
  next.danger = clampMeter(state.danger + dangerRatePerSecond(state) * deltaMs / 1000);
  // A loss on the dawn/completion tick takes precedence.
  if (next.danger >= BALANCE.meterMax) return finish(next, "lost", "danger");
  if (next.elapsedMs >= BALANCE.winSeconds * 1000) return finish(next, "won");

  next.calmMs = isCalm(state) ? state.calmMs + deltaMs : 0;
  if (next.calmMs > BALANCE.calmDelayMs) {
    const recoveryMs = next.calmMs - Math.max(state.calmMs, BALANCE.calmDelayMs);
    next.wakefulness = clampMeter(state.wakefulness - BALANCE.wakeRecoveryPerSecond * recoveryMs / 1000);
  }
  if (state.disturbance) {
    const remainingMs = state.disturbance.remainingMs - deltaMs;
    next.disturbance = remainingMs > 0 ? { ...state.disturbance, remainingMs } : null;
  }
  // Completion at a deadline wins over an event check at that same instant:
  // relighting cancels darkness checks before any manifestation can happen.
  next = advanceAction(next, deltaMs, frame.random.window);
  return advanceEvents(next, frame.random);
}

// Pure transitions: randomness is supplied by Game, not generated on render or
// inside the reducer. One clock drives all schedules; no detached ghost timers.
export function gameReducer(state, event) {
  if (event.type === "restart") return createInitialGame(state.runId + 1);
  if (event.runId !== state.runId || state.status !== "playing") return state;
  switch (event.type) {
    case "tick": {
      let next = state;
      for (const frame of event.frames) {
        if (next.status !== "playing") break;
        next = tick(next, frame);
      }
      return next;
    }
    case "action": return startAction(state, event.kind, event.random);
    case "cancel": return state.activeAction ? {
      ...state, activeAction: null, calmMs: 0,
      lastEvent: "Action cancelled. Unfinished progress was lost.",
    } : state;
    default: return state;
  }
}
