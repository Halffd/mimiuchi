
import { useDefaultStore } from '@/stores/default'

export interface RubyProvider {
  supports(lang: string): boolean
  generate(text: string): Promise<string>
}

class JapaneseProvider implements RubyProvider {
  supports(lang: string): boolean {
    return lang.startsWith('ja')
  }

  async generate(text: string): Promise<string> {
    if (typeof (window as any).generateFuriganaTranscript === 'function') {
      return await (window as any).generateFuriganaTranscript(text)
    }
    return text
  }
}

class ChineseProvider implements RubyProvider {
  supports(lang: string): boolean {
    return lang.startsWith('zh') || lang.startsWith('cmn')
  }

  async generate(text: string): Promise<string> {
    const defaultStore = useDefaultStore()
    const worker = defaultStore.worker

    if (!worker) return text

    return new Promise((resolve) => {
      const messageHandler = (e: MessageEvent) => {
        if (e.data.status === 'complete' && e.data.task === 'generate-ruby') {
          worker.removeEventListener('message', messageHandler)
          resolve(e.data.output)
        }
      }
      worker.addEventListener('message', messageHandler)
      worker.postMessage({
        type: 'generate-ruby',
        text,
        lang: 'zh', // Provider already filtered for zh
      })
      
      // Safety timeout
      setTimeout(() => {
        worker.removeEventListener('message', messageHandler)
        resolve(text)
      }, 1000)
    })
  }
}

class RubyProxy {
  private providers: RubyProvider[] = [
    new JapaneseProvider(),
    new ChineseProvider(),
  ]

  async generate(text: string, lang: string): Promise<string> {
    const provider = this.providers.find(p => p.supports(lang))
    if (provider) {
      return await provider.generate(text)
    }
    return text
  }
}

export const rubyProxy = new RubyProxy()
