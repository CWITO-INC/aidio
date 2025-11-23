import { useEffect, useRef, useState } from "react";
import { useTranscription, type Word } from "../lib/transcriptionContext";

export const Transcription = () => {
    const { isPlaying, words } = useTranscription();
    const [currentWords, setCurrentWords] = useState<Word[]>([]);

    const accumulate = (word: Word) => {
        setCurrentWords((prev) => [...prev, word]);
    }
    const started = useRef<boolean>(false);
    useEffect(() => {
        if (isPlaying && words && !started.current) {
            if (!started.current) {
                started.current = true;
                setCurrentWords([]);
            }

            words.forEach((word) => {
                setTimeout(() => {
                    accumulate(word);
                }, Number(word.start) * 1000 - 300 + 1000)
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
        <div ref={containerRef} className="h-24 w-180 flex flex-wrap overflow-visible overflow-y-scroll text-3xl no-scrollbar">
            {currentWords.map(word => (
                <Word key={word.start} word={word} />
            ))}
        </div>
    );
}

const Word = ({ word }: { word: Word }) => {
    const [opacity, setOpacity] = useState(0)
    const [duration, setDuration] = useState("300ms")
    const spanRef = useRef<HTMLSpanElement>(null);
    const onceRef = useRef<boolean>(false);

    useEffect(() => {
        if (onceRef.current) {
            return;
        }
        onceRef.current = true;
        setTimeout(() => {
            setOpacity(1)
        }, 10)
        setTimeout(() => {
            setDuration("3000ms")
            setOpacity(0)
        }, 4000)
        word.characters.forEach((character) => {
            setTimeout(() => {
                if (spanRef.current) {
                    spanRef.current.textContent += character.text
                }
            }, Math.max((Number(character.start) - Number(word.start)) * 1000, 0))
        })
    }, [])

    return (
        <span className="mr-1 transition-opacity" style={{ opacity, transitionDuration: duration }} ref={spanRef} />
    );
};
