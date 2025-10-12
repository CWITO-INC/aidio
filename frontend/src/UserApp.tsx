import { Link } from "react-router";
import { Button } from "./components/ui/button";
import { CodeXmlIcon } from "lucide-react";
import ReportAudioPlayer from "./ReportAudioPlayer";

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background/0 via-background to-background/100">
      <h1 className="text-4xl font-bold mb-8">Welcome to AIdio</h1>
      <ReportAudioPlayer />
    </div>
  );
}

export default App;
