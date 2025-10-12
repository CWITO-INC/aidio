import React, { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Api } from "./api";
import { Spinner } from "./components/ui/spinner";
import { AudioWaveformIcon } from "lucide-react";

const ReportAudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const fetchAudio = async () => {
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const res = await Api.postRaw("/tts/report");

      if (!res.ok) {
        // Try reading JSON error if server returns it
        let msg = `Request failed: ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch (jsonError) {
          console.error("Error parsing JSON error response:", jsonError);
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      const blob = await res.blob(); // audio/mpeg
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      // Auto-play when loaded
      audioRef.current?.addEventListener("loadeddata", () => {
        audioRef.current?.play().then(() => {
          setPlaying(true);
          audioRef.current?.addEventListener("ended", () => setPlaying(false));
        }).catch((e) => {
          console.error("Autoplay failed:", e);
          // Autoplay blocked; user must click Play
          console.log("Autoplay failed", e);
        });
      });

    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "Failed to fetch audio"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clean up object URL on unmount or when updated
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <Button onClick={fetchAudio} disabled={loading || playing} className="backdrop-blur-md">
      {loading ? <Spinner /> : <AudioWaveformIcon />}
      {playing ? "Playing Report..." : "Generate & Play Report Audio"}
      {error && <div style={{ color: "red" }}>{error}</div>}
      <audio
        ref={audioRef}
        controls
        src={audioUrl ?? undefined}
        // preload can be 'none' or 'metadata' to avoid unnecessary data usage
        preload="metadata"
        className="hidden"
      />
    </Button>
  );
};

export default ReportAudioPlayer;
