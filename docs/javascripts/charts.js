/* Line charts drawn as SVG from the JSON beside each plot.

   Every chart is sized to its container, so it is redrawn when the container
   changes width (phone rotation, a collapsible block opening). Hovering,
   touching or focusing a plot shows one read-out for the nearest year with
   every series in it; the same figures are always in the table under the
   chart, so nothing depends on the read-out.

   Two kinds of chart data:
   - { kind: 'line', unit, series: [{ name, color, points, context }], breaks }
   - { kind: 'focus', unit, countries: [{ iso, name, points, comparable }], median, focus }
     every country as a grey line, the country in focus in blue, and the
     median line when the build supplies one. */
(function () {
  var NS = 'http://www.w3.org/2000/svg'
  var BLUE = '#005eb8'
  var CONTEXT = '#aeb7bd'
  var REFERENCE = '#212b32' // the median line: clearly apart from the blue
  var INK = '#4c6272' // crosshair and break markers
  var GRID = '#d8dde0'
  var AXIS = '#aeb7bd'

  function svgEl(name, attrs, parent) {
    var node = document.createElementNS(NS, name)
    for (var k in attrs) node.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(node)
    return node
  }

  function htmlEl(name, className, parent, text) {
    var node = document.createElement(name)
    if (className) node.className = className
    if (text != null) node.textContent = text
    if (parent) parent.appendChild(node)
    return node
  }

  function fmt(v) {
    if (v == null || isNaN(v)) return '–'
    return v.toFixed(1).replace(/^-/, '−')
  }

  function tickLabel(v, step) {
    return step < 1 ? v.toFixed(1) : String(Math.round(v))
  }

  /** About `count` round steps from 0 to at least `max`. */
  function niceScale(max, count) {
    if (!(max > 0)) max = 1
    var raw = max / count
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10))
    var norm = raw / mag
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
    var top = Math.ceil(max / step - 1e-9) * step
    var ticks = []
    for (var v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
    return { top: top, step: step, ticks: ticks }
  }

  function valueAt(points, year) {
    for (var i = 0; i < points.length; i++) if (points[i][0] === year) return points[i][1]
    return null
  }

  /** Turn 'focus' data into plain series, plus what the read-out needs. */
  function resolve(data) {
    if (data.kind !== 'focus') return { series: data.series, readout: null }
    var comparable = data.countries.filter(function (c) { return c.comparable !== false })
    var byYear = {}
    comparable.forEach(function (c) {
      c.points.forEach(function (p) { (byYear[p[0]] = byYear[p[0]] || []).push(p[1]) })
    })
    // The build works out the median, and leaves it out when too few
    // countries report in most years
    var medianPoints = data.median || []
    var series = data.countries
      .filter(function (c) { return c.iso !== data.focus })
      .map(function (c) { return { name: c.name, color: CONTEXT, points: c.points, context: true } })
    var focus = data.countries.filter(function (c) { return c.iso === data.focus })[0]
    if (focus) series.push({ name: focus.name, color: BLUE, points: focus.points })
    if (medianPoints.length > 1) series.push({ name: 'Median of countries with data', color: REFERENCE, points: medianPoints, reference: true })
    return { series: series, readout: { byYear: byYear } }
  }

  function draw(plot) {
    var data = plot._chartData
    if (!data) return
    var width = Math.floor(plot.clientWidth)
    if (!width) return // inside a closed block; drawn when it opens
    plot._drawnWidth = width

    var resolved = resolve(data)
    var series = resolved.series.filter(function (s) { return s.points.length })
    var named = series.filter(function (s) { return !s.context })
    plot.textContent = ''
    if (!series.length) {
      htmlEl('p', 'app-chart__note', plot, 'No data to plot.')
      return
    }

    var years = []
    var maxValue = 0
    series.forEach(function (s) {
      s.points.forEach(function (p) {
        if (years.indexOf(p[0]) < 0) years.push(p[0])
        if (p[1] > maxValue) maxValue = p[1]
      })
    })
    years.sort(function (a, b) { return a - b })
    var firstYear = years[0]
    var lastYear = years[years.length - 1]
    if (firstYear === lastYear) { firstYear -= 1; lastYear += 1 }

    var compact = width < 520
    var height = compact ? 230 : 300
    var scale = niceScale(maxValue, compact ? 4 : 5)
    var longest = scale.ticks.reduce(function (n, t) { return Math.max(n, tickLabel(t, scale.step).length) }, 1)
    var m = { top: 14, right: 14, bottom: 30, left: 10 + longest * 8 }
    var innerW = width - m.left - m.right
    var innerH = height - m.top - m.bottom
    var x = function (year) { return m.left + ((year - firstYear) / (lastYear - firstYear)) * innerW }
    var y = function (value) { return m.top + innerH - (value / scale.top) * innerH }

    var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, width: width, height: height, 'aria-hidden': 'true', focusable: 'false' }, plot)

    // Grid and value axis
    scale.ticks.forEach(function (t) {
      svgEl('line', { x1: m.left, x2: width - m.right, y1: y(t), y2: y(t), stroke: t === 0 ? AXIS : GRID, 'stroke-width': 1 }, svg)
      var label = svgEl('text', { x: m.left - 8, y: y(t) + 4, 'text-anchor': 'end' }, svg)
      label.textContent = tickLabel(t, scale.step)
    })

    // Year axis: as many labels as fit
    var span = lastYear - firstYear
    var step = [1, 2, 5, 10, 20].filter(function (s) { return (span / s) * 44 <= innerW })[0] || 20
    for (var yr = Math.ceil(firstYear / step) * step; yr <= lastYear; yr += step) {
      svgEl('line', { x1: x(yr), x2: x(yr), y1: m.top + innerH, y2: m.top + innerH + 5, stroke: AXIS, 'stroke-width': 1 }, svg)
      var yl = svgEl('text', { x: x(yr), y: height - 8, 'text-anchor': 'middle' }, svg)
      yl.textContent = yr
    }

    // Breaks in series: figures either side are not comparable
    ;(data.breaks || []).forEach(function (b) {
      if (b <= firstYear || b > lastYear) return
      var bx = x(b - 0.5)
      svgEl('line', { x1: bx, x2: bx, y1: m.top, y2: m.top + innerH, stroke: INK, 'stroke-width': 1 }, svg)
      var bl = svgEl('text', { x: bx + 4, y: m.top + 10 }, svg)
      bl.textContent = 'break'
    })

    // Lines: context first, so the named series sit on top
    series.forEach(function (s) {
      if (!s.context) return
      svgEl('path', { d: pathFor(s.points, x, y), fill: 'none', stroke: s.color, 'stroke-width': 1, 'stroke-opacity': 0.55, 'stroke-linejoin': 'round' }, svg)
    })
    named.slice().sort(function (a, b) { return (b.reference ? 1 : 0) - (a.reference ? 1 : 0) }).forEach(function (s) {
      svgEl('path', { d: pathFor(s.points, x, y), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg)
      // Survey years are irregular: mark each one when there are few enough to read
      var sparse = s.points.length <= 14 && !s.reference
      s.points.forEach(function (p, i) {
        var last = i === s.points.length - 1
        if (!sparse && !last) return
        svgEl('circle', { cx: x(p[0]), cy: y(p[1]), r: last ? 4.5 : 3.5, fill: s.color, stroke: '#ffffff', 'stroke-width': 2 }, svg)
      })
    })

    // Read-out layer
    var cross = svgEl('line', { y1: m.top, y2: m.top + innerH, stroke: INK, 'stroke-width': 1, visibility: 'hidden' }, svg)
    var dots = named.map(function (s) {
      return svgEl('circle', { r: 5.5, fill: s.color, stroke: '#ffffff', 'stroke-width': 2, visibility: 'hidden' }, svg)
    })
    var tip = htmlEl('div', 'app-chart__tooltip', plot)
    tip.hidden = true

    // Years the read-out can land on: those where a named series has a value
    var stops = []
    ;(named.length ? named : series).forEach(function (s) {
      s.points.forEach(function (p) { if (stops.indexOf(p[0]) < 0) stops.push(p[0]) })
    })
    stops.sort(function (a, b) { return a - b })
    var current = -1

    function show(index) {
      current = Math.max(0, Math.min(stops.length - 1, index))
      var year = stops[current]
      var cx = x(year)
      cross.setAttribute('x1', cx)
      cross.setAttribute('x2', cx)
      cross.setAttribute('visibility', 'visible')
      tip.textContent = ''
      htmlEl('div', 'app-chart__tooltip-year', tip, String(year))
      named.forEach(function (s, i) {
        var v = valueAt(s.points, year)
        if (v == null) { dots[i].setAttribute('visibility', 'hidden'); return }
        dots[i].setAttribute('cx', cx)
        dots[i].setAttribute('cy', y(v))
        dots[i].setAttribute('visibility', 'visible')
        var row = htmlEl('div', 'app-chart__tooltip-row', tip)
        var key = htmlEl('span', 'app-chart__tooltip-key', row)
        key.style.setProperty('--c', s.color)
        htmlEl('span', 'app-chart__tooltip-value', row, fmt(v))
        htmlEl('span', 'app-chart__tooltip-name', row, s.name)
      })
      if (resolved.readout) {
        var all = resolved.readout.byYear[year] || []
        if (all.length > 1) {
          var lo = Math.min.apply(null, all)
          var hi = Math.max.apply(null, all)
          htmlEl('div', 'app-chart__tooltip-row', tip, all.length + ' countries: ' + fmt(lo) + ' to ' + fmt(hi))
        }
      }
      tip.hidden = false
      var tw = tip.offsetWidth
      var left = cx + 12
      if (left + tw > width) left = cx - 12 - tw
      if (left < 0) left = 0
      tip.style.transform = 'translate(' + Math.round(left) + 'px,' + (m.top + 2) + 'px)'
    }

    function hide() {
      current = -1
      cross.setAttribute('visibility', 'hidden')
      dots.forEach(function (d) { d.setAttribute('visibility', 'hidden') })
      tip.hidden = true
    }

    function nearest(clientX) {
      var rect = plot.getBoundingClientRect()
      var px = clientX - rect.left
      var best = 0
      var bestDist = Infinity
      stops.forEach(function (yr, i) {
        var d = Math.abs(x(yr) - px)
        if (d < bestDist) { bestDist = d; best = i }
      })
      return best
    }

    plot.onpointermove = function (ev) { show(nearest(ev.clientX)) }
    plot.onpointerdown = function (ev) { show(nearest(ev.clientX)) }
    plot.onpointerleave = function (ev) { if (ev.pointerType === 'mouse') hide() }
    plot.onfocus = function () { if (current < 0) show(stops.length - 1) }
    plot.onblur = hide
    plot.onkeydown = function (ev) {
      if (ev.key === 'ArrowLeft') { show((current < 0 ? stops.length : current) - 1); ev.preventDefault() }
      else if (ev.key === 'ArrowRight') { show(current < 0 ? stops.length - 1 : current + 1); ev.preventDefault() }
      else if (ev.key === 'Home') { show(0); ev.preventDefault() }
      else if (ev.key === 'End') { show(stops.length - 1); ev.preventDefault() }
      else if (ev.key === 'Escape') hide()
    }
    plot._hideReadout = hide
  }

  function pathFor(points, x, y) {
    return points.map(function (p, i) { return (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1) }).join(' ')
  }

  /** Attach chart data to a plot element and draw it. */
  function mount(plot, data) {
    plot._chartData = data
    draw(plot)
    if (plot._observed) return
    plot._observed = true
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        if (Math.floor(plot.clientWidth) !== plot._drawnWidth) draw(plot)
      }).observe(plot)
    } else {
      window.addEventListener('resize', function () { draw(plot) })
    }
  }

  function mountAll(rootNode) {
    Array.prototype.forEach.call((rootNode || document).querySelectorAll('[data-chart]'), function (plot) {
      if (plot._chartData) return
      var script = plot.parentElement.querySelector('script.app-chart__data')
      if (!script) return
      try { mount(plot, JSON.parse(script.textContent)) } catch (e) { /* leave the table to carry the figures */ }
    })
  }

  // A touch outside any plot dismisses an open read-out
  document.addEventListener('pointerdown', function (ev) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-chart]'), function (plot) {
      if (plot._hideReadout && !plot.contains(ev.target)) plot._hideReadout()
    })
  })

  window.UHCCharts = { mount: mount, mountAll: mountAll, redraw: draw, fmt: fmt }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAll() })
  else mountAll()
})()
