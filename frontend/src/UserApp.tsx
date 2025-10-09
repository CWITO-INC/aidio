import { Link } from "react-router";
import { Button } from "./components/ui/button";
import { CodeXmlIcon } from "lucide-react";

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background/0 via-background to-background/100">
      <h1 className="text-4xl font-bold mb-8">Welcome to AIdio</h1>
      <div className="space-x-4">
        <Link to="/dev">
          <Button>
            <CodeXmlIcon />
            Developer Interface
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default App;
