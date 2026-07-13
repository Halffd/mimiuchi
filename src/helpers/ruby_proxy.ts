import Kuroshiro from 'kuroshiro'
import Analyzer from 'kuroshiro-analyzer-kuromoji' // Ensure this points to the correct build for browser
import { useDefaultStore } from '@/stores/default'

export interface RubyProvider {
  supports(lang: string): boolean
  generate(text: string): Promise<string>
}

class JapaneseProvider implements RubyProvider {
  private kuroshiro: Kuroshiro
  private initialized: Promise<void>

  constructor() {
    this.kuroshiro = new Kuroshiro()
    this.initialized = this.initKuroshiro()
  }

  private async initKuroshiro(): Promise<void> {
    try {
      console.log('Initializing Kuroshiro analyzer...');
      // Analyzer needs to be initialized with its dictionary path
      // For browser, it might need to fetch the dictionary
      await this.kuroshiro.init(new Analyzer({ dictPath: 'dict/' }));
      console.log('Kuroshiro analyzer initialized.');
    } catch (error) {
      console.error('Failed to initialize Kuroshiro analyzer:', error);
      // Fallback or throw error
    }
  }

  supports(lang: string): boolean {
    return lang.startsWith('ja')
  }

  async generate(text: string): Promise<string> {
    await this.initialized; // Ensure Kuroshiro is initialized
    if (!this.kuroshiro || !this.kuroshiro.isInitialized()) {
      console.warn('Kuroshiro not initialized, returning original text for Japanese.');
      return text;
    }

    try {
      // kuroshiro.convert returns format "word[furigana]"
      const result = await this.kuroshiro.convert(text, { to: "hiragana", mode: "furigana", romajiSystem: "hepburn" });
      
      // Transform kuroshiro's output format to our "word[furigana]|..." format
      // kuroshiro's furigana mode already returns the format we need: "語[ご]"
      // We just need to split by non-kanji characters and add pipes, or handle single words.
      
      // A simple regex to split into word[furigana] or just word
      // This will handle continuous Japanese text
      const parts = result.match(/(\p{sc=Han}+\p{sc=Hira}*\[\p{sc=Hira}+\]|\p{sc=Han}+|\p{sc=Hira}+|\p{sc=Kana}+|\w+|[^\s\p{sc=Han}\p{sc=Hira}\p{sc=Kana}\w])/gu);
      
      if (!parts) return result; // Should not happen with typical Japanese text

      return parts.map(part => {
        // If it's already in word[furigana] format, use it as is
        if (part.includes('[') && part.includes(']')) {
          return part;
        }
        // For other parts (hiragana, katakana, non-Japanese words), return as word without furigana
        return part;
      }).join('|');

    } catch (error) {
      console.error('JapaneseProvider kuroshiro conversion error:', error);
      return text;
    }
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
