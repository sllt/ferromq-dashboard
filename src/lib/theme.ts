export type Theme = 'light' | 'dark'

const THEME_KEY = 'ferromq_theme'

export function getStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_KEY, theme)
}
