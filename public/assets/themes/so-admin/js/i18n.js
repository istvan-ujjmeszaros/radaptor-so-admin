/**
 * JS i18n helper — reads from window.__i18n populated by fetchClosingHtml().
 *
 * Usage in Stimulus controllers:
 *   import { t } from '/assets/packages/themes/so-admin/js/i18n.js';
 *   t(EXAMPLE_KEY_SAVE)               // → 'Save'
 *   t(EXAMPLE_KEY_CONFIRM, { name: 'John' })  // → 'Delete John?'
 */

/**
 * @param {string} key
 * @param {Record<string, string|number>} params
 * @returns {string}
 */
export function t(key, params = {}) {
    const text = window.__i18n?.[key] ?? `[${key}]`;
    return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}
