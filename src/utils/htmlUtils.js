/**
 * Utility to decode HTML entities in a string.
 * @param {string} html - The string containing HTML entities.
 * @returns {string} - The decoded string.
 */
export const decodeHtml = (html) => {
    if (!html || typeof html !== 'string') return html;
    // Check if it actually contains entities to avoid unnecessary work
    if (!html.includes('&') || !html.includes(';')) return html;

    try {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    } catch (e) {
        return html;
    }
};
