/* CLEAN GYM: interactions
   reveal on people, smoke, glass tilt, cursor, text rolls, scroll reveals */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* ---------- small text helpers ---------- */
  $$('[data-roll]').forEach(a => {
    const t = a.textContent.trim();
    a.textContent = '';
    a.append(Object.assign(document.createElement('span'), { textContent: t }));
    a.append(Object.assign(document.createElement('span'), { textContent: t }));
    a.setAttribute('aria-label', t);
  });
  $$('[data-split]').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });
  $$('.wordmark span').forEach((s, i) => s.style.setProperty('--i', i));
  $$('.glass').forEach(g => g.prepend(Object.assign(document.createElement('span'), { className: 'sheen' })));

  /* ---------- load sequence ---------- */
  const heroImgs = $$('.hero img');
  Promise.all(heroImgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))
    .then(() => requestAnimationFrame(() => document.body.classList.add('is-loaded')));
  setTimeout(() => document.body.classList.add('is-loaded'), 2500); // never hold the page hostage

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();
  const burger = $('.burger'), menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- scroll reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal], [data-split]').forEach(el => io.observe(el));

  /* ---------- count-up ---------- */
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count;
    const run = () => {
      if (reduce) { el.textContent = to; return; }
      const t0 = performance.now(), d = 1800;
      const step = t => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    setTimeout(run, 1400);
  });

  /* ---------- people: cursor reveal ----------
     Each person has a dim base layer and a lit layer masked by a circle at --x/--y.
     Moving across the section lights a spotlight; pointing at the person themselves
     (alpha hit-test on the cut-out) opens the light fully. */
  const people = $$('[data-person]').map(fig => {
    const img = $('.person__lit', fig);
    const p = { fig, img, hit: null, open: false, section: fig.closest('section') };
    const build = () => {
      try {
        const c = document.createElement('canvas');
        const w = c.width = 120, h = c.height = Math.round(120 * img.naturalHeight / img.naturalWidth);
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        p.hit = (u, v) => {
          if (u < 0 || v < 0 || u > 1 || v > 1) return false;
          // sample a small neighbourhood so thin gaps between arm and body still count
          let a = 0;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const x = Math.min(w - 1, Math.max(0, Math.round(u * w) + dx)), y = Math.min(h - 1, Math.max(0, Math.round(v * h) + dy));
            a = Math.max(a, data[(y * w + x) * 4 + 3]);
          }
          return a > 80;
        };
      } catch (e) { // file:// taints the canvas: fall back to a central box
        p.hit = (u, v) => u > .15 && u < .85 && v > .02 && v < .9;
      }
    };
    img.complete ? build() : img.addEventListener('load', build, { once: true });
    return p;
  });

  const cursor = $('.cursor');
  let anyReveal = false;
  const updatePeople = (cx, cy) => {
    anyReveal = false;
    people.forEach(p => {
      const r = p.fig.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      p.fig.style.setProperty('--x', x + 'px');
      p.fig.style.setProperty('--y', y + 'px');
      const on = !!(p.hit && p.hit(x / r.width, y / r.height));
      if (on !== p.open) { p.open = on; p.fig.classList.toggle('is-open', on); }
      if (on) anyReveal = true;
    });
  };

  if (finePointer) {
    $$('section').forEach(s => {
      if (!$('[data-person]', s)) return;
      s.addEventListener('pointerenter', () => s.classList.add('is-pointer'));
      s.addEventListener('pointerleave', () => {
        s.classList.remove('is-pointer');
        $$('[data-person]', s).forEach(f => f.classList.remove('is-open'));
        people.forEach(p => { if (p.section === s) p.open = false; });
      });
    });
  } else {
    // touch: a slow light sweeps over each person while it is on screen; tap opens fully
    const visible = new Set();
    const vio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)), { threshold: .2 });
    people.forEach(p => {
      vio.observe(p.fig);
      p.section.classList.add('is-pointer');
      p.fig.addEventListener('click', () => p.fig.classList.toggle('is-open'));
    });
    if (!reduce) {
      const sweep = t => {
        people.forEach((p, i) => {
          if (!visible.has(p.fig)) return;
          const r = p.fig.getBoundingClientRect();
          const k = t / 2600 + i * 1.7;
          p.fig.style.setProperty('--x', (r.width * (.5 + .38 * Math.sin(k))) + 'px');
          p.fig.style.setProperty('--y', (r.height * (.35 + .22 * Math.sin(k * 1.6))) + 'px');
        });
        requestAnimationFrame(sweep);
      };
      requestAnimationFrame(sweep);
    } else {
      people.forEach(p => p.fig.classList.add('is-open'));
    }
  }

  /* ---------- custom cursor ---------- */
  let mx = innerWidth / 2, my = innerHeight / 2;
  if (finePointer) {
    root.classList.add('has-cursor');
    const dot = $('.cursor__dot'), ring = $('.cursor__ring');
    let rx = mx, ry = my;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      updatePeople(mx, my);
      const t = e.target;
      cursor.classList.toggle('is-reveal', anyReveal);
      cursor.classList.toggle('is-link', !anyReveal && !!t.closest('a, button, .glass[data-tilt]') && !t.closest('input'));
      cursor.classList.toggle('is-text', !!t.closest('input'));
    }, { passive: true });
    addEventListener('scroll', () => {
      updatePeople(mx, my);
      cursor.classList.toggle('is-reveal', anyReveal);
      if (anyReveal) cursor.classList.remove('is-link');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.style.opacity = 0);
    document.addEventListener('pointerenter', () => cursor.style.opacity = 1);
    const loop = () => {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- buttons: fill grows from where you enter, slight magnet ---------- */
  $$('.btn').forEach(b => {
    const set = e => { const r = b.getBoundingClientRect(); b.style.setProperty('--x', (e.clientX - r.left) + 'px'); b.style.setProperty('--y', (e.clientY - r.top) + 'px'); };
    b.addEventListener('pointerenter', set);
    b.addEventListener('pointerleave', e => { set(e); b.style.translate = ''; });
    if (finePointer && !reduce) b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * .12}px ${(e.clientY - r.top - r.height / 2) * .25}px`;
    });
  });

  /* ---------- glass tilt + light follows pointer ---------- */
  if (finePointer && !reduce) $$('[data-tilt]').forEach(g => {
    const max = g.classList.contains('search') ? 4 : 9;
    g.addEventListener('pointermove', e => {
      const r = g.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
      g.style.transform = `perspective(900px) rotateX(${(.5 - v) * max}deg) rotateY(${(u - .5) * max}deg) translateY(-4px)`;
      g.style.setProperty('--mx', u * 100 + '%');
      g.style.setProperty('--my', v * 100 + '%');
    });
    g.addEventListener('pointerleave', () => { g.style.transform = ''; g.style.setProperty('--mx', '50%'); g.style.setProperty('--my', '30%'); });
  });

  /* ---------- hero parallax ---------- */
  const par = $$('.hero [data-speed]');
  const hero = $('#hero');
  let ticking = false;
  const parallax = () => {
    ticking = false;
    const y = scrollY;
    if (y > hero.offsetHeight * 1.2) return;
    par.forEach(el => el.style.transform = `translate3d(0, ${y * +el.dataset.speed}px, 0)`);
  };
  if (!reduce) addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });

  /* ---------- smoke ---------- */
  const sprites = ['smoke_a', 'smoke_b', 'smoke_c'].map(n => Object.assign(new Image(), { src: `assets/img/${n}.webp` }));
  class Smoke {
    constructor(canvas, opt) {
      this.c = canvas; this.ctx = canvas.getContext('2d'); this.o = opt;
      this.ps = []; this.run = false; this.last = 0;
      this.host = canvas.parentElement;
      this.px = -1e4; this.py = -1e4;
      this.resize(); addEventListener('resize', () => this.resize());
      if (finePointer) this.host.addEventListener('pointermove', e => { const r = this.c.getBoundingClientRect(); this.px = e.clientX - r.left; this.py = e.clientY - r.top; });
      this.host.addEventListener('pointerleave', () => { this.px = this.py = -1e4; });
      new IntersectionObserver(([e]) => { e.isIntersecting ? this.start() : (this.run = false); }).observe(canvas);
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const r = this.c.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(this.o.count * Math.min(1.2, Math.max(.45, this.w / 1400)));
      this.ps = Array.from({ length: n }, () => this.spawn(true));
    }
    spawn(initial) {
      const o = this.o, s = (o.size[0] + Math.random() * (o.size[1] - o.size[0])) * Math.min(1, Math.max(.55, this.w / 1300));
      return {
        x: o.x[0] * this.w + Math.random() * (o.x[1] - o.x[0]) * this.w,
        y: this.h * (o.y[0] + Math.random() * (o.y[1] - o.y[0])),
        s, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .0016,
        vx: (Math.random() - .5) * .18, vy: -(.06 + Math.random() * .2) * o.rise,
        a: o.alpha * (.5 + Math.random() * .5), life: initial ? Math.random() : 0,
        span: 14 + Math.random() * 14, img: sprites[(Math.random() * 3) | 0], pushx: 0, pushy: 0
      };
    }
    start() { if (this.run || reduce) { if (reduce) this.frame(performance.now(), true); return; } this.run = true; this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }
    frame(t, once) {
      const dt = Math.min(.05, (t - this.last) / 1000); this.last = t;
      const { ctx } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < this.ps.length; i++) {
        let p = this.ps[i];
        p.life += dt / p.span;
        if (p.life >= 1) { p = this.ps[i] = this.spawn(false); }
        // the cursor parts the smoke
        const dx = p.x - this.px, dy = p.y - this.py, d2 = dx * dx + dy * dy, R = p.s * .7;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 90; p.pushx += dx / d * f * dt; p.pushy += dy / d * f * dt; }
        p.pushx *= .96; p.pushy *= .96;
        p.x += (p.vx * 60 + p.pushx) * dt * 6; p.y += (p.vy * 60 + p.pushy) * dt * 6; p.rot += p.vr * 60 * dt;
        const fade = Math.sin(Math.PI * p.life);
        if (!p.img.complete || !p.img.naturalWidth) continue;
        ctx.globalAlpha = p.a * fade;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s * .7);
        ctx.restore();
      }
      if (this.run && !once) requestAnimationFrame(tt => this.frame(tt));
    }
  }
  const smokeCfg = {
    hero: { count: 26, size: [420, 900], x: [-.1, 1.1], y: [.62, 1.05], alpha: .55, rise: 1 },
    cairn: { count: 9, size: [220, 420], x: [.25, .75], y: [.35, .85], alpha: .45, rise: 1.4 },
  };
  const startSmoke = () => $$('canvas[data-smoke]').forEach(c => new Smoke(c, smokeCfg[c.dataset.smoke]));
  Promise.all(sprites.map(s => s.decode().catch(() => {}))).then(startSmoke);

  /* ---------- form ---------- */
  const form = $('.search'), note = $('.form-note');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      form.classList.remove('is-error'); void form.offsetWidth; form.classList.add('is-error');
      note.textContent = 'That email doesn’t look right. Try again?';
      form.email.focus();
      return;
    }
    form.classList.remove('is-error');
    note.textContent = 'Thanks. We’ll email you within a day with times for your session.';
    form.reset();
  });
})();
