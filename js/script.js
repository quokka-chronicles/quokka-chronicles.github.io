var qk = qk || {};

console.info('%cWelcome to Quokka-Chronicles', `font-size:18px;color:maroon;`)

qk.Version = "0.3.0";

document.addEventListener('DOMContentLoaded', async () => {
    await qk.i18nModule.init();
    console.dir(qk, { depth: null });
});

/**
 * @namespace qk.Preferen
 * 0ces
 * @description
 * Centralized preference manager for the Quokka engine.
 * Handles:
 *  - loading/saving preferences to cookies
 *  - storing engine state (theme, chapter, language)
 *  - storing custom variables from narrative pathways
 *  - dispatching change events
 *  - providing safe accessors and utilities
 */
qk.Preferences = (me => {
    "use strict";

    /** @constant {string} */
    const COOKIE_NAME = "qk";

    /** @constant {number} Days the cookie remains valid */
    const COOKIE_AGE_DAYS = 7;

    /**
     * Internal preference store.
     * @private
     * @type {Object}
     */
    let prefs = {
        theme: "light-theme",
        chapter: "0000-quokka-chronicles",
        lang: "en",
        previousChapter: null,

        /**
         * Custom variables extracted from .md narrative pathways.
         * Stored separately to avoid mixing engine preferences with story state.
         * @type {Object<string, string>|null}
         */
        customVariables: null
    };

    // ---------------------------------------------------------------------
    // Cookie Handling
    // ---------------------------------------------------------------------

    /**
     * Serializes the preference object into a URI‑encoded JSON string.
     * @private
     * @returns {string} Encoded JSON string.
     */
    function _stringifyPrefs() {
        return encodeURIComponent(JSON.stringify(prefs));
    }

    /**
     * Writes the current preferences into a browser cookie.
     * @private
     */
    function _setCookie() {
        const cookieValue =
            `${COOKIE_NAME}=${_stringifyPrefs()}; ` +
            `Max-Age=${3600 * 24 * COOKIE_AGE_DAYS}; path=/; SameSite=Lax`;

        document.cookie = cookieValue;
        console.log(`Cookie set: ${cookieValue}`);
    }

    /**
     * Loads preferences from the cookie and merges them into the internal store.
     * Ensures customVariables is always an object after load.
     * @private
     */
    function _loadCookie() {
        const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
        const encoded = match ? match[1] : null;

        if (!encoded) {
            console.info("No preference cookie found.");
            prefs.customVariables = {}; // initialize empty
            return;
        }

        try {
            const decoded = decodeURIComponent(encoded);
            console.log(`Cookie found: ${decoded}`);

            const cookie = JSON.parse(decoded);

            // Merge cookie values safely
            prefs.theme = cookie.theme ?? prefs.theme;
            prefs.chapter = cookie.chapter ?? prefs.chapter;
            prefs.lang = cookie.lang ?? prefs.lang;
            prefs.previousChapter = cookie.previousChapter ?? prefs.previousChapter;

            // FIX: preserve customVariables from cookie
            prefs.customVariables = cookie.customVariables ?? {};

        } catch (err) {
            console.warn("Failed to parse preference cookie, using defaults.", err);
            prefs.customVariables = {};
        }
    }

    /**
     * Deletes the preference cookie immediately.
     * @private
     */
    function _deleteCookie() {
        document.cookie = `${COOKIE_NAME}=; Max-Age=1; path=/;`;
        console.log("Cookie deleted.");
    }

    // Load cookie immediately on module creation
    _loadCookie();

    // ---------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------

    return {

        /**
         * Retrieves a preference value by key.
         * @param {string} key - Preference key.
         * @returns {*} Stored value.
         */
        get(key) {
            return prefs[key];
        },

        /**
         * Sets a preference value and persists it.
         * Dispatches a `qk:preferencesChanged` event.
         * @param {string} key - Preference key.
         * @param {*} value - New value.
         */
        set(key, value) {
            prefs[key] = value;
            _setCookie();
            window.dispatchEvent(new CustomEvent("qk:preferencesChanged"));
        },

        /**
         * Stores a custom variable (from narrative pathways).
         * Ensures customVariables is always an object.
         * @param {string} key - Variable name.
         * @param {string} value - Variable value.
         */
        setCustom(key, value) {
            if (!prefs.customVariables) prefs.customVariables = {};
            prefs.customVariables[key] = value;

            _setCookie();
            window.dispatchEvent(new CustomEvent("qk:preferencesChanged"));
        },

        /**
         * Retrieves a specific custom variable safely.
         * @param {string} key - Variable name.
         * @returns {string|null} Stored value or null if not found.
         */
        getCustom(key) {
            if (!prefs.customVariables) return null;
            return prefs.customVariables[key] ?? null;
        },

        clearCustom() {
            prefs.customVariables = {};
            _setCookie();
            window.dispatchEvent(new CustomEvent("qk:preferencesChanged"));
        },

        /**
         * Reloads preferences from the cookie.
         * Useful for debugging or forced sync.
         */
        load() {
            _loadCookie();
        },

        /**
         * Deletes the preference cookie.
         */
        delete() {
            _deleteCookie();
        },

        /**
         * Returns a shallow copy of the entire preference store.
         * @returns {Object} Copy of preferences.
         */
        dump() {
            return { ...prefs };
        }
    };

})(window.qk || {});


qk.Modal = (me => {
    const CLASSNAME_ACTIVE = 'is-active';

    const Panels = {};
    const openedPanels = [];    
    
    document.querySelectorAll('.modal-panel').forEach(panel => {
        Panels[panel.id] = panel;        
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-content';
        
        // Preserve existing HTML elements instead of converting to textContent
        while (panel.firstChild) {
            wrapper.appendChild(panel.firstChild);
        }
        
        panel.innerHTML = '';
        panel.appendChild(wrapper);
        panel.insertBefore(_createButtonClose(), panel.firstChild);
    });

    function _createButtonClose() {
        const buttonClose = document.createElement('button');
        buttonClose.addEventListener('click', _closeAll);
        buttonClose.innerHTML = '&times;';
        buttonClose.className = 'close';
        return buttonClose;
    }

    const query = '[data-show-panel-id]:not([data-show-panel-id=""])';
    document.querySelectorAll(query).forEach(button => {
        button.addEventListener('click', _open);
    })

    function _open(e) {
        e.stopPropagation(); // ⬅️ prevents bubbling to document

        _closeAll();
        const panel = Panels[e.target.dataset.showPanelId];
        panel.classList.add(CLASSNAME_ACTIVE);
        openedPanels.push(panel);
    }

    function _closeAll() {        
        openedPanels.forEach(panel => {
            panel.classList.remove(CLASSNAME_ACTIVE);
        });
        openedPanels.length = 0;
    }

    // Close modal on ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            _closeAll();
        }
    });

    // Close modal when clicking outside the panel
    document.addEventListener('click', e => {
        const anyOpen = openedPanels.length > 0;
        console.log("DOKUMENT-CLICK | openedPanels", openedPanels)
        if (!anyOpen) return;

        // If click is NOT inside any opened panel → close
        const clickedInside = openedPanels.some(panel => panel.contains(e.target));
        console.log("DOKUMENT-CLICK | clickedInside", openedPanels)
        if (!clickedInside) {
            _closeAll();
        }
    });

    return {
        panels: () => Panels,
        opened: () => openedPanels,
        closeAll: _closeAll
    }

})(qk);

qk.PreferencesModal = (me => {
    const list = document.getElementById('preferences-list');

    function _render() {
        const prefs = me.Preferences.dump(); // we will add this method below

        list.innerHTML = Object.entries(prefs)
            .map(([key, value]) => `<p><strong>${toDisplayName(key)}</strong>: ${value}</p>`)
            .join('');
    }

    function toDisplayName(key) {
        return key
            .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
            .replace(/^./, m => m.toUpperCase());
    }

    // Re-render whenever preferences change
    window.addEventListener('qk:preferencesChanged', _render);

    return {
        render: _render
    };
})(qk);

qk.Theme = (me => {
    "use strict";

    // ==========================================
    // SETTINGS
    // ==========================================
    const SETTINGS = {
        storageKey: 'theme'
    };

    const body = document.body;
    const themeButton = document.getElementById('btn-theme');
    let currentTheme;

    // ==========================================
    // HELPERS (Private)
    // ==========================================

    function _isDarkTheme() {
        return body.classList.contains(Theme.dark);
    } 

    function _applyThemeImages() {
        const query = 'img[data-light-src][data-dark-src]';
        document.querySelectorAll(query).forEach(img => {
            img.src = currentTheme === Theme.dark ? img.dataset.darkSrc : img.dataset.lightSrc;
        });
    }
     
    function _toggleButtonText() {
        if (!themeButton) return;
        const isDark = _isDarkTheme();
        
        // Fetch translated words dynamically, falling back to custom HTML attributes
        const darkWord = me.i18nModule?.get('theme_dark_word') || themeButton.dataset.darkWord || 'Nocturne';
        const lightWord = me.i18nModule?.get('theme_light_word') || themeButton.dataset.lightWord || 'Illumine';
        
        const ariaDark = me.i18nModule?.get('aria_theme_dark') || themeButton.getAttribute('data-fallback-aria-dark') || 'Switch to light theme';
        const ariaLight = me.i18nModule?.get('aria_theme_light') || themeButton.getAttribute('data-fallback-aria-light') || 'Switch to dark theme';

        themeButton.textContent = isDark ? darkWord : lightWord;
        themeButton.setAttribute('aria-label', isDark ? ariaDark : ariaLight);
    }

    function _applyTheme(theme) {
        body.className = '';
        body.classList.add(theme);
        currentTheme = theme;
        _applyThemeImages();
        _toggleButtonText();
    }

    // ==========================================
    // THEME OBJECT & INITIALIZATION
    // ==========================================
    const Theme = {
        dark: 'dark-theme',
        light: 'light-theme',
        verified(theme) {
            return theme === this.dark || theme === this.light;
        },
        set(theme) {
            if (!this.verified(theme)) return;
            _applyTheme(theme);
            me.Preferences?.set(SETTINGS.storageKey, theme);
        },
    };

    let preferredTheme = me.Preferences?.get(SETTINGS.storageKey);
    if (!Theme.verified(preferredTheme)) {
        preferredTheme = Theme.light;
    }
    
    _applyTheme(preferredTheme);

    if (themeButton) {
        themeButton.addEventListener('click', () => {
            Theme.set(_isDarkTheme() ? Theme.light : Theme.dark);
        });
    }

    // Listen to global language changes to re-render theme button text in new language
    window.addEventListener('qk:languageChanged', () => {
        _toggleButtonText();
    });

    return {
        get current() {
            return currentTheme;
        },
        set(theme) {
            Theme.set(theme);
        },
        refreshText() {
            _toggleButtonText();
        }
    };
})(qk);

qk.Chapter = (me => {
    "use strict";

    const DIVIDER_MAXLENGTH = 10;
    const ContentType = {
        path: 'path',
        title: 'title',
        divider: 'divider',
        emphasize: 'em',
        pathway: 'pathway',
        paragraph: 'p'
    }
    const panel = document.getElementById('reading-panel');
    const narr = document.querySelector('#narratives-panel .modal-content');

    let currentChapterData = null;

    /**
     * Fetches the XML content from the specified filename.
     * @param {string} filename - The name of the chapter file.
     * @returns {Promise<string>} - A promise that resolves with the XML text.
     * @throws {Error} - If the network request fails or the file is not found.
     */
    async function _fetch(filename) {
        const lang = me.Preferences.get('lang') || 'en';
        const folder = lang === 'sk' ? 'chapters_SK' : 'chapters';
        const chapterPath = `./${folder}/${filename}`;
        const response = await fetch(chapterPath);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Chapter file not found: ${filename} in (${folder})`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    }

    function _getLines(string) {
        return string
        .split('\n')                      // Split the string into lines
        .map(line => line.trim())        // Trim whitespace from each line
        .filter(line => line.length > 0) // Keep only non-empty lines
    }

    /**
     * Parses an array of raw text lines representing a chapter's content,
     * categorizing each line based on specific markdown-like rules and
     * extracting structured data into a chapter object.
     *
     * The function identifies:
     * - **Pathlog:** The very first line starting with '@'.
     * - **Titles:** Lines starting with '#'.
     * - **Dividers:** Lines consisting of repeating single characters (ignoring whitespace).
     * - **Emphasized Text (Blockquotes):** Lines starting with '>'.
     * - **Pathways:** Lines matching a specific `[text](target)` pattern.
     * - **Endnotes:** Inline `[symbol](content)` patterns within paragraphs (processed by `_parseEndnotes`).
     * - **Paragraphs:** Any other lines are treated as regular paragraphs.
     *
     * @param {Array<string>} [lines=[]] - An array of strings, where each string represents a line
     * from the raw chapter text file.
     * @returns {object} A structured chapter object
     */
    function _parseChapter(lines = []) {
        const chapter = {
            pathlog: '',
            path: [],
            content: [],
            pathways: [],
            endnotes:[],
            vars: {}
        }

        lines.forEach((line, index) => {
            
            let trimmed = line.trim();

            // Rule 1: First item, starts with "@"
            if (index === 0 && trimmed.startsWith("@")) {
                chapter.pathlog = trimmed.slice(1).trim();
                chapter.path = _parsePathlog(chapter.pathlog);
                return;
            }

            // Rule 2: Starts with "#"
            if (trimmed.startsWith("#")) {
                chapter.content.push({ 
                    type: ContentType.title, 
                    content: trimmed.slice(1).trim() 
                });
                return;
            }

            // Rule 4: Starts with ">"
            if (trimmed.startsWith(">")) {
                chapter.content.push({ 
                    type: ContentType.emphasize, 
                    content: trimmed.slice(1).trim() 
                });
                return;
            }

            // Rule 3: Repeating single char (ignoring whitespace)
            const collapsed = trimmed.replace(/\s+/g, '');
            if (collapsed.length >= 3 && /^([^\s])\1*$/.test(collapsed)) {
                chapter.content.push({ 
                    type: ContentType.divider, 
                    content: collapsed[0], 
                    length: Math.min(collapsed.length, DIVIDER_MAXLENGTH)
                });
                return;
            }

            // Rule 5: Custom pathway pattern
            const pathwayRegex = /^\[([^\]]+)\]\s*\(\s*(.+)\)$/;
            const match = trimmed.match(pathwayRegex);
            if (match) {
                let target = match[2].trim(); 
                
                // <--- 3. Resolve __PREVIOUS__ dynamically
                if (target === "__PREVIOUS__") {
                    target = me.Preferences.get('previousChapter') || "0000-quokka-chronicles";
                }

                const vars = {};
                if (target.includes("?") && target.includes("=")) {
                    const parsedVar = target.match(/^(?<target>[^?]+)\?(?<variableName>[^=]+)=(?<value>[^$]+)$/);
                    if (parsedVar) {
                        const g = parsedVar.groups;
                        target = g.target;
                        vars[g.variableName] = g.value;
                    }
                }
                chapter.pathways.push({
                    type: ContentType.pathway,
                    content: match[1].trim(),
                    target: target, 
                    variables: vars
                });
                return;
            }

            trimmed = _parseEndnotes(trimmed, chapter.endnotes);
            chapter.content.push({
                type: ContentType.paragraph,
                content: trimmed
            })
        });
        return chapter;
    }

    /**
     * Parses a given line of text to identify and extract endnote references,
     * transforming them into a standardized format within the line and accumulating
     * the full endnote details into a provided array.
     *
     * It looks for patterns like `[symbol](endnote content)` (e.g., `[1](This is the first endnote.)`).
     *
     * @param {string} line - The input string (e.g., a paragraph's text content) to be parsed for endnotes.
     * @param {Array<object>} [endnotes=[]] - An optional array to which extracted endnote objects will be pushed.
     * Each pushed object will have the structure:
     * `{ type: 'ContentType.endnote', symbol: string, content: string }`.
     * If not provided, a new empty array will be used and modified.
     * @returns {string} The modified line string, where `[symbol](endnote content)` patterns
     * are replaced with `[=symbol=]` for subsequent HTMLization.
     */
    function _parseEndnotes(line, endnotes = []) {
        return line.replace(/\[(.)\]\(([^\)]+)\)/g, (_, g1, g2) => {
            endnotes.push({
                type: 'ContentType.endnote',
                symbol: g1,
                content: g2
            });
            return `[=${g1}=]`;
        });
    }

/**
     * Replaces any {{qk.variableName}} placeholders in a string
     * with values from custom variables, falling back to an empty string.
     * Used for both narrative text paragraphs and pathlogs.
     */
    function _interpolateText(text) {
        if (typeof text !== 'string') return '';
        
        return text.replace(/\{\{qk\.([^\}]+)\}\}/g, (match, varName) => {
            const value = me.Preferences.getCustom(varName);
            // Handle null, undefined, or empty values gracefully
            return (value !== null && value !== undefined) ? value : '';
        });
    }

    function _parsePathlog(pathlogString) {
        if (typeof pathlogString !== 'string' || pathlogString.trim() === '') {
            return [];
        }
        const chapterRegex = /^\[([^\]]+)\]\(([^)]+)\)$/;
        
        const interpolated = _interpolateText(pathlogString);
        const items = interpolated.split('>');
        
        const chapterNames = [];
        items.forEach(item => {
            const trimmedItem = item.trim();
            const match = trimmedItem.match(chapterRegex);
            if (match) {
                chapterNames.push(match[2].trim());
            }
        });
        return chapterNames;
    }

    /**
     * Parses a string representing a chapter's pathlog and generates the corresponding HTML.
     * The string is split by the ">" character. Each item is then parsed to determine
     * if it is a chapter title or a selection.
     *
     * @param {string} pathlogString The string containing the pathlog,
     * e.g., "[Chapter One](intro)>[Chapter Two](part_2)>[Continue...]"
     * @returns {string} The generated HTML string with `<a>` tags for chapters and
     * `<div>` tags for selections, separated by dividers.
     */
    function _parsePathlogToHTML(pathlogString) {
        if (typeof pathlogString !== 'string' || pathlogString.trim() === '') {
            return '';
        }

        const chapterRegex = /^\[([^\]]+)\]\(([^)]+)\)$/;
        const selectionRegex = /^\[([^\]]+)\]$/;
        
        const interpolated = _interpolateText(pathlogString);
        const items = interpolated.split('>');
        
        const htmlSnippets = items.map(item => {
            const trimmedItem = item.trim();
            
            const chapterMatch = trimmedItem.match(chapterRegex);
            if (chapterMatch) {
                const title = chapterMatch[1].trim();
                const filename = chapterMatch[2].trim();
                return `<button class="chapter-title" data-target="${filename}" target="_self">${title}</button>`;
            }
            
            const selectionMatch = trimmedItem.match(selectionRegex);
            if (selectionMatch) {
                const selectionText = selectionMatch[1].trim();
                // If the variable wasn't set yet, the selection tag becomes empty and gets filtered out
                if (!selectionText) return '';
                return `<div class="selection">${selectionText}</div>`;
            }
            
            return '';
        });
        
        return htmlSnippets.filter(snippet => snippet !== '').join('<div class="chapter-divider"></div>');
    }

    /**
     * Converts a structured chapter data object into a complete HTML string for display.
     * This function dynamically generates HTML for content paragraphs (including endnote references),
     * navigation pathways, and a styled endnotes section with custom markers.
     *
     * @param {object} chapter - The chapter data object to be converted to HTML.
     * @param {string} chapter.pathlog - A string representing the chapter's path or log (not directly used in HTML generation here).
     * @param {Array<object>} chapter.content - An array of content blocks for the main body of the chapter.
     * @param {Array<object>} chapter.pathways - An array of pathway objects, representing navigation options to other chapters.
     * @param {Array<object>} chapter.endnotes - An array of endnote objects, providing detailed explanations.
     * @returns {string} A complete HTML string representing the chapter, wrapped in an `<article class="chapter">` tag.
     */
    function _htmlize(chapter) {
        let html = "";

        _mergeContentByType(chapter.content).forEach(p => {
            switch(p.type) {
                case ContentType.title: 
                    html += `<h1>${_interpolateText(p.content)}</h2>`; 
                    break;
                case ContentType.emphasize: 
                    html += `<p><em>${_interpolateText(p.content)}</em></p>`; 
                    break;
                case ContentType.divider: 
                    html += `<p class="divider">${p.content.repeat(p.length)}</p>`; 
                    break;
                default:
                    let x = _interpolateText(p.content)
                        .replace(/\[=(.)=\]/g, '<sup class="endnote">$1</sup>');
                    html += `<p>${x}</p>`;
            }
        });
        
        if (chapter.pathways.length) {
            html += '<nav>';
            chapter.pathways.forEach(pathway => {
                console.log(pathway)
                const keys = Object.keys(pathway.variables);
                let vars = keys.length ? `data-variable="${keys[0]}" data-value="${pathway.variables[keys[0]]}"` : "";
                html += `<div><button data-target="${pathway.target}"${vars}>${pathway.content}</button></div>`;
            });
            html += '</nav>';
        }
        if (chapter.endnotes.length) {
            const ID = `chapter-endonte-markers`;
            html += '<ul class="endnotes">';
            let css = '', counter = 0;
            chapter.endnotes.forEach(endnote => {
                const marker = btoa(`endnote-marker-${String(++counter).padStart(4, '0')}`).replace(/=/g, '').toLowerCase();
                html += `<li class="${marker}" data-symbol="${endnote.symbol}">${endnote.content}</li>`;
                css += `.endnotes li.${marker}::marker { content: '${endnote.symbol} '; }\n`
            });
            html += '<ul>';
            const style = document.getElementById(ID) || document.createElement('style');
            style.id = ID;
            style.innerHTML = css;
            document.head.appendChild(style);
        }
        return `<article class="chapter"><div>&nbsp;</div>${html}</article>`;        
    }
    /**
     * Merges the content of consecutive items of a specific type in an array of objects.
     * This version aims for conciseness using Array.prototype.reduce().
     *
     * @param {Array<Object>} inputArray - The input array of objects.
     * @param {string} [aimingType="em"] - The type of item whose content should be merged. Defaults to "em".
     * @param {string} [separator=""] - The string to use as a separator when merging content. Defaults to an empty string.
     * @returns {Array<Object>} A new array with the content of consecutive items of the aimingType merged.
     */
    function _mergeContentByType(inputArray, aimingType = "em", separator = "<br>") {
        return inputArray.reduce((acc, currentItem) => {
            const lastItem = acc[acc.length - 1];
            if (lastItem && lastItem.type === aimingType && currentItem.type === aimingType) {
                lastItem.content += separator + currentItem.content;
            } 
            else {
                acc.push({ ...currentItem });
            }
            return acc;
        }, []);
    }
    function _addEndnoteListeners() {
        panel.querySelectorAll('sup.endnote').forEach(mark => {
            mark.addEventListener('click', (e) => {
                e.preventDefault();
                const endnoteArea = panel.querySelector('ul.endnotes');
                if(endnoteArea) {
                    endnoteArea.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                } else {
                    console.warn(`Endnote target element not found`);
                }
            });
            let showTimeout;
            mark.addEventListener('mouseover', (e) => {
                showTimeout = setTimeout(() => {
                    const rect = e.target.getBoundingClientRect();
                    const li = document.querySelector(`ul.endnotes li[data-symbol="${mark.textContent}"]`);
                    console.log(e.target.getBoundingClientRect())
                    me.Tooltip.show(li.textContent, rect.top, rect.left);
                }, 500); 
            });
            mark.addEventListener('mouseout', (e) => {
                clearTimeout(showTimeout);
                me.Tooltip.hide();
            });
        });
    }

    function _addPathwaysListeners() {
        panel.querySelectorAll('nav button[data-target]').forEach(path => {
            path.addEventListener('click', e => {
                e.preventDefault();
                const filename = e.target.dataset.target || null;
                const variable = e.target.dataset.variable || null;
                const value = e.target.dataset.value || null;

                // Save ANY variable
                if (variable && value) {
                    me.Preferences.setCustom(variable, value);
                    me.CustomVariables.updateButton();
                }

                if (filename) {
                    _load(filename);
                }
            });
        });
    }

    function _addPathlogListeners() {
        narr.querySelectorAll('button[data-target]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                me.Modal.closeAll();
                const filename = e.target.dataset.target || null;
                if (filename) {
                    _load(filename);
                }
            });
        });
    }

    async function _load(filename) {
        filename = filename || me.Preferences.get('chapter');

        const currentChapter = me.Preferences.get('chapter');
        // Only update previousChapter if we aren't coming back from the TBC page
        if (currentChapter && currentChapter !== filename && currentChapter !== '9999-tbc') {
            me.Preferences.set('previousChapter', currentChapter);
        }

        try {
            const f = await _fetch(`${filename}.md`);
            const lines = _getLines(f);
            const ch = _parseChapter(lines);
            currentChapterData = _parseChapter(lines);
            console.log(ch);

            // If the chapter has no path history, it's the root/first chapter
            if (!ch.pathlog || ch.path.length < 2) {
                me.Preferences.clearCustom();
            }

            const html = _htmlize(ch);            
            panel.innerHTML = html;
            narr.innerHTML = _parsePathlogToHTML(ch.pathlog);
            _addPathlogListeners();
            ch.endnotes.length && _addEndnoteListeners();
            ch.pathways.length && _addPathwaysListeners();
            panel.firstChild.scrollIntoView({
                        behavior: 'smooth', // Smooth scroll
                        block: 'start' // Align the top of the target element with the top of the scroll area
                    });
            me.Preferences.set('chapter', filename);
            return true;
        }
        catch(e)
        {
            panel.innerHTML = '<article class="chapter">Oops! There was an issue loading this chapter.</article>';
            console.log(e);
            return false;
        }
    }

    return {
        load: _load,
        path: () => currentChapterData ? currentChapterData.path : []
    }

})(qk);

qk.CustomVariables = (me => {
    "use strict";

    const btn = document.getElementById('btn-custom-variables') 
        || document.createElement('button');

    btn.textContent = "Character";   // or "Variables", or "Profile"
    btn.hidden = true;

    function _updateButton() {
        const vars = me.Preferences.get('customVariables');
        const hasVars = vars && Object.keys(vars).length > 0;

        btn.hidden = !hasVars;
    }

    function _toDisplayName(key) {
        return key
            .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
            .replace(/^./, m => m.toUpperCase());
    }

    function _renderModal() {
        const list = document.getElementById('preferences-list');
        const vars = me.Preferences.get('customVariables') || {};

        list.innerHTML = Object.entries(vars)
            .map(([key, value]) => {
                const friendly = _toDisplayName(key);
                return `<p><strong>${friendly} :</strong><span>${value}</span></p>`;
            })
            .join('');
    }

    // React to changes
    window.addEventListener('qk:preferencesChanged', () => {
        _updateButton();
        _renderModal();
    });

    return {
        updateButton: _updateButton,
        renderModal: _renderModal,
        toDisplayName: _toDisplayName
    };

})(qk);

qk.Language = (me => {
    "use strict";

    // ==========================================
    // SETTINGS
    // ==========================================
    const SETTINGS = {
        defaultLang: 'en',
        storageKey: 'lang'
    };

    const panel = document.getElementById('lingua-panel');
    if (!panel) return {};

    const buttons = panel.querySelectorAll('button[data-lang]');

    // ==========================================
    // HELPERS (Private)
    // ==========================================

    /**
     * Updates the visual active class on language selection buttons.
     * @param {string} currentLang - The active language code.
     */
    function _updateActiveState(currentLang) {
        buttons.forEach(btn => {
            if (btn.dataset.lang === currentLang) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });
    }

    // ==========================================
    // INITIALIZATION & EVENT LISTENERS
    // ==========================================

    // Initialize active state on page load
    const initialLang = me.Preferences.get(SETTINGS.storageKey) || SETTINGS.defaultLang;
    _updateActiveState(initialLang);

    buttons.forEach(btn => {
        btn.addEventListener('click', async e => {
            e.preventDefault();
            const selectedLang = e.target.dataset.lang;
            const currentLang = me.Preferences.get(SETTINGS.storageKey);
            
            if (selectedLang && selectedLang !== currentLang) {
                // Save preference
                me.Preferences.set(SETTINGS.storageKey, selectedLang);                
                
                // Update button visual states
                _updateActiveState(selectedLang);
                
                // Close the modal panel
                me.Modal.closeAll();
                
                // 1. Update the UI strings translation file
                if (me.i18nModule && typeof me.i18nModule.setLanguage === 'function') {
                    await me.i18nModule.setLanguage(selectedLang);
                }
                
                // 2. Reload the current chapter using the new language folder
                if (me.Chapter && typeof me.Chapter.load === 'function') {
                    me.Chapter.load(me.Preferences.get('chapter'));
                }
            }
        });
    });

    return {};
})(qk);

qk.Tooltip = (me => {
    "use strict";

    const tooltipBox = document.createElement("div");
    tooltipBox.className = "tooltip hidden";
    tooltipBox.id = "tooltip";    
    document.body.appendChild(tooltipBox);

    function _show(content, rectTop, rectLeft) {
        tooltipBox.innerText = content;

        // Temporarily position off-screen to measure size
        tooltipBox.style.top = "0px";
        tooltipBox.style.left = "0px";

        const tooltipRect = tooltipBox.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        const padding = 10;
        let top = rectTop + padding;
        let left = rectLeft + padding;

        // Check if it overflows the right edge
        if (left + tooltipWidth > window.innerWidth) {
            left = rectLeft - tooltipWidth - padding;
        }

        // Check if it overflows the bottom edge
        if (top + tooltipHeight > window.innerHeight) {
            top = rectTop - tooltipHeight - padding;
        }

        // Apply final position
        tooltipBox.style.top = `${top}px`;
        tooltipBox.style.left = `${left}px`;
        
        tooltipBox.classList.remove("hidden");
        tooltipBox.classList.add('visible');
    }


    function _hide() {
        tooltipBox.classList.remove('visible');
        tooltipBox.classList.add("hidden");
    }

    // Enable tooltip for any element with data-tooltip attribute
    document.addEventListener('mouseover', e => {
        const el = e.target.closest('[data-tooltip]');
        if (!el) return;

        const text = el.getAttribute('data-tooltip');
        if (!text) return;

        const rect = el.getBoundingClientRect();
        qk.Tooltip.show(text, rect.top, rect.left);
    });

    document.addEventListener('mouseout', e => {
        const el = e.target.closest('[data-tooltip]');
        if (!el) return;

        qk.Tooltip.hide();
    });

    return {
        show: _show,
        hide: _hide
    }
})(qk);

qk.Chapter.load(qk.Preferences.get('chapter'));
