# UHC Watch dashboards

Country briefings and comparisons for policy advisors on whether people can afford health care in the 53 countries of the WHO European Region. Every figure comes from [UHC Watch](https://apps.who.int/dhis2/uhcwatch), the WHO Regional Office for Europe's monitor of financial protection. It is a static site built for GitHub Pages: no backend, no accounts, nothing stored.

**This is not a WHO product.** The site re-arranges published figures for quick reading on a phone. Every page says so, and tells readers to check a figure against UHC Watch before citing it.

`data/snapshot.json` is the single source of every figure. It is a copy of the UHC Watch API taken by `npm run fetch`; every page is generated from it, so refreshing the snapshot and rebuilding updates the whole site.

## What the site contains

- **Where do I start?** (`index.html`) – open a country briefing, or pick one of five questions to go straight to the indicator that answers it; the region in three figures; links to compare, all countries, all indicators and about the data.
- **53 country briefings** (`country/*.html`) – each follows the same order: key figures (latest value, year, rank, and a strip showing where the country sits between the lowest and highest) → UHC Watch's summary → one collapsible block per question, opening with the takeaway and then the charts → gaps in coverage and recommendations in UHC Watch's own words → sources and a CSV download.
- **12 indicator pages** (`indicator/*.html`) – what the indicator measures, every country's latest figure ranked, the change over time for every country, UHC Watch's information note, breaks in series and a CSV download. Choosing a country puts it in focus on the ranking and the chart.
- **Compare countries** (`compare.html`) – up to four countries side by side on every indicator. The address keeps the selection (`compare.html?c=CZE,POL,SVK`), so a comparison can be bookmarked or shared.
- **About the data** (`about.html`) – sources, how figures are chosen and ranked, and what they cannot tell you.

The site remembers the last country opened or put in focus (in the browser's local storage only) and picks it out on every ranking.

## The API behind it

UHC Watch is a DHIS2 app. Its data service is open, with no login:

```
https://apps.who.int/dhis2/uhcwatch/api
```

`src/fetch.mjs` reads `analytics` (the values), `organisationUnits` and `organisationUnitGroups` (countries and groups), and `events` for three programs: country information (summaries, gaps, recommendations), information notes and breaks in series. It is not a documented public API, so identifiers or access could change; the fetch fails loudly and leaves the old snapshot in place if anything is missing.

## Refreshing the figures

```bash
npm install
npm run refresh    # fetch a new snapshot, then rebuild docs/
```

Then commit `data/` and `docs/`. The status strip on every page shows the date of the snapshot.

## Building locally

```bash
npm install
npm run build      # writes docs/ from data/snapshot.json
npm run preview    # serves docs/ at http://localhost:8080
```

`docs/` is generated and safe to delete; the build recreates it (it refuses to overwrite a `docs/` folder it did not create). The build checks every internal link and fails if one is broken.

## Publishing on GitHub Pages

1. Push the repository to GitHub (including the `docs/` folder).
2. In the repository settings, open **Pages**, choose **Deploy from a branch**, branch `main`, folder `/docs`.
3. The site appears at `https://<user>.github.io/<repository>/`. All links are relative, so no base-path configuration is needed.

## Changing what is shown

`src/lib/catalog.mjs` lists the themes, the indicators and the breakdowns on country briefings. Each entry names the UHC Watch data element it reads and carries the plain-language wording. To add an indicator, add an entry, then run `npm run refresh`.

Three things in the data need care, and the code handles each explicitly:

- **Latest year differs by country.** Rankings and key figures use each country's most recent value and always show its year.
- **Values filled forward.** UHC Watch repeats the last value of some series in years without new data. The fetch warns when a data element looks filled forward; mark it `dedupe: true` in the catalog (only the first year of each run is kept) or `stable: true` if the repeats are real.
- **Catastrophic spending by consumption fifth.** UHC Watch stores each fifth's contribution to the national figure (the five add up to it). The site multiplies by five to show the share of households affected within each fifth, as UHC Watch does for the poorest fifth, and says so under the chart.

Netherlands and Norway are flagged as not comparable on household budget survey indicators, following UHC Watch's notes, and are left out of ranks and medians.

## Design notes

- The layout follows the Delirium policy microsite: components from [nhsuk-frontend](https://github.com/nhsuk/nhsuk-frontend) 10.x (MIT), a white header, a status strip on every page, full-width navigation rows, collapsible blocks with blue button headings, and a bottom bar on phones and tablets.
- **No NHS identity.** This is not an NHS service, so the NHS logo, a Trust lock-up and the Frutiger font (licensed for NHS organisations only) are not used. Text is set in Arial, nhsuk's own fallback. If the site is published by an NHS organisation, the logo and font can be restored in `src/lib/html.mjs` and `src/styles/app.scss`.
- Body text is 18px with 1.5 line spacing on phones, 19px on larger screens. Navigation rows are at least 48px tall.
- Amber is reserved for the "Unofficial" status. Charts never use red or green for series, so no colour reads as good or bad.
- Bars are plain HTML with the value written on every row, so they reflow at 320px, print, and read in order with a screen reader. Line charts are SVG drawn in the browser; each has the same figures in a table underneath, and a read-out on hover, touch and keyboard (arrow keys).
- Chart colours are NHS palette colours in a fixed order, checked for colour-blind separation: `#005eb8 #ed8b00 #ae2573 #41b6e6 #78be20 #00a499`. Changing the order or the colours needs re-checking.

## Project layout

```
data/snapshot.json              copy of the UHC Watch API (source of every figure)
src/fetch.mjs                   takes the snapshot
src/build.mjs                   build script (snapshot → docs/, Sass, assets, link check)
src/lib/catalog.mjs             themes, indicators, breakdowns and their wording
src/lib/data.mjs                series, latest values, ranks and medians from the snapshot
src/lib/context.mjs             country names and URLs, chart colours, rank wording
src/lib/html.mjs                nhsuk component markup, key figures, bars, chart figures, page shell
src/lib/markdown.mjs            renders UHC Watch's country text (escaped, links checked)
src/lib/site.mjs                URLs
src/pages/                      homepage, countries, indicators, compare and about
src/styles/app.scss             styles (imports nhsuk-frontend)
src/js/charts.js                line charts and their read-out
src/js/app.js                   collapsible blocks, the remembered country, picker and filter
src/js/compare.js               the compare page
docs/                           generated site (GitHub Pages)
```
