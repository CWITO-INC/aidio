import { useEffect, useRef, useState } from "react";
import { useTranscription } from "../lib/transcriptionContext";

export const Transcription = () => {
    const { isPlaying, words } = useTranscription();
    const [currentWords, setCurrentWords] = useState<{ text: string; id: number }[]>([]);

    const accumulate = (text: string) => {
        setCurrentWords((prev) => [...prev, { text, id: Date.now() + Math.random() }]);
    }
    const started = useRef<boolean>(false);
    useEffect(() => {
        if (isPlaying && words && !started.current) {
            if (!started.current) {
                started.current = true;
                setCurrentWords([]);
            }

            words.forEach((word: any) => {
                setTimeout(() => {
                    accumulate(word.text);
                }, Number(word.start) * 1000 - 300)
            });
        }

        if (!isPlaying) {
            started.current = false;
        }
    }, [words, isPlaying]);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scroll({
                top: containerRef.current.scrollHeight,
                behavior: "smooth"
            })
        }
    }, [currentWords]);

    return (
        <div ref={containerRef} className="h-24 w-180 flex flex-wrap overflow-visible overflow-y-scroll text-2xl no-scrollbar">
            {currentWords.map((word) => (
                <Word key={word.id} text={word.text} />
            ))}
        </div>
    );
}

const Word = ({ text }: { text: string }) => {
    const [opacity, setOpacity] = useState(0)
    const [duration, setDuration] = useState("300ms")
    useEffect(() => {
        setTimeout(() => {
            setOpacity(1)
        }, 10)
        setTimeout(() => {
            setDuration("3000ms")
            setOpacity(0)
        }, 4000)
    }, [])

    return (
        <span className="mr-1 transition-opacity" style={{ opacity, transitionDuration: duration }}>
            {text}
        </span>
    );
};
