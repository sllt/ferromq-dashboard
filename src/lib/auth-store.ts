import { create } from 'zustand'
import { parseSessionUser, type SessionUser } from '@/lib/session-user'

const TOKEN_KEY = 'ferromq_http_bearer_token'
const USER_KEY = 'ferromq_session_user'
const LEGACY_CONNECTED_KEY = 'ferromq_connected'

let memoryToken: string | null = null
let memoryUser: SessionUser | null = null

function readStoredToken(): string | null {
  if (typeof sessionStorage === 'undefined') return memoryToken
  return sessionStorage.getItem(TOKEN_KEY) ?? memoryToken
}

function readStoredUser(): SessionUser | null {
  if (typeof sessionStorage === 'undefined') return memoryUser
  try {
    return parseSessionUser(JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null'))
  } catch {
    return memoryUser
  }
}

function persistToken(token: string | null) {
  memoryToken = token
  if (typeof sessionStorage === 'undefined') return
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

function persistUser(user: SessionUser | null) {
  memoryUser = user
  if (typeof sessionStorage === 'undefined') return
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  else sessionStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(LEGACY_CONNECTED_KEY)
}

const initialToken = readStoredToken()
const initialUser = readStoredUser()
memoryToken = initialToken
memoryUser = initialUser

type AuthState = {
  token: string | null
  user: SessionUser | null
  hydrated: boolean
  applySession: (user: SessionUser, token?: string | null) => void
  setBearerToken: (token: string | null) => void
  clearLocal: () => void
  markHydrated: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser,
  hydrated: false,
  applySession: (user, token) => {
    persistUser(user)
    if (token !== undefined) persistToken(token)
    set({
      user,
      token: token === undefined ? useAuthStore.getState().token : token,
      hydrated: true,
    })
  },
  setBearerToken: (token) => {
    persistToken(token)
    set({ token })
  },
  clearLocal: () => {
    persistToken(null)
    persistUser(null)
    set({ token: null, user: null, hydrated: true })
  },
  markHydrated: () => set({ hydrated: true }),
}))

export function getAuthToken(): string | null {
  return useAuthStore.getState().token ?? memoryToken
}

export function getAuthUser(): SessionUser | null {
  return useAuthStore.getState().user ?? memoryUser
}

export function clearAuthSession() {
  useAuthStore.getState().clearLocal()
}

export function useCanWrite(): boolean {
  const user = useAuthStore((s) => s.user)
  return user != null && user.role !== 'viewer'
}
