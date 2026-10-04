/**
 * Homepage: "Where do I start?".
 * Order: status (page shell) → open a country briefing → one row per question,
 * each going straight to its indicator → the region in three figures →
 * compare, all countries, all indicators, about the data.
 */
import * as h from '../lib/html.mjs'
import { THEMES, INDICATORS, indicator } from '../lib/catalog.mjs'
import { fmt } from '../lib/data.mjs'

export function buildHub(ctx) {
  const { site, countries } = ctx
  const page = { url: site.urls.hub, title: 'Where do I start?', navKey: 'start', bodyClass: 'app-body--hub' }
  const href = (to) => site.href(page.url, to)

  const picker = `<form class="app-picker" action="${href(site.urls.countries)}" method="get" data-country-picker>
  <div class="nhsuk-form-group">
    <label class="nhsuk-label nhsuk-label--s" for="country">Open a country briefing</label>
    <div class="app-picker__row">
      <select class="nhsuk-select app-picker__control" id="country">
        <option value="">Choose a country</option>
        ${countries.map((c) => `<option value="${href(site.urls.country(c.slug))}" data-iso="${c.iso}">${h.esc(c.display)}</option>`).join('\n        ')}
      </select>
      <button class="nhsuk-button app-picker__button" type="submit" data-module="nhsuk-button">Open</button>
    </div>
  </div>
</form>`

  // One row per question, going to the indicator that answers it first
  const questions = h.navRows(
    THEMES.map((t) => {
      const first = INDICATORS.find((i) => i.theme === t.key)
      return { text: h.esc(t.question), href: href(site.urls.indicator(first.key)), description: `${h.esc(first.short)}, ranked for every country` }
    }),
    { label: 'Questions' }
  )

  // The region in three figures, worked out from the snapshot
  const cata = ctx.standing(indicator('catastrophic-health-spending'))
  const cataRanked = cata.rows.filter((r) => r.comparable)
  const low = cataRanked[0]
  const high = cataRanked[cataRanked.length - 1]
  const oop = ctx.standing(indicator('out-of-pocket-share-of-health-spending'))
  const above15 = oop.rows.filter((r) => r.value > 15).length
  const unmet = ctx.standing(indicator('unmet-need-health-care'))
  const unmetHigh = unmet.rows[unmet.rows.length - 1]
  const region = h.careCard({
    heading: 'Across the region',
    level: 2,
    hiddenPrefix: null,
    html: `<ul class="nhsuk-list nhsuk-list--bullet">
  <li><strong>Catastrophic health spending</strong> affects from ${fmt(low.value)}% of households in ${h.esc(ctx.country(low.iso).display)} to ${fmt(high.value)}% in ${h.esc(ctx.country(high.iso).display)}. The median across ${cata.ranked} countries is ${fmt(cata.median)}%.</li>
  <li><strong>Out-of-pocket payments</strong> are more than 15% of current spending on health in ${above15} of ${oop.rows.length} countries.</li>
  <li><strong>Unmet need for health care</strong> ranges up to ${fmt(unmetHigh.value)}% of people (${h.esc(ctx.country(unmetHigh.iso).display)}, ${unmetHigh.year}). The median across ${unmet.ranked} countries is ${fmt(unmet.median)}%.</li>
</ul>
<p class="nhsuk-body-s">Latest year for each country, so the years differ. <a href="${href(site.urls.about)}">How the figures are chosen</a></p>`
  })

  const more = h.navRows(
    [
      { text: 'Compare countries', href: href(site.urls.compare), description: 'Up to four countries side by side on every indicator' },
      { text: 'All countries', href: href(site.urls.countries), description: `${countries.length} country briefings` },
      { text: 'All indicators', href: href(site.urls.indicators), description: `${INDICATORS.length} indicators, each ranked for every country` },
      { text: 'About the data', href: href(site.urls.about), description: 'Sources, definitions and limits' }
    ],
    { label: 'Compare, countries, indicators and about' }
  )

  const content = `
<h1 class="nhsuk-heading-l app-hub__title">Where do I start?</h1>
<p>Choose a country for its briefing, or a question to see how every country compares.</p>
${picker}
${questions}
${region}
${more}
<p class="nhsuk-body-s">These pages re-arrange figures published by UHC Watch, the WHO Regional Office for Europe’s monitor of affordable access to health care. They are not a WHO product.</p>
`
  return { page, html: h.layout({ site, page, content, snapshotDate: ctx.snapshotDate }) }
}
