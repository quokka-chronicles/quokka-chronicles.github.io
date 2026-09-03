/**
 * @fileoverview Internationalization (i18n) module for managing UI language state, 
 * fetching localized JSON strings with fallback support, and updating DOM text & attributes.
 * @namespace qk.i18nModule
 */

window.qk = window.qk || {};

window.qk.i18nModule = (() => {
    'use strict';

    // ==========================================
    // SETTINGS
    // ==========================================
    const SETTINGS = {
        defaultLang: 'en',
        supportedLangs: ['en', 'sk'],
        storageKey: 'lang',
        pathPrefix: './sharedStrings/'
    };

    let currentLang = SETTINGS.defaultLang;
    let strings = {};
    let defaultStrings = {};

    // ==========================================
    // HELPERS (Private)
    // ==========================================

    /**
     * Asynchronously fetches a translation dictionary JSON file with fallback.
     * @param {string} lang - The language code.
     * @returns {Promise<Object>} The key-value dictionary.
     */
    async function _fetchStringResource(lang) {
        const fileName = lang === 'en' ? 'strings.json' : `strings_${lang.toUpperCase()}.json`;
        const url = `${SETTINGS.pathPrefix}${fileName}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`[i18n] Could not load resource for '${lang}' (${url}). Falling back to default.`, error);
            if (lang !== SETTINGS.defaultLang) {
                return _fetchStringResource(SETTINGS.defaultLang);
            }
            return {};
        }
    }

    /**
     * Updates DOM elements containing data-i18n (text content) and data-i18n-attr (attributes).
     */
    function _DOMTextUpdater() {
        // 1. Standard text content updates
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = strings[key] || defaultStrings[key];
            if (translation) {
                element.innerHTML = translation;
            }
        });

        // 2. Attribute updates (format: "attributeName:translationKey")
        // Example: data-i18n-attr="aria-label:nav_theme_aria"
        document.querySelectorAll('[data-i18n-attr]').forEach(element => {
            const rule = element.getAttribute('data-i18n-attr');
            const [attrName, key] = rule.split(':');
            if (attrName && key) {
                const translation = strings[key] || defaultStrings[key];
                if (translation) {
                    element.setAttribute(attrName, translation);
                }
            }
        });
    }

    // ==========================================
    // MAIN PUBLIC API
    // ==========================================
    return {
        /**
         * Initializes the localization module, pre-loads default and target strings.
         * @public
         */
        async init() {
            currentLang = window.qk.Preferences?.get(SETTINGS.storageKey) || SETTINGS.defaultLang;
            
            // Always cache default strings as a robust baseline fallback
            if (currentLang !== SETTINGS.defaultLang) {
                defaultStrings = await _fetchStringResource(SETTINGS.defaultLang);
            }
            
            strings = await _fetchStringResource(currentLang);
            if (currentLang === SETTINGS.defaultLang) {
                defaultStrings = strings;
            }
            
            _DOMTextUpdater();
        },

        /**
         * Changes the active language, fetches strings, and updates the UI.
         * @public
         * @param {string} lang - Target language code.
         */
        async setLanguage(lang) {
            if (!SETTINGS.supportedLangs.includes(lang)) return;
            currentLang = lang;
            
            strings = await _fetchStringResource(lang);
            _DOMTextUpdater();
        },

        /**
         * Retrieves a translated string by key.
         * @public
         * @param {string} key - Lookup key.
         * @returns {string} Translated string or the key itself.
         */
        get(key) {
            return strings[key] || defaultStrings[key] || key;
        }
    };
})();