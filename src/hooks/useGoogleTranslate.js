import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { decodeHtml } from '../utils/htmlUtils';
import { API_URL } from '../config';

/**
 * Hook to translate dynamic content on the fly.
 * @param {string} text - The text to translate.
 * @param {string} sourceLang - The source language code (default: 'en').
 * @returns {string} - The translated text (or original if failed/loading).
 */
const useGoogleTranslate = (text, sourceLang = 'en') => {
    const { i18n } = useTranslation();
    const [translatedText, setTranslatedText] = useState(decodeHtml(text));

    useEffect(() => {
        // Reset translation when source text changes
        setTranslatedText(decodeHtml(text));
    }, [text]);

    useEffect(() => {
        if (!text) return;

        const targetLang = i18n.language;

        // If target and source are roughly the same (en vs en-US), don't translate
        if (targetLang.startsWith(sourceLang) || sourceLang.startsWith(targetLang)) {
            setTranslatedText(decodeHtml(text));
            return;
        }

        const translateText = async () => {
            try {
                const response = await fetch(`${API_URL}/api/translate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, targetLang }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.translatedText) {
                        // Decode any HTML entities returned by the translation engine
                        setTranslatedText(decodeHtml(data.translatedText));
                    }
                }
            } catch (error) {
                console.error("Translation failed", error);
            }
        };

        const timeoutId = setTimeout(translateText, 500);
        return () => clearTimeout(timeoutId);

    }, [text, i18n.language, sourceLang]);

    return translatedText;
};

export default useGoogleTranslate;
