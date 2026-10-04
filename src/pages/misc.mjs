/** Compare countries, and About the data. */
import * as h from '../lib/html.mjs'
import { asset } from '../lib/html.mjs'
import { INDICATORS, HBS_NOT_COMPARABLE, API_BASE, UHCW_SITE, requiredElements } from '../lib/catalog.mjs'
import { COLORS } from '../lib/context.mjs'

export function buildCompare(ctx) {
  const { site, countries, db } = ctx
  const page = {
    url: site.urls.compare,
    title: 'Compare countries',
    navKey: 'compare',
    description: 'Up to four countries side by side on every UHC Watch indicator.',
    scripts: `<script src="${asset('javascripts/compare.js')}" defer></script>`
  }
  const options = countries.map((c) => `<option value="${c.iso}">${h.esc(c.display)}</option>`).join('\n        ')
  const ordinals = ['First', 'Second', 'Third', 'Fourth']
  const controls = ordinals
    .map(
      (word, i) => `  <div class="nhsuk-form-group">
    <label class="nhsuk-label nhsuk-label--s app-compare__label" for="compare-${i + 1}"><span class="app-compare__swatch" style="--c:${COLORS.series[i]}" aria-hidden="true"></span>${word} country</label>
    <select class="nhsuk-select" id="compare-${i + 1}" data-compare-select>
      <option value="">${i === 0 ? 'Choose a country' : 'None'}</option>
        ${options}
    </select>
  </div>`
    )
    .join('\n')

  const content = `
<h1 class="nhsuk-heading-l">Compare countries</h1>
<p>Choose up to four countries. The address of this page keeps your choice, so you can bookmark a comparison or send it to a colleague.</p>
<form class="app-compare__controls">
${controls}
</form>
<p class="app-takeaway" data-compare-status role="status">This page needs JavaScript. Without it, use the indicator pages: each one ranks every country.</p>
<div data-compare-output></div>
${h.sourceNote([
    `<a href="${UHCW_SITE}">UHC Watch</a>, WHO Regional Office for Europe. Data read on ${ctx.snapshotDate}.`,
    `<a href="${site.href(page.url, site.urls.about)}">About the data: sources, definitions and limits</a>`
  ])}
`
  // Every indicator's full series for every country, read by compare.js
  const data = {
    countries: Object.fromEntries(countries.map((c) => [c.iso, { name: c.display, slug: c.slug }])),
    indicators: INDICATORS.map((ind) => ({
      key: ind.key,
      title: ind.title,
      short: ind.short,
      unit: ind.unit,
      better: ind.better ? ind.better.charAt(0).toUpperCase() + ind.better.slice(1) : null,
      source: ind.source,
      // Countries UHC Watch says cannot be compared with the others on this indicator
      notComparable: ind.hbs ? HBS_NOT_COMPARABLE : [],
      series: Object.fromEntries(countries.map((c) => [c.iso, db.series(ind.dx, c.iso)]).filter(([, s]) => s.length))
    }))
  }
  return { page, html: h.layout({ site, page, content, snapshotDate: ctx.snapshotDate }), json: { url: site.urls.compareData, value: data } }
}

export function buildAbout(ctx) {
  const { site, snapshot, countries } = ctx
  const page = { url: site.urls.about, title: 'About the data', navKey: 'about', description: 'Where the figures come from, how they are chosen and what they cannot tell you.' }
  const filled = [...requiredElements().entries()].filter(([, f]) => f.dedupe).map(([dx]) => snapshot.elements[dx].name)
  const sources = [...new Set(INDICATORS.map((i) => i.source))]
  const updated = new Date(snapshot.source.analyticsUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const notComparable = HBS_NOT_COMPARABLE.map((iso) => ctx.country(iso).display).join(' and ')

  const content = `
<h1 class="nhsuk-heading-l">About the data</h1>
<p class="app-lead">Every figure on this site comes from UHC Watch, the WHO Regional Office for Europe’s monitor of affordable access to health care in Europe and central Asia.</p>

${h.insetText('<p>This site is not produced or endorsed by WHO. It re-arranges published figures for quick reading. Check a figure against <a href="' + UHCW_SITE + '">UHC Watch</a> before you cite it, and cite UHC Watch as the source.</p>')}

<h2 class="nhsuk-heading-m">Where the figures come from</h2>
<p>The site reads UHC Watch’s public data service and keeps a copy. The copy on this site was read on <strong>${ctx.snapshotDate}</strong>; UHC Watch last refreshed its figures on ${updated}.</p>
<p>UHC Watch draws on:</p>
<ul class="nhsuk-list nhsuk-list--bullet">
${sources.map((s) => `  <li>${h.esc(s)}</li>`).join('\n')}
</ul>
<p>The summaries, gaps in coverage and recommendations on country briefings are UHC Watch’s own text, unedited.</p>

<h2 class="nhsuk-heading-m">How figures are chosen</h2>
<ul class="nhsuk-list nhsuk-list--bullet">
  <li><strong>Latest year.</strong> Rankings and key figures use each country’s most recent figure, so the years differ between countries. The year is always shown beside the figure.</li>
  <li><strong>Ranks.</strong> A rank is a position, not a verdict: “5th lowest of 42 countries”. Countries with the same figure share a rank.</li>
  <li><strong>Median.</strong> The middle country when countries are put in order. It is used instead of an average because a few countries with very high figures would pull an average up.</li>
  <li><strong>Median lines on charts.</strong> Drawn only for years when at least 60% of countries report a figure.</li>
</ul>

<h2 class="nhsuk-heading-m">What to keep in mind</h2>
<ul class="nhsuk-list nhsuk-list--bullet">
  <li><strong>Not comparable.</strong> UHC Watch says the household budget surveys of ${h.esc(notComparable)} cannot be compared with other countries. They are shown, marked, and left out of ranks and medians.</li>
  <li><strong>Breaks in series.</strong> Where a survey changed, UHC Watch records a break: figures before and after it are not comparable. Breaks are marked on country charts and listed on indicator pages.</li>
  <li><strong>Survey years.</strong> Financial hardship figures come from household budget surveys, which most countries run every few years. A country’s latest figure can be several years old.</li>
  <li><strong>Repeated values.</strong> UHC Watch repeats the last value of some series in years without new data. For ${filled.length === 1 ? 'this series' : 'these series'} the site shows only the first year of each run of equal values: ${filled.map((n) => h.esc(n)).join('; ')}.</li>
  <li><strong>Coverage.</strong> ${countries.length} countries are listed. Not every country has every indicator; a briefing says when there is no figure.</li>
</ul>

<h2 class="nhsuk-heading-m">Getting the numbers</h2>
<p>Each indicator page and each country briefing has a CSV download. For anything else, UHC Watch’s data service is open: <a href="${API_BASE}/system/info.json">${API_BASE}</a>.</p>

<h2 class="nhsuk-heading-m">Your country</h2>
<p>The site remembers the last country you opened or put in focus, so rankings can pick it out. This is stored in your browser only and is never sent anywhere.</p>
`
  return { page, html: h.layout({ site, page, content, snapshotDate: ctx.snapshotDate }) }
}
