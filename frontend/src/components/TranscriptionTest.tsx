import { Api } from "@/api";
import { useState } from "react";
import { Button } from "./ui/button";

export const TranscriptionTest = () => {
    const [transcriptionData, setTranscriptionData] = useState<string | null>(null);

    const handleTranscriptionTest = async () => {
        try {
            const response = await Api.post("/transcribe-latest")
            setTranscriptionData(JSON.stringify(response, null, 2));
        } catch (error) {
            console.error('Error during transcription test:', error);
        }
    };

    return (<div>
        <Button onClick={handleTranscriptionTest}>Test Transcription</Button>
            {transcriptionData && (
                <pre>{transcriptionData}</pre>
            )}
        </div>
    );
}