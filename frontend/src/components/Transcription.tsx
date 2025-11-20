import { useEffect, useRef, useState } from "react";

export const Transcription = ({
    transcription,
    playing,
}: {
    transcription: any;
    playing: boolean;
}) => {
    const textEl = useRef<HTMLPreElement | null>(null);
    const accumulate = (text: string) => {
        textEl.current!.textContent += text;
        textEl.current!.scrollTop = textEl.current!.scrollHeight;
    }
    const started = useRef<boolean>(false);
    useEffect(() => {
        if (playing && transcription && !started.current) {
            if (!started.current) {
                started.current = true;
                textEl.current!.textContent = "";
            }

            transcription.words.forEach(word => {
                setTimeout(() => {
                    accumulate(word.text);
                }, Number(word.start) * 1000)
            });
        }
    }, [transcription, playing]);

    return (
        <div className="mt-4 p-4 rounded-lg max-h-96 overflow-y-auto backdrop-blur-md">
            <pre className="whitespace-pre-wrap text-sm" ref={textEl}></pre>
        </div>
    );
}