import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Prumo: propostas, projetos e financeiro com uma visão real do painel";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const dashboardData = await readFile(
    join(process.cwd(), "public", "dashboard-mockup.png"),
    "base64",
  );
  const dashboardSrc = `data:image/png;base64,${dashboardData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          padding: "54px 0 54px 58px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "43%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingRight: "42px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "34px",
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                backgroundColor: "#047752",
                color: "#ffffff",
                fontSize: "32px",
                fontWeight: 900,
              }}
            >
              P
            </div>
            Prumo
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "42px",
              fontSize: "55px",
              lineHeight: 1.08,
              fontWeight: 900,
              letterSpacing: "-1px",
            }}
          >
            Proposta aprovada. Projeto no controle.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontSize: "25px",
              lineHeight: 1.35,
              color: "#475569",
            }}
          >
            Propostas, projetos, cobranças e custos em um só fluxo.
          </div>
        </div>

        <div
          style={{
            width: "57%",
            height: "480px",
            display: "flex",
            alignItems: "flex-start",
            overflow: "hidden",
            border: "1px solid #cbd5e1",
            borderRight: "none",
            borderRadius: "12px 0 0 12px",
            backgroundColor: "#ffffff",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
          }}
        >
          {/* next/og supports base64 images loaded from the local filesystem. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dashboardSrc}
            alt=""
            width="876"
            height="480"
            style={{
              width: "876px",
              height: "480px",
              objectFit: "cover",
              objectPosition: "left top",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
