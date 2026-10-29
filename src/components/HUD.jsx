import { BALANCE, SUSTAINED_ACTIONS } from "../game/balance.js";
import { canPerformAction, dangerRatePerSecond, isCalm } from "../game/gameState.js";

export default function HUD({ game, performAction, cancelAction, pauseGame, restartGame }) {
  const { danger, wakefulness, status, activeAction, disturbance } = game;
  const actionInfo = activeAction && SUSTAINED_ACTIONS[activeAction.kind];
  const progress = activeAction ? activeAction.elapsedMs / actionInfo.durationMs : 0;
  const actionDisabled = (kind) => !canPerformAction(game, kind) || activeAction?.kind === kind;
  const seconds = (ms) => ms / 1000;
  const displayedMeter = (value) => Math.round(value * 10) / 10;
  const dangerRate = dangerRatePerSecond(game);
  const protectionLeft = Math.max(0, Math.ceil((game.draftProtectedUntilMs - game.elapsedMs) / 1000));
  const graceLeft = Math.max(0, Math.ceil((game.safeGraceUntilMs - game.elapsedMs) / 1000));
  const calmMessage = isCalm(game)
    ? game.calmMs >= BALANCE.calmDelayMs ? "Wakefulness recovering" : "Sleeper settling"
    : "Resolve threats to recover";

  return (
    <section className="game-hud" aria-label="Night Guardian controls">
      <div className="hud-overview">
        <h1>Night Guardian</h1>
        <div className="meter-group">
          <label htmlFor="danger-meter">Danger <strong>{displayedMeter(danger)} / {BALANCE.meterMax}</strong></label>
          <meter id="danger-meter" aria-label="Danger" min="0" max={BALANCE.meterMax} value={danger} />
        </div>
        <div className="meter-group">
          <label htmlFor="wakefulness-meter">Wakefulness <strong>{displayedMeter(wakefulness)} / {BALANCE.meterMax}</strong></label>
          <meter id="wakefulness-meter" aria-label="Wakefulness" min="0" max={BALANCE.meterMax} value={wakefulness} />
        </div>
        <p className="night-time">Time survived <strong>{Math.floor(game.elapsedMs / 1000)}s / {BALANCE.winSeconds}s</strong></p>
      </div>

      <div className="hud-actions">
        <section className="action-group window-actions" aria-labelledby="window-heading">
          <h2 id="window-heading">Window · {game.windowOpen ? "Open" : "Closed"}</h2>
          <div className="action-buttons">
            <button disabled={actionDisabled("gentleClose")} onClick={() => performAction("gentleClose")}>
              <strong>Gentle Close</strong><span>{seconds(BALANCE.gentleCloseMs)}s · +0 Wakefulness</span>
            </button>
            <button className="disruptive-action" disabled={actionDisabled("slam")} onClick={() => performAction("slam")}>
              <strong>Emergency Slam</strong><span>Instant · +{BALANCE.slamWakefulness} Wakefulness</span>
            </button>
          </div>
        </section>
        <section className="action-group candle-actions" aria-labelledby="candle-heading">
          <h2 id="candle-heading">Candle · {game.candleLit ? "Lit" : "Out"} <span className="ghost-status">Ghost · {game.ghostVisible ? "Present" : "Absent"}</span></h2>
          <div className="action-buttons">
            <button disabled={actionDisabled("relight")} onClick={() => performAction("relight")}>
              <strong>Relight Candle</strong><span>{seconds(BALANCE.relightMs)}s · +0 Wakefulness</span>
            </button>
            <button className="disruptive-action" disabled={actionDisabled("flare")} onClick={() => performAction("flare")}>
              <strong>Flare</strong><span>Instant · +{BALANCE.flareWakefulness} Wakefulness</span>
            </button>
          </div>
        </section>
      </div>

      <div className="hud-feedback">
        <div className="action-progress">
          <p>{activeAction
            ? `${actionInfo.label}: ${Math.round(progress * 100)}% · ${((actionInfo.durationMs - activeAction.elapsedMs) / 1000).toFixed(1)}s left`
            : "No action in progress"}</p>
          <progress aria-label={actionInfo ? `${actionInfo.label} progress` : "Action progress"} max="1" value={progress} />
        </div>
        {status === "playing" ? (
          <p className={`game-event${disturbance ? " disturbed" : ""}`} role="status">{disturbance?.message || game.lastEvent}</p>
        ) : (
          <p className="game-result" role="alert">
            {status === "won" ? "You survived until morning."
              : game.lossReason === "wakefulness"
                ? `Night failed: Wakefulness reached ${BALANCE.meterMax}. The sleeper woke in fright.`
                : `Night failed: Danger reached ${BALANCE.meterMax}. Nightmares reached the sleeper.`}
          </p>
        )}
        <div className="session-actions">
          <button className="secondary-action" aria-label="Cancel action" disabled={!activeAction || status !== "playing"} onClick={cancelAction}>Cancel</button>
          <button className="secondary-action" onClick={pauseGame}>Pause Night</button>
          <button className="restart-action" onClick={restartGame}>Restart Game</button>
        </div>
      </div>
      <div className="hud-footer">
        <p className="calm-status">{status !== "playing" ? "The night has ended."
          : `Danger ${dangerRate > 0 ? "+" : ""}${dangerRate}/s · ${game.ghostVisible ? "Ghost encounter: drafts blocked"
            : graceLeft ? `Safe-room grace: ${graceLeft}s · ${calmMessage}`
              : protectionLeft ? `Draft protection: ${protectionLeft}s` : calmMessage}`}</p>
        <details className="play-guide">
          <summary>How to play</summary>
          <p>Protect the sleeper for {BALANCE.winSeconds} seconds without either meter reaching {BALANCE.meterMax}. Close the window gently or slam it at a Wakefulness cost.</p>
          <p>A draft may put the candle out. Relight takes {seconds(BALANCE.relightMs)} uninterrupted seconds, then its flame banishes any ghost. The candle stays out until completion. After {seconds(BALANCE.firstGhostCheckDelayMs)} dark seconds, a ghost has a {BALANCE.ghostChance * 100}% chance to appear, checked every {seconds(BALANCE.ghostCheckIntervalMs)} seconds afterward, even during Relight.</p>
          <p>A newly appearing ghost cancels Relight once: click Relight again for a fresh {seconds(BALANCE.relightMs)}-second attempt. The active ghost cannot interrupt it again, and drafts are blocked for the encounter. Flare works even in darkness, immediately banishes the ghost, and leaves the candle lit.</p>
          <p>Click once to begin. Only one sustained action can run; switching or cancelling loses progress without resetting darkness. Darkness and ghost Danger continue until the flame returns. Successful Relight or Flare grants {seconds(BALANCE.draftProtectionMs)} seconds of draft protection.</p>
          <p>A safe room has its window closed, candle lit, and no ghost. Danger recovers immediately at {BALANCE.safeDangerRecoveryPerSecond}/second. Resolving the last threat grants {seconds(BALANCE.safeRoomGraceMs)} seconds without a new window opening or draft. Wakefulness recovers at {BALANCE.wakeRecoveryPerSecond}/second after {seconds(BALANCE.calmDelayMs)} calm seconds with no sustained action.</p>
        </details>
      </div>
    </section>
  );
}
