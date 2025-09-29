import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tool } from "./types";
import { Api } from "./api";

function App() {
  const [report, setReport] = useState("");
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolResults, setToolResults] = useState<{ [key: string]: string }>({});

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
      const data = await Api.post("/generate-report");
      setReport(data.report);
    } catch (error) {
      setReport("Error generating report");
    }
  };

  console.log("Tools:", tools);

  return (
    <div>
      <h1>AI Report Generator</h1>
      <h2>Available tools:</h2>
      <ul>
        {tools.map((tool, index) => (
          <li key={index}>
            <ToolForm tool={tool} />
          </li>
        ))}
      </ul>

      <button onClick={generateReport}>Generate Report</button>
      <h2>Latest report:</h2>
      <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
    </div>
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
      <h3>{tool.function.name}</h3>
      <p>{tool.function.description}</p>
      {Object.entries(tool.function.parameters.properties).map(
        ([paramName, paramDetails]) => (
          <div key={paramName}>
            <label>
              {paramName} ({paramDetails.type}):
              <input type="text" name={paramName} />
            </label>
          </div>
        ),
      )}
      <button type="submit">Call Tool</button>
      {result && (
        <div>
          <h4>Result:</h4>
          <pre>{result}</pre>
        </div>
      )}
    </form>
  );
};

export default App;
