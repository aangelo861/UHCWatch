/**
 * HTML helpers: nhsuk-frontend component markup, the data components
 * (key figures, bar lists, chart figures) and the page shell.
 * Markup mirrors the Nunjucks templates shipped in nhsuk-frontend 10.x.
 */
import { fmt } from './data.mjs'

export const SITE_NAME = 'UHC Watch dashboards'
export const SITE_DESCRIPTOR = 'Can people afford health care? Europe and central Asia'

// Content hash appended to stylesheet and script URLs so browsers fetch the
// new files after every deploy instead of a cached copy (set by build.mjs).
let assetVersion = ''
export function setAssetVersion(v) {
  assetVersion = v
}
export const asset = (path) => (assetVersion ? `${path}?v=${assetVersion}` : path)

/** Escape text that came from the API before it goes into HTML. */
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** JSON that is safe inside a <script type="application/json"> block. */
export const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

const svg = (path, cls) =>
  `<svg class="nhsuk-icon nhsuk-icon--${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">${path}</svg>`

export const icons = {
  arrowRight: () => svg('<path d="m14.7 6.3 5 5c.2.2.3.4.3.7 0 .3-.1.5-.3.7l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H5a1 1 0 0 1 0-2h11.6l-3.3-3.3a1 1 0 1 1 1.4-1.4Z"/>', 'arrow-right'),
  arrowLeft: () => svg('<path d="M10.7 6.3c.4.4.4 1 0 1.4L7.4 11H19a1 1 0 0 1 0 2H7.4l3.3 3.3c.4.4.4 1 0 1.4a1 1 0 0 1-1.4 0l-5-5A1 1 0 0 1 4 12c0-.3.1-.5.3-.7l5-5a1 1 0 0 1 1.4 0Z"/>', 'arrow-left'),
  arrowRightCircle: () => svg('<path d="M12 2a10 10 0 0 0-10 9h11.7l-4-4a1 1 0 0 1 1.5-1.4l5.6 5.7a1 1 0 0 1 0 1.4l-5.6 5.7a1 1 0 0 1-1.5 0 1 1 0 0 1 0-1.4l4-4H2A10 10 0 1 0 12 2z"/>', 'arrow-right-circle'),
  chevronRightCircle: () => svg('<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-.3 5.8a1 1 0 1 0-1.5 1.4l2.9 2.8-2.9 2.8a1 1 0 0 0 1.5 1.4l3.5-3.5c.4-.4.4-1 0-1.4Z"/>', 'chevron-right-circle'),
  // App icons (not part of nhsuk-frontend)
  chevronDown: () => svg('<path d="M12 15.5a1 1 0 0 1-.7-.3l-6-6a1 1 0 0 1 1.4-1.4l5.3 5.3 5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-.7.3Z"/>', 'chevron-down'),
  list: () => svg('<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>', 'list'),
  globe: () => svg('<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>', 'globe'),
  chart: () => svg('<path d="M4 20V11h4v9H4Zm6 0V4h4v16h-4Zm6 0v-6h4v6h-4Z"/>', 'chart'),
  compare: () => svg('<path d="M9 3H4v18h5V3Zm-2 16H6V5h1v14Zm8-12h5v14h-5V7Zm2 12h1V9h-1v10ZM11 1h2v22h-2V1Z"/>', 'compare')
}

const cls = (...names) => names.filter(Boolean).join(' ')

export function careCard({ variant = 'non-urgent', heading, level = 2, hiddenPrefix, html, id, classes }) {
  const prefixes = { emergency: 'Immediate action required', urgent: 'Urgent advice', 'non-urgent': 'Non-urgent advice' }
  const prefix = hiddenPrefix === null ? '' : `<span class="nhsuk-u-visually-hidden">${hiddenPrefix ?? prefixes[variant]}: </span>`
  return `<div class="${cls('nhsuk-card nhsuk-card--care', `nhsuk-card--care--${variant}`, classes)}"${id ? ` id="${id}"` : ''}>
  <div class="nhsuk-card__heading-container">
    <h${level} class="nhsuk-card__heading nhsuk-heading-m"><span role="text">${prefix}${heading}</span></h${level}>
    <span class="nhsuk-card--care__arrow" aria-hidden="true"></span>
  </div>
  <div class="nhsuk-card__content">
${html}
  </div>
</div>
`
}

export function details({ summary, html, open = false, classes }) {
  return `<details class="${cls('nhsuk-details', classes)}"${open ? ' open' : ''}>
  <summary class="nhsuk-details__summary"><span class="nhsuk-details__summary-text">${summary}</span></summary>
  <div class="nhsuk-details__text">
${html}
  </div>
</details>
`
}

/**
 * Collapsible block whose heading is a full-width blue button.
 * Native details/summary: works without JavaScript; app.js opens it when a
 * link targets an anchor inside, and when printing.
 */
export function reveal({ id, heading, html, level = 2, open = false }) {
  return `<details class="app-reveal"${id ? ` id="${id}"` : ''}${open ? ' open' : ''}>
  <summary class="app-reveal__summary"><h${level} class="app-reveal__heading">${heading}</h${level}>${icons.chevronDown()}</summary>
  <div class="app-reveal__content">
${html}
  </div>
</details>
`
}

export function insetText(html, hiddenText = 'Information') {
  return `<div class="nhsuk-inset-text"><span class="nhsuk-u-visually-hidden">${hiddenText}: </span>${html}</div>\n`
}

export function actionLink({ href, text, classes }) {
  return `<a class="${cls('nhsuk-action-link', classes)}" href="${href}">${icons.arrowRightCircle()}<span class="nhsuk-action-link__text">${text}</span></a>\n`
}

export function tag(text, colour) {
  return `<strong class="${cls('nhsuk-tag', colour && `nhsuk-tag--${colour}`)}">${text}</strong>`
}

export function pagination({ prev, next }) {
  if (!prev && !next) return ''
  const item = (link, dir) => {
    if (!link) return ''
    const arrow = dir === 'prev' ? icons.arrowLeft() : icons.arrowRight()
    const word = dir === 'prev' ? 'Previous' : 'Next'
    return `<li class="nhsuk-pagination-item--${dir === 'prev' ? 'previous' : 'next'}">
    <a class="nhsuk-pagination__link nhsuk-pagination__link--${dir}" href="${link.href}" rel="${dir}">
      <span class="nhsuk-pagination__title">${word}<span class="nhsuk-u-visually-hidden"> page</span></span>
      <span class="nhsuk-u-visually-hidden">:</span>
      <span class="nhsuk-pagination__page">${link.label}</span>
      ${arrow}
    </a>
  </li>`
  }
  return `<nav class="nhsuk-pagination" role="navigation" aria-label="Pagination">
  <ul class="nhsuk-list nhsuk-pagination__list">
  ${item(prev, 'prev')}
  ${item(next, 'next')}
  </ul>
</nav>
`
}

/** Breadcrumb trail (desktop) with a back link to the last item (mobile). */
export function breadcrumb(items) {
  const last = items[items.length - 1]
  return `<nav class="nhsuk-breadcrumb" aria-label="Breadcrumb">
  <ol class="nhsuk-breadcrumb__list">
${items.map((i) => `    <li class="nhsuk-breadcrumb__list-item"><a class="nhsuk-breadcrumb__link" href="${i.href}">${i.text}</a></li>`).join('\n')}
  </ol>
  <a class="nhsuk-back-link" href="${last.href}"><span class="nhsuk-u-visually-hidden">Back to </span>${last.text}</a>
</nav>
`
}

/** Compact full-width navigation rows (48px min height). */
export function navRows(items, { label, classes } = {}) {
  return `<ul class="${cls('app-nav-rows', classes)}"${label ? ` aria-label="${label}"` : ''}>
${items
  .map(
    (i) => `  <li class="app-nav-rows__item"${i.filterText ? ` data-filter-text="${esc(i.filterText)}"` : ''}>
    <a class="app-nav-row" href="${i.href}">
      <span class="app-nav-row__text"><span class="app-nav-row__title">${i.text}</span>${i.description ? `<span class="app-nav-row__description">${i.description}</span>` : ''}</span>
      ${icons.chevronRightCircle()}
    </a>
  </li>`
  )
  .join('\n')}
</ul>
`
}

/** "Source" footer for a page: where the figures come from. */
export function sourceNote(items, heading = 'Sources') {
  return `<div class="app-source" id="source">
  <h2 class="nhsuk-heading-s">${heading}</h2>
  <ul class="nhsuk-list">
${items.map((l) => `    <li>${l}</li>`).join('\n')}
  </ul>
</div>
`
}

// Data components ------------------------------------------------------------

/**
 * Key figures: one tile per indicator with the latest value, its year, where
 * the country ranks, and a strip showing its position between the lowest and
 * highest country (tick = median).
 * tiles: [{ label, href, value, unit, year, rankText, median, min, max, note }]
 */
export function keyFigures(tiles) {
  return `<ul class="app-figures">
${tiles
  .map((t) => {
    if (t.value == null) {
      return `  <li class="app-figure app-figure--empty">
    <a class="app-figure__label" href="${t.href}">${t.label}</a>
    <p class="app-figure__none">No data for this country</p>
  </li>`
    }
    const span = t.max - t.min || 1
    const pos = Math.min(100, Math.max(0, ((t.value - t.min) / span) * 100))
    const med = ((t.median - t.min) / span) * 100
    return `  <li class="app-figure">
    <a class="app-figure__label" href="${t.href}">${t.label}</a>
    <p class="app-figure__value">${fmt(t.value)}<span class="app-figure__unit">${t.unit}</span></p>
    <p class="app-figure__meta">${t.year}${t.rankText ? ` · ${t.rankText}` : ''}</p>
    <div class="app-strip" role="img" aria-label="Lowest country ${fmt(t.min)}, median ${fmt(t.median)}, highest country ${fmt(t.max)}">
      <span class="app-strip__mid" style="--at:${med.toFixed(1)}%"><span>median ${fmt(t.median)}</span></span>
      <span class="app-strip__track"><span class="app-strip__median" style="left:${med.toFixed(1)}%"></span><span class="app-strip__dot" style="left:${pos.toFixed(1)}%"></span></span>
      <span class="app-strip__ends"><span>${fmt(t.min)} lowest</span><span>highest ${fmt(t.max)}</span></span>
    </div>${t.note ? `\n    <p class="app-figure__note">${t.note}</p>` : ''}
  </li>`
  })
  .join('\n')}
</ul>
`
}

/**
 * Horizontal bars with the value written at the end of each row.
 * rows: [{ label, href, note, value, iso, muted }]
 * reference: { value, label } draws a line through every row (the median).
 */
export function barList(rows, { max, reference, label, classes, ordered = false, focusable = false } = {}) {
  const top = max ?? Math.max(...rows.map((r) => r.value), reference?.value ?? 0)
  const scale = top > 0 ? 100 / top : 0
  const tagName = ordered ? 'ol' : 'ul'
  const ref = reference ? ` style="--ref:${(reference.value * scale).toFixed(2)}%"` : ''
  return `${reference ? `<p class="app-bars__reference"><span class="app-bars__reference-key" aria-hidden="true"></span>${reference.label}</p>\n` : ''}<${tagName} class="${cls('app-bars', reference && 'app-bars--reference', classes)}"${focusable ? ' data-focusable' : ''}${label ? ` aria-label="${esc(label)}"` : ''}${ref}>
${rows
  .map((r) => {
    const name = r.href ? `<a href="${r.href}">${esc(r.label)}</a>` : esc(r.label)
    const width = Math.max(0, r.value * scale)
    return `  <li class="${cls('app-bars__row', r.muted && 'app-bars__row--muted')}"${r.iso ? ` data-iso="${r.iso}"` : ''}>
    <span class="app-bars__label">${name}${r.note ? ` <span class="app-bars__note">${esc(r.note)}</span>` : ''}</span>
    <span class="app-bars__track"><span class="app-bars__bar" style="width:${width.toFixed(2)}%"></span></span>
    <span class="app-bars__value">${fmt(r.value)}</span>
  </li>`
  })
  .join('\n')}
</${tagName}>
`
}

/**
 * A chart figure: title, what is measured, legend, the plot (drawn by
 * charts.js from the JSON beside it) and the same numbers as a table.
 * series: [{ name, color, points: [[year, value], …], context }]
 */
export function chartFigure({ id, title, unit, series, breaks = [], notes = [], source, level = 3, kind = 'line', extra = {} }) {
  const shown = series.filter((s) => s.points.length)
  if (!shown.length) return ''
  const legend =
    shown.length > 1
      ? `<ul class="app-legend" aria-label="Series">
${shown
  .map((s) => {
    const last = s.points[s.points.length - 1]
    return `    <li class="app-legend__item"><span class="app-legend__key${s.context ? ' app-legend__key--context' : ''}" style="--c:${s.color}" aria-hidden="true"></span>${esc(s.name)} <span class="app-legend__value">${fmt(last[1])} in ${last[0]}</span></li>`
  })
  .join('\n')}
  </ul>`
      : ''
  const years = [...new Set(shown.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b)
  const table = `<table class="nhsuk-table app-chart__table">
    <caption class="nhsuk-u-visually-hidden">${esc(title)} (${esc(unit)})</caption>
    <thead class="nhsuk-table__head"><tr><th scope="col" class="nhsuk-table__header">Year</th>${shown.map((s) => `<th scope="col" class="nhsuk-table__header nhsuk-table__header--numeric">${esc(s.name)}</th>`).join('')}</tr></thead>
    <tbody class="nhsuk-table__body">
${years
  .map((y) => `      <tr class="nhsuk-table__row"><th scope="row" class="nhsuk-table__cell">${y}</th>${shown.map((s) => { const p = s.points.find((x) => x[0] === y); return `<td class="nhsuk-table__cell nhsuk-table__cell--numeric">${p ? fmt(p[1]) : '–'}</td>` }).join('')}</tr>`)
  .join('\n')}
    </tbody>
  </table>`
  const data = { kind, unit, series: shown.map((s) => ({ name: s.name, color: s.color, points: s.points, context: s.context || undefined })), breaks, ...extra }
  return `<figure class="app-chart"${id ? ` id="${id}"` : ''}>
  <figcaption class="app-chart__caption">
    <h${level} class="app-chart__title">${esc(title)}</h${level}>
    <p class="app-chart__unit">${esc(unit)}</p>
  </figcaption>
  ${legend}
  <div class="app-chart__plot" data-chart tabindex="0" role="img" aria-label="${esc(title)}. Line chart; the same figures are in the table below."></div>
  <script type="application/json" class="app-chart__data">${jsonForScript(data)}</script>
  ${notes.map((n) => `<p class="app-chart__note">${n}</p>`).join('\n  ')}
  ${details({ summary: 'Show the figures as a table', html: `<div class="app-scroll" tabindex="0" role="region" aria-label="${esc(title)} table">${table}</div>`, classes: 'app-chart__details' })}
  ${source ? `<p class="app-chart__source">Source: ${source}</p>` : ''}
</figure>
`
}

/** Full HTML document. */
export function layout({ site, page, content, breadcrumbs = null, snapshotDate }) {
  const root = site.root(page.url)
  const href = (to) => site.href(page.url, to)
  const nav = [
    { key: 'start', text: 'Where do I start?', short: 'Start', href: href(site.urls.hub), icon: icons.list() },
    { key: 'countries', text: 'Countries', short: 'Countries', href: href(site.urls.countries), icon: icons.globe() },
    { key: 'indicators', text: 'Indicators', short: 'Indicators', href: href(site.urls.indicators), icon: icons.chart() },
    { key: 'compare', text: 'Compare countries', short: 'Compare', href: href(site.urls.compare), icon: icons.compare() }
  ]
  const about = { key: 'about', text: 'About the data', href: href(site.urls.about) }
  const navHtml = [...nav, about]
    .map((n) => {
      const current = n.key === page.navKey
      return `<li class="nhsuk-header__navigation-item${current ? ' nhsuk-header__navigation-item--current' : ''}"><a class="nhsuk-header__navigation-link" href="${n.href}"${current ? ' aria-current="page"' : ''}>${current ? `<strong class="nhsuk-header__navigation-item-current-fallback">${n.text}</strong>` : n.text}</a></li>`
    })
    .join('\n          ')
  const bottom = nav
    .map((b) => {
      const current = b.key === page.navKey
      return `<a class="app-bottom-bar__link${current ? ' app-bottom-bar__link--current' : ''}" href="${b.href}"${current ? ' aria-current="page"' : ''}>${b.icon}<span class="app-bottom-bar__label">${b.short}</span></a>`
    })
    .join('\n    ')

  return `<!DOCTYPE html>
<html lang="en" class="app-html">
<head>
  <meta charset="utf-8">
  <title>${page.title} – ${SITE_NAME}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#005eb8">
  <meta name="description" content="${esc(page.description || 'Country briefings on financial hardship, unmet need and health spending in Europe and central Asia, built from WHO/Europe UHC Watch data.')}">
  <link rel="icon" href="${root}assets/images/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${asset(`${root}stylesheets/app.css`)}">
</head>
<body class="app-body${page.bodyClass ? ` ${page.bodyClass}` : ''}" data-root="${root}"${page.country ? ` data-country="${page.country}"` : ''}>
<script>document.body.className += ' js-enabled' + ('noModule' in HTMLScriptElement.prototype ? ' nhsuk-frontend-supported' : '');</script>
<a class="nhsuk-skip-link" href="#maincontent" data-module="nhsuk-skip-link">Skip to main content</a>
<header class="nhsuk-header nhsuk-header--white nhsuk-header--organisation app-header" role="banner" data-module="nhsuk-header">
  <div class="nhsuk-header__container nhsuk-width-container">
    <div class="nhsuk-header__service">
      <a class="nhsuk-header__service-logo app-header__brand" href="${href(site.urls.hub)}" aria-label="${SITE_NAME} homepage">
        <img class="app-header__mark" src="${root}assets/images/mark.svg" width="44" height="44" alt="">
        <span class="app-header__names"><span class="app-header__service-name">${SITE_NAME}</span><span class="app-header__service-descriptor">${SITE_DESCRIPTOR}</span></span>
      </a>
    </div>
  </div>
  <nav class="nhsuk-header__navigation nhsuk-header__navigation--white app-header__nav" aria-label="Menu">
    <div class="nhsuk-header__navigation-container nhsuk-width-container">
      <ul class="nhsuk-header__navigation-list">
          ${navHtml}
        <li class="nhsuk-header__menu" hidden>
          <button class="nhsuk-header__menu-toggle nhsuk-header__navigation-link" id="toggle-menu" aria-expanded="false"><span class="nhsuk-u-visually-hidden">Browse </span>More</button>
        </li>
      </ul>
    </div>
  </nav>
</header>
<div class="app-status" role="note" aria-label="Status of this site">
  <div class="nhsuk-width-container">
    <p class="app-status__text"><strong class="nhsuk-tag app-status__tag">Unofficial</strong> <span class="app-status__label">Not a WHO product.</span> <span class="app-status__scope">Data read from WHO/Europe UHC Watch on ${snapshotDate}.</span></p>
  </div>
</div>
<div class="nhsuk-width-container">
  ${breadcrumbs ? breadcrumb(breadcrumbs) : ''}
  <main class="nhsuk-main-wrapper app-main" id="maincontent">
    <div class="app-content${page.wide ? ' app-content--wide' : ''}">${content}</div>
  </main>
</div>
<footer class="nhsuk-footer" role="contentinfo">
  <div class="nhsuk-width-container">
    <div class="app-footer__brand">
      <img class="app-footer__mark" src="${root}assets/images/mark.svg" width="40" height="40" alt="">
      <p class="nhsuk-body-s app-footer__trust">${SITE_NAME}</p>
    </div>
    <div class="nhsuk-footer__meta">
      <h2 class="nhsuk-u-visually-hidden">Support links</h2>
      <ul class="nhsuk-footer__list">
        ${[...nav, about].map((n) => `<li class="nhsuk-footer__list-item"><a class="nhsuk-footer__list-item-link" href="${n.href}">${n.text}</a></li>`).join('\n        ')}
      </ul>
      <p class="nhsuk-body-s">Figures come from <a class="nhsuk-footer__list-item-link" href="https://apps.who.int/dhis2/uhcwatch">UHC Watch</a>, WHO Regional Office for Europe, read on ${snapshotDate}. This site is not produced or endorsed by WHO. Check a figure against UHC Watch before you cite it.</p>
    </div>
  </div>
</footer>
<nav class="app-bottom-bar" aria-label="Quick links">
    ${bottom}
</nav>
<p class="app-print-footer">${SITE_NAME} – unofficial. Data: WHO/Europe UHC Watch, read on ${snapshotDate}.</p>
<script type="module">
  import { initAll } from '${asset(`${root || './'}javascripts/nhsuk-frontend.min.js`)}'
  initAll()
</script>
<script src="${asset(`${root}javascripts/charts.js`)}" defer></script>
<script src="${asset(`${root}javascripts/app.js`)}" defer></script>
${page.scripts || ''}
</body>
</html>
`
}
