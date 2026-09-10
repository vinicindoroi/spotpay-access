import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spotify Rewards – Evaluate & Earn" },
      { name: "description", content: "Avalie músicas e ganhe recompensas." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Spotify Rewards – Evaluate & Earn" },
      { property: "og:description", content: "Avalie músicas e ganhe recompensas." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/sp/app/app.html"
      title="Spotify Rewards"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
      allow="autoplay"
    />
  );
}
