import { ImageResponse } from "next/og";

// Generated at build time, so there are no binary assets to keep in sync with the palette.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1f24", // iron
          color: "#f3f4f2", // chalk
          fontSize: 104,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        GB
      </div>
    ),
    size,
  );
}
