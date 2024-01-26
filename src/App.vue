<template>
  <v-app>
    <SystemBar v-if="is_electron()"></SystemBar>
    <router-view name="Header"></router-view>    
    <v-main style="--v-layout-left: 0px; --v-layout-right: 0px; --v-layout-top: 0px; --v-layout-bottom: 60px; margin-bottom: -60px;">
      <router-view class="fullscreen-router-view"></router-view>
    </v-main>
    <!-- Hide Footer Button -->
    <v-btn v-if="!footer" class="corner-button" color="primary" icon @click="toggleFooter">
    <v-icon>{{ footer ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
  </v-btn>

    <router-view name="Footer" @toggle-footer-visibility="toggleFooter" ></router-view>
  </v-app>
</template>

<script lang="ts">
import { useAppearanceStore } from  './stores/appearance'
import { useWordReplaceStore } from  './stores/word_replace'
import { useSettingsStore } from  './stores/settings'
import { useSpeechStore } from  './stores/speech'
import { useTranslationStore } from './stores/translation'
import { useConnectionStore } from  './stores/connections'
import { useOSCStore } from  './stores/osc'

import is_electron from './helpers/is_electron'

import SystemBar from './components/appbars/SystemBar.vue'

declare const window: any

export default {
  name: 'App',
  components: {
    SystemBar
  },
  data() {
    return {
      footer: true
    };
  },
  methods: {
    toggleFooter() {
      this.footer = !this.footer;
      let el: HTMLElement | null = document.querySelector("#log-list")
      let em: HTMLElement | null = document.querySelector(".v-main")
      let ef: HTMLElement | null = document.querySelector("#app > div > div > footer")
      if(el && em && ef){
          var rs = getComputedStyle(el);
          console.log(el,em,ef,this.ft);
          if(rs.getPropertyValue("--933e9cdf-outer_size") != '0'){
              ef.style.height = '0'
              ef.style.padding = '0'
              em.style.setProperty('margin-bottom', '0');
              em.style.setProperty('--v-layout-bottom', '0');
              el.style.setProperty('--933e9cdf-outer_size', '0');
          } else {
              this.ft = true
              em.style.setProperty('--v-layout-bottom', '60px');
              el.style.setProperty('--933e9cdf-outer_size', '55px');
              ef.style.height = '60px'
              ef.style.padding = '8px'
          }
      }
    },
  },
  setup() {
    const appearanceStore = useAppearanceStore()
    const speechStore = useSpeechStore()
    const wordReplaceStore = useWordReplaceStore()
    const translationStore = useTranslationStore()
    const settingsStore = useSettingsStore()
    const connectionStore = useConnectionStore()
    const oscStore = useOSCStore()

    appearanceStore.$subscribe((_, state) => {
        localStorage.setItem('appearance', JSON.stringify(state))
    })
    speechStore.$subscribe((_, state) => {
        localStorage.setItem('speech', JSON.stringify(state))
    })
    settingsStore.$subscribe((_, state) => {
        localStorage.setItem('settings', JSON.stringify(state))
    })
    wordReplaceStore.$subscribe((_, state) => {
        localStorage.setItem('word_replace', JSON.stringify(state))
    })
    translationStore.$subscribe((_, state) => {
        localStorage.setItem('translation', JSON.stringify(state))
    })
    connectionStore.$subscribe((_, state) => {
        localStorage.setItem('connections', JSON.stringify(state))
    })
    oscStore.$subscribe((_, state) => {
        localStorage.setItem('osc', JSON.stringify(state))
    })


    appearanceStore.$patch(JSON.parse(localStorage.getItem('appearance') || '{}'))
    speechStore.$patch(JSON.parse(localStorage.getItem('speech') || '{}'))
    settingsStore.$patch(JSON.parse(localStorage.getItem('settings') || '{}'))
    wordReplaceStore.$patch(JSON.parse(localStorage.getItem('word_replace') || '{}'))
    translationStore.$patch(JSON.parse(localStorage.getItem('translation') || '{}'))
    connectionStore.$patch(JSON.parse(localStorage.getItem('connections') || '{}'))
    oscStore.$patch(JSON.parse(localStorage.getItem('osc') || '{}'))

    return {
      settingsStore,
      connectionStore,
      is_electron,
      wordReplaceStore,
    }
  },
  unmounted() {
    if (this.is_electron())
      window.ipcRenderer.send('close-ws')
  },
  mounted() {
    if (this.is_electron() && this.connectionStore.ws.enabled)
      window.ipcRenderer.send('start-ws', this.connectionStore.ws.port)

    this.$i18n.locale = this.settingsStore.language
    this.settingsStore.$subscribe((language, state) => {
      this.$i18n.locale = this.settingsStore.language
    })
  },
  created() {
    if (this.is_electron())
      this.$router.push('/')
  },
}
</script>

<style>
.pointer {
  cursor: pointer;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
    background-color: transparent; /* rgb(var(--v-theme-primary)); */
}

::-webkit-scrollbar-thumb {
  background: #4e4e4e; /* #a9a4e5 */
  border-radius: 10px;
}

/* blink keyframe */
.text-glow {
  color: rgba(var(--v-theme-secondary))
}
.blink {
  animation: blinker 1s cubic-bezier(.5, 0, 1, 1) infinite alternate;  
}
@keyframes blinker {  
  from { opacity: 1; }
  to { opacity: 0; }
}

#corner-element {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background-color: red;
  padding: 0;
  margin: 0;
}

.fullscreen-router-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.corner-button {
  position: fixed;
  top: 0; /* Adjust the top value to your desired position */
  left: 0; /* Adjust the right value to your desired position */
  transform: scale(0.5);
}
</style>