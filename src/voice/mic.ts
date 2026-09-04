export type MicHandle = {
  stream: MediaStream
  audioContext: AudioContext
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
  stop: () => void
}

export async function openMicrophone(): Promise<MicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  })

  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.5
  source.connect(analyser)

  return {
    stream,
    audioContext,
    analyser,
    source,
    stop: () => {
      source.disconnect()
      void audioContext.close()
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}
