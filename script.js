/* =========================================================
   PORTFOLIO YANIS
   1. Morphing de thème piloté par le scroll
   2. Décor réseau (canvas)
   3. Session terminal
   4. Compteurs
========================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     1. THÈMES ET MORPHING
     Chaque chapitre a sa palette. Plutôt que de basculer d'un
     coup à la frontière, on interpole les deux palettes
     voisines sur une bande centrée sur la frontière : le
     décor se transforme pendant qu'on scrolle, sans jamais
     bloquer ni détourner le défilement.
  ========================================================= */
  var THEMES = {
    boot: {
      bg: '#05070d', fg: '#e6edf3', muted: '#8b9bb0',
      accent: '#22c55e', accent2: '#38bdf8',
      onAccent: '#04140a', surface: '#0e1422', line: '#1e2a3d'
    },
    campus: {
      bg: '#f2efe4', fg: '#1b2430', muted: '#55637a',
      accent: '#2563eb', accent2: '#dc2626',
      onAccent: '#ffffff', surface: '#fbfaf5', line: '#ccd4e0'
    },
    ide: {
      bg: '#0d1117', fg: '#e6edf3', muted: '#8b949e',
      accent: '#58a6ff', accent2: '#f78166',
      onAccent: '#04121f', surface: '#161b22', line: '#2a3038'
    },
    blueprint: {
      bg: '#0a3a63', fg: '#eaf4ff', muted: '#a8c8e8',
      accent: '#7dd3fc', accent2: '#ffffff',
      onAccent: '#052436', surface: '#0d4677', line: '#2a6ca3'
    },
    link: {
      bg: '#05070d', fg: '#e6edf3', muted: '#8b9bb0',
      accent: '#22c55e', accent2: '#38bdf8',
      onAccent: '#04140a', surface: '#0e1422', line: '#1e2a3d'
    }
  };

  var KEYS = ['bg', 'fg', 'muted', 'accent', 'accent2', 'onAccent', 'surface', 'line'];
  var VARS = {
    bg: '--bg', fg: '--fg', muted: '--muted', accent: '--accent',
    accent2: '--accent-2', onAccent: '--on-accent',
    surface: '--surface', line: '--line'
  };

  var root = document.documentElement;
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
  var layers = {};
  Array.prototype.forEach.call(document.querySelectorAll('.layer'), function (el) {
    layers[el.dataset.layer] = el;
  });
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var progress = document.getElementById('scroll-bar-fill');

  function hexToRgb(h) {
    return [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16)
    ];
  }

  // pré-calcul des composantes pour éviter de reparser à chaque frame
  var RGB = {};
  Object.keys(THEMES).forEach(function (name) {
    RGB[name] = {};
    KEYS.forEach(function (k) { RGB[name][k] = hexToRgb(THEMES[name][k]); });
  });

  function mix(a, b, t) {
    return 'rgb(' +
      Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  var bounds = [];
  function measure() {
    var y = window.scrollY;
    bounds = chapters.map(function (el) {
      var r = el.getBoundingClientRect();
      return { top: r.top + y, bottom: r.bottom + y, theme: el.dataset.theme };
    });
  }

  // couleur d'accent courante, relue par le canvas
  var currentAccent = RGB.boot.accent;

  function apply() {
    if (!bounds.length) return;

    var vh = window.innerHeight;
    var anchor = window.scrollY + vh * 0.42;

    // chapitre contenant le point d'ancrage
    var i = 0;
    for (var k = 0; k < bounds.length; k++) {
      if (anchor >= bounds[k].top) i = k;
    }

    var band = Math.min(420, vh * 0.55);
    var half = band / 2;
    var other = i;
    var f = 0;

    if (i + 1 < bounds.length && anchor > bounds[i].bottom - half) {
      other = i + 1;
      f = (anchor - (bounds[i].bottom - half)) / band;
    } else if (i > 0 && anchor < bounds[i].top + half) {
      other = i - 1;
      f = (bounds[i].top + half - anchor) / band;
    }
    f = Math.max(0, Math.min(1, f));
    if (reduced) { other = i; f = 0; }

    var from = RGB[bounds[i].theme];
    var to = RGB[bounds[other].theme];

    for (var n = 0; n < KEYS.length; n++) {
      var key = KEYS[n];
      root.style.setProperty(VARS[key], mix(from[key], to[key], f));
    }

    // le décor suit la même pondération
    var wA = 1 - f, wB = f;
    Object.keys(layers).forEach(function (name) {
      var o = 0;
      if (name === bounds[i].theme) o += wA;
      if (name === bounds[other].theme) o += wB;
      layers[name].style.opacity = o;
    });

    currentAccent = [
      Math.round(from.accent[0] + (to.accent[0] - from.accent[0]) * f),
      Math.round(from.accent[1] + (to.accent[1] - from.accent[1]) * f),
      Math.round(from.accent[2] + (to.accent[2] - from.accent[2]) * f)
    ];

    // chapitre courant dans le rail et la navigation
    for (var r = 0; r < railLinks.length; r++) {
      railLinks[r].classList.toggle('current', r === i);
    }
    var id = chapters[i].id;
    for (var m = 0; m < navLinks.length; m++) {
      navLinks[m].classList.toggle('current', navLinks[m].getAttribute('href') === '#' + id);
    }

    if (progress) {
      var max = document.documentElement.scrollHeight - vh;
      progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { apply(); ticking = false; });
  }

  measure();
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); apply(); });
  window.addEventListener('load', function () { measure(); apply(); });

  /* =========================================================
     2. DÉCOR RÉSEAU
  ========================================================= */
  var canvas = document.getElementById('net-canvas');
  if (canvas && !reduced) {
    var ctx = canvas.getContext('2d');
    var nodes = [];
    var W = 0, H = 0, LINK = 140;

    function sizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      LINK = W < 760 ? 100 : 140;
      var density = W < 760 ? 26000 : 18000;
      var count = Math.min(70, Math.floor((W * H) / density));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: 1 + Math.random() * 1.4
        });
      }
    }

    function draw() {
      var c = currentAccent.join(',');
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      ctx.lineWidth = 1;
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x;
          var dy = nodes[a].y - nodes[b].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(' + c + ',' + (0.16 * (1 - d / LINK)).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(nodes[a].x, nodes[a].y);
            ctx.lineTo(nodes[b].x, nodes[b].y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = 'rgba(' + c + ',.5)';
      for (var p = 0; p < nodes.length; p++) {
        ctx.beginPath();
        ctx.arc(nodes[p].x, nodes[p].y, nodes[p].r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!document.hidden) requestAnimationFrame(draw);
    }

    sizeCanvas();
    requestAnimationFrame(draw);
    window.addEventListener('resize', sizeCanvas);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) requestAnimationFrame(draw);
    });
  }

  /* =========================================================
     3. SESSION TERMINAL
  ========================================================= */
  var term = document.getElementById('terminal-body');
  if (term) {
    var LINES = [
      { t: 'cmd', text: 'nmap -sS -sV 10.10.20.0/24' },
      { t: 'out', text: 'Nmap scan report for 10.10.20.14', cls: 'dim' },
      { t: 'out', text: '22/tcp   open  ssh     OpenSSH 8.9', cls: 'dim' },
      { t: 'out', text: '80/tcp   open  http    nginx 1.24', cls: 'dim' },
      { t: 'out', text: '443/tcp  open  https   nginx 1.24', cls: 'dim' },
      { t: 'cmd', text: 'ssh root@10.10.20.14' },
      { t: 'out', text: 'Permission denied (publickey).', cls: 'err' },
      { t: 'cmd', text: 'python3 parse_scan.py --xml scan.xml' },
      { t: 'out', text: '[+] 254 hotes analyses .......... OK', cls: 'ok' },
      { t: 'out', text: '[+] 37 services identifies ...... OK', cls: 'ok' },
      { t: 'out', text: '[+] export -> rapport.html', cls: 'ok' }
    ];
    var PROMPT = '<span class="t-prompt">[yanis@lab ~]$ </span>';

    var esc = function (s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    var fmt = function (l) {
      return l.t === 'cmd'
        ? PROMPT + esc(l.text)
        : '<span class="' + (l.cls || '') + '">' + esc(l.text) + '</span>';
    };

    if (reduced) {
      term.innerHTML = LINES.map(fmt).join('\n') + '\n' + PROMPT;
    } else {
      var idx = 0, done = '';
      var paint = function (partial) {
        term.innerHTML = done + partial + '<span class="t-cursor">&#9614;</span>';
      };
      var next = function () {
        if (idx >= LINES.length) { paint(PROMPT); return; }
        var l = LINES[idx++];
        if (l.t === 'cmd') {
          var i = 0;
          var type = function () {
            if (i <= l.text.length) {
              paint(PROMPT + esc(l.text.slice(0, i)));
              i++;
              setTimeout(type, 26 + Math.random() * 34);
            } else {
              done += fmt(l) + '\n';
              setTimeout(next, 280);
            }
          };
          type();
        } else {
          done += fmt(l) + '\n';
          paint('');
          setTimeout(next, 200 + Math.random() * 220);
        }
      };
      paint('');
      setTimeout(next, 400);
    }
  }

  /* =========================================================
     4. COMPTEURS
  ========================================================= */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (counters.length) {
    var nf = new Intl.NumberFormat('fr-FR');
    counters.forEach(function (el) {
      var target = parseInt(el.dataset.count, 10);
      if (reduced) { el.textContent = nf.format(target); return; }
      var t0 = null;
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 1100);
        el.textContent = nf.format(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
})();
