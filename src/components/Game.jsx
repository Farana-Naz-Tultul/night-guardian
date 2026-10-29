import { useEffect, useReducer, useRef, useState } from "react";
import Room from "./Room.jsx";
import HUD from "./HUD.jsx";
import { GameOverScreen, MainMenu, PauseScreen, Tutorial } from "./GameScreen.jsx";
import { BALANCE } from "../game/balance.js";
import { createInitialGame, gameReducer } from "../game/gameState.js";
import "./Game.css";

export default function Game() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createInitialGame);
  const [screen, setScreen] = useState("menu");
  const elapsedRef = useRef(0);
  const { runId, status, windowOpen, candleLit, ghostVisible } = game;
  const gameIsRunning = screen === "playing" && status === "playing";

  useEffect(() => {
    elapsedRef.current = game.elapsedMs;
  }, [game.elapsedMs]);

  useEffect(() => {
    if (!gameIsRunning) return undefined;
    // Restart the clock from the reducer's timestamp after a pause. The
    // reducer still owns elapsed game time; this only measures real time
    // while the player is actively playing.
    const startedAt = performance.now() - elapsedRef.current;
    let sentThroughMs = elapsedRef.current;
    const interval = setInterval(() => {
      const elapsedMs = Math.min(BALANCE.winSeconds * 1000,
        Math.floor((performance.now() - startedAt) / BALANCE.tickMs) * BALANCE.tickMs);
      const frames = [];
      // Catch up elapsed real time in small ordered steps. Every step has its
      // own random samples; only scheduled, eligible checks use those samples.
      for (let at = sentThroughMs + BALANCE.tickMs; at <= elapsedMs; at += BALANCE.tickMs) {
        frames.push({ elapsedMs: at,
          random: { window: Math.random(), draft: Math.random(), ghost: Math.random() } });
      }
      sentThroughMs = elapsedMs;
      if (frames.length) dispatch({ type: "tick", runId, frames });
    }, BALANCE.tickMs);
    return () => clearInterval(interval);
  }, [gameIsRunning, runId]);

  const restartNight = () => {
    dispatch({ type: "restart" });
    setScreen("playing");
  };

  const returnToMenu = () => {
    dispatch({ type: "restart" });
    setScreen("menu");
  };

  const startNight = () => restartNight();

  let panel;
  if (screen === "menu") {
    panel = <MainMenu startNight={startNight} showTutorial={() => setScreen("tutorial")} />;
  } else if (screen === "tutorial") {
    panel = <Tutorial startNight={startNight} returnToMenu={returnToMenu} />;
  } else if (screen === "paused") {
    panel = <PauseScreen game={game} resumeNight={() => setScreen("playing")} restartNight={restartNight} returnToMenu={returnToMenu} />;
  } else if (status !== "playing") {
    panel = <GameOverScreen game={game} restartNight={restartNight} returnToMenu={returnToMenu} />;
  } else {
    panel = (
      <HUD
        game={game}
        performAction={(kind) => dispatch({ type: "action", kind, runId, random: Math.random() })}
        cancelAction={() => dispatch({ type: "cancel", runId })}
        pauseGame={() => setScreen("paused")}
        restartGame={restartNight}
      />
    );
  }

  return (
    <div className="game-layout">
      <Room
        windowOpen={windowOpen}
        candleLit={candleLit}
        ghostVisible={ghostVisible}
        sleeperAwake={game.lossReason === "wakefulness"}
        danger={game.danger}
        lastEvent={game.lastEvent}
      />
      {panel}
    </div>
  );
}
