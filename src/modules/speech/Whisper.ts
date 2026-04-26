import { useSpeechStore } from '@/stores/speech'
import { useDefaultStore } from '@/stores/default'

declare const window: any

class Whisper {
  stream_ref: MediaStream | null = null
  audio_context: AudioContext | null = null
  source: MediaStreamAudioSourceNode | null = null
  processor: ScriptProcessorNode | null = null

  listening: boolean = false
  talking: boolean = false
  
  // Conform to WebSpeech interface
  recognition: any = { lang: 'en-US' } 
  listening_error: boolean = false

  audio_buffer: Float32Array[] = []
  
  speechStore = useSpeechStore()
  defaultStore = useDefaultStore()

  onresult: Function = () => {}
  onend: Function = () => {}
  onerror: Function = () => {}

  constructor(lang: string = 'en-US') {
    this.recognition.lang = lang
  }

  async start() {
    if (this.listening) return
    this.listening = true

    try {
      this.stream_ref = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })

      this.audio_context = new AudioContext({ sampleRate: 16000 })
      this.source = this.audio_context.createMediaStreamSource(this.stream_ref)
      
      this.processor = this.audio_context.createScriptProcessor(4096, 1, 1)

      this.processor.onaudioprocess = (event) => {
        if (!this.listening) return

        const inputData = event.inputBuffer.getChannelData(0)
        const bufferCopy = new Float32Array(inputData)
        
        const volume = this.get_volume(bufferCopy)
        
        if (volume > this.speechStore.stt.sensitivity) {
          if (!this.talking) {
            this.talking = true
            this.audio_buffer = []
          }
          this.audio_buffer.push(bufferCopy)
        } else {
          if (this.talking) {
            this.talking = false
            this.transcribe()
          }
        }
      }

      this.source.connect(this.processor)
      this.processor.connect(this.audio_context.destination)

    } catch (err) {
      this.listening = false
      this.onerror(err)
    }
  }

  get_volume(buffer: Float32Array) {
    let sumSquares = 0.0
    for (const amplitude of buffer) sumSquares += amplitude * amplitude
    return Math.sqrt(sumSquares / buffer.length)
  }

  stop() {
    this.listening = false
    this.talking = false
    
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.audio_context) {
      this.audio_context.close()
      this.audio_context = null
    }
    if (this.stream_ref) {
      this.stream_ref.getTracks().forEach(track => track.stop())
      this.stream_ref = null
    }
    this.onend()
  }

  async transcribe() {
    if (this.audio_buffer.length === 0) return

    const totalLength = this.audio_buffer.reduce((acc, curr) => acc + curr.length, 0)
    const mergedBuffer = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.audio_buffer) {
      mergedBuffer.set(chunk, offset)
      offset += chunk.length
    }
    this.audio_buffer = []

    if (this.speechStore.stt.type.value === 'api') {
      this.transcribe_api(mergedBuffer)
    } else {
      this.transcribe_local(mergedBuffer)
    }
  }

  async transcribe_local(mergedBuffer: Float32Array) {
    const worker = this.defaultStore.worker
    if (worker) {
      console.log(`[Whisper] Requesting transcription with model: ${this.speechStore.stt.whisper_model}`)
      worker.postMessage({
        type: 'transcribe',
        audio: mergedBuffer,
        src_lang: this.speechStore.stt.language.split('-')[0],
        model: this.speechStore.stt.whisper_model,
        index: -1,
      })

      const handler = (e: MessageEvent) => {
          if (e.data.status === 'init') {
             console.log(`[Whisper] Loading model: ${e.data.model}`)
             this.defaultStore.show_snackbar('info', `Loading Whisper model: ${e.data.model}...`)
          }
          if (e.data.status === 'ready') {
             console.log(`[Whisper] Model ready`)
             this.defaultStore.show_snackbar('success', `Whisper model ready`)
          }
          if (e.data.status === 'complete' && e.data.task === 'transcribe') {
              console.log(`[Whisper] Transcription complete: ${e.data.output.text}`)
              this.onresult(e.data.output.text, true)
              worker.removeEventListener('message', handler)
          }
      }
      worker.addEventListener('message', handler)
    }
  }

  async transcribe_api(mergedBuffer: Float32Array) {
    const wavBlob = this.toWav(mergedBuffer)
    const formData = new FormData()
    formData.append('file', wavBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', this.speechStore.stt.language.split('-')[0])

    try {
      const response = await fetch(this.speechStore.stt.api_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.speechStore.stt.api_key}`,
        },
        body: formData,
      })
      const data = await response.json()
      if (data.text) {
        this.onresult(data.text, true)
      }
    } catch (err) {
      console.error('STT API Error:', err)
      this.onerror(err)
    }
  }

  toWav(buffer: Float32Array) {
    const wavBuffer = new ArrayBuffer(44 + buffer.length * 2)
    const view = new DataView(wavBuffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + buffer.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 16000, true)
    view.setUint32(28, 16000 * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, buffer.length * 2, true)

    let offset = 44
    for (let i = 0; i < buffer.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, buffer[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }

    return new Blob([view], { type: 'audio/wav' })
  }

  speak(input: string) {
    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(input)
    utterance.voice = synth.getVoices().filter((voice: any) => voice.name === this.speechStore.tts.voice)[0]
    utterance.pitch = this.speechStore.tts.pitch
    utterance.rate = this.speechStore.tts.rate
    synth.speak(utterance)
  }
}

export { Whisper }
