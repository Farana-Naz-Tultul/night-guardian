export default function Candle({ candleLit, danger }) {
  return (
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

            width: "20px",
            height: "40px",
            background: candleLit ? "#f5f5f5" : "#666",
            borderRadius: "6px",
            /* glow */
            boxShadow: candleLit
              ? danger > 60
                ? "0 0 30px rgba(255, 180, 80, 1)"
                : "0 0 15px rgba(255, 200, 100, 0.6)"
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
  );
}
