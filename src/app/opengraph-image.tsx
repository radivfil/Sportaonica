import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "Sportaonica — Sport koji gradi zdrave navike za cijeli život!";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const root = process.cwd();
  const [font, logo, kids] = await Promise.all([
    readFile(path.join(root, "src/assets/Baloo2-ExtraBold.ttf")),
    readFile(path.join(root, "public/brand/logo.png")),
    readFile(path.join(root, "public/illustrations/kids-group.png")),
  ]);
  const src = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #FCE8FB 0%, #FFF5F8 45%, #FFFBEA 100%)",
          fontFamily: "Baloo",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: -80, top: -60, width: 360, height: 360, borderRadius: 999, background: "#FBCFD6" }} />
        <div style={{ position: "absolute", right: -90, bottom: -80, width: 420, height: 420, borderRadius: 999, background: "#BFE7E4" }} />
        <div style={{ position: "absolute", right: 120, top: -70, width: 220, height: 220, borderRadius: 999, background: "#FFF6CC" }} />
        <img src={src(kids)} width={420} height={252} style={{ marginBottom: 6 }} alt="" />
        <img src={src(logo)} width={720} height={171} alt="" />
        <div style={{ marginTop: 18, fontSize: 50, color: "#13385A", display: "flex" }}>Sport koji gradi zdrave navike za cijeli život!</div>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            color: "#fff",
            background: "#0F4F7D",
            padding: "6px 26px",
            borderRadius: 999,
            display: "flex",
          }}
        >
          Sportska škola za djecu 3–10 god. · Božjakovina · Brckovljani · Sesvetski Kraljevec
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Baloo", data: font, weight: 800, style: "normal" }] },
  );
}
