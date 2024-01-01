<template>
    <v-snackbar v-model="defaultStore.snackbar.enabled" :color="defaultStore.snackbar.type" location="top" :timeout="8000">
        <v-row class="align-center justify-center">
            <v-col :cols="12">
                <p v-html="defaultStore.snackbar.desc"></p>
            </v-col>
        </v-row>
        <template v-slot:actions>
            <v-btn variant="text" @click="defaultStore.snackbar.enabled = false">
                Close
            </v-btn>
        </template>
    </v-snackbar>

    <!-- Add the v-snackbar component -->
    <v-snackbar v-model="toast.show" :color="toast.color" :timeout="toast.timeout">
        {{ toast.text }}
    </v-snackbar>
    <v-footer app class="d-flex flex-column pl-2" :class="{ 'hidden': !footerVisible }" height="60" permanent fixed>
        <div class="d-flex w-100 align-center">
            <!--hotkeys:
    space: mic button
    a->l: change language and show popup message for 3s then reinitialize speech
        a: ja-JP
        s: en-US
        d: id-ID
        f: zh-CN
        g: ko-KR
        h: pt-BR
        h: es-ME
        j: fr-FR
        k: de-GE
        l: it-IT
    c: copy to clipboard
    x: clear all text
    z: save and export log
    q: change auto start speech and show popup
    0->9: select part of text (x%) in the screen
    w: toggle requests
    e: search
    r: restart
    t: toggle translate
    y: hide translate
    u: logging
    i: toggle footer display (hide)
    -:zoom out
    =:zoom in-->
            <v-form @submit.prevent="onSubmit()" class="d-flex w-100 align-center" @keydown="handleHotkey">
                <div class="d-flex w-100 align-center">
                    <!-- Language Selector -->
                    <v-select v-model="selectedLanguage" :items="WebSpeechLangs" item-value="value" item-text="title"
                        label="Language" dense outlined hide-details></v-select>
                    <v-text-field v-model="input_text" density="compact" variant="outlined"
                        :label="$t('general.type_message')" append-inner-icon="mdi-chevron-right" class="mr-6" single-line
                        hide-details flat loading>
                        <template v-slot:loader>
                            <v-progress-linear :active="logStore.loading_result === true || translationStore.download >= 0"
                                :color="translationStore.download !== -1 ? 'warning' : 'secondary'"
                                :indeterminate="translationStore.download === -1" :model-value="translationStore.download"
                                :max="100" height="5" rounded></v-progress-linear>
                        </template>
                    </v-text-field>

                    <v-spacer v-if="!smAndDown"></v-spacer>

                    <div class="d-flex jusqtify-right">
                        <v-btn v-if="!is_electron()" @click="toggleListen" class="mr-4"
                            :color="(defaultStore.speech.listening) ? 'success' : 'error'" size="small" icon
                            variant="outlined">
                            <v-icon v-if="!defaultStore.speech.listening">mdi-microphone-off</v-icon>
                            <v-icon v-else>mdi-microphone</v-icon>
                        </v-btn>
                        <v-badge :model-value="!!defaultStore.connections"
                            :content="defaultStore.connections ? defaultStore.connections : undefined" color="success"
                            class="mr-4">
                            <v-btn @click="toggleBroadcast" :loading="defaultStore.loading_websocket"
                                :disabled="defaultStore.loading_websocket"
                                :color="(defaultStore.broadcasting) ? 'success' : 'error'" size="small" icon
                                variant="outlined">
                                <v-icon v-if="!defaultStore.broadcasting">mdi-broadcast-off</v-icon>
                                <v-icon v-else>mdi-broadcast</v-icon>
                            </v-btn>
                        </v-badge>
                        <v-divider class="mr-4" vertical></v-divider>
                        <v-btn v-if="$route.name === 'home'" @click="$router.push({ path: last_setting })"
                            color="transparent" size="small" icon flat>
                            <v-icon>mdi-cog</v-icon>
                        </v-btn>
                        <v-btn v-else @click="$router.push({ path: '/' })" color="transparent" size="small" icon flat>
                            <v-icon>mdi-home</v-icon>
                        </v-btn>
                        <!-- Copy Button -->
                        <v-btn icon class="copy-button" @click="copyToClipboard">
                            <v-icon>mdi-content-copy</v-icon>
                        </v-btn>
                        <!-- Translate Button -->
                        <v-btn @click="translateText" color="primary" icon>
                            <v-icon>mdi-translate</v-icon>
                        </v-btn>

                        <!-- Hide Controls Button -->
                        <v-btn @click="toggleControls" color="primary" icon>
                            <v-icon>{{ controlsVisible ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                        </v-btn>

                        <!-- Hide Footer Button -->
                        <v-btn @click="toggleFooter" color="primary" icon>
                            <v-icon>{{ footerVisible ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
                        </v-btn>
                    </div>
                </div>
            </v-form>
        </div>
    </v-footer>
</template>

<script lang="ts">
// import {ipcRenderer} from "electron"
import is_electron from "../helpers/is_electron"

import { useDisplay } from 'vuetify'
import { useWordReplaceStore } from '../stores/word_replace'
import { useSettingsStore } from '../stores/settings'
import { useSpeechStore } from '../stores/speech'
import { useAppearanceStore } from '../stores/appearance'
import { useLogStore, Log } from '../stores/logs'
import { useTranslationStore } from '../stores/translation'
import { useOSCStore } from '../stores/osc'
import { useConnectionStore } from '../stores/connections'
import { useDefaultStore } from '../stores/default'

import { WebSpeechLangs } from '../modules/speech/WebSpeech';

declare const window: any

export default {
    name: 'Home',
    data() {
        return {
            last_route: null as any,

            controlsVisible: true,
            footerVisible: true,
            auto: true,
            selectedLanguage: '',

            input_text: '',
            typing_limited: false,
            WebSpeechLangs,
            snackbar: false,
            snackbar_color: "error",
            snackbar_icon: "",
            snackbar_desc: '',

            toast: {
                show: false,
                text: '',
                color: '',
                timeout: 3000,
            },
            windowSize: {
                x: 0,
                y: 0,
            }
        }
    },
    watch: {
        input_text() {
            if (this.oscStore.osc_text && this.oscStore.text_typing && this.defaultStore.broadcasting)
                this.typing_event(true)
        },

        selectedLanguage(newLanguage) {
            // Implement functionality for changing the language and showing the popup message
        },
        'speechStore.stt.language'(new_val) {
            if (this.defaultStore.speech.recognition) {
                this.defaultStore.speech.stop()
                this.defaultStore.speech.recognition.lang = new_val
            }
        }
    },
    methods: {
        toggleListen() {
            this.speechStore.toggle_listen()
        },

        showToast(text: string, color: any) {
            this.toast.text = text;
            this.toast.color = color;
            this.toast.show = true;
        },
        typing_event(event: boolean) {
            this.speechStore.typing_event(event)
        },
        paramTrigger(input: string) {
            // console.log(window.process.type)
            if (this.defaultStore.broadcasting && is_electron()) {
                // if custom params
                // potential addition:
                // use https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search
                // to see which assign is the closest to the keyword found
                // unless switch to nlp first.....
                if (this.oscStore.osc_params.length) {
                    this.oscStore.osc_params.forEach(custom_param => {
                        let matchesKey = null

                        custom_param.keywords.forEach(keyword => {
                            const key_check = `(^|\\s)(${keyword.text})($|[^a-zA-Z\\d])`
                            const reKey = new RegExp(key_check, "ig")
                            matchesKey = reKey.exec(input)
                        })

                        if (matchesKey) {
                            custom_param.assigns.forEach(assign => {
                                const assign_check = `(^|\\s)(${assign.keyword})($|[^a-zA-Z\\d])`
                                const reAssign = new RegExp(assign_check, "ig")
                                const matchesAssign = reAssign.exec(input)
                                if (matchesAssign) {
                                    this.show_snackbar('secondary', `<code>${custom_param.route} = ${assign.set}</code>`)
                                    window.ipcRenderer.send("send-param-event", { ip: custom_param.ip, port: custom_param.port, route: custom_param.route, value: assign.set })
                                }
                            })
                        }
                    })
                }
            }
        },
        async onSubmit(log: Log | null = null) {
            if (log && !log.transcript) return

            if (!log)
                log = {
                    transcript: this.input_text,
                    isFinal: true,
                    isTranslationFinal: false,
                    translate: false,
                    hide: 0 // 1 = fade, 2 = hide
                }
            if (log.isFinal) this.paramTrigger(log.transcript)
            this.speechStore.on_submit(log, Math.max(this.logStore.logs.length - 1, 0))

            // clear chatbox
            this.input_text = ''
        },
        toggleBroadcast() {
            this.defaultStore.toggle_broadcast()
        },
        show_snackbar(type: string, desc: string) {
            this.defaultStore.snackbar.desc = desc
            this.defaultStore.snackbar.type = type
            this.defaultStore.snackbar.enabled = true
        },
        onResize() {
            this.windowSize = { x: window.innerWidth, y: window.innerHeight }
        },

        toggleMic() {
            // Implement functionality for toggling the mic button
        },
        changeLanguage(language: string) {

            // Call the auto function to change the language and toggle the listen mode
            const result = auto(this.speechStore, language, true);

            // Show a popup message for 3 seconds
            if (result) {
                // Show success message
                this.showToast('Language changed successfully.', 'success');
            } else {
                // Show error message
                this.showToast('Failed to change language.', 'error');
            }
        },
        translateText() {
            // Implement translation functionality here
            // You can use a translation API or library of your choice
        },

        toggleControls() {
            this.controlsVisible = !this.controlsVisible;
        },

        copyToClipboard() {
            // Copy the input_text to the clipboard
            navigator.clipboard.writeText(this.input_text)
                .then(() => {
                    this.showToast('Text copied to clipboard.', 'success');
                })
                .catch((error) => {
                    console.error('Failed to copy text to clipboard:', error);
                    this.showToast('Failed to copy text to clipboard.', 'error');
                });
        },

        clearText() {
            // Clear the input_text
            this.input_text = '';
        },

        saveAndExportLog() {
            // Save and export the log
            // Implement the functionality to save and export the log here
        },

        changeAutoStartSpeech() {
            // Change auto start speech setting
            this.auto = !this.auto;
            if (this.auto) {
                auto(this.speechStore, this.selectedLanguage, true);
                this.showToast('Auto start speech enabled.', 'success');
            } else {
                this.speechStore.toggle_listen()
                this.showToast('Auto start speech disabled.', 'success');
            }
        },

        selectText(percentage: number) {
            // Select a part of the text based on the percentage
            const textLength = this.input_text.length;
            const startIndex = Math.floor((percentage / 100) * textLength);
            const endIndex = Math.floor(((percentage + 10) / 100) * textLength);
            const selectedText = this.input_text.substring(startIndex, endIndex);
            console.log('Selected Text:', selectedText);
        },

        toggleRequests() {
            // Toggle requests
            // Implement the functionality to toggle requests here
        },

        search() {
            // Search
            // Implement the search functionality here
        },

        restart() {
            // Restart the application
            // Implement the restart functionality here
        },

        toggleTranslate() {
            // Toggle translate
            // Implement the functionality to toggle translate here
        },

        hideTranslate() {
            // Hide translate
            // Implement the functionality to hide translate here
        },

        toggleLogging() {
            // Toggle logging
            // Implement the functionality to toggle logging here
        },

        toggleFooterDisplay() {
            // Toggle footer display
            this.footerVisible = !this.footerVisible;
        },

        zoomOut() {
            // Zoom out
            // Implement the functionality to zoom out here
        },

        zoomIn() {
            // Zoom in
            // Implement the functionality to zoom in here
        },

        handleHotkey(event: any) {
            // Check the event key to determine the triggered hotkey
            if (event.key === ' ') {
                // Spacebar: mic button
                this.toggleListen();
            } else if (event.key === 'a' && event.ctrlKey) {
                // Ctrl + A: Change language to ja-JP
                this.changeLanguage('ja-JP');
            } else if (event.key === 's' && event.ctrlKey) {
                // Ctrl + S: Change language to en-US
                this.changeLanguage('en-US');
            } else if (event.key === 'd' && event.ctrlKey) {
                // Ctrl + D: Change language to id-ID
                this.changeLanguage('id-ID');
            } else if (event.key === 'f' && event.ctrlKey) {
                // Ctrl + F: Change language to zh-CN
                this.changeLanguage('zh-CN');
            } else if (event.key === 'g' && event.ctrlKey) {
                // Ctrl + G: Change language to ko-KR
                this.changeLanguage('ko-KR');
            } else if (event.key === 'h' && event.ctrlKey) {
                // Ctrl + H: Change language to pt-BR
                this.changeLanguage('pt-BR');
            } else if (event.key === 'j' && event.ctrlKey) {
                // Ctrl + J: Change language to es-ME
                this.changeLanguage('es-ME');
            } else if (event.key === 'k' && event.ctrlKey) {
                // Ctrl + K: Change language to fr-FR
                this.changeLanguage('fr-FR');
            } else if (event.key === 'l' && event.ctrlKey) {
                // Ctrl + L: Change language to it-IT
                this.changeLanguage('it-IT');
            } else if (event.key === 'c' && event.ctrlKey) {
                // Ctrl + C: Copy to clipboard
                this.copyToClipboard();
            } else if (event.key === 'x' && event.ctrlKey) {
                // Ctrl + X: Clear all text
                this.clearText();
            } else if (event.key === 'z' && event.ctrlKey) {
                // Ctrl + Z: Save and export log
                this.saveAndExportLog();
            } else if (event.key === 'q' && event.ctrlKey) {
                // Ctrl + Q: Change auto start speech
                this.changeAutoStartSpeech();
            } else if (event.key === 'w' && event.ctrlKey) {
                // Ctrl + W: Toggle requests
                this.toggleRequests();
            } else if (event.key === 'e' && event.ctrlKey) {
                // Ctrl + E: Search
                this.search();
            } else if (event.key === 'r' && event.ctrlKey) {
                // Ctrl + R: Restart
                this.restart();
            } else if (event.key === 't' && event.ctrlKey) {
                // Ctrl + T: Toggle translate
                this.toggleTranslate();
            } else if (event.key === 'y' && event.ctrlKey) {
                // Ctrl + Y: Hide translate
                this.hideTranslate();
            } else if (event.key === 'u' && event.ctrlKey) {
                // Ctrl + U: Logging
                this.toggleLogging();
            } else if (event.key === 'x') {
                // Ctrl + I: Toggle footer display
                this.toggleFooter();
            } else if (event.key === '-') {
                // Minus: Zoom out
                this.zoomOut();
            } else if (event.key === '=') {
                // Equal sign: Zoom in
                this.zoomIn();
            } else   if (parseInt(event.key, 10) >= 0 && parseInt(event.key, 10) <= 9 && event.ctrlKey) {
                // Ctrl + 0-9: Select part of text in the screen
                const percentage = parseInt(event.key) * 10;
                this.selectText(percentage);
            }
        },
        toggleFooter() {
            this.footerVisible = !this.footerVisible;
        },
        reloadEvents() {
            if (is_electron()) {
                window.ipcRenderer.removeListener('websocket-connect')
                window.ipcRenderer.removeListener('receive-text-event')
                window.ipcRenderer.receive('websocket-connect', (event: any, data: any) => {
                    this.defaultStore.broadcasting = event
                })
                window.ipcRenderer.receive('receive-text-event', (event: any, data: any) => {
                    event = JSON.parse(event)
                    this.onSubmit(event)
                })
            }
        }
    },
    computed: {
        last_setting() {
            return (this.last_route && this.last_route.startsWith('/settings')) ? this.last_route : '/settings/general'
        }
    },
    unmounted() {
        if (this.defaultStore.speech.listening) this.toggleListen()
        if (this.defaultStore.broadcasting) this.toggleBroadcast()
        if (is_electron()) {
            window.ipcRenderer.removeListener('websocket-connect')
            window.ipcRenderer.removeListener('receive-text-event')
        }
        this.defaultStore.worker.removeEventListener('message', this.translationStore.onMessageReceived)
    },
    updated() {
        this.reloadEvents()
        this.last_route = this.$router.options.history.state.back
    },
    mounted() {
        this.onResize()
        this.reloadEvents()

        if (!this.defaultStore.worker) {
            this.defaultStore.worker = new Worker(new URL('../worker.ts', import.meta.url), {
                type: 'module'
            })
        }
        this.defaultStore.worker.addEventListener('message', this.translationStore.onMessageReceived)
        // Add a double-click event listener to a specific corner of the app to toggle the visibility of the footer section
        const cornerElement = document.getElementById('corner-element');
        cornerElement?.addEventListener('dblclick', this.toggleFooter);
        if (this.auto) {
            let automatic = auto(this.speechStore, 'ja-JP', true)
        } else {
            this.speechStore.initialize_speech(this.speechStore.stt.language)
        }
    },
    setup() {
        const { smAndDown } = useDisplay()
        const wordReplaceStore = useWordReplaceStore()
        const settingsStore = useSettingsStore()
        const speechStore = useSpeechStore()
        const appearanceStore = useAppearanceStore()
        const logStore = useLogStore()
        const translationStore = useTranslationStore()
        const oscStore = useOSCStore()
        const connectionStore = useConnectionStore()
        const defaultStore = useDefaultStore()

        return {
            wordReplaceStore,
            settingsStore,
            speechStore,
            appearanceStore,
            logs: logStore.logs,
            logStore,
            translationStore,
            oscStore,
            connectionStore,
            defaultStore,

            smAndDown,
            is_electron,
        }
    }
}
function auto(speechStore: any, lang?: string, on?: boolean): any {
    lang = lang ?? 'ja-JP'
    speechStore.stt.language = lang
    speechStore.initialize_speech(lang)
    let r = speechStore.toggle_listen()
    return r
}
</script>
<style>
    .hidden {
        display: none;
    }
</style>
    <!-- ... 
I: add vue hotkeys:
    space: mic button
    a->l: change language and show popup message for 3s then reinitialize speech
        a: ja-JP
        s: en-US
        d: id-ID
        f: zh-CN
        g: ko-KR
        h: pt-BR
        h: es-ME
        j: fr-FR
        k: de-GE
        l: it-IT
    c: copy to clipboard
    x: clear all text
    z: save and export log
    q: change auto start speech and show popup
    0->9: select part of text (x%) in the screen
    w: toggle requests
    e: search
    r: restart
    t: toggle translate
    y: hide translate
    u: logging
    i: toggle footer display (hide)
    -:zoom out
    =:zoom in
II: copy button (between the mic button)
III: Translate button
IV: Hide controls button-->