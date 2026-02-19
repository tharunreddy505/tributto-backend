import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locals/en/translation.json';
import translationDE from './locals/de/translation.json';
import translationIT from './locals/it/translation.json';

const resources = {
    en: {
        translation: translationEN,
    },
    de: {
        translation: translationDE,
    },
    it: {
        translation: translationIT,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Default language to English
        fallbackLng: 'en', // Fallback to English if translation is missing

        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;
