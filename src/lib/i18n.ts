import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import zhCN from '@/locales/zh-CN.json'

const LANG_KEY = 'ferromq_locale'

export function getStoredLocale(): 'zh-CN' | 'en' {
  if (typeof localStorage === 'undefined') return 'zh-CN'
  const stored = localStorage.getItem(LANG_KEY)
  if (stored === 'en' || stored === 'zh-CN') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function setStoredLocale(locale: 'zh-CN' | 'en') {
  localStorage.setItem(LANG_KEY, locale)
  document.documentElement.lang = locale
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-CN': { translation: zhCN },
  },
  lng: getStoredLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

setStoredLocale(i18n.language === 'en' ? 'en' : 'zh-CN')

export default i18n
