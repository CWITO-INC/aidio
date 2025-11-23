import { Link } from "react-router";
import { Button } from "./components/ui/button";
import { CodeXmlIcon, SparklesIcon } from "lucide-react";
import ReportAudioPlayer from "./components/ReportAudioPlayer";
import { Background1 } from "./components/Background1";
import React from "react";
import { Transcription } from "./components/Transcription";
import { TranscriptionProvider } from "./lib/transcriptionContext";
import { Background2 } from "./components/Background2";
import { Background3 } from "./components/Background3";

function App() {
  const [backgroundOn, setBackgroundOn] = React.useState(0);

  return (
    <div className="flex flex-col items-start justify-end min-h-screen">
      {backgroundOn === 1 && <Background1 />}
      {backgroundOn === 2 && <Background2 />}
      {backgroundOn === 3 && <Background3 />}
      <div className="absolute top-4 right-4">
        <Button variant="outline" size="icon-sm" onClick={() => setBackgroundOn((backgroundOn + 1) % 4)}>
          <SparklesIcon />
        </Button>
      </div>

      <TranscriptionProvider>
        <div className="m-4 p-8 backdrop-blur-md bg-gradient-to-bl from-white/0 to-white/7 border-1 border-white/10 squircle">
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
