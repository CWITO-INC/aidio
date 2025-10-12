import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tool } from "./types";
import { Api } from "./api";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { NewspaperIcon, SendHorizonalIcon } from "lucide-react";
import aidio_cat from "@/assets/aidio_cat.jpg";
import ReportAudioPlayer from "./components/ReportAudioPlayer";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Spinner } from "./components/ui/spinner";

function App() {
  const { data: reportData } = useQuery<{ report: string }>({ queryKey: ["/latest-report"] });
  const { data: toolsData, isSuccess: isToolsSuccess } = useQuery<{ tools: Tool[] }>({ queryKey: ["/tools"] });

  const { mutateAsync: generateReport, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const response = await Api.post<{ report: string }>("/generate-report");
      return response;
    },
    onSuccess: (data, _, __, { client }) => {
      client.setQueryData(["/latest-report"], data);
    }
  })

  return (
    <>
      <img src={aidio_cat} alt="AIdio Logo" className="mx-auto fixed top-0 -z-10 w-[100vw]" />

      <div className="bg-gradient-to-b from-background/0 via-background to-background/100 min-h-screen">
        <main className="text-foreground container mx-auto p-16">

          <div className="flex gap-8">

            <section className="my-4 flex-1">
              <h2 className="text-4xl font-semibold mb-4">Tools</h2>
              <ul className="space-y-4">
                {isToolsSuccess && toolsData.tools.map((tool, index) => (
                  <li key={index} className="p-4 border rounded backdrop-blur-lg">
                    <ToolForm tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          
            <section className="my-4 flex-2">
              <div className="flex items-center mb-4">
                <h2 className="text-4xl font-semibold mr-4">Report</h2>
                <Button variant="outline" className="backdrop-blur-md mr-4" onClick={() => generateReport()} disabled={isGenerating}><NewspaperIcon /> Generate new report {isGenerating && <Spinner />}</Button>
                <ReportAudioPlayer />
              </div>
              <article className="p-4 border rounded prose prose-invert font-serif backdrop-blur-lg">
                <Markdown remarkPlugins={[remarkGfm]}>{reportData?.report}</Markdown>
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
    </>
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
