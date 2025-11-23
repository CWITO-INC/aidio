import React, { createContext, useContext, useState } from 'react';

export interface Word {
  text: string;
  start: number;
  characters: { text: string; start: number }[];
}

interface TranscriptionContextType {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  words: Word[];
  setWords: (words: Word[]) => void;
}

const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined);

export const TranscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [words, setWords] = useState<Word[]>([]);

  const contextValue: TranscriptionContextType = {
    isPlaying,
    setIsPlaying,
    words,
    setWords,
  };

  return (
    <TranscriptionContext.Provider value={contextValue}>
      {children}
    </TranscriptionContext.Provider>
  );
};

export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (context === undefined) {
    throw new Error('useTranscription must be used within a TranscriptionProvider');
  }
  return context;
};
