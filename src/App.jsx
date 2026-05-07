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
        // minHeight: "100vh",
        // background: danger > 60 ? "#020617" : "#0f172a",
        // animation: danger > 60 ? "none" : "roomPulse 6s ease-in-out infinite",
        // color: "white",
        // display: "flex",
        // alignItems: "center",
        // justifyContent: "center",
        // fontFamily: "Arial, sans-serif",

        display: "flex",
        justifyContent: "center",
        gap: "30px",
        padding: "20px",
      }}
    >
      {/* ROOM */}
      <div
        style={{
          position: "relative",
          width: "520px",
          height: "420px",
          background: "#2a2233",
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >

        {/* WINDOW */}
        <div
          style={{
            position: "absolute",
            top: "90px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120px",
            height: "90px",
            background: "#1e293b",
            border: "6px solid #1a1320",
            borderRadius: "8px",
            boxShadow: windowOpen
              ? "0 0 25px rgba(125, 211, 252, 0.6)"
              : "0 8px 18px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >  

          {/* sky */}
          <div
            style={{
              position: "absolute",
              inset: "8px",
              background: windowOpen ? "#7dd3fc" : "#334155",
              transition: "background 0.3s ease",
            }}
          />

          {/* window panel 
          <div
            style={{
              position: "absolte",
              top: "8px",
              left: "8px",
              width: "48px",
              height: "64px",
              background: windowOpen ? "rgba(186,230,253,0.8)" : "rgba(148,163,184,0.35)",
              border: "2px solid rgba(255,255,255,0.35)",
              transform: windowOpen ? "translaeX(-14px) rotateY(25deg)" : "translateX(0)",
              transformOrigin: "left center",
              transition: "al 0.35s ease",
            }}
          /> */}

          {/* cnter bar */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "8px",
              bottom: "8px",
              width: "4px",
              background: "#1a1320",
              transform: "translateX(-50%)",
            }}
          />

          {/* middle bar */}
          <div
            style={{
              position: "absolute",
              left: "8px",
              right: "8px",
              top: "50%",
              height: "4px",
              background: "#1a1320",
              transform: "translateY(-50%)",
            }}
          />

        </div>
        
        {/* GHOST */}
          <div
            style={{
              position: "absolute",
              left: "40px",
              bottom: "60px",
              width: "80px",
              height: "110px",
              margin: "10px auto",
              //border: "2px solid white",
              //borderRadius: "50%",
              background: ghostVisible ? "rgba(255, 255, 255, 0.9)" : "rgba(255,255,255,0.01)",
              borderRadius: "40px 40px 20px 20px",
              opacity: ghostVisible ? 1 : 0,
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
            {/* eyes */}
            <div
              style={{
                position: "absolute",
                top: "30px",
                left: "22px",
                width: "10px",
                height: "20px",
                background: "#111827",
                borderRadius: "50%",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "30px",
                right: "22px",
                width: "10px",
                height: "20px",
                background: "#111827",
                borderRadius: "50%",
              }}
            />

            {/* mouth */}
            <div
              style={{
                position: "absolute",
                top: "65px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "12px",
                height: "10px",
                background: "#111827",
                borderRadius: "50%",
              }}
            />
          </div>

          {/* BED + SLEEPER */}
          <div
            style={{
              position: "absolute",
              right: "40px",
              bottom:"40px",
              width: "120px",
              height: "140px",
            }}
          >

            {/* bed base */}
            <div
              style={{
                position: "absolute",
                bottom: "0",
                width: "100%",
                height: "60px",
                background: "#261607",
                borderRadius: "8px",
              }}
            />

            {/* pillow */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "20px",
                width: "60px",
                height: "40px",
                background: "#d6dded",
                borderRadius: "10px",
              }}
            />

            {/* head */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "30px",
                width: "40px",
                height: "40px",
                background: "#e6b1a7",
                borderRadius: "50%",
              }}
            >
              {/* Left Eye */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "3px",
                  width: "6px",
                  height: "2px",
                  background: "#111827",
                  borderRadius: "2px",
                }}
              />

              {/* Right Eye */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "3px",
                  width: "6px",
                  height: "2px",
                  background: "#111827",
                  borderRadius: "2px",
                }}
              />
            </div>


            {/* eyes (sleeping) 
            <div
              style={{
                position: "absolute",
                top: "18px",
                left: "34px",
                width: "16px",
                height: "3px",
                bacground: "#010612",
                borderRadius: "2px",
                boxshadow: "0 0 2px rgba(0,0,0,0.5)",
              }}
            /> */}

            {/* blanket */}
            <div
              style={{
                position: "absolute",
                top: "30px",
                left: "0",
                width: "100%",
                height: "90px",
                background: "#4b71bc",
                borderRadius: "12px",
              }}
            />

            

            {/* eyes (sleeping) */}
            <div
              style={{
                position: "absolute",
                top: "18px",
                left: "34px",
                width: "16px",
                height: "3px",
                bacground: "#010612",
                borderRadius: "2px",
                boxshadow: "0 0 2px rgba(0,0,0,0.5)",
              }}
            />

          </div>

          {/* CANDLE + TABLE GROUP */}
          
          <div
            style={{
              position: "absolute",
              left: "48%",
              bottom: "0px",
              transform: "translateX(-50%)",
              width: "140px",
              height: "170px",
            }}
          >
            {/* TABLE TOP */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "40px",
                transform: "translateX(-50%)",
                width: "120px",
                height: "20px",
                background: "#5a3e2b",
                borderRadius: "6px",
              }}
            />
            {/* TABLE BASE*/}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "0px",
                transform: "translateX(-50%)",
                width: "80px",
                height: "40px",
                background: "#3b2a1d",
                borderRadius: "4px"
              }}
            />

            {/* CANDLE + FLAME WRAPPER */}
            <div
              style={{
                position: "absolute",
                bottom: "60px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "20px",
                height: "40px",
              }}
            >
              {/*CANDLE BODY*/}
              <div
                style={{
                  //position: "absolute",
                  //left: "50%",
                  //bottom: "60px",
                  //transform: "translateX(-50%)",
                  width: "20px",
                  height: "40px",
                  background: candleLit ? "#f5f5f5" : "#666",
                  borderRadius: "6px",
                  /* glow */
                  boxShadow: candleLit
                    ? danger > 60
                      ? "0 0 30px rgba(255, 180, 80, 1)"
                      : "0 0 15px rgba(255 200 100 0.6)"
                    : "none",
              
                  transition: "background 0.3s ease, box-shadow 0.3s ease",
                }}
              />

              {/* FLAME */}
              {candleLit && (
                <div
                  style={{
                    position: "absolute",
                    top: "-25px",
                    left: "20%",
                    //bottom: "105px",
                    transform: "transLateX(-50%)",
                    width: "12px",
                    height: "18px",
                    background: "orange",
                    borderRadius: "50%",

                    boxShadow:
                      danger > 60
                        ? "0 0 30px rgba(255, 150, 50, 1)"
                        : "0 0 15px rgba(255, 200, 100, 0.7)",
                    animation:
                      danger > 60
                        ? "candleFlicker 0.6s ease-in-out infinite"
                        : "candleFlicker 1.2s ease-in-out infinite",
                  }}
                />
              )}
            </div>
          </div>

      </div>

      
      {/* CONTROL PANEL */}
      <div
          style={{
            width: "300px",
            padding: "22px",
            borderRadius: "22px",
            background: "rgba(42, 34, 51, 0.92)",
            border: "2px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            color: "white",
          }}
      >
        <h1
            style={{
              margin: "0 0 20px",
              fontSize: "42px",
              lineHeight: "1",
              textAlign: "center",
            }}
        >
          Night Guardian
        </h1>

        {/* <div
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
          
          {/* Window 
          <div
            style={{
              width: "100px",
              height: "120px",
              background: windowOpen ? "#38bdf8" : "#1e293b",
              margin: "10px auto",
              border: "2px solid white",

              /*Window Animation
              transform: windowOpen ? "rotate(10deg)" : "rotate(0deg)",
              transformOrigin: "left center",
              transition: "all 0.3s ease",
            }}
          >
            Window
          </div>

          {/* Candle 
          <div
            style={{
              width: "40px",
              height: "60px",
              background: candleLit ? "#facc15" : "#374151",
              margin: "10px auto",
              border: "2px solid white",

              /*Candle Glow
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


        </div> */}

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
        
        {/* Open Window Button
        <button
          onClick={() => {
            setWindowOpen(true);
            setLastEvent("You opened the window.");
          }}

          style={{
            width: "100%",
            marginTop: "8px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "none",
            background: "#f2d6a2",
            color: "#2a2233",
            fontWeight: "bold",
            cursor: gameOver || gameWon ? "not-allowed" : "pointer",
          }}

          disabled={gameOver || gameWon}
        >
          Open Window
        </button> */}

        {/*Close Window Button*/}
        <button
          onClick={() => {
            setWindowOpen(false);
            setLastEvent("You closed the window.");
          }}

          style={{
            width: "100%",
            marginTop: "8px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "none",
            background: "#f2d6a2",
            color: "#2a2233",
            fontWeight: "bold",
            cursor: gameOver || gameWon ? "not-allowed" : "pointer",
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

          style={{
            width: "100%",
            marginTop: "8px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "none",
            background: "#f2d6a2",
            color: "#2a2233",
            fontWeight: "bold",
            cursor: gameOver || gameWon ? "not-allowed" : "pointer",
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

          style={{
            width: "100%",
            marginTop: "8px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "none",
            background: "#f2d6a2",
            color: "#2a2233",
            fontWeight: "bold",
            cursor: gameOver || gameWon ? "not-allowed" : "pointer",
          }}

          disabled={gameOver || gameWon|| !ghostVisible}
        >
          Calm Ghost
        </button>

        {/*Restart Button*/}
        <button 
          onClick={restartGame}
          
          style={{
            width: "100%",
            marginTop: "14px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "#6b4f7a",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Restart Game
        </button>
      </div>
    </div>
  );
}