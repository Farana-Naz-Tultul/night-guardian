export default function Sleeper({ awake = false }) {
  return (
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
            height: awake ? "7px" : "2px",
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
            height: awake ? "7px" : "2px",
            background: "#111827",
            borderRadius: "2px",
          }}
        />
      </div>

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
          height: awake ? "7px" : "3px",
          background: "#010612",
          borderRadius: "2px",
          boxShadow: "0 0 2px rgba(0,0,0,0.5)",
        }}
      />

    </div>
  );
}
