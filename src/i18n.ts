import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enDocs from './locales/en.json';
import esDocs from './locales/es.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enDocs
            },
            es: {
                translation: esDocs
            }
        },
        lng: 'en', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
