<template>
  <v-card id="log-list" v-resize="onResize" class="fill-height pa-4 overflow-auto log-list"
    :color="appearanceStore.ui.color" :height="height - 55" tile>
    <div v-if="isElectron && logStore.jp">
      <a v-for="log in logs"
        :class="{ 'fade-out': log.hide, 'final-text': log.isFinal || log.isTranslationFinal, 'interim-text': !log.isFinal || (!log.isTranslationFinal && log.translate) }"
        :key="log.time">
        <a v-if="log.hide !== 2">
          <span v-for="(item, index) in parseTranscript(log.transcript)" :key="index" class="japanese-text">
            <template v-if="item.furigana">
              <ruby class="japanese-ruby">
                {{ item.word }}<rt>{{ item.furigana }}</rt>
              </ruby>
            </template>
            <template v-else>
              <span>{{ item.word }}</span>
            </template>
          </span>
        </a>
        <v-expand-transition v-show="log.pause">
          <div>
            <v-col class="pa-0" />
          </div>
        </v-expand-transition>
      </a>
    </div>
    <div v-else>
      <a v-for="log in logs"
        :class="{ 'fade-out': log.hide, 'final-text': log.isFinal || log.isTranslationFinal, 'interim-text': !log.isFinal || (!log.isTranslationFinal && log.translate) }"
        :key="log.time">
        <a v-if="log.hide !== 2">{{ (translationStore.enabled && (log.translation || !translationStore.show_original)) ?
          log.translation : log.transcript }}</a>
        <v-expand-transition v-show="log.pause">
          <div>
            <v-col class="pa-0" />
          </div>
        </v-expand-transition>
      </a>
    </div>

    <WelcomeOverlay :overlay="overlay_main" :page="overlay_page" />
  </v-card>
</template>

<script lang="ts">
// import {ipcRenderer} from "electron"
import { useDisplay } from 'vuetify'

import is_electron from '../helpers/is_electron'

import WelcomeOverlay from '@/components/overlays/WelcomeOverlay.vue'

import { useSettingsStore } from '@/stores/settings'
import { useAppearanceStore } from '@/stores/appearance'
import { useLogStore } from '@/stores/logs'
import { useTranslationStore } from '@/stores/translation'

declare const window: any

export default {
  name: 'Home',
  components: {
    WelcomeOverlay,
  },
  props: {
    isElectron: {
      type: Boolean,
      required: false
    },
    footer: {
      type: Boolean,
      required: true
    }
  },
  setup() {
    const { height } = useDisplay()

    const settingsStore = useSettingsStore()
    const appearanceStore = useAppearanceStore()
    const logStore = useLogStore()
    const translationStore = useTranslationStore()

    const font_size = `${appearanceStore.text.font_size}px`
    const fade_time = `${appearanceStore.text.fade_time}s`
    const text_color = appearanceStore.text.color
    const interim_color = appearanceStore.text.interim_color

    const font_name = appearanceStore.text.font.name
    const font_subtype = appearanceStore.text.font.sub_type

    return {
      settingsStore,
      appearanceStore,
      logs: logStore.logs,
      translationStore,
      font_size,
      fade_time,
      text_color,
      interim_color,
      font_name,
      font_subtype,
      height,
      logStore,
    }
  },
  data() {
    return {
      // oscClient: client,
      overlay_main: false,
      overlay_page: 0,

      ws: null as any,

      japaneseRegex: /[\u4E00-\u9FFF]/,

      listening: false,
      listening_error: false,
      talking: false,

      loadingWebsocket: false,
      broadcasting: false,

      input_text: '',

      snackbar: false,
      snackbar_color: 'error',
      snackbar_icon: '',
      snackbar_desc: '',

      error_snackbar: false,
      error_message: '',

      windowSize: {
        x: 0,
        y: 0,
      },
    }
  },
  computed: {
    outer_size() {
      return this.footer ? (is_electron() ? '90px' : '55px') : '0px'
    },
    console: () => console,
    window: () => window,
  },
  mounted() {
    this.overlay_main = this.settingsStore.welcome
    this.onResize()
  },
  methods: {
    onResize() {
      this.windowSize = { x: window.innerWidth, y: window.innerHeight }
    },
    parseTranscript(transcript: string) {
      console.log('Parsing transcript:', transcript);
      if (!transcript) {
        console.log('Empty transcript');
        return [];
      }
      
      // Split by pipe character
      const parts = transcript.split('|');
      console.log('Split parts:', parts);
      
      const result = [];
      
      for (const part of parts) {
        if (!part) {
          console.log('Skipping empty part');
          continue;
        }
        
        console.log('Processing part:', part);
        // Check if part contains furigana (has square brackets)
        const match = part.match(/^(.*?)\[(.*?)\]$/);
        if (match) {
          const [_, word, furigana] = match;
          console.log(`Found furigana: word=${word}, furigana=${furigana}`);
          result.push({ word, furigana });
        } else {
          console.log(`No furigana, adding as plain word: ${part}`);
          // Only add word without furigana if we're not in Japanese mode or if it's punctuation/spacing
          if (!this.logStore.jp || /[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(part)) {
            result.push({ word: part, furigana: '' });
          }
        }
      }
      
      console.log('Final parsed result:', result);
      return result;
    },
    isJapaneseWord(word: string) {
      if (!word || typeof word !== 'string') return false;
      return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(word);
    },
    isValidFurigana(item: { word: string, furigana: string }) {
      // Only validate that we have both word and furigana
      return !!(item && item.word && item.furigana);
    }
  },
}
</script>

<style>
html {
  overflow-y: hidden;
}

.log-list {
  display: flex;
  flex-direction: column-reverse;
  font-family: v-bind(font_name);
  font-style: v-bind('font_subtype.style');
  font-weight: v-bind('font_subtype.weight');
  font-size: v-bind(font_size);
  overflow-y: auto;
  max-height: calc(100vh - v-bind(outer_size));
}

/* Add ruby text styling */
ruby {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: 0;
  padding: 0;
  line-height: 1.2;
}

rt {
  display: block;
  font-size: 0.5em;
  line-height: 1;
  text-align: center;
  transform: translateY(-0.1em);
  margin: 0;
  padding: 0;
  user-select: none;
  color: inherit;
  opacity: 0.85;
}

/* Ensure proper spacing between characters */
ruby + ruby {
  margin-left: 0.1em;
}

/* Fix ruby alignment in vertical text */
.vertical-text ruby {
  flex-direction: row;
  writing-mode: vertical-rl;
}

.log-list::-webkit-scrollbar {
  display: none;
  /* for Chrome, Safari and Opera */
}

.final-text {
  color: v-bind(text_color);
}

.interim-text {
  color: v-bind(interim_color);
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.fade-out {
  animation: fadeOut ease v-bind(fade_time);
  -webkit-animation: fadeOut ease v-bind(fade_time);
  -moz-animation: fadeOut ease v-bind(fade_time);
  -o-animation: fadeOut ease v-bind(fade_time);
  -ms-animation: fadeOut ease v-bind(fade_time);
  animation-fill-mode: forwards;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

@-moz-keyframes fadeOut {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

@-webkit-keyframes fadeOut {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

@-o-keyframes fadeOut {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

@-ms-keyframes fadeOut {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}
rt, ruby > rt {
      pointer-events: none;
      user-select: none;
}
rb, ruby {
  user-select: text;
}

.japanese-text {
  display: inline-block;
  line-height: 2;
  margin: 0 0.1em;
}

.japanese-ruby {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  line-height: 1.2;
  margin: 0;
  padding: 0;
}
</style>
