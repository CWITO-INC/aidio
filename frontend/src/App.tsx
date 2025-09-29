import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function App() {
  const [response, setResponse] = useState("");
  const [report, setReport] = useState("");

  const callBackend = async () => {
    try {
      const res = await fetch("http://localhost:8000/generate-report", {
        method: "POST",
      });
      const data = await res.json();
      setResponse(data.report);
    } catch (error) {
      setResponse("Error calling backend");
    }
  };

  const getLatestReport = async () => {
    try {
      const res = await fetch("http://localhost:8000/latest-report");
      const data = await res.json();
      setReport(data.report);
    } catch (error) {
      setReport("Error fetching report");
    }
  };

  return (
    <div>
      <button onClick={callBackend}>Generate Report</button>
      <button onClick={getLatestReport}>Get Latest Report</button>
      <h2>Last action response:</h2>
      <Markdown remarkPlugins={[remarkGfm]}>{response}</Markdown>
      <h2>Latest report:</h2>
      <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
    </div>
  );
}

export default App;
