import kuromoji from 'kuromoji'
import pkg from '../../../package.json'
import { emit_osc } from './osc'

let tokenizer = null
kuromoji.builder({ dicPath: 'lib/dict' }).build((err, res) => {
  if (err)
    console.log(err)

  tokenizer = res
})
const japaneseRegex = /[\u4E00-\u9FFF]/
function katakanaToHiragana(input: string): string {
  const katakanaToHiraganaMap: { [key: string]: string } = {
    ア: 'あ',
    イ: 'い',
    ウ: 'う',
    エ: 'え',
    オ: 'お',
    カ: 'か',
    キ: 'き',
    ク: 'く',
    ケ: 'け',
    コ: 'こ',
    サ: 'さ',
    シ: 'し',
    ス: 'す',
    セ: 'せ',
    ソ: 'そ',
    タ: 'た',
    チ: 'ち',
    ツ: 'つ',
    テ: 'て',
    ト: 'と',
    ナ: 'な',
    ニ: 'に',
    ヌ: 'ぬ',
    ネ: 'ね',
    ノ: 'の',
    ハ: 'は',
    ヒ: 'ひ',
    フ: 'ふ',
    ヘ: 'へ',
    ホ: 'ほ',
    マ: 'ま',
    ミ: 'み',
    ム: 'む',
    メ: 'め',
    モ: 'も',
    ヤ: 'や',
    ユ: 'ゆ',
    ヨ: 'よ',
    ラ: 'ら',
    リ: 'り',
    ル: 'る',
    レ: 'れ',
    ロ: 'ろ',
    ワ: 'わ',
    ヰ: 'ゐ',
    ヱ: 'ゑ',
    ヲ: 'を',
    ン: 'ん',
    ガ: 'が',
    ギ: 'ぎ',
    グ: 'ぐ',
    ゲ: 'げ',
    ゴ: 'ご',
    ザ: 'ざ',
    ジ: 'じ',
    ズ: 'ず',
    ゼ: 'ぜ',
    ゾ: 'ぞ',
    ダ: 'だ',
    ヂ: 'ぢ',
    ヅ: 'づ',
    デ: 'で',
    ド: 'ど',
    バ: 'ば',
    ビ: 'び',
    ブ: 'ぶ',
    ベ: 'べ',
    ボ: 'ぼ',
    パ: 'ぱ',
    ピ: 'ぴ',
    プ: 'ぷ',
    ペ: 'ぺ',
    ポ: 'ぽ',
    ァ: 'ぁ',
    ィ: 'ぃ',
    ゥ: 'ぅ',
    ェ: 'ぇ',
    ォ: 'ぉ',
    ャ: 'ゃ',
    ュ: 'ゅ',
    ョ: 'ょ',
    ー: 'ー',
  }

  let result = ''
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (katakanaToHiraganaMap[char])
      result += katakanaToHiraganaMap[char]
    else
      result += char
  }
  return result
}

/*
 * websocket control
 */
function initialize_ws(win: any, wss: any, port: number) {
  return new Promise((resolve, reject) => {
    // wss = new WebSocketServer({ port: port })
    wss.on('error', error => reject(error))
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        message = JSON.parse(message)
        if (message.data.transcript.length > 0) {
          try {
            if (japaneseRegex.test(message.data.transcript)) {
              const tokens = tokenizer.tokenize(message.data.transcript)
              let furigana = ''
              for (const token of tokens) {
                const hiragana = katakanaToHiragana(token.reading)
                if (hiragana.endsWith('ッ'))
                  hiragana = hiragana.slice(0, -1)

                const word = token.basic_form !== token.reading
                  && token.basic_form !== hiragana && japaneseRegex.test(token.basic_form)
                  ? `${token.basic_form}[${hiragana}]`
                  : token.basic_form
                furigana += word
              }
              message.data.transcript = furigana
            }
          }
          catch (error) {
            console.error(error)
          }
        }
        console.log(`WS => ${message.type}`)

        if (message.type === 'command') {
          console.log(`Received command: ${message.data}`)
          switch (message.data) {
            case 'stop':
              win.webContents.send('websocket-connect', false)
              break
            case 'speechstart':
              emit_osc(['/chatbox/typing', true])
              break
            case 'speechend':
              emit_osc(['/chatbox/typing', false])
              break
            default:
              break
          }
        }
        else if (message.type === 'text') {
          if (message.data.transcript.length > 0)
            win.webContents.send('receive-text-event', JSON.stringify(message.data))
        }
      })
      ws.send(`{"event": "connect", "msg":"connected to websocket ( •̀ ω •́ )", "version":"${pkg.version}"}`)
      win.webContents.send('websocket-connect', true)
    })
    wss.on('open', () => resolve(wss))
  })
}

function close_ws(wss: any) {
  wss.close()
}

export { initialize_ws, close_ws }
