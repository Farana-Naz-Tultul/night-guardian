# Night Guardian — current checkpoint

## 2026-10-29 — Menu, tutorial, pause, and end screens

Added the first presentation-flow milestone without changing the gameplay reducer, balance, threats, assets, or 180-second goal. The game now opens on a main menu, includes a short three-step tutorial, and provides pause/resume, restart, and return-to-menu controls. Win, Danger-loss, and Wakefulness-loss states now replace the control HUD with a clear result panel showing the outcome, time survived, and final meter values.

`Game` owns the presentation screen state while the existing reducer continues to own all gameplay state. The single gameplay interval only runs on the active play screen. Pausing removes that interval; resuming rebuilds its real-time origin from the reducer's stored `elapsedMs`, so no game time, action progress, Danger, Wakefulness, or event deadline advances while paused. Restart and menu transitions still dispatch the reducer's existing `restart` event, preserving run-ID stale-callback protection.

Verification performed:

- `npm test`: all 50 deterministic gameplay tests passed, including restart, both loss reasons, and the 180-second win.
- `npm run lint`, `npm run build`, and `git diff --check` passed.
- Live Chrome check: main menu → tutorial → play; pause froze the run at 7 seconds for an additional 1.8 seconds; resume continued to 8 seconds and triggered the original 8-second window event at the correct game time. Restart reset time, meters, threats, and controls. An unattended run produced the new Danger-loss screen at 32 seconds; “Try Again” reset it, and Pause → Main Menu returned to the opening screen.
- The Danger-loss screen and desktop layout were visually inspected. The win and Wakefulness result copy are implemented through the same result component and their underlying terminal states are deterministic-test covered; they were not each reached through a full live browser run in this checkpoint.

Changed in this checkpoint: `src/components/Game.jsx`, `src/components/HUD.jsx`, `src/components/GameScreen.jsx`, `src/components/Game.css`, `README.md`, `index.html`, and this log. No authentication, persistence, statistics, achievements, or guest-account work was started.

## 2026-09-29 — One Relight action and a continuous game frame

Replaced the separate relight/repel phases with one 3-second Relight in the existing React/Vite game. A first ghost manifestation can interrupt it once; a fresh player click starts a full retry that the active ghost cannot randomly interrupt. Joined the room and bottom HUD with aligned edges and no gap. Preserved artwork, components, responsive scene scaling, window mechanics, other pacing, meter rates/costs, and the 180-second goal. No dependencies added; nothing published.

### Audit: why the earlier night felt unfair

The actual starting code had one Danger calculation, gated to once per accumulated second. There was no duplicate Danger interval, per-render accumulation, or 100 ms / 1 second multiplication error. The old formula could add **12 Danger/second** (+5 window, +4 darkness, +3 ghost), while a safe room recovered only 2/second. Independent random threats arrived frequently and their probabilities increased above Danger 60. There was no guaranteed safe recovery gap.

A separate random candle timer could extinguish the flame during a ghost encounter and explicitly cancelled Steady Candlelight. A separate ghost timer could spawn ghosts even while the candle was lit. Both independent timers and the danger-based event acceleration have been removed.

### Current rules and provisional values

All gameplay tuning lives in `src/game/balance.js`. These are playtest defaults, not final difficulty.

| System | Implemented values |
| --- | --- |
| Danger rates, per second | Window +2; darkness +1; ghost +3; fully safe room −10 |
| Danger arithmetic | Add all active threat penalties; safe recovery only when all threats are absent, starting immediately |
| Wakefulness | 0–100; recover 3/second after 3 uninterrupted calm seconds |
| Calm | Safe room (closed window, lit candle, no ghost) with no sustained action; threats/actions/disturbances reset settling |
| Window | First opening at 8s; each successful closure schedules another in 12–18s |
| Draft | First check at 12s, then every 4s; 20% chance closed window / 40% open |
| Ghost | Darkness only: first check after 2s, then every 2s; independent 35% chance per eligible check |
| Draft protection | 6s after successful Relight or Flare |
| Recovery grace | 6s without a new window opening or draft when the **last** threat resolves |
| Gentle Close / Relight | 2s / 3s; each costs 0 Wakefulness |
| Emergency Slam / Flare | Instant; +20 / +25 Wakefulness |
| Goal / feedback / clock resolution | 180s / 3s disturbance message / 100 ms |

- Drafts only extinguish an eligible lit candle. Repeated blocked checks are discarded and cannot restart darkness. Open windows increase draft probability without automatically extinguishing anything.
- Darkness begins when the candle actually goes out. Starting, cancelling, or retrying Relight never changes that start or postpones a ghost check. Failed rolls leave progress intact.
- Relight keeps the flame out for all 3 seconds, with or without a ghost. Completion lights the candle, banishes any ghost, clears the darkness deadline, and grants protection together. Darkness/ghost Danger stop contributing from that transition onward. Steady Candlelight, Light & Hold, and the old ghost-fade progress are absent from gameplay.
- Only a no-ghost → ghost transition can cancel Relight. It clears the action slot and displays “A ghost smothered the spark! Relight again.” This explanation takes priority over an older disturbance notice. No automatic retry or extra interruption flag is needed: an active ghost blocks all further manifestation checks and drafts for the episode. Gentle Close is unaffected; window events do not cancel Relight.
- Flare works even with the candle out, removes the ghost, lights the candle, and grants protection. No free instant ghost removal exists.
- Grace only follows a real unsafe → safe transition. It never removes existing threats, extends itself through invalid clicks, pulls a later window deadline forward, or queues blocked drafts for later release.

### State and timer lifecycle

`Game` owns reducer state and **one** interval. It measures monotonic real elapsed time and dispatches ordered 100 ms frames (including missed frames after a delayed callback), with random samples supplied as data. The reducer is pure. It maintains independent window, draft, and darkness deadlines rather than separate asynchronous event callbacks.

One authoritative calculation applies `dangerRatePerSecond × deltaMs / 1000`. Fractions stay in state; the HUD displays tenths. Only floating-point noise within 1e-9 of a meter bound is clamped to that bound, preventing repeated 0.1 additions from delaying a threshold loss by one tick. Wakefulness recovery has its own calm timer.

There is one sustained action slot and no completion timeout. Switching/cancelling removes unfinished progress; invalid/repeated clicks do not change protection or schedules. Win/loss clears actions and deadlines and ignores further updates. Restart recreates all state and increments the run ID; old-run callbacks and duplicate/out-of-order frame timestamps are rejected. Danger loss wins a tie at dawn/completion; successful action completion precedes event checks at that same timestamp.

### Layout

Controls sit below the room in one centered purple/gold frame: zero inter-panel gap, equal outer widths, square joining corners, and one thin divider. Outside corners remain rounded and HUD padding is preserved. The scene retains its aspect ratio and ResizeObserver scaling. Four action choices, both meters, time, progress, feedback, Cancel, and Restart fit together at the desktop targets. Mobile and reduced viewports wrap and scroll naturally; no global overflow hiding was introduced.

### Verification performed

- **Deterministic:** `npm test` — **50 tests passed**. Covers 3-second Relight with/without ghosts, unlit state before completion, checks during Relight, failed rolls, one interruption per episode, fresh-click retry, cancellation/repeated clicks without postponing checks, Gentle Close surviving manifestation, batched chronological processing, exact-time completion precedence, no stale manifestations, Flare overrides, protection/grace, unchanged rates, both losses, restart, and five seeded full 180-second nights. Replaced obsolete separate-repelling assertions while retaining unrelated regressions.
- **Static/build:** `npm run lint`, `npm run build`, and `git diff --check` passed. Source audit confirms one interval and one Danger accumulation expression.
- **Browser interaction/visual checks:** in-app Chromium at 1280×720, 1366×768, and 390×844. Room bottom equals HUD top (0 px gap); left/right edges match. Desktop controls fit; mobile wraps without horizontal overflow. Inspected active Relight, interruption feedback, victory, and Danger loss. Reduced 640×360 viewport has vertical scrolling and no horizontal overflow. No captured warnings/errors. End states freeze time/meters and disable gameplay controls except Restart.
- **Real-time winning night:** won at 180 seconds through normal UI controls with unmodified randomness/duration: 9 Gentle Closes and 4 Relight attempts. At 26s a ghost interrupted Relight; the UI showed zero progress and the retry message, with Relight enabled. It stayed idle while desktop/mobile evidence was captured, then a fresh click completed the retry. Sampled Danger peaked at ≈62.4 (including gaps between automation chunks); Wakefulness stayed 0. Both meters ended at 0. This is a browser interaction check, not a human difficulty playtest.
- **Additional live checks:** restart reset the run to 0s and a safe room; mobile Gentle Close was overridden by Slam (+20); Relight was intentionally cancelled while still dark; a fresh Relight against a ghost was overridden by Flare (+25), immediately leaving a lit candle/no ghost. Then unattended play naturally lost to Danger at 59s; the result was checked on mobile and desktop and remained frozen. An earlier unattended page also lost at 34s.
- **Visual evidence:** `screenshots/night-guardian-relight-active.png`, `night-guardian-relight-interruption.png`, `night-guardian-relight-mobile.png`, `night-guardian-relight-win.png`, and `night-guardian-relight-loss.png`.
- **Unperformed / still to assess:** human reaction-time/difficulty sessions, real-time Wakefulness loss (covered deterministically), actual browser zoom rather than reduced-viewport approximation, physical touch devices, Firefox/Safari, full keyboard/screen-reader audit, and background-tab throttling/suspension. Reducer tests do not mount React effects. One live win does not establish final balance.

Changed this revision: `src/game/balance.js`, `src/game/gameState.js`, `src/components/Game.jsx`, `src/components/Room.jsx`, `src/components/Ghost.jsx`, `src/components/HUD.jsx`, `src/components/Game.css`, `src/components/Room.css`, `tests/gameState.test.js`, `README.md`, this log, and five new screenshots. Personal study materials and raw private records are excluded from the repository.

Previous checkpoints introduced Wakefulness, cancellation/run-ID protection, then revised Danger rates, draft/darkness pacing, recovery grace, and a bottom HUD. This focused revision supersedes only the earlier separate candle-repelling phase, 1.5-second Relight, 3-second initial ghost delay, and the gap between panels.

## 2026-10-29 — Published-baseline review and project handoff documentation

Reviewed the repository history and fetched remote references without pulling or changing working files. The current branch is `main`, its configured upstream is `origin/main`, and both local `HEAD` and the fetched upstream resolve to `1f1e4c73f2e8eb6486013f1e731dd680f9c80779` (`update README with room layout screenshot and current features`). This provides an exact published baseline for the current uncommitted milestone.

The pushed build already contained the illustrated room, animated window/candle/ghost threats, a Danger meter, a basic win/Danger-loss loop, restart, and an interactive control panel in a single `App.jsx`. It used a 90-second goal, independent effect timers, instant window/candle/ghost controls, and had no project log or automated tests. The current working implementation preserves that scene and threat concept while adding the 180-second Danger/Wakefulness loop, quiet-versus-disruptive actions, one cancellable sustained-action slot, deadline-driven threat pacing, centralized balance configuration, responsive joined room/HUD composition, component/reducer separation, and 50 deterministic gameplay tests.

The current presentation milestone adds the main menu, three-step tutorial, true pause/resume, restart and return-to-menu choices, and distinct morning, Danger-loss, and Wakefulness-loss result screens. Authentication, persistence, cross-device saves, statistics, achievements, and an account-specific guest mode remain unimplemented.

Reworked `README.md` around that verified comparison. It now documents the objective, current mechanics and controls, presentation flow, actual architecture and technology, package scripts, screenshots, verification boundaries, limitations, and clearly labelled future plans. No version number, hosted demo, badge, performance claim, or unpublished feature was added.
