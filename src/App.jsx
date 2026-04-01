import { useState, useEffect, useRef } from "react";

export default function App() {
  const WIN_TIME = 90;

  const [windowOpen, setWindowOpen] = useState(false);
  const [danger, setDanger] = useState(0);
  const [lastEvent, setLastEvent] = useState("The room is quiet");
  const [gameOver, setGameOver] = useState(false);
  const [candleLit, setCandleLit] = useState(true);
  const [nightTime, setNightTime] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [ghostVisible, setGhostVisible] = useState(false);
  const dangerRef = useRef(danger);

  useEffect(() => {
    dangerRef.current = danger;
  }, [danger]);
  
//Danger Level  and Losing the Game

  useEffect(() => {
    if (gameOver || gameWon) return;

    const interval = setInterval(() => {
      setDanger((prev) => {
        let nextDanger = prev;

        if (windowOpen) {
          nextDanger += 5;
        } else {
          nextDanger -= 2;
        }

        if (!candleLit) {
          nextDanger += 4;        }

        if (ghostVisible) {
          nextDanger += 3;
        }

        nextDanger = Math.max(nextDanger, 0);

        if (nextDanger >= 100) {
          setGameOver(true);
          setLastEvent("The room became too dangerous...");
          return 100;
        }

        return nextDanger;
      });
    }, 1000);
``
    return () => clearInterval(interval);
  }, [windowOpen, candleLit, ghostVisible, gameOver, gameWon]);

  // Window Opens at Random

  useEffect(() => {
    if (gameOver || gameWon) return;

    const interval = setInterval(() => {
      const random = Math.random();

      const currentDanger = dangerRef.current;

      const openChance = currentDanger > 60 ? 0.4 : 0.5;

      if (!windowOpen && random > openChance) {
        setWindowOpen(true);
        setLastEvent("A cold wind pushes the window open...");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [windowOpen, gameOver, gameWon]);

//Candle FLickers Out at Random

  useEffect(() => {
    if (gameOver || gameWon) return;

    const interval = setInterval(() => {
      const random = Math.random();

      const currentDanger = dangerRef.current;

      const candleChance = currentDanger > 60 ? 0.5 : 0.6;

      if (candleLit && random > candleChance) {
        setCandleLit(false);
        setLastEvent("The candle flickered out...");
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [candleLit, gameOver, gameWon]);

  //Night Time Timer and Winning the Game

  useEffect(() => {
    if (gameOver || gameWon) return;

    const interval = setInterval(() => {
      setNightTime((prev) => {
        const nextTime = prev + 1;

        if (nextTime >= WIN_TIME) {
          setGameWon(true);
          setLastEvent("Morning has come. You kept the room safe.");
          return WIN_TIME;
        }

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  },[WIN_TIME, gameOver, gameWon]);

//Ghost Appears at Random

useEffect(() => {

  if (gameOver || gameWon) return;

  const interval = setInterval(() => {
    const random = Math.random();

    const currentDanger = dangerRef.current;

    const ghostChance = currentDanger > 60 ? 0.5 : 0.7;

    //console.log("ghost check", {ghostVisible, random, ghostChance});

    if(!ghostVisible && random > ghostChance) {
      setGhostVisible(true);
      setLastEvent("A faint presense drifts through the room...");
    }
  }, 5000);

  return () => clearInterval(interval);
}, [ghostVisible, gameOver, gameWon]);

//Game Restarts
  
  const restartGame = () => {
    setWindowOpen(false);
    setDanger(0);
    setLastEvent("The room is quiet.");
    setGameOver(false);
    setCandleLit(true);
    setNightTime(0);
    setGameWon(false);
    setGhostVisible(false);
  };

// User Interface

  return (
    <div
      style={{
        minHeight: "100vh",
        background: danger > 60 ? "#020617" : "#0f172a",
        animation: danger > 60 ? "none" : "roomPulse 6s ease-in-out infinite",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div>
        <h1>Night Guardian</h1>

        <div
          style={{
            marginTop: "20px",
            padding: "24px",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.04)",
            border: "rgba(255,255,255,0.04)",
            width: "260px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          
          {/* Window */}
          <div
            style={{
              width: "100px",
              height: "120px",
              background: windowOpen ? "#38bdf8" : "#1e293b",
              margin: "10px auto",
              border: "2px solid white",

              /*Window Animation*/
              transform: windowOpen ? "rotate(10deg)" : "rotate(0deg)",
              transformOrigin: "left center",
              transition: "all 0.3s ease",
            }}
          >
            Window
          </div>

          {/* Candle */}
          <div
            style={{
              width: "40px",
              height: "60px",
              background: candleLit ? "#facc15" : "#374151",
              margin: "10px auto",
              border: "2px solid white",

              /*Candle Glow*/
              boxShadow: candleLit ? "0 0 20px rgba(255, 200, 50, 0.8)" : "none",
              animation: candleLit
                ? danger > 60
                  ? "candleFlicker 0.6s ease-in-out infinite"
                  : "candleFlicker 1.2s ease-in-out infinite"
                : "none",
              transition: "background 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            Candle
          </div>

          {/* Ghost */}
          <div
            style={{
              width: "60px",
              height: "60px",
              margin: "10px auto",
              border: "2px solid white",
              borderRadius: "50%",
              background: ghostVisible ? "rgba(220, 220, 255, 0.8)" : "rgba(255,255,255,0.08)",
              opacity: ghostVisible ? 1 : 0.25,
              boxShadow: ghostVisible
                ? danger > 60
                  ? "0 0 40px rgba(200, 200, 255, 1)"
                  : "0 0 20px rgba(200, 200, 255, 0.8)"
                : "none",
             // transform: ghostVisible ? "translateY(-10px)" : "translateY(0px)",
              animation: ghostVisible ? "ghostBob 2s ease-in-out infinite" : "none",
              transition: "opacity 0.4s ease, background 0.4s ease, box-shadow 0.4s ease",
            }}
          >
            Ghost
          </div>

        </div>

      {/*  <p>Window status: {windowOpen ? "Open" : "Closed"}</p> */}
        {/*<p>Candle: {candleLit ? "Lit" : "Out"}</p>*/}
        
        <p style={{ color: danger > 60 ? "red" : "white"}}>
          Danger: {danger}
        </p>
        <p>Tension: {danger > 60 ? "High" : "Low"}</p>
        <p>Time survived: {nightTime}s</p>
        <p>Goal: Survive {WIN_TIME}s</p>
        <p>Latest event: {lastEvent}</p>

        {gameOver && <p>Game Over</p>}
        {gameWon && <p>You survived until morning.</p>}
        
        {/*Open Window Button*/}
        <button
          onClick={() => {
            setWindowOpen(true);
            setLastEvent("You opened the window.");
          }}
          disabled={gameOver || gameWon}
        >
          Open Window
        </button>

        {/*Close Window Button*/}
        <button
          onClick={() => {
            setWindowOpen(false);
            setLastEvent("You closed the window.");
          }}
          disabled={gameOver || gameWon}
        >
          Close Window
        </button>
        
        {/*Candle Relight Button*/}
        <button
          onClick={() => {
            setCandleLit(true);
            setLastEvent("You relit the candle.");
          }}
          disabled={gameOver || gameWon}
        >
          Relight Candle
        </button>

        {/*Ghost Disappear Button*/}
        <button
          onClick={() => {
            setGhostVisible(false);
            setLastEvent("You whisper a calming prayer. The presence fades.");
          }}
          disabled={gameOver || gameWon|| !ghostVisible}
        >
          Calm Presence
        </button>

        {/*Restart Button*/}
        <button onClick={restartGame}>
          Restart Game
        </button>
      </div>
    </div>
  );
}