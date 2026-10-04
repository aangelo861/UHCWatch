/**
 * Site map: every page URL in one place, plus helpers for relative links.
 *
 * All output URLs are flat `.html` files so the site works from GitHub Pages
 * (project sub-path) and from a plain local file server without any base-path
 * configuration.
 */
import path from 'node:path'

export const urls = {
  hub: 'index.html',
  countries: 'countries.html',
  indicators: 'indicators.html',
  compare: 'compare.html',
  about: 'about.html',
  compareData: 'data/compare.json',
  country: (slug) => `country/${slug}.html`,
  indicator: (key) => `indicator/${key}.html`,
  countryCsv: (slug) => `data/country/${slug}.csv`,
  indicatorCsv: (key) => `data/indicator/${key}.csv`
}

/** Prefix that reaches the site root from a page URL ("" or "../"). */
export function root(url) {
  const depth = url.split('/').length - 1
  return '../'.repeat(depth)
}

/** Relative href from one page URL to another (either may carry a ?query or #fragment). */
export function href(from, to) {
  const m = to.match(/^([^?#]*)(.*)$/)
  const [toPath, suffix] = [m[1], m[2]]
  if (suffix.startsWith('#') && toPath === from) return suffix
  const fromDir = path.posix.dirname(from)
  let rel = path.posix.relative(fromDir === '.' ? '' : fromDir, toPath)
  if (!rel) rel = path.posix.basename(toPath)
  return `${rel}${suffix}`
}

export const site = { urls, root, href }
