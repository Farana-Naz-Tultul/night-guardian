import { useEffect, useRef, useState } from "react";
import roomBackground from "../assets/room/room-background.png";
import "./Room.css";
import Window from "./Window.jsx";
import Ghost from "./Ghost.jsx";
import Sleeper from "./Sleeper.jsx";
import Candle from "./Candle.jsx";

// Keep the existing illustration's coordinates and scale it as one layer.
const SCENE_HEIGHT = 420;

export default function Room({
  windowOpen,
  candleLit,
  ghostVisible,
  sleeperAwake,
  danger,
  lastEvent,
}) {
  const roomRef = useRef(null);
  const [sceneScale, setSceneScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSceneScale(entry.contentRect.height / SCENE_HEIGHT);
    });

    observer.observe(roomRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="room" ref={roomRef}>
      <img
        className="room-background"
        src={roomBackground}
        alt=""
        width={1672}
        height={941}
        draggable={false}
      />
      <div
        className="room-scene"
        style={{ transform: `translateX(-50%) scale(${sceneScale})` }}
      >

        <Window windowOpen={windowOpen} />

        <Ghost ghostVisible={ghostVisible} danger={danger} />

        <Sleeper awake={sleeperAwake} />

        <Candle candleLit={candleLit} danger={danger} />

        {/* ROOM EVENT MESSAGE */}
        <div
          key={lastEvent}
          style={{
            position: "absolute",
            left: "50%",
            top: "18px",
            transform: "translateX(-50%)",
            maxWidth: "80%",
            padding: "8px 14px",
            borderRadius: "999px",
            background: "rgba(20, 15, 30, 0.75)",
            color: "#f8fafc",
            fontSize: "14px",
            textAlign: "center",
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            animation: "eventFade 3s ease-in-out forwards",
            pointerEvents: "none",
          }}
        >
          {lastEvent}
        </div>
      </div>
    </div>
  );
}
