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
          alignItems: "center",
          justifyContent: "center",
          background: "#b41e2a",
          color: "white",
          fontSize: "14px",
          fontWeight: 700,
          borderRadius: "6px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        WSBC
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  );
}
