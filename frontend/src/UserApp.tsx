import { Link } from "react-router";
import { Button } from "./components/ui/button";
import { CodeXmlIcon, SparklesIcon } from "lucide-react";
import ReportAudioPlayer from "./components/ReportAudioPlayer";
import { Background1 } from "./components/Background1";
import React from "react";

function App() {
  const [backgroundOn, setBackgroundOn] = React.useState(true);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {backgroundOn && <Background1 />}
      <div className="absolute top-4 right-4">
        <Button variant="outline" size="icon-sm" onClick={() => setBackgroundOn(!backgroundOn)} title={backgroundOn ? "Disable background" : "Enable background"}>
          <SparklesIcon />
        </Button>
      </div>
      <h1 className="text-4xl font-bold mb-8">Welcome to <span className="font-stretch-50%">AIDIO</span>!</h1>
      <ReportAudioPlayer />
    </div>
  );
}

export default App;
