import { create } from 'zustand'

const TOKEN_KEY = 'ferromq_http_bearer_token'
const SESSION_KEY = 'ferromq_connected'

let memoryToken: string | null = null
let memoryConnected = false

function readSession(): { token: string | null; connected: boolean } {
  if (typeof sessionStorage === 'undefined') {
    return { token: memoryToken, connected: memoryConnected }
  }
  const connected = sessionStorage.getItem(SESSION_KEY) === '1'
  const token = sessionStorage.getItem(TOKEN_KEY)
  return {
    token: token ?? memoryToken,
    connected: connected || memoryConnected,
  }
}

const initial = readSession()
memoryToken = initial.token
memoryConnected = initial.connected

type AuthState = {
  token: string | null
  connected: boolean
  connect: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  connected: initial.connected,
  connect: (token) => {
    memoryToken = token
    memoryConnected = true
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(SESSION_KEY, '1')
    set({ token, connected: true })
  },
  logout: () => {
    memoryToken = null
    memoryConnected = false
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    set({ token: null, connected: false })
  },
}))

export function getAuthToken(): string | null {
  return useAuthStore.getState().token ?? memoryToken
}

export function clearAuthSession() {
  useAuthStore.getState().logout()
}
