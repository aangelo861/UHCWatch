/**
 * Indicators: the list by question, and one page per indicator.
 *
 * An indicator page follows the same order every time: what it measures →
 * choose a country to put in focus → every country's latest figure, ranked →
 * change over time → UHC Watch's information note → sources.
 */
import * as h from '../lib/html.mjs'
import { INDICATORS, THEMES, HBS_NOT_COMPARABLE, UHCW_SITE, theme, indicator } from '../lib/catalog.mjs'
import { renderText } from '../lib/markdown.mjs'
import { fmt, median } from '../lib/data.mjs'

const directionText = (ind) => (ind.better === 'lower' ? 'Lower is better.' : ind.better === 'higher' ? 'Higher is better.' : '')

export function buildIndicatorsIndex(ctx) {
  const { site } = ctx
  const page = { url: site.urls.indicators, title: 'Indicators', navKey: 'indicators' }
  const href = (to) => site.href(page.url, to)

  const groups = THEMES.map((t) => {
    const items = INDICATORS.filter((i) => i.theme === t.key).map((ind) => {
      const st = ctx.standing(ind)
      return {
        text: h.esc(ind.title),
        href: href(site.urls.indicator(ind.key)),
        description: `${st.rows.length} countries · median ${h.esc(ctx.withUnit(st.median, ind.unit))}`
      }
    })
    return `<h2 class="nhsuk-heading-s app-nav-rows__heading">${h.esc(t.question)}</h2>
${h.navRows(items, { label: t.title })}`
  })

  const content = `
<h1 class="nhsuk-heading-l">Indicators</h1>
<p>Each indicator ranks every country on its latest figure and shows the change over time.</p>
${groups.join('\n')}
`
  return { page, html: h.layout({ site, page, content, snapshotDate: ctx.snapshotDate }) }
}

export function buildIndicatorPages(ctx) {
  return INDICATORS.map((ind, i) => buildIndicator(ctx, ind, INDICATORS[i - 1], INDICATORS[i + 1]))
}

function buildIndicator(ctx, ind, prev, next) {
  const { site, db, countries, snapshot } = ctx
  const page = { url: site.urls.indicator(ind.key), title: ind.title, navKey: 'indicators', description: ind.meaning }
  const href = (to) => site.href(page.url, to)
  const st = ctx.standing(ind)
  const th = theme(ind.theme)

  // Ranking: every country's latest figure
  const rows = st.rows.map((r) => {
    const c = ctx.country(r.iso)
    return {
      iso: r.iso,
      label: c.display,
      href: href(site.urls.country(c.slug)),
      note: r.comparable ? String(r.year) : `${r.year}, not comparable`,
      value: r.value,
      muted: !r.comparable
    }
  })
  const years = st.rows.map((r) => r.year)
  const yearRange = Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)} to ${Math.max(...years)}`
  const orderWord = ind.better === 'lower' ? 'lowest first' : 'highest first'

  // One sentence per country for the focus read-out
  const sentences = Object.fromEntries(
    st.rows.map((r) => {
      const c = ctx.country(r.iso)
      return [r.iso, `${c.display}: ${ctx.withUnit(r.value, ind.unit)} in ${r.year}, ${ctx.rankText(ind, r, st)}. Median: ${fmt(st.median)}${ind.unit.startsWith('%') ? '%' : ''}.`]
    })
  )

  // Trend: every country, the one in focus picked out by charts.js
  const chartCountries = countries
    .map((c) => ({ iso: c.iso, name: c.display, points: db.series(ind.dx, c.iso), comparable: !(ind.hbs && HBS_NOT_COMPARABLE.includes(c.iso)) }))
    .filter((c) => c.points.length)
  const medianPoints = ctx.yearMedian(ind)
  const hasMedian = medianPoints.length > 1
  const trend = `<figure class="app-chart">
  <figcaption class="app-chart__caption">
    <h3 class="app-chart__title">${h.esc(ind.title)}, every country</h3>
    <p class="app-chart__unit">${h.esc(ind.unit)}</p>
  </figcaption>
  <ul class="app-legend" aria-label="Series">
    <li class="app-legend__item" data-focus-legend hidden><span class="app-legend__key" style="--c:#005eb8" aria-hidden="true"></span><span data-focus-name></span></li>
    ${hasMedian ? '<li class="app-legend__item"><span class="app-legend__key" style="--c:#212b32" aria-hidden="true"></span>Median of countries with data</li>' : ''}
    <li class="app-legend__item"><span class="app-legend__key app-legend__key--context" style="--c:#aeb7bd" aria-hidden="true"></span>Each other country</li>
  </ul>
  <div class="app-chart__plot" data-chart tabindex="0" role="img" aria-label="${h.esc(ind.title)} over time, one line per country. The figures are in the CSV download below."></div>
  <script type="application/json" class="app-chart__data">${h.jsonForScript({ kind: 'focus', unit: ind.unit, countries: chartCountries, median: medianPoints, focus: null })}</script>
  ${hasMedian ? '' : '<p class="app-chart__note">Countries run their surveys in different years, so there is no median line: too few countries report in any one year.</p>'}
  <p class="app-chart__source">Source: ${h.esc(ind.source)}, through UHC Watch. <a href="${href(site.urls.indicatorCsv(ind.key))}" download>Download every year for every country (CSV)</a></p>
</figure>`

  const caution = ind.hbs
    ? h.insetText('<p>UHC Watch says the household budget surveys of Netherlands and Norway cannot be compared with other countries. They are shown, but left out of the ranks and the median.</p>')
    : ''
  const note = snapshot.notes[ind.noteKey]
  const noteHtml = note ? h.details({ summary: 'UHC Watch’s note on this indicator', html: `<div class="app-quoted">${renderText(note)}</div>` }) : ''
  const breaks = ind.breakKey ? snapshot.breaks.filter((b) => b.applies.includes(ind.breakKey)) : []
  const breaksHtml = breaks.length
    ? h.details({
        summary: `Breaks in series (${breaks.length} ${breaks.length === 1 ? 'country' : 'countries'})`,
        html: `<p>UHC Watch says figures before and after these years are not comparable.</p>
<ul class="nhsuk-list nhsuk-list--bullet">
${breaks.map((b) => `  <li>${h.esc(ctx.country(b.country).display)}: ${b.years.join(', ')}</li>`).join('\n')}
</ul>`
      })
    : ''

  const content = `
<h1 class="nhsuk-heading-l"><span class="app-page-caption">${h.esc(th.title)}</span>${h.esc(ind.title)}</h1>
<p class="app-lead">${h.esc(ind.meaning)}</p>
${directionText(ind) ? `<p><strong>${directionText(ind)}</strong></p>` : ''}
${ind.key === 'out-of-pocket-share-of-health-spending' ? thresholdPanel(ctx, ind) : ''}
<form class="app-picker">
  <div class="nhsuk-form-group">
    <label class="nhsuk-label nhsuk-label--s" for="focus">Put a country in focus</label>
    <select class="nhsuk-select app-picker__control" id="focus" data-focus-select>
      <option value="">No country</option>
      ${st.rows.slice().sort((a, b) => a.name.localeCompare(b.name, 'en')).map((r) => `<option value="${r.iso}">${h.esc(ctx.country(r.iso).display)}</option>`).join('\n      ')}
    </select>
  </div>
</form>
<p class="app-takeaway" data-focus-summary role="status" hidden></p>
<script type="application/json" id="focus-sentences">${h.jsonForScript(sentences)}</script>

<h2 class="nhsuk-heading-m">Latest figure for each country</h2>
<p>${st.rows.length} countries, ${orderWord}. The year of each figure is under the country name (${yearRange}).</p>
${caution}
${h.barList(rows, { reference: { value: st.median, label: `Median of ${st.ranked} countries: ${fmt(st.median)}${ind.unit.startsWith('%') ? '%' : ''}` }, label: `${ind.title}, latest year, ${orderWord}`, ordered: true, focusable: true })}

<h2 class="nhsuk-heading-m">Change over time</h2>
${trend}
${noteHtml}
${breaksHtml}
${h.sourceNote([
    `${h.esc(ind.source)}, published by <a href="${UHCW_SITE}/indicator-explorer">UHC Watch</a>, WHO Regional Office for Europe. Data read on ${ctx.snapshotDate}.`,
    `<a href="${href(site.urls.about)}">About the data: how figures are chosen, ranked and compared</a>`
  ])}
${h.pagination({
    prev: prev && { href: href(site.urls.indicator(prev.key)), label: h.esc(prev.short) },
    next: next && { href: href(site.urls.indicator(next.key)), label: h.esc(next.short) }
  })}
`
  const csvRows = [['country', 'iso3', 'indicator', 'unit', 'year', 'value']]
  const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  for (const c of countries) for (const [y, v] of db.series(ind.dx, c.iso)) csvRows.push([c.name, c.iso, ind.title, ind.unit, y, v])
  return {
    page,
    html: h.layout({ site, page, content, snapshotDate: ctx.snapshotDate, breadcrumbs: [{ text: 'Indicators', href: href(site.urls.indicators) }] }),
    csv: { url: site.urls.indicatorCsv(ind.key), text: csvRows.map((r) => r.map((x) => q(String(x))).join(',')).join('\n') + '\n' }
  }
}

/**
 * Why the out-of-pocket share matters: catastrophic health spending in
 * countries grouped by their out-of-pocket share, worked out from the
 * snapshot (latest year for each country, comparable countries only).
 */
function thresholdPanel(ctx, ind) {
  const cata = indicator('catastrophic-health-spending')
  const cataRows = new Map(ctx.standing(cata).rows.filter((r) => r.comparable).map((r) => [r.iso, r.value]))
  const bands = [
    { label: 'Below 15%', test: (v) => v < 15 },
    { label: '15% to 30%', test: (v) => v >= 15 && v <= 30 },
    { label: 'Above 30%', test: (v) => v > 30 }
  ].map((band) => {
    const values = ctx.standing(ind).rows.filter((r) => band.test(r.value) && cataRows.has(r.iso)).map((r) => cataRows.get(r.iso)).sort((a, b) => a - b)
    return { ...band, n: values.length, median: median(values), min: values[0], max: values[values.length - 1] }
  })
  // Only say it when this snapshot bears it out
  if (bands.some((b) => b.n < 3) || !(bands[0].median < bands[1].median && bands[1].median < bands[2].median)) return ''
  return h.careCard({
    heading: 'Why it matters',
    hiddenPrefix: null,
    html: `<p>Catastrophic health spending is lower in countries where people pay a smaller share of health spending out of pocket.</p>
<table class="nhsuk-table">
  <caption class="nhsuk-table__caption nhsuk-u-visually-hidden">Households with catastrophic health spending, by the out-of-pocket share of current spending on health</caption>
  <thead class="nhsuk-table__head"><tr><th scope="col" class="nhsuk-table__header">Out-of-pocket share</th><th scope="col" class="nhsuk-table__header nhsuk-table__header--numeric">Countries</th><th scope="col" class="nhsuk-table__header nhsuk-table__header--numeric">Median catastrophic spending</th></tr></thead>
  <tbody class="nhsuk-table__body">
${bands.map((b) => `    <tr class="nhsuk-table__row"><th scope="row" class="nhsuk-table__cell">${b.label}</th><td class="nhsuk-table__cell nhsuk-table__cell--numeric">${b.n}</td><td class="nhsuk-table__cell nhsuk-table__cell--numeric">${fmt(b.median)}% <span class="app-compare__year">${fmt(b.min)} to ${fmt(b.max)}</span></td></tr>`).join('\n')}
  </tbody>
</table>
<p class="nhsuk-body-s">Worked out here from each country’s latest figure on both indicators; the years differ between countries. <a href="${ctx.site.href(ctx.site.urls.indicator(ind.key), ctx.site.urls.indicator(cata.key))}">Catastrophic health spending by country</a></p>`
  })
}
