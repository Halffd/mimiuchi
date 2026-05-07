
import is_electron from '@/helpers/is_electron'

export interface HistorySession {
  id: string
  date: string
  transcript: string
  logs: any[]
}

export interface HistoryProvider {
  saveSession(session: HistorySession): Promise<void>
  getSessions(): Promise<HistorySession[]>
  deleteSession(id: string): Promise<void>
  clearHistory(): Promise<void>
}

class BrowserHistoryProvider implements HistoryProvider {
  private readonly KEY = 'mimiuchi_history'

  async saveSession(session: HistorySession): Promise<void> {
    const history = await this.getSessions()
    const index = history.findIndex(s => s.id === session.id)
    if (index !== -1) {
      history[index] = session
    } else {
      history.unshift(session)
    }
    localStorage.setItem(this.KEY, JSON.stringify(history.slice(0, 100))) // Limit to 100 sessions
  }

  async getSessions(): Promise<HistorySession[]> {
    const data = localStorage.getItem(this.KEY)
    return data ? JSON.parse(data) : []
  }

  async deleteSession(id: string): Promise<void> {
    const history = await this.getSessions()
    const filtered = history.filter(s => s.id !== id)
    localStorage.setItem(this.KEY, JSON.stringify(filtered))
  }

  async clearHistory(): Promise<void> {
    localStorage.removeItem(this.KEY)
  }
}

class ElectronHistoryProvider implements HistoryProvider {
  async saveSession(session: HistorySession): Promise<void> {
    return window.ipcRenderer.invoke('history-save', JSON.parse(JSON.stringify(session)))
  }

  async getSessions(): Promise<HistorySession[]> {
    return window.ipcRenderer.invoke('history-get-all')
  }

  async deleteSession(id: string): Promise<void> {
    return window.ipcRenderer.invoke('history-delete', id)
  }

  async clearHistory(): Promise<void> {
    return window.ipcRenderer.invoke('history-clear')
  }
}

class HistoryBridge {
  private provider: HistoryProvider

  constructor() {
    this.provider = is_electron() ? new ElectronHistoryProvider() : new BrowserHistoryProvider()
  }

  saveSession(session: HistorySession) {
    return this.provider.saveSession(session)
  }

  getSessions() {
    return this.provider.getSessions()
  }

  deleteSession(id: string) {
    return this.provider.deleteSession(id)
  }

  clearHistory() {
    return this.provider.clearHistory()
  }
}

export const historyBridge = new HistoryBridge()
