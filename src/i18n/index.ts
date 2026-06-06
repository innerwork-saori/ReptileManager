import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhTW from './zh-TW'
import en from './en'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      zh: { translation: zhTW },
      en: { translation: en },
    },
    fallbackLng: 'zh-TW',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'reptileManager_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
