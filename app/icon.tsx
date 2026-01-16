import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "32px",
          height: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#b41e2a",
          color: "white",
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: 1,
          borderRadius: "6px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <span>WS</span>
        <span>BC</span>
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  );
}
