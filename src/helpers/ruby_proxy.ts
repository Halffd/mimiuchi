
import { pinyin } from 'pinyin-pro'
import is_electron from '@/helpers/is_electron'

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
    // Using pinyin-pro to get pinyin for each character
    // We use array type to match characters 1:1 if possible
    const result = pinyin(text, { type: 'array', toneType: 'symbol' })
    let transcript = ''
    
    // pinyin-pro array type usually matches character indices
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const py = result[i]
      
      // Only add ruby if it's a Chinese character and pinyin is different
      if (/[\u4e00-\u9fa5]/.test(char) && py && py !== char) {
        transcript += `${char}[${py}]`
      } else {
        transcript += char
      }
      transcript += '|'
    }
    return transcript.endsWith('|') ? transcript.slice(0, -1) : transcript
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
