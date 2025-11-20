import { useEffect, useRef, useState } from "react";

export const Transcription = ({
    transcription,
    playing,
}: {
    transcription: any;
    playing: boolean;
}) => {
    const [words, setWords] = useState<{ text: string; id: number }[]>([]);

    const accumulate = (text: string) => {
        setWords((prev) => [...prev, { text, id: Date.now() + Math.random() }]);
    }
    const started = useRef<boolean>(false);
    useEffect(() => {
        if (playing && transcription && !started.current) {
            if (!started.current) {
                started.current = true;
                setWords([]);
            }

            transcription.words.forEach((word: any) => {
                setTimeout(() => {
                    accumulate(word.text);
                }, Number(word.start) * 1000)
            });
        }
    }, [transcription, playing]);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [words]);

    return (
        <div ref={containerRef} className="mt-4 p-4 rounded-lg h-32 w-128 overflow-y-hidden flex flex-wrap">
            {words.map((word) => (
                <Word key={word.id} text={word.text} />
            ))}
        </div>
    );
}

const Word = ({ text }: { text: string }) => {
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setOpacity(0);
        }, 6000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <span
            className="mr-1 transition-opacity duration-2000"
            style={{ opacity }}
        >
            {text}
        </span>
    );
};
