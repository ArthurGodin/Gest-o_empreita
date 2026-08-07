import type { Metadata } from "next";
import { PublicDemoClient } from "./public-demo-client";

export const metadata: Metadata = {
  title: "Demonstração interativa - Prumo",
  description:
    "Explore um cenário protegido do Prumo para arquitetura, interiores, engenharia e obras.",
  alternates: {
    canonical: "/demo",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function PublicDemoPage() {
  return <PublicDemoClient />;
}
