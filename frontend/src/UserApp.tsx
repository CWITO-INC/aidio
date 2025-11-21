import { Link } from "react-router";
import { Button } from "./components/ui/button";
import { CodeXmlIcon, SparklesIcon } from "lucide-react";
import ReportAudioPlayer from "./components/ReportAudioPlayer";
import { Background1 } from "./components/Background1";
import React from "react";
import { Transcription } from "./components/Transcription";
import { TranscriptionProvider } from "./lib/transcriptionContext";

function App() {
  const [backgroundOn, setBackgroundOn] = React.useState(true);

  return (
    <div className="flex flex-col items-start justify-end min-h-screen">
      {backgroundOn && <Background1 />}
      <div className="absolute top-4 right-4">
        <Button variant="outline" size="icon-sm" onClick={() => setBackgroundOn(!backgroundOn)} title={backgroundOn ? "Disable background" : "Enable background"}>
          <SparklesIcon />
        </Button>
      </div>

      <TranscriptionProvider>
        <div className="m-4 p-8 bg-gradient-to-bl from-white/0 to-white/10 border-1 border-white/10 squircle">
          <h1 className="text-4xl font-bold mb-8">Welcome to <span className="font-stretch-50%">AIDIO</span>!</h1>
          <ReportAudioPlayer />
        </div>

        <div className="fixed bottom-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Transcription />
        </div>
      </TranscriptionProvider>
    </div>
  );
}

export default App;
