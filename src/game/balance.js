// Playtest defaults. Rates are points/SECOND; all durations below are milliseconds.
export const BALANCE = {
  winSeconds: 180,
  meterMax: 100,
  tickMs: 100,
  gentleCloseMs: 2000,
  relightMs: 3000,
  slamWakefulness: 20,
  flareWakefulness: 25,
  calmDelayMs: 3000,
  wakeRecoveryPerSecond: 3,
  disturbanceMessageMs: 3000,
  openWindowDangerPerSecond: 2,
  darknessDangerPerSecond: 1,
  ghostDangerPerSecond: 3,
  safeDangerRecoveryPerSecond: 10,
  firstWindowMs: 8000,
  windowDelayMinMs: 12000,
  windowDelayMaxMs: 18000,
  firstDraftCheckMs: 12000,
  draftCheckIntervalMs: 4000,
  closedWindowDraftChance: 0.2,
  openWindowDraftChance: 0.4,
  firstGhostCheckDelayMs: 2000,
  ghostCheckIntervalMs: 2000,
  ghostChance: 0.35,
  draftProtectionMs: 6000,
  safeRoomGraceMs: 6000,
};

export const SUSTAINED_ACTIONS = {
  gentleClose: { label: "Gentle Close", durationMs: BALANCE.gentleCloseMs },
  relight: { label: "Relight Candle", durationMs: BALANCE.relightMs },
};
