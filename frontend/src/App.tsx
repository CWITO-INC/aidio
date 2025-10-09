import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tool } from "./types";
import { Api } from "./api";
import { Button } from "./components/ui/button";
import { ThemeProvider } from "./components/ThemeProvider";
import { Input } from "./components/ui/input";
import { NewspaperIcon, SendHorizonalIcon, SendIcon } from "lucide-react";
import aidio_cat from "@/assets/aidio_cat.jpg";
import { Spinner } from "./components/ui/spinner";
import ReportAudioPlayer from "./ReportAudioPlayer";

function App() {
  const [report, setReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await Api.get("/latest-report");
        setReport(data.report);
      } catch (error) {
        setReport("Error fetching report");
      }
    };
    fetchReport();
  }, []);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const data = await Api.get("/tools");
        setTools(data.tools);
      } catch (error) {
        setTools([]);
      }
    };
    fetchTools();
  }, []);

  const generateReport = async () => {
    try {
      setIsGenerating(true);
      const data = await Api.post("/generate-report");
      setReport(data.report);
    } catch (error) {
      setReport("Error generating report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <img src={aidio_cat} alt="AIdio Logo" className="mx-auto fixed top-0 -z-10 w-[100vw]" />

      <div className="bg-gradient-to-b from-background/0 via-background to-background/100 min-h-screen">
        <main className="text-foreground container mx-auto p-16">
          <h1 className="text-8xl font-bold mb-16 mt-80">AIdio</h1>

          <div className="flex gap-8">

            <section className="my-4 flex-1">
              <h2 className="text-4xl font-semibold mb-4">Tools</h2>
              <ul className="space-y-4">
                {tools.map((tool, index) => (
                  <li key={index} className="p-4 border rounded backdrop-blur-lg">
                    <ToolForm tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          
            <section className="my-4 flex-2">
              <div className="flex items-center mb-4">
                <h2 className="text-4xl font-semibold mr-4">Report</h2>
                <Button variant="outline" className="backdrop-blur-md mr-4" onClick={generateReport} disabled={isGenerating}><NewspaperIcon /> Generate new report {isGenerating && <Spinner />}</Button>
                <ReportAudioPlayer />
              </div>
              <article className="p-4 border rounded prose prose-invert font-serif backdrop-blur-lg">
                <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
              </article>
            </section>
          </div>
        </main>
        <footer className="bg-background p-4 mt-16">
          <p className="text-center text-sm text-foreground/50">
            &copy; 2025 AIdio. All rights reserved.
          </p>
        </footer>
      </div>
    </ThemeProvider>
  );
}

const ToolForm = ({ tool }: { tool: Tool }) => {
  const [result, setResult] = useState<string | null>(null);

  const callTool = async (toolName: string, args: { [key: string]: any }) => {
    try {
      console.log("Calling tool:", toolName, args);
      const data = await Api.post(`/tools/${toolName}`, args);
      setResult(data.result);
    } catch (error) {
      setResult("Error calling tool");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const args: { [key: string]: any } = {};
        formData.forEach((value, key) => {
          args[key] = value;
        });
        callTool(tool.function.name, args);
      }}
    >
      <h3 className="font-semibold">{tool.function.name}</h3>
      <p>{tool.function.description}</p>
      {Object.entries(tool.function.parameters.properties).map(
        ([paramName, paramDetails]) => (
          <div key={paramName} className="mt-4">
            <Input type="text" placeholder={`${paramName} (${paramDetails.type})`} name={paramName} />
          </div>
        ),
      )}
      <Button className="mt-4" variant="outline" type="submit"><SendHorizonalIcon /> Call Tool</Button>
      {result && (
        <div className="mt-4 p-4 border rounded">
          <h4 className="font-semibold">Result:</h4>
          <p className="text-xs font-mono whitespace-pre-line">{result}</p>
        </div>
      )}
    </form>
  );
};

export default App;
