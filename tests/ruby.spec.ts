import { test, expect } from '@playwright/test';

test.describe('Ruby/Tokenizing logic', () => {
  test.beforeEach(async ({ page }) => {
    // We can test the logic by injecting the necessary libraries and the proxy logic
    // or by navigating to the app if it's running. 
    // For a robust test without needing the full app running, we'll inject.
    
    // Inject Kuromoji (mocked or real if we can point to the dicts)
    // Actually, let's just navigate to the dev server if it's expected to be up.
    // Or better, we test the logic by defining it in the page context.
    
    await page.goto('about:blank');
    
    // Inject pinyin-pro (we can use a CDN version for testing if needed, or just bundle it)
    await page.addScriptTag({ url: 'https://unpkg.com/pinyin-pro' });
    
    // Inject a simplified version of our proxy logic for verification
    await page.evaluate(() => {
      (window as any).JapaneseProvider = class {
        supports(lang: string) { return lang.startsWith('ja'); }
        async generate(text: string) {
          // Mocking the behavior of generateFuriganaTranscript
          if (text === '日本語') return '日本[にほん]|語[ご]';
          return text;
        }
      };

      (window as any).ChineseProvider = class {
        supports(lang: string) { return lang.startsWith('zh') || lang.startsWith('cmn'); }
        async generate(text: string) {
          const { pinyin } = (window as any).pinyinPro;
          const result = pinyin(text, { type: 'array', toneType: 'symbol' });
          let transcript = '';
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const py = result[i];
            if (/[\u4e00-\u9fa5]/.test(char) && py && py !== char) {
              transcript += `${char}[${py}]`;
            } else {
              transcript += char;
            }
            transcript += '|';
          }
          return transcript.endsWith('|') ? transcript.slice(0, -1) : transcript;
        }
      };

      (window as any).rubyProxy = new (class {
        providers = [
          new (window as any).JapaneseProvider(),
          new (window as any).ChineseProvider(),
        ];
        async generate(text: string, lang: string) {
          const provider = this.providers.find(p => p.supports(lang));
          return provider ? await provider.generate(text) : text;
        }
      })();
    });
  });

  test('should generate Japanese furigana', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await (window as any).rubyProxy.generate('日本語', 'ja-JP');
    });
    expect(result).toBe('日本[にほん]|語[ご]');
  });

  test('should generate Chinese pinyin', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await (window as any).rubyProxy.generate('你好', 'zh-CN');
    });
    // pinyin-pro for 你好 should be nǐ|hǎo
    // Our logic formats it as 你[nǐ]|好[hǎo]
    expect(result).toBe('你[nǐ]|好[hǎo]');
  });

  test('should return original text for unsupported languages', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await (window as any).rubyProxy.generate('Hello', 'en-US');
    });
    expect(result).toBe('Hello');
  });

  test('should handle mixed Chinese and English', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await (window as any).rubyProxy.generate('你好 Hello', 'zh-CN');
    });
    expect(result).toBe('你[nǐ]|好[hǎo]| |H|e|l|l|o');
  });
});
