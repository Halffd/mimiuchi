
<template>
  <v-dialog v-model="visible" max-width="800px" scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Session History</span>
        <v-btn icon @click="visible = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text style="height: 500px;">
        <v-list v-if="sessions.length > 0">
          <v-list-item v-for="session in sessions" :key="session.id" class="mb-4 border rounded">
            <v-list-item-title class="font-weight-bold mb-1">
              {{ new Date(session.date).toLocaleString() }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-truncate" style="max-width: 600px;">
              {{ session.transcript }}
            </v-list-item-subtitle>
            
            <template v-slot:append>
              <div class="d-flex">
                <v-btn icon size="small" color="primary" @click="openSession(session)" title="Open Session">
                  <v-icon>mdi-open-in-app</v-icon>
                </v-btn>
                <v-btn icon size="small" color="secondary" class="ml-2" @click="copyTranscript(session.transcript)" title="Copy Transcript">
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
                <v-btn icon size="small" color="success" class="ml-2" @click="downloadTranscript(session)" title="Download">
                  <v-icon>mdi-download</v-icon>
                </v-btn>
                <v-btn icon size="small" color="error" class="ml-2" @click="deleteSession(session.id)" title="Delete">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="d-flex flex-column align-center justify-center fill-height opacity-60">
          <v-icon size="64">mdi-history</v-icon>
          <p class="mt-4 text-h6">No history found</p>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn color="error" variant="text" @click="clearHistory" v-if="sessions.length > 0">
          Clear All History
        </v-btn>
        <v-btn color="primary" @click="visible = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { historyBridge } from '@/helpers/history_bridge'
import { useLogStore } from '@/stores/logs'
import { useDefaultStore } from '@/stores/default'

export default {
  name: 'HistoryOverlay',
  data() {
    return {
      visible: false,
      sessions: [] as any[],
    }
  },
  methods: {
    async show() {
      await this.loadSessions()
      this.visible = true
    },
    async loadSessions() {
      this.sessions = await historyBridge.getSessions()
    },
    async deleteSession(id: string) {
      if (confirm('Are you sure you want to delete this session?')) {
        await historyBridge.deleteSession(id)
        await this.loadSessions()
      }
    },
    async clearHistory() {
      if (confirm('Are you sure you want to clear ALL history?')) {
        await historyBridge.clearHistory()
        await this.loadSessions()
      }
    },
    openSession(session: any) {
      const logStore = useLogStore()
      const defaultStore = useDefaultStore()
      
      if (confirm('Load this session into the current view? Current transcripts will be replaced.')) {
        logStore.logs = session.logs
        logStore.sessionId = session.id
        this.visible = false
        defaultStore.show_snackbar('success', 'Session loaded')
      }
    },
    copyTranscript(text: string) {
      navigator.clipboard.writeText(text)
      const defaultStore = useDefaultStore()
      defaultStore.show_snackbar('success', 'Transcript copied to clipboard')
    },
    downloadTranscript(session: any) {
      const text = `Session Date: ${new Date(session.date).toLocaleString()}\n\n${session.transcript}`
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript_${session.id}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>
