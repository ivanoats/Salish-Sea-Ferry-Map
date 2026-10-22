(function () {
  // Exported from the project's src/data (routes, terminals, baked route-leg geometry).
  var DATA = {"ops": {"wsf": {"n": "WSF", "c": "#2563eb", "k": 9}, "bc-ferries": {"n": "BC Ferries", "c": "#7c3aed", "k": 23}, "black-ball": {"n": "Black Ball", "c": "#dc2626", "k": 1}, "king-county-water-taxi": {"n": "King County Water Taxi", "c": "#0284c7", "k": 2}, "kitsap-transit": {"n": "Kitsap Transit", "c": "#16a34a", "k": 5}, "pierce-county": {"n": "Pierce County", "c": "#db2777", "k": 1}, "victoria-clipper": {"n": "Victoria Clipper", "c": "#d97706", "k": 1}, "skagit-county": {"n": "Guemes Ferry", "c": "#0f766e", "k": 1}, "whatcom-county": {"n": "Whatcom Chief", "c": "#57534e", "k": 1}, "harbor-hopper": {"n": "Harbor Hopper", "c": "#0891b2", "k": 1}, "hat-island-ferry": {"n": "Hat Island Ferry", "c": "#65a30d", "k": 1}, "puget-sound-express": {"n": "Puget Sound Express", "c": "#a21caf", "k": 1}, "hullo": {"n": "Hullo", "c": "#ea580c", "k": 1}, "translink": {"n": "SeaBus", "c": "#854d0e", "k": 1}, "aquabus": {"n": "Aquabus", "c": "#e11d48", "k": 1}, "false-creek-ferries": {"n": "False Creek Ferries", "c": "#4f46e5", "k": 2}, "port-of-everett": {"n": "Jetty Island Ferry", "c": "#ca8a04", "k": 1}, "herron-island": {"n": "Herron Island Ferry", "c": "#9a3412", "k": 1}, "sidney-spit-ferry": {"n": "Sidney Spit Ferry", "c": "#0d9488", "k": 1}, "dinghy-dock-pub": {"n": "Protection Island Ferry", "c": "#92400e", "k": 1}, "saysutshun-ferry": {"n": "Saysutshun Ferry", "c": "#047857", "k": 1}, "lund-water-taxi": {"n": "Lund Water Taxi", "c": "#be185d", "k": 1}, "big-animal-encounters": {"n": "Hornby Island Water Taxi", "c": "#1d4ed8", "k": 1}}};
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e); return e;
  }

  // Operator wall (slide 3), largest operators first.
  var wall = document.getElementById('op-wall');
  if (wall) {
    Object.keys(DATA.ops).map(function (k) { return DATA.ops[k]; })
      .sort(function (a, b) { return b.k - a.k || a.n.localeCompare(b.n); })
      .forEach(function (o) {
        var li = document.createElement('li');
        li.style.setProperty('--c', o.c);
        li.textContent = o.n;
        wall.appendChild(li);
      });
  }

  var svg = document.getElementById('ferry-svg');
  if (!svg) return;
  var LON0 = -125.34, LAT1 = 50.18, K = 208, KX = K * Math.cos(48.65 * Math.PI / 180);
  function px(p) { return [(p[0] - LON0) * KX + 8, (LAT1 - p[1]) * K + 8]; }

  var a = px([-123.09, 49.0]), b = px([-122.15, 49.0]);
  el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], 'class': 'border' }, svg);
  var bl = el('text', { x: b[0] - 40, y: a[1] - 6, 'class': 'country' }, svg); bl.textContent = '49°N';
  var ca = el('text', { x: 330, y: 60, 'class': 'country' }, svg); ca.textContent = 'CANADA';
  var us = el('text', { x: 290, y: 560, 'class': 'country' }, svg); us.textContent = 'USA';

  var big = { 'bc-ferries': 0, wsf: 1 };
  var legs = DATA.legs.slice().sort(function (x, y) { return (x.o in big ? 0 : 1) - (y.o in big ? 0 : 1); });
  legs.forEach(function (leg, i) {
    var d = leg.c.map(function (p, j) { var q = px(p); return (j ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    var running = leg.s === 'active';
    var path = el('path', { d: d, 'class': 'route' + (running ? ' draw' : ''), stroke: DATA.ops[leg.o].c }, svg);
    if (running) path.setAttribute('pathLength', 1);
    else path.setAttribute('stroke-dasharray', '5 4');
    path.style.setProperty('--d', (i * 0.012).toFixed(3) + 's');
  });
  DATA.terms.forEach(function (t) { var p = px(t); el('circle', { cx: p[0], cy: p[1], r: 2.4, 'class': 'terminal' }, svg); });

  var LABELS = [
    [[-122.339, 47.602], 'Seattle', 8, 4], [[-123.372, 48.423], 'Victoria', -58, 6],
    [[-123.109, 49.287], 'Vancouver', 8, -6], [[-123.956, 49.193], 'Nanaimo', -62, -4],
    [[-123.431, 48.122], 'Port Angeles', -40, 18], [[-122.679, 48.508], 'Anacortes', 8, 12],
    [[-122.760, 48.113], 'Port Townsend', -100, 4], [[-124.531, 49.835], 'Powell River', 8, -6],
    [[-122.515, 47.305], 'Tacoma', 8, 10], [[-125.242, 50.028], 'Campbell River', 8, 14],
    [[-122.224, 47.997], 'Everett', 8, 4]
  ];
  LABELS.forEach(function (l) { var p = px(l[0]); var t = el('text', { x: p[0] + l[2], y: p[1] + l[3], 'class': 'label' }, svg); t.textContent = l[1]; });
})();
