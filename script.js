/* =========================================
   PORTFOLIO - interactions
   1. Fond réseau animé (canvas)
   2. Terminal auto-typé (hero)
   3. Tilt 3D des cartes
   4. Compteurs animés
   5. Révélation au scroll
========================================= */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* =========================================
     1. Fond réseau animé - nœuds + liens
  ========================================= */
  const canvas = document.getElementById('net-canvas');
  if (canvas && !reducedMotion) {
    const ctx = canvas.getContext('2d');
    let nodes = [];
    let W = 0, H = 0;
    let LINK_DIST = 140;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      // moins de nœuds et de liens sur petit écran : le maillage reste lisible
      // et la boucle de rendu (O(n²)) reste peu coûteuse sur mobile
      LINK_DIST = W < 760 ? 105 : 140;
      const density = W < 760 ? 22000 : 16000;
      const count = Math.min(90, Math.floor((W * H) / density));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 1.6
      }));
    }

    function step() {
      ctx.clearRect(0, 0, W, H);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = 'rgba(0,229,255,' + (0.10 * (1 - d / LINK_DIST)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        // lien vers le curseur : le visiteur fait partie du réseau
        const n = nodes[i];
        const dm = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (dm < LINK_DIST * 1.4) {
          ctx.strokeStyle = 'rgba(139,92,246,' + (0.18 * (1 - dm / (LINK_DIST * 1.4))).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = 'rgba(0,229,255,.45)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!document.hidden) requestAnimationFrame(step);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) requestAnimationFrame(step);
    });
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseout', () => { mouse.x = -9999; mouse.y = -9999; });

    resize();
    requestAnimationFrame(step);
  }

  /* =========================================
     2. Terminal auto-typé
  ========================================= */
  const term = document.getElementById('terminal-body');
  if (term) {
    // type: 'cmd' -> tapé caractère par caractère, 'out' -> affiché d'un bloc
    const SCRIPT = [
      { t: 'cmd', text: 'nmap -sS -sV 10.10.20.0/24' },
      { t: 'out', text: 'Nmap scan report for 10.10.20.14', cls: 'dim' },
      { t: 'out', text: '22/tcp   open  ssh     OpenSSH 8.9', cls: 'dim' },
      { t: 'out', text: '80/tcp   open  http    nginx 1.24', cls: 'dim' },
      { t: 'out', text: '443/tcp  open  https   nginx 1.24', cls: 'dim' },
      { t: 'cmd', text: 'ssh root@10.10.20.14' },
      { t: 'out', text: 'Permission denied (publickey).', cls: 'err' },
      { t: 'cmd', text: 'python3 parse_scan.py --xml scan.xml' },
      { t: 'out', text: '[+] 254 hôtes analysés .......... OK', cls: 'ok' },
      { t: 'out', text: '[+] 37 services identifiés ...... OK', cls: 'ok' },
      { t: 'out', text: '[+] export -> rapport.html', cls: 'ok' }
    ];
    const PROMPT = '<span class="t-prompt">[yanis@lab ~]$ </span>';

    if (reducedMotion) {
      term.innerHTML = SCRIPT.map((l) =>
        l.t === 'cmd'
          ? PROMPT + escapeHtml(l.text)
          : '<span class="' + (l.cls || '') + '">' + escapeHtml(l.text) + '</span>'
      ).join('\n') + '\n' + PROMPT + '<span class="t-cursor">▊</span>';
    } else {
      let line = 0;
      let done = '';
      const started = { v: false };

      const start = () => {
        if (started.v) return;
        started.v = true;
        setTimeout(nextLine, 500);
      };

      if (inViewport(term)) {
        start();
      } else {
        const io = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            start();
            io.disconnect();
          }
        }, { threshold: 0.3 });
        io.observe(term);
      }

      function render(partial) {
        term.innerHTML = done + partial + '<span class="t-cursor">▊</span>';
      }

      function nextLine() {
        if (line >= SCRIPT.length) {
          render(PROMPT);
          return;
        }
        const l = SCRIPT[line++];
        if (l.t === 'cmd') {
          let i = 0;
          const typed = () => {
            if (i <= l.text.length) {
              render(PROMPT + escapeHtml(l.text.slice(0, i)));
              i++;
              setTimeout(typed, 28 + Math.random() * 40);
            } else {
              done += PROMPT + escapeHtml(l.text) + '\n';
              setTimeout(nextLine, 320);
            }
          };
          typed();
        } else {
          done += '<span class="' + (l.cls || '') + '">' + escapeHtml(l.text) + '</span>\n';
          render('');
          setTimeout(nextLine, 220 + Math.random() * 260);
        }
      }
    }
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  /* =========================================
     3. Tilt 3D des cartes
  ========================================= */
  if (!reducedMotion && !isTouch) {
    const MAX_TILT = 7;
    document.querySelectorAll('.tilt, .terminal').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(800px) rotateX(' + (-py * MAX_TILT).toFixed(2) + 'deg)' +
          ' rotateY(' + (px * MAX_TILT).toFixed(2) + 'deg) translateY(-4px)';
        card.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* =========================================
     4. Compteurs animés
  ========================================= */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const fmt = new Intl.NumberFormat('fr-FR');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        io.unobserve(el);
        if (reducedMotion) { el.textContent = fmt.format(target); return; }
        const t0 = performance.now();
        const DUR = 1400;
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / DUR);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt.format(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => io.observe(c));
  }

  /* =========================================
     5. Révélation au scroll
  ========================================= */
  const revealEls = document.querySelectorAll('.reveal');
  if (reducedMotion) {
    revealEls.forEach((el) => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    // révélation immédiate de ce qui est déjà à l'écran,
    // l'observer ne gère que ce qui arrive au scroll
    revealEls.forEach((el) => {
      if (inViewport(el)) {
        el.classList.add('visible');
      } else {
        io.observe(el);
      }
    });
  }
})();
