// see: https://github.com/xenova/transformers.js
import { pipeline } from '@xenova/transformers'

class MyTranslationPipeline {
  static task = 'translation'
  static model = 'Xenova/nllb-200-distilled-600M'
  static instance: any = null

  static async getInstance(progress_callback: any = null) {
    if (this.instance === null)
      this.instance = pipeline(this.task, this.model, { progress_callback })

    return this.instance
  }
}

class MyTranscriptionPipeline {
  static task = 'automatic-speech-recognition'
  static model = ''
  static instance: any = null

  static async getInstance(model: string, progress_callback: any = null) {
    if (this.instance === null || this.model !== model) {
      this.model = model
      this.instance = pipeline(this.task, this.model, { progress_callback })
    }

    return this.instance
  }
}

self.addEventListener('message', async (event) => {
  const { type, text, audio, src_lang, tgt_lang, index, model } = event.data

  if (type === 'transcribe') {
    const model_to_use = model || (src_lang === 'en' ? 'Xenova/whisper-tiny.en' : 'Xenova/whisper-tiny')
    
    self.postMessage({ status: 'init', model: model_to_use, task: 'transcribe' })
    
    const transcriber = await MyTranscriptionPipeline.getInstance(model_to_use, (x: any) => {
      self.postMessage({ ...x, task: 'transcribe' })
    })

    self.postMessage({ status: 'ready', model: model_to_use, task: 'transcribe' })

    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: src_lang,
      callback_function: (x: any) => {
        // Handle intermediate results if possible
      },
    })

    self.postMessage({
      status: 'complete',
      task: 'transcribe',
      output,
      index,
    })
  }
  else {
    // call translator. downloads and caches model if first load
    const translator = await MyTranslationPipeline.getInstance((x: any) => {
      self.postMessage(x)
    })

    const output = await translator(text, {
      tgt_lang,
      src_lang,

      // partial outputs
      callback_function: (x: any) => {
        self.postMessage({
          status: 'update',
          task: 'translate',
          output: translator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true }),
          index,
        })
      },
    })

    // send back to main thread
    self.postMessage({
      status: 'complete',
      task: 'translate',
      output,
      index,
    })
  }
})

