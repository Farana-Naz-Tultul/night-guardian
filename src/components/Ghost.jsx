export default function Ghost({ ghostVisible, danger }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "40px",
        bottom: "60px",
        width: "80px",
        height: "110px",
        margin: "10px auto",

        background: ghostVisible ? "rgba(255, 255, 255, 0.9)" : "rgba(255,255,255,0.01)",
        borderRadius: "40px 40px 20px 20px",
        opacity: ghostVisible ? 1 : 0,
        boxShadow: ghostVisible
          ? danger > 60
            ? "0 0 40px rgba(200, 200, 255, 1)"
            : "0 0 20px rgba(200, 200, 255, 0.8)"
          : "none",

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
  );
}
