import { pipeline } from '@xenova/transformers'
import { pinyin } from 'pinyin-pro'

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
    // ... transcribe logic ...
  }
  else if (type === 'generate-ruby') {
    const { text, lang } = event.data
    let output = text

    if (lang.startsWith('zh') || lang.startsWith('cmn')) {
      const result = pinyin(text, { type: 'array', toneType: 'symbol' })
      let transcript = ''
      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const py = result[i]
        if (/[\u4e00-\u9fa5]/.test(char) && py && py !== char) {
          transcript += `${char}[${py}]`
        } else {
          transcript += char
        }
        transcript += '|'
      }
      output = transcript.endsWith('|') ? transcript.slice(0, -1) : transcript
    }

    self.postMessage({
      status: 'complete',
      task: 'generate-ruby',
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

