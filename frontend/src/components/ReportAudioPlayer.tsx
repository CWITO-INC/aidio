import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Api } from "../api";
import { Spinner } from "./ui/spinner";
import { AudioWaveformIcon } from "lucide-react";
import PersonalizationEditor from "./PersonalizationEditor";
import { playAnalyzeAudio } from "@/lib/audioAnalysis";

const ReportAudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<"ai" | "tts" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const generateReport = async () => {
    setLoading('ai');
    setError(null);
    setAudioUrl(null);
    try {
      const res = await Api.postRaw("/generate-report");
      // Done generating report
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to generate report");
    } finally {
      setLoading(null);
    }
  }

  const fetchAudio = async () => {
    setLoading('tts');
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

      setLoading(null);
      setPlaying(true);

      await playAnalyzeAudio(blob);

      setPlaying(false)

    } catch (e: unknown) {
      setError((e as Error).message || "Failed to fetch audio");
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    // Clean up object URL on unmount or when updated
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div>
      <Button onClick={fetchAudio} disabled={!!loading || playing} className="backdrop-blur-md">
        {loading ? <Spinner /> : <AudioWaveformIcon />}
        {playing ? "Playing Report..." : loading === 'tts' ? 'Generating speech...' : loading === 'ai' ? 'Writing report...' : "Generate & Play Report Audio"}
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

      <div className="mt-3">
        <Button variant="outline" onClick={() => setShowEditor((s) => !s)} className="backdrop-blur-md">{showEditor ? "Hide Personalization" : "Edit Personalization"}</Button>
      </div>

      {showEditor && (
        <div className="mt-3">
          <PersonalizationEditor onClose={() => setShowEditor(false)} />
        </div>
      )}
    </div>
  );
};

export default ReportAudioPlayer;
