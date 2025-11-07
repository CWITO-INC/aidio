export const playAnalyzeAudio = async (audioBlob: Blob): Promise<void> => {
  const audioContext = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  return new Promise((resolve, reject) => {

    try {

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const id = crypto.randomUUID();
      AudioAnalysisState.sourceId = id;
      AudioAnalysisState.dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      source.start(0);

      const analyze = () => {
        if (!AudioAnalysisState.dataArray || AudioAnalysisState.sourceId !== id) return;
        analyser.getByteFrequencyData(AudioAnalysisState.dataArray);
        // Process spectral data in dataArray
        if (audioContext.currentTime < audioBuffer.duration) {
          requestAnimationFrame(analyze);
        }
      };

      analyze();
      source.onended = () => {
        if (AudioAnalysisState.sourceId === id) {
          AudioAnalysisState.dataArray = null;
          AudioAnalysisState.sourceId = null;
        }
        resolve();
      };
    } catch (error) {
      reject(error);
    }
  });
}

export const AudioAnalysisState = {
  dataArray: null as Uint8Array<ArrayBuffer> | null,
  sourceId: null as string | null,
}
