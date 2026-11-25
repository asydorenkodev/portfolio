/* Victoria Square Barbers: hero
   torch reveal, water reflection, dust, rolling type, glass tilt */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------ rolling type */
  const split = (el) => {
    const text = el.textContent;
    const row = (cls) => {
      const s = document.createElement('span');
      s.className = cls;
      [...text].forEach((c, i) => {
        const ch = document.createElement('span');
        ch.className = 'ch'; ch.textContent = c; ch.style.setProperty('--i', i);
        s.appendChild(ch);
      });
      return s;
    };
    const wrap = document.createElement('span');
    wrap.className = 'roll';
    const a = row('roll__a'), b = row('roll__b');
    b.setAttribute('aria-hidden', 'true');
    wrap.append(a, b);
    el.textContent = '';
    el.setAttribute('aria-label', text);
    el.appendChild(wrap);
  };
  $$('[data-roll]').forEach(split);

  // headline: words rise out of a mask
  $$('[data-words]').forEach((h) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          const w = document.createElement('span'); w.className = 'w';
          n.style.setProperty('--i', i++); n.style.display = 'inline-block';
          n.style.transform = ''; n.replaceWith(w); w.appendChild(n);
        }
      });
    };
    walk(h);
  });

  /* ------------------------------------------------------------ load */
  const frame = $('.frame');
  const product = $('#product');
  const dark = $('.product__dark');
  const lit = $('.product__lit');
  const imgs = [dark, lit, ...$$('.card__portrait img')];
  Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())))
    .then(() => requestAnimationFrame(() => root.classList.add('is-loaded')));
  setTimeout(() => root.classList.add('is-loaded'), 2500);

  /* ------------------------------------------------------------ pointer + torch */
  const cursor = $('.cursor'), ring = $('.cursor__ring'), dot = $('.cursor__dot');
  const torch = $('.torch');
  const hint = $('[data-hint]');
  const P = { x: innerWidth / 2, y: innerHeight * .4, sx: innerWidth / 2, sy: innerHeight * .4, inside: false, cx: 0, cy: 0 };
  if (fine) root.classList.add('has-cursor');

  frame.addEventListener('pointermove', (e) => {
    P.x = e.clientX; P.y = e.clientY;
    if (!P.inside) { P.inside = true; P.sx = P.x; P.sy = P.y; root.classList.add('is-pointer'); }
  });
  frame.addEventListener('pointerleave', () => { P.inside = false; root.classList.remove('is-pointer'); });
  addEventListener('pointermove', (e) => { P.cx = e.clientX; P.cy = e.clientY; }, { passive: true });

  if (fine) {
    $$('a, button').forEach((el) => {
      if (el.classList.contains('product__hit')) return;
      el.addEventListener('pointerenter', () => cursor.classList.add('is-link'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-link'));
    });
  }

  // reveal state
  const S = { r: 0, rT: 0, open: false, rv: 0 };       // rv = 0..1 how "open" the bottle is (for the reflection)
  const hit = $('.product__hit');
  const setOpen = (v) => {
    S.open = v; product.classList.toggle('is-open', v);
    cursor.classList.toggle('is-light', v);
    if (v && hint) hint.classList.add('is-gone');
  };
  hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setOpen(true); });
  hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setOpen(false); });
  hit.addEventListener('click', (e) => { if (!fine) setOpen(!S.open); });
  hit.addEventListener('focus', () => setOpen(true));
  hit.addEventListener('blur', () => setOpen(false));

  // portrait reveal inside the barber card
  const portrait = $('[data-portrait]');
  const barberCard = $('.card--barber');
  const PR = { r: 0, open: false };
  barberCard.addEventListener('pointerenter', () => { PR.open = true; });
  barberCard.addEventListener('pointerleave', () => { PR.open = false; });
  barberCard.addEventListener('focus', () => { PR.open = true; });
  barberCard.addEventListener('blur', () => { PR.open = false; });

  /* ------------------------------------------------------------ glass tilt + pill fill origin */
  $$('[data-tilt]').forEach((el) => {
    if (!fine) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(.5 - py) * 7}deg) rotateY(${(px - .5) * 9}deg) translateY(-4px)`;
      el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; el.style.setProperty('--mx', '50%'); el.style.setProperty('--my', '30%'); });
  });
  $$('.pill').forEach((el) => {
    const set = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', `${e.clientX - r.left}px`); el.style.setProperty('--y', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointerenter', set); el.addEventListener('pointerleave', set);
  });

  /* ------------------------------------------------------------ dropdown + burger */
  const drop = $('.drop'), dropBtn = $('.drop__btn');
  dropBtn.addEventListener('click', () => {
    const v = !drop.classList.contains('is-open');
    drop.classList.toggle('is-open', v); dropBtn.setAttribute('aria-expanded', v);
  });
  document.addEventListener('click', (e) => { if (!drop.contains(e.target)) { drop.classList.remove('is-open'); dropBtn.setAttribute('aria-expanded', false); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { drop.classList.remove('is-open'); root.classList.remove('nav-open'); } });
  const burger = $('.burger'), menu = $('.menu');
  burger.addEventListener('click', () => {
    const v = !root.classList.contains('nav-open');
    root.classList.toggle('nav-open', v); burger.setAttribute('aria-expanded', v); menu.setAttribute('aria-hidden', !v);
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', () => { root.classList.remove('nav-open'); burger.setAttribute('aria-expanded', false); }));

  /* ------------------------------------------------------------ next free chair (Belfast time) */
  (() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const long = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = days.indexOf(parts.weekday);
    const mins = +parts.hour * 60 + +parts.minute;
    const hours = (day) => (day === 0 ? null : [9 * 60, (day === 4 ? 21 : 19) * 60]);
    const pad = (n) => String(n).padStart(2, '0');
    const hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    let label = 'Next free chair', day = 'Today', time, booked;
    const h = hours(d);
    // a stable, believable "booked" figure for the day
    const seed = (new Date().getUTCDate() * 37 + d * 11) % 17;
    if (h && mins < h[1] - 45) {
      const from = Math.max(mins, h[0] - 30);
      time = Math.ceil((from + 40) / 15) * 15;
      if (time < h[0]) time = h[0];
      const elapsed = clamp((mins - h[0]) / (h[1] - h[0]), 0, 1);
      booked = Math.round(48 + elapsed * 34 + seed);
    } else {
      let n = (d + 1) % 7; while (!hours(n)) n = (n + 1) % 7;
      label = 'First free chair'; day = n === (d + 1) % 7 ? 'Tomorrow' : long[n];
      time = hours(n)[0]; booked = 22 + seed;
    }
    $('[data-slot]').textContent = hm(time);
    $('[data-slot-day]').textContent = day;
    const lab = $('[data-slot-label]');
    if (label !== 'Next free chair') { lab.textContent = label; split(lab); }
    const bar = $('[data-bar]'), num = $('[data-booked]');
    booked = clamp(booked, 8, 96);
    const go = () => {
      bar.style.width = `${booked}%`;
      const t0 = performance.now() + 1900;
      const tick = (t) => {
        const k = clamp((t - t0) / 1800, 0, 1), e = 1 - Math.pow(1 - k, 3);
        num.textContent = Math.round(booked * e);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const wait = () => (root.classList.contains('is-loaded') ? go() : setTimeout(wait, 100));
    wait();
  })();

  /* ------------------------------------------------------------ stars (page background) */
  (() => {
    const c = $('.stars'), x = c.getContext('2d');
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const n = Math.round(innerWidth * innerHeight / 9000);
      for (let i = 0; i < n; i++) {
        const a = rnd() * .5 + .1, r = rnd() < .9 ? .6 : 1.1;
        x.fillStyle = `rgba(215,210,255,${a})`;
        x.beginPath(); x.arc(rnd() * innerWidth, rnd() * innerHeight, r, 0, 7); x.fill();
      }
    };
    draw(); addEventListener('resize', draw);
  })();

  /* ------------------------------------------------------------ dust in the beam */
  const dust = (() => {
    const c = $('.dust'), x = c.getContext('2d');
    let W = 0, H = 0, parts = [];
    const size = () => {
      const r = frame.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp(W * H / 9000, 40, 140));
      parts = Array.from({ length: n }, () => ({
        x: W / 2 + (Math.random() - .5) * W * .7, y: Math.random() * H * .75,
        v: .08 + Math.random() * .25, s: Math.random() < .85 ? .7 + Math.random() * .8 : 1.6 + Math.random(),
        p: Math.random() * 6.28, w: .4 + Math.random() * .9,
      }));
    };
    size(); addEventListener('resize', size);
    return (t, mx, my) => {
      x.clearRect(0, 0, W, H);
      for (const q of parts) {
        q.y -= q.v; q.x += Math.sin(t * .0004 * q.w + q.p) * .15;
        if (q.y < -10) { q.y = H * .72; q.x = W / 2 + (Math.random() - .5) * W * .7; }
        const beam = Math.exp(-(((q.x - W / 2) / (W * .22)) ** 2));          // brighter in the beam
        const near = P.inside ? Math.exp(-(((q.x - mx) ** 2 + (q.y - my) ** 2) / (2 * 160 * 160))) : 0;
        const tw = .55 + .45 * Math.sin(t * .002 * q.w + q.p);
        const a = clamp((.08 + beam * .35 + near * .8) * tw, 0, 1);
        x.fillStyle = `rgba(215,208,255,${a})`;
        x.beginPath(); x.arc(q.x, q.y, q.s * (1 + near * .6), 0, 7); x.fill();
      }
    };
  })();

  /* ------------------------------------------------------------ water: reflection + ripples */
  const water = (() => {
    const wrap = $('.water'), c = $('.water__canvas'), x = c.getContext('2d');
    const src = document.createElement('canvas'), sx = src.getContext('2d');
    const tmp = document.createElement('canvas'), tx = tmp.getContext('2d');
    let W = 0, H = 0, dpr = 1, k = .6;
    const rings = [];
    const size = () => {
      const r = wrap.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); addEventListener('resize', size);
    let lastRing = 0;
    wrap.parentElement.parentElement.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      if (e.clientY < r.top + 4 || reduce) return;
      const now = performance.now();
      if (now - lastRing < 220) return; lastRing = now;
      rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: now, max: 90 + Math.random() * 50 });
    });
    return (t, pr, rPx, lx, ly) => {
      x.clearRect(0, 0, W, H);
      const wr = wrap.getBoundingClientRect();
      const pw = pr.width, ph = pr.height;
      if (!pw || !dark.complete) return;
      // 1. compose what the viewer sees on the bottle right now (dark + torch-lit) at low res
      const w = Math.max(2, Math.round(pw * k)), h = Math.max(2, Math.round(ph * k));
      if (src.width !== w || src.height !== h) { src.width = tmp.width = w; src.height = tmp.height = h; }
      sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, w, h);
      sx.drawImage(dark, 0, 0, w, h);
      if (rPx > 1) {
        tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, w, h);
        tx.drawImage(lit, 0, 0, w, h);
        tx.globalCompositeOperation = 'destination-in';
        const g = tx.createRadialGradient(lx * k, ly * k, 0, lx * k, ly * k, rPx * k);
        g.addColorStop(0, '#000'); g.addColorStop(.42, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        tx.fillStyle = g; tx.fillRect(0, 0, w, h);
        sx.drawImage(tmp, 0, 0);
      }
      // 2. mirror it into the water, row by row, with a slow ripple
      // the stone dissolves into the water over its last ~3%, so start the mirror above that
      const squash = .72, base = ph * .972;
      const ox = pr.left - wr.left, reflH = Math.min(H, base * squash);
      const amp = reduce ? 0 : 1;
      const step = 2;
      for (let y = 0; y < reflH; y += step) {
        const f = y / reflH;
        const dx = amp * (Math.sin(y * .13 - t * .0024) * (.5 + y * .03) + Math.sin(y * .047 + t * .0013) * 1.4);
        const syRow = (base - (y + step) / squash) * k;
        if (syRow < 0) break;
        x.globalAlpha = .85 * Math.pow(1 - f, 1.35) * (.82 + .18 * Math.sin(y * .32 - t * .004));
        x.drawImage(src, 0, syRow, w, (step / squash) * k, ox + dx, y, pw, step);
      }
      x.globalAlpha = 1;
      // 3. rings: one from the stone now and then, plus the ones the pointer leaves
      if (!reduce && (!rings.length || t - rings[rings.length - 1].t > 2600) && rings.filter((r) => r.auto).length < 2) {
        rings.push({ x: ox + pw / 2, y: 3, t, max: pw * .75, auto: true });
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i], age = (t - r.t) / (r.auto ? 4200 : 1900);
        if (age >= 1) { rings.splice(i, 1); continue; }
        const rad = (r.auto ? pw * .3 : 6) + r.max * age;
        x.strokeStyle = `rgba(190,180,255,${(1 - age) * (r.auto ? .2 : .32)})`;
        x.lineWidth = 1;
        x.beginPath(); x.ellipse(r.x, r.y, rad, rad * .16, 0, 0, Math.PI * 2); x.stroke();
        if (!r.auto) { x.strokeStyle = `rgba(190,180,255,${(1 - age) * .14})`; x.beginPath(); x.ellipse(r.x, r.y, rad * .62, rad * .1, 0, 0, Math.PI * 2); x.stroke(); }
      }
    };
  })();

  /* ------------------------------------------------------------ touch: one slow light sweep so phones see the reveal */
  let sweep = null;
  if (!fine) {
    const wait = () => (root.classList.contains('is-loaded') ? setTimeout(() => { sweep = performance.now(); }, 2200) : setTimeout(wait, 100));
    wait();
  }

  /* ------------------------------------------------------------ main loop */
  const loop = (t) => {
    const fr = frame.getBoundingClientRect();
    P.sx = lerp(P.sx, P.x, .14); P.sy = lerp(P.sy, P.y, .14);
    if (fine) {
      cursor.style.transform = `translate(${P.cx}px, ${P.cy}px)`;
    }
    torch.style.transform = `translate(${P.sx - fr.left}px, ${P.sy - fr.top}px)`;

    const pr = product.getBoundingClientRect();
    let lx = P.sx - pr.left, ly = P.sy - pr.top;
    let target = S.open ? Math.max(pr.width, pr.height) * 1.5 : (P.inside ? Math.min(180, pr.height * .4) : 0);
    if (sweep !== null) {                                        // phones: light drifts across, then opens
      const k = (t - sweep) / 2600;
      if (k < 1) { lx = pr.width * (.15 + .7 * k); ly = pr.height * (.35 + .1 * Math.sin(k * 3.14)); target = pr.height * .35; }
      else { if (!S.open) setOpen(true); sweep = null; }
    }
    if (S.open && !P.inside) { lx = pr.width / 2; ly = pr.height * .45; }
    S.r = lerp(S.r, target, S.open ? .06 : .12);
    product.style.setProperty('--x', `${lx}px`); product.style.setProperty('--y', `${ly}px`); product.style.setProperty('--r', `${S.r}px`);

    // portrait: torch everywhere in the frame, full light while hovered
    const qr = portrait.getBoundingClientRect();
    const pt = PR.open ? qr.height * 2.2 : (P.inside ? 110 : 0);
    PR.r = lerp(PR.r, pt, .1);
    portrait.style.setProperty('--x', `${PR.open ? qr.width / 2 : P.sx - qr.left}px`);
    portrait.style.setProperty('--y', `${PR.open ? qr.height * .35 : P.sy - qr.top}px`);
    portrait.style.setProperty('--r', `${PR.r}px`);

    if (fr.bottom > 0 && fr.top < innerHeight) {
      if (!reduce) dust(t, P.sx - fr.left, P.sy - fr.top);
      water(t, pr, S.r, lx, ly);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
