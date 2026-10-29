export default function Window({ windowOpen }) {
  return (
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

      {/* center bar */}
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
  );
}
