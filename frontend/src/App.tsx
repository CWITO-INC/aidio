import { useState } from "react";
import "./App.css";

function App() {
  const [response, setResponse] = useState("");

  const callBackend = async () => {
    try {
      const res = await fetch("http://localhost:8000/generate-report", {
        method: "POST",
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse("Error calling backend");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={callBackend}>Generate Report</button>
        <pre>{response}</pre>
      </header>
    </div>
  );
}

export default App;
