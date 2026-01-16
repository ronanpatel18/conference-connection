import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoBuffer = await fetch(new URL("../wsbc logo.jpg", import.meta.url)).then((res) =>
    res.arrayBuffer()
  );
  const logoBase64 = Buffer.from(logoBuffer).toString("base64");

  return new ImageResponse(
    (
      <img
        src={`data:image/jpeg;base64,${logoBase64}`}
        width={32}
        height={32}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          objectFit: "contain",
          backgroundColor: "white",
        }}
      />
    ),
    {
      width: 32,
      height: 32,
    }
  );
}
