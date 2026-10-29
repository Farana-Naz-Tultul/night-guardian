import { BALANCE } from "../game/balance.js";

function ScreenButton({ children, primary = false, onClick }) {
  return (
    <button className={primary ? "screen-button screen-button-primary" : "screen-button"} onClick={onClick}>
      {children}
    </button>
  );
}

export function MainMenu({ startNight, showTutorial }) {
  return (
    <section className="game-screen main-menu" aria-labelledby="main-menu-title">
      <p className="screen-kicker">A quiet room. A long night.</p>
      <h1 id="main-menu-title">Night Guardian</h1>
      <p className="screen-lede">Keep the sleeper safe until morning without letting Danger or Wakefulness reach 100.</p>
      <div className="screen-actions">
        <ScreenButton primary onClick={startNight}>Start Night</ScreenButton>
        <ScreenButton onClick={showTutorial}>How to Play</ScreenButton>
      </div>
      <p className="screen-note">A full night lasts {BALANCE.winSeconds} seconds.</p>
    </section>
  );
}

export function Tutorial({ startNight, returnToMenu }) {
  return (
    <section className="game-screen tutorial-screen" aria-labelledby="tutorial-title">
      <p className="screen-kicker">How to play</p>
      <h1 id="tutorial-title">Guard the sleeper</h1>
      <ol className="tutorial-steps">
        <li><strong>Keep Danger low.</strong> An open window, darkness, and ghosts add Danger. A safe room recovers it.</li>
        <li><strong>Stay quiet when you can.</strong> Slamming the window or using Flare works instantly, but raises Wakefulness.</li>
        <li><strong>Relight with care.</strong> The candle takes 3 seconds to relight and banishes a ghost when it catches.</li>
      </ol>
      <p className="screen-note">You win by reaching morning with both meters below 100.</p>
      <div className="screen-actions">
        <ScreenButton primary onClick={startNight}>Begin Guarding</ScreenButton>
        <ScreenButton onClick={returnToMenu}>Back to Menu</ScreenButton>
      </div>
    </section>
  );
}

export function PauseScreen({ game, resumeNight, restartNight, returnToMenu }) {
  return (
    <section className="game-screen pause-screen" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <p className="screen-kicker">The room is waiting</p>
      <h1 id="pause-title">Night Paused</h1>
      <p className="screen-lede">{Math.floor(game.elapsedMs / 1000)} seconds survived. The night will remain exactly as you left it.</p>
      <div className="screen-actions">
        <ScreenButton primary onClick={resumeNight}>Resume Night</ScreenButton>
        <ScreenButton onClick={restartNight}>Restart Night</ScreenButton>
        <ScreenButton onClick={returnToMenu}>Main Menu</ScreenButton>
      </div>
    </section>
  );
}

export function GameOverScreen({ game, restartNight, returnToMenu }) {
  const won = game.status === "won";
  const wokeUp = game.lossReason === "wakefulness";
  const title = won ? "Morning Has Come" : wokeUp ? "The Sleeper Woke" : "Night Over";
  const message = won
    ? `You protected the sleeper for ${BALANCE.winSeconds} seconds.`
    : wokeUp
      ? "Too much disturbance woke the sleeper in fright."
      : "Danger filled the room before morning arrived.";

  return (
    <section className={`game-screen game-over-screen ${won ? "screen-won" : "screen-lost"}`} role="alert" aria-labelledby="game-over-title">
      <p className="screen-kicker">{won ? "Night complete" : "The night has ended"}</p>
      <h1 id="game-over-title">{title}</h1>
      <p className="screen-lede">{message}</p>
      <dl className="result-summary">
        <div><dt>Time survived</dt><dd>{Math.floor(game.elapsedMs / 1000)}s</dd></div>
        <div><dt>Danger</dt><dd>{Math.round(game.danger)} / {BALANCE.meterMax}</dd></div>
        <div><dt>Wakefulness</dt><dd>{Math.round(game.wakefulness)} / {BALANCE.meterMax}</dd></div>
      </dl>
      <div className="screen-actions">
        <ScreenButton primary onClick={restartNight}>{won ? "Play Again" : "Try Again"}</ScreenButton>
        <ScreenButton onClick={returnToMenu}>Main Menu</ScreenButton>
      </div>
    </section>
  );
}
