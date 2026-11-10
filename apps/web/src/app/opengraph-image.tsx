import { ImageResponse } from "next/og"

export const alt = "Glyphswap: change the words, keep the look"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#FAFAF7",
        color: "#111111",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 8,
            background: "#2F5BEA",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontStyle: "italic",
          }}
        >
          G
        </div>
        Glyphswap
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 92,
          lineHeight: 1.05,
          letterSpacing: -2,
        }}
      >
        <span>Change the words.</span>
        <span style={{ color: "#2F5BEA" }}>Keep the look.</span>
      </div>
      <div style={{ fontSize: 28, color: "#6B6B66" }}>Open-source AI text editing for images</div>
    </div>,
    size,
  )
}
