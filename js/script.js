var qk = qk || {};


console.info('%cWelcome to Quokka-Chronicles', `font-size:18px;color:maroon;`)
console.log(qk);

qk.Version = "0.2.0";

qk.Preferences = (me => {
    const prefs = {        
        theme: "light-theme",
        chapter: "0000-quokka-chronicles",
        characterName: null,
    };

    const COOKIE_NAME = 'qk';
    const COOKIE_AGE_DAYS = 7;

    function _setCookie() {
        let c = `${COOKIE_NAME}=${_stringifyPrefs()}; Max-Age=${3600 * 24 * COOKIE_AGE_DAYS}; path=/; SameSite=Lax`;
        document.cookie = c;
        console.log(`Cookie set: ${c}`);
    }

    function _stringifyPrefs() {
        return encodeURIComponent(JSON.stringify(prefs));
    }

    function _getCookie() {
        let match = document.cookie.match(/qk=(?<cookie>[^;$]*)/);
        let json = (match && match.groups && match.groups.cookie !== undefined) ? match.groups.cookie : null;
        if (json)            
        {
            json = decodeURIComponent(json);
            console.log(`Cookie found: ${json}`);
            let cookie = {};
            try {
                cookie = JSON.parse(json);
            } catch (e) {
                console.info('No cookie', document.cookie);
            }
            prefs.theme = cookie?.theme || prefs.theme;
            prefs.chapter = cookie?.chapter || prefs.chapter;
            prefs.characterName = cookie?.characterName || prefs.characterName;
        }
    }

    function _deleteCookie() {
        document.cookie(`${COOKIE_NAME}=; Max-Age=1;`);
        console.log("COOKIE Deleted:", document.cookie)
    }

    _getCookie();

    return {
        get: (key) => {
            return prefs[key];
        },
        set: (key, value) => {
            prefs[key] = value;
            _setCookie();
        },
        load: _getCookie,
        delete: _deleteCookie
    }
})(qk);

qk.Modal = (me => {
    const CLASSNAME_ACTIVE = 'is-active';

    const Panels = {};
    const openedPanels = [];    
    
    document.querySelectorAll('.modal-panel').forEach(panel => {
        Panels[panel.id] = panel;        
        const wrapper = document.createElement('div');
        wrapper.textContent = panel.textContent;
        wrapper.className = 'modal-content'      
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

    /**
     * Opens triggered panel
     * @param {Event} e 
     */
    function _open(e) {
        _closeAll();
        const panel = Panels[e.target.dataset.showPanelId];
        panel.classList.add(CLASSNAME_ACTIVE);
        openedPanels.push(panel);
    }

    /**
     * Closes all opened modal panes and clears the list of opened panes
     */
    function _closeAll() {        
        openedPanels.forEach(panel => {
            panel.classList.remove(CLASSNAME_ACTIVE);
        });
        openedPanels.length = 0;
    }

    return {
        panels: () => Panels,
        opened: () => openedPanels,
        closeAll: _closeAll()
    }

})(qk);

qk.Theme = (me => {
    // --- Private Variables ---
    const body = document.body;
    const ARIAL_LABEL_DARK = 'Switch to light theme';
    const ARIAL_LABEL_LIGHT = 'Switch to dark theme';
    const themeButton = document.getElementById('btn-theme');
    let currentTheme;
    
    function _isDarkTheme() {
        return body.classList.contains(Theme.dark);
    } 
        
    const Theme = {
        dark: 'dark-theme',
        light: 'light-theme',
        verified(theme) {
            return theme === this.dark || theme === this.light;
        },
        set(theme) {
            if (!this.verified(theme)) return;
            _applyTheme(theme)
            me.Preferences?.set('theme', theme);
            console.log(`Theme set to: ${theme}`, document.cookie);
        },
    }

    function _applyTheme(theme)
    {
        body.className = '';
        body.classList.add(theme);
        themeButton.setAttribute('aria-label', this.dark === theme ? ARIAL_LABEL_DARK : ARIAL_LABEL_LIGHT);
        currentTheme = theme;
        _applyThemeImages();
        _toggleButtonText();
    }

    let preferredTheme = me.Preferences?.get('theme');
    Theme.verified(preferredTheme) && _applyTheme(preferredTheme);

    function _applyThemeImages() {
        const query = 'img[data-light-src][data-dark-src]';
        document.querySelectorAll(query).forEach(img => {
            img.src = currentTheme ? img.dataset.darkSrc : img.dataset.lightSrc;
        });
    }

    function _toggleButtonText() {
        const d = themeButton.dataset;
        themeButton.textContent = !_isDarkTheme() ? d.darkWord : d.lightWord;
    }

    function _toggleTheme() {
        Theme.set(_isDarkTheme() ? Theme.light : Theme.dark);
    }

    currentTheme = _isDarkTheme() ? Theme.dark : Theme.light;
    _applyThemeImages();
    themeButton.addEventListener('click', _toggleTheme);

    return {
        get current() {
            return currentTheme;
        },
        set: (theme) => {
                Theme.set(theme);
        },
    }
})(qk);

qk.Chapter = (me => {
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

    /**
     * Fetches the XML content from the specified filename.
     * @param {string} filename - The name of the chapter file.
     * @returns {Promise<string>} - A promise that resolves with the XML text.
     * @throws {Error} - If the network request fails or the file is not found.
     */
    async function _fetch(filename) {
        const chapterPath = `./chapters/${filename}`;
        const response = await fetch(chapterPath);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Chapter file not found: ${filename}`);
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
                case ContentType.title: html += `<h1>${p.content}</h2>`; break;
                case ContentType.emphasize: html += `<p><em>${p.content}</em></p>`; break;
                case ContentType.divider: html += `<p class="divider">${p.content.repeat(p.length)}</p>`; break
                default:
                    let x = p.content
                        .replace(/\[=(.)=\]/g, '<sup class="endnote">$1</sup>')
                        .replace(/\{\{qk\.characterName\}\}/g, me.Preferences.get('characterName'));
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
                html += `<li class="${marker}">${endnote.content}</li>`;
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
        });
    }

    function _addPathwaysListeners() {
        panel.querySelectorAll('nav button[data-target]').forEach(path => {
            path.addEventListener('click', e => {
                e.preventDefault();
                const filename = e.target.dataset.target || null;
                const variable = e.target.dataset.variable || null;
                const value = e.target.dataset.value || null;
                if (variable && value) {
                    if (variable === "characterName") {
                        me.Preferences.set('characterName', value);
                        me.Character.start(value);
                    }
                }
                if (filename) {
                    _load(filename);
                }
            });
        });
    }

    async function _load(filename) {
        filename = filename || me.Preferences.get('chapter');
        try {
            const f = await _fetch(`${filename}.md`);
            const lines = _getLines(f);
            const ch = _parseChapter(lines);
            console.log(ch);
            const html = _htmlize(ch);
            panel.innerHTML = html;
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
        load: _load
    }

})(qk);

qk.Character = (me => {
    "use strict";
    const charButton = document.getElementById('btn-character') || document.createElement('button');
    const charName = me.Preferences.get('characterName');

    if (charName !== null && charName != "") {
        _characterSet(charName);
    }
    
    function _characterSet(name) {
        charButton.textContent = name;
        charButton.hidden = false;
    }

    return {
        start: _characterSet
    }
})(qk);

qk.Chapter.load(qk.Preferences.get('chapter'));
