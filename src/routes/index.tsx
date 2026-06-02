import { createFileRoute } from "@tanstack/react-router";
import { UniMarketApp } from "@/components/unimarket/UniMarketApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNIMarket — Marketplace Oficial UNI" },
      { name: "description", content: "Compra y vende dentro de la comunidad UNI." },
    ],
  }),
  component: UniMarketApp,
});
