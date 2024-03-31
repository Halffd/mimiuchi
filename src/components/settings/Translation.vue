<template>
  <v-card :title="$t('settings.translation.title')" :subtitle="$t('settings.translation.description')" color="transparent" flat>
    <v-divider />
    <v-card-text>
<<<<<<< HEAD
      <v-row v-if="is_electron()">
=======
      <v-row>
>>>>>>> d4cb924 (autostart)
        <v-col>
          <v-chip variant="outlined" label color="error" size="large">
            <v-icon start icon="mdi-alert" />
            {{ $t('settings.translation.warning') }}
          </v-chip>
        </v-col>
        <v-col :cols="12">
          <v-card flat>
<<<<<<< HEAD
            <v-list-item :title="$t('settings.translation.enabled')">
              <template #append>
                <v-switch
                  v-model="translationStore.enabled"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>
=======
            <v-switch
              v-model="translationStore.enabled"
              :label="$t('settings.translation.enabled')"
              color="primary"
              hide-details
              inset
              class="mx-3"
            />
>>>>>>> d4cb924 (autostart)
          </v-card>
        </v-col>
        <v-col :cols="12">
          <v-select
            v-model="translationStore.type"
            :label="$t('settings.translation.type')"
            :items="translation_types"
            item-title="title"
            item-value="value"
            variant="outlined"
            hide-details
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #append>
                  <v-icon icon="mdi-laptop" />
                </template>
              </v-list-item>
            </template>
          </v-select>
        </v-col>
        <v-col v-if="translation_types.find(o => o.type === 'local')" :cols="12">
          <v-alert variant="outlined" type="info" prominent>
            <v-alert-title class="text-subtitle-1">
              <i18n-t keypath="settings.translation.ml_notice" tag="label" scope="global">
                <span class="text-primary">{{ translationStore.type }}</span>
              </i18n-t>
            </v-alert-title>
          </v-alert>
        </v-col>
        <v-col :cols="12" :sm="6">
          <v-autocomplete
            v-model="translationStore.source"
            :label="$t('settings.translation.source')"
            :items="translation_options"
            item-title="title"
            item-value="value"
            auto-select-first
            :hint="`${$t('settings.translation.speech_lang')}${stt_language}`"
            persistent-hint
          />
        </v-col>
        <v-col :cols="12" :sm="6">
          <v-autocomplete
            v-model="translationStore.target"
            :label="$t('settings.translation.target')"
            :items="translation_options"
            item-title="title"
            item-value="value"
            auto-select-first
            hide-details
          />
        </v-col>
        <v-col :cols="12">
          <v-card flat>
<<<<<<< HEAD
            <v-list-item :title="$t('settings.translation.show_original')">
              <template #append>
                <v-switch
                  v-model="translationStore.show_original"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>
          </v-card>
        </v-col>
      </v-row>
      <v-card-text v-else>
        <v-alert variant="outlined" type="warning" prominent>
          <v-alert-title>
            <i18n-t keypath="settings.translation.unsupported.text" tag="label" for="link" scope="global">
              <a class="text-primary pointer" @click="openURL('https://github.com/naeruru/mimiuchi/releases')">{{ $t('settings.translation.unsupported.link') }}</a>
            </i18n-t>
          </v-alert-title>
        </v-alert>
      </v-card-text>
=======
            <v-switch
              v-model="translationStore.show_original"
              :label="$t('settings.translation.show_original')"
              color="primary"
              hide-details
              inset
              class="mx-3"
            />
          </v-card>
        </v-col>
      </v-row>
>>>>>>> d4cb924 (autostart)
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { useTranslationStore } from '@/stores/translation'
import { useSpeechStore } from '@/stores/speech'
import translation_options from '@/constants/translation_options'

<<<<<<< HEAD
import is_electron from '@/helpers/is_electron'

=======
>>>>>>> d4cb924 (autostart)
export default {
  name: 'SettingsTranslation',
  setup() {
    const translationStore = useTranslationStore()
    const speechStore = useSpeechStore()

    return {
      translationStore,
      stt_language: speechStore.stt.language,
<<<<<<< HEAD
      is_electron,
=======
>>>>>>> d4cb924 (autostart)
    }
  },
  data() {
    return {
      translation_types: [
        {
          title: 'Transformers.js (BETA)',
          value: 'Transformers.js',
          type: 'local',
        },
      ],
      translation_options,
    }
  },
  async mounted() {

  },
  methods: {
<<<<<<< HEAD
    openURL(url: string) {
      window.open(url, '_blank')
=======
    open_external(link: string | null) {
      if (link)
        window.open(link, '_blank')
>>>>>>> d4cb924 (autostart)
    },
  },
}
</script>
