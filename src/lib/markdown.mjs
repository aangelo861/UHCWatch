/**
 * Renders the markdown UHC Watch stores in its country records (bold, bullet
 * lists, links) as NHS design system HTML.
 *
 * The text comes from an API, so it is treated as data: HTML is escaped before
 * the markdown is rendered and only http(s) links are kept.
 */
import { marked } from 'marked'

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function renderText(source) {
  if (!source) return ''
  const html = marked.parse(escapeHtml(String(source).trim()), { gfm: true, breaks: false })
  return html
    .replace(/<a href="([^"]*)"/g, (m, url) => (/^https?:\/\//i.test(url) ? `<a href="${url}"` : '<a href="#"'))
    .replace(/<ul>/g, '<ul class="nhsuk-list nhsuk-list--bullet">')
    .replace(/<ol>/g, '<ol class="nhsuk-list nhsuk-list--number">')
    .replace(/<h[1-6]>(.*?)<\/h[1-6]>/g, '<p><strong>$1</strong></p>')
}

/** One line of markdown without the wrapping paragraph (titles, source lines). */
export function renderInline(source) {
  if (!source) return ''
  return marked
    .parseInline(escapeHtml(String(source).trim()))
    .replace(/<a href="([^"]*)"/g, (m, url) => (/^https?:\/\//i.test(url) ? `<a href="${url}"` : '<a href="#"'))
}

export const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
