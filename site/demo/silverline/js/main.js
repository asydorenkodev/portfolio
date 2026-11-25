/* Silverline Coffee · hero */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  // Windows "animation effects: off" also flips this; the motion here is the product, so it only calms the snow
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reduce = false;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const DRINKS = [
    { name: "Glacier", ink: "light",    price: "£4.60", accent: "#c98a4b", soft: "rgba(214,150,84,.62)",  desc: "Cold brew over clear ice, salted caramel, a soft cold foam." },
    { name: "Crumble", ink: "light",    price: "£5.20", accent: "#d3a066", soft: "rgba(220,170,110,.6)",  desc: "Iced latte, brown butter caramel, cookie crumb on whipped cream." },
    { name: "Nutcracker", ink: "dark", price: "£5.60", accent: "#a87650", soft: "rgba(176,124,84,.62)",  desc: "Peanut mocha shake, dark chocolate sauce, roasted peanuts." },
    { name: "Kirsch", ink: "dark",     price: "£5.90", accent: "#b23347", soft: "rgba(190,52,74,.55)",   desc: "Espresso and vanilla cream in layers, dark chocolate, one sour cherry." },
  ];
  const N = DRINKS.length;
  const SW = 2496, SH = 1404, CUPX = 1243;

  const stage = $("#stage"), wheel = $("#wheel"), cup = $("#cup"), reflect = $("#reflect");
  const app = $("#app");
  app.addEventListener("scroll", () => { app.scrollTop = 0; app.scrollLeft = 0; });
  const tiles = $$(".tile", wheel);

  /* ---------------------------------------------------------------- stage fit */
  let S = 1, geo;
  function circleFrom(inner, outer) {
    // circle with centre on the cup axis through both slots
    const [d1, y1] = inner, [d2, y2] = outer;
    const cy = (d2 * d2 - d1 * d1 + y2 * y2 - y1 * y1) / (2 * (y2 - y1));
    const R = Math.hypot(d1, cy - y1);
    const a1 = Math.atan2(d1, cy - y1), a2 = Math.atan2(d2, cy - y2);
    return { cy, R, a1, a2, ah: a2 + (a2 - a1) * 1.5 };
  }
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    const narrow = vw / vh < 0.9;
    S = Math.max(vw / SW, vh / SH);
    if (narrow) S = Math.min(S, vw / 900);
    const H = SH * S;
    const x = vw / 2 - CUPX * S;
    const y = H >= vh ? (vh - H) * 0.62 : vh - H * 0.97;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${S})`;
    body.classList.toggle("is-narrow", narrow);
    const c = narrow ? circleFrom([340, 900], [440, 1120]) : circleFrom([455, 800], [830, 935]);
    geo = { ...c, tileScale: narrow ? 0.72 : 1, tilts: narrow ? [10, 24, 40] : [14, 28, 40] };
    placeTiles();
  }

  /* ---------------------------------------------------------------- wheel */
  // continuous rotation r; tile i sits at slot p = (i - r + 2) mod N, p in [-.5, 3.5)
  // slots: 0 outer-left, 1 inner-left, 2 inner-right (in the cup), 3 outer-right
  let r = 0, intro = tiles.map(() => null);
  const norm = (p) => { p = ((p % N) + N) % N; return p >= 3.5 ? p - N : p; };
  function slotState(p) {
    const { a1, a2, ah, tilts } = geo;
    const T = [
      [-0.5, -ah, -tilts[2]], [0, -a2, -tilts[1]], [1, -a1, -tilts[0]],
      [2, a1, tilts[0]], [3, a2, tilts[1]], [3.5, ah, tilts[2]],
    ];
    let k = 0; while (k < T.length - 2 && p > T[k + 1][0]) k++;
    const [p0, A0, t0] = T[k], [p1, A1, t1] = T[k + 1];
    const f = Math.min(1, Math.max(0, (p - p0) / (p1 - p0)));
    // behind the cup the tile dips a little in scale, like it goes round the back
    const behind = Math.max(0, 1 - Math.abs(p - 1.5) / 0.5);
    return { a: A0 + (A1 - A0) * f, tilt: t0 + (t1 - t0) * f, sc: 1 - 0.14 * behind, behind };
  }
  function placeTiles() {
    if (!geo) return;
    tiles.forEach((t, i) => {
      const p = intro[i] != null ? intro[i] : norm(i - r + 2);
      const st = slotState(p);
      const x = CUPX + geo.R * Math.sin(st.a), y = geo.cy - geo.R * Math.cos(st.a);
      t.style.transform = `translate(${x}px, ${y}px) rotate(${st.tilt}deg) scale(${st.sc * geo.tileScale})`;
      t.style.setProperty("--counter", `${-st.tilt * 0.55}deg`);
      t.style.zIndex = st.behind > 0 ? 1 : 3;
      t.dataset.p = p.toFixed(2);
    });
  }
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  function tween(ms, fn, ease = easeIO) {
    return new Promise((res) => {
      if (reduce) { fn(1); return res(); }
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        fn(ease(k));
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------- reflection */
  const cupBody = $("[data-cup]", cup);
  const mirror = cupBody.cloneNode(true);
  $$("img", mirror).forEach((im) => { im.alt = ""; im.setAttribute("aria-hidden", "true"); });
  reflect.appendChild(mirror);
  const bodies = [cupBody, mirror];

  /* ---------------------------------------------------------------- flavour change */
  let active = 0, busy = false, queued = null, zTop = 2;
  const nameEl = $("#cupName"), priceEl = $("#priceNum"), descEl = $("#desc"), countEl = $("#countNow");
  const addBtn = $("#addBtn");

  function splitInto(el, text, cls) {
    el.textContent = "";
    [...text].forEach((c, i) => {
      const s = document.createElement("span");
      s.className = "ch" + (cls ? " " + cls : "");
      s.textContent = c === " " ? " " : c;
      s.style.animationDelay = `${i * 32}ms`;
      el.appendChild(s);
    });
  }
  function swapName(text) {
    const old = $$(".ch", nameEl);
    old.forEach((c, i) => { c.style.animationDelay = `${i * 22}ms`; c.classList.add("out"); });
    setTimeout(() => {
      splitInto(nameEl, text, "in");
      setTimeout(() => $$(".ch", nameEl).forEach((c) => c.classList.toggle("in", false)), 1300);
    }, reduce ? 0 : 380);
  }
  function swapPrice(text) {
    priceEl.textContent = "";
    [...text].forEach((c, i) => {
      const s = document.createElement("span"); s.className = "dg roll"; s.textContent = c;
      s.style.animationDelay = `${120 + i * 50}ms`; priceEl.appendChild(s);
    });
  }
  function setDrink(i) {
    const prev = active; active = i;
    const d = DRINKS[i];
    bodies.forEach((b) => {
      const dr = $$(".drink", b), tp = $$(".top", b);
      dr.forEach((x) => x.classList.remove("is-pour", "is-drain"));
      tp.forEach((x) => x.classList.remove("is-in", "is-out"));
      dr[prev].classList.add("is-drain");
      dr[i].style.zIndex = ++zTop; dr[i].classList.add("is-pour");
      tp[prev].classList.remove("is-on"); tp[prev].classList.add("is-out");
      tp[i].classList.add("is-on", "is-in");
      setTimeout(() => {
        dr.forEach((x, k) => { x.classList.remove("is-pour", "is-drain"); x.classList.toggle("is-on", k === active); });
        tp.forEach((x) => x.classList.remove("is-out", "is-in"));
      }, reduce ? 0 : 1350);
    });
    $$(".drink", cupBody).forEach((im, k) => { im.alt = k === i ? `${d.name}: ${d.desc}` : ""; });
    cup.classList.remove("is-shine"); void cup.offsetWidth; cup.classList.add("is-shine");
    setTimeout(() => cup.classList.toggle("ink-dark", d.ink === "dark"), reduce ? 0 : 380);
    swapName(d.name); swapPrice(d.price);
    descEl.textContent = d.desc; descEl.classList.remove("swap"); void descEl.offsetWidth; descEl.classList.add("swap");
    countEl.textContent = String(i + 1).padStart(2, "0");
    addBtn.setAttribute("aria-label", `Add ${d.name} to your order`);
    document.documentElement.style.setProperty("--accent", d.accent);
    document.documentElement.style.setProperty("--accent-soft", d.soft);
    tiles.forEach((t, k) => t.classList.toggle("is-active", k === i));
  }

  function flyFrom(i) {
    if (reduce) return;
    const t = tiles[i], st = slotState(norm(i - r + 2));
    const x0 = CUPX + geo.R * Math.sin(st.a), y0 = geo.cy - geo.R * Math.cos(st.a);
    const im = document.createElement("img");
    im.className = "fly"; im.src = $(".tile__img", t).src; im.alt = "";
    stage.appendChild(im);
    const x1 = CUPX, y1 = 560, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 220;
    im.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1) rotate(0deg)`, opacity: 1, filter: "blur(0)" },
      { transform: `translate(${mx}px, ${my}px) scale(.72) rotate(${x0 < x1 ? 25 : -25}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${x1}px, ${y1}px) scale(.22) rotate(${x0 < x1 ? 50 : -50}deg)`, opacity: 0, filter: "blur(4px)" },
    ], { duration: 900, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }).onfinish = () => im.remove();
  }

  async function go(delta, fromTile) {
    if (!delta) return;
    if (busy) { queued = delta; return; }
    busy = true;
    const target = ((Math.round(r + delta) % N) + N) % N;
    const flyIdx = fromTile != null ? fromTile : target;
    flyFrom(flyIdx);
    setTimeout(() => setDrink(target), reduce ? 0 : 320);
    const r0 = r, r1 = r + delta;
    await tween(1000 + 160 * (Math.abs(delta) - 1), (k) => { r = r0 + (r1 - r0) * k; placeTiles(); });
    r = Math.round(r1); placeTiles();
    busy = false;
    if (queued != null) { const q = queued; queued = null; go(q); }
  }
  const next = () => go(1), prev = () => go(-1);

  tiles.forEach((t, i) => {
    t.addEventListener("click", () => {
      if (!body.classList.contains("s-done")) return;
      const p = Math.round(norm(i - r + 2));
      if (p === 2) { cup.classList.remove("is-shine"); void cup.offsetWidth; cup.classList.add("is-shine"); return; }
      go(p - 2, i);
    });
    // 3D tilt following the pointer
    const card = $(".tile__card", t);
    t.addEventListener("pointermove", (e) => {
      const b = t.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
      card.style.setProperty("--ry", `${px * 22}deg`); card.style.setProperty("--rx", `${-py * 22}deg`);
    });
    t.addEventListener("pointerleave", () => { card.style.setProperty("--ry", "0deg"); card.style.setProperty("--rx", "0deg"); });
  });
  $("#next").addEventListener("click", next);
  $("#prev").addEventListener("click", prev);
  addEventListener("keydown", (e) => {
    if (!body.classList.contains("s-done")) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });
  // swipe on touch, wheel on desktop
  let sx = null;
  addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") sx = e.clientX; });
  addEventListener("pointerup", (e) => {
    if (sx == null) return; const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50 && body.classList.contains("s-done")) dx < 0 ? next() : prev();
  });
  let wheelLock = 0;
  addEventListener("wheel", (e) => {
    if (!body.classList.contains("s-done")) return;
    const now = performance.now(); if (now < wheelLock) return;
    const v = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(v) < 18) return;
    wheelLock = now + 1100; v > 0 ? next() : prev();
  }, { passive: true });

  // add to order
  const bag = $("#bagCount"); let inBag = 0;
  addBtn.addEventListener("click", () => {
    inBag++; bag.textContent = inBag; bag.classList.add("has");
    bag.classList.remove("bump"); void bag.offsetWidth; bag.classList.add("bump");
    addBtn.classList.remove("is-added"); void addBtn.offsetWidth; addBtn.classList.add("is-added");
  });

  /* ---------------------------------------------------------------- title */
  const title = $("#title");
  (function splitTitle() {
    const words = title.textContent.trim().split(" ");
    title.textContent = ""; let n = 0;
    words.forEach((w, wi) => {
      const ws = document.createElement("span"); ws.className = "w"; ws.setAttribute("aria-hidden", "true");
      [...w].forEach((c) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; s.style.setProperty("--i", n++); ws.appendChild(s); });
      title.appendChild(ws);
      if (wi < words.length - 1) { const sp = document.createElement("span"); sp.className = "sp"; title.appendChild(sp); n++; }
    });
  })();
  const tChars = $$(".ch", title);
  let mouse = { x: -999, y: -999 };
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; if (e.pointerType === "mouse") $(".cursor").classList.remove("is-hidden"); });
  function titleWave() {
    if (body.classList.contains("s-done") && fine) {
      tChars.forEach((c) => {
        const b = c.getBoundingClientRect();
        const d = Math.hypot(mouse.x - (b.left + b.width / 2), (mouse.y - (b.top + b.height / 2)) * 1.4);
        const k = Math.max(0, 1 - d / 170);
        c.style.setProperty("--lift", `${(-k * k * 0.16).toFixed(3)}em`);
      });
    }
    requestAnimationFrame(titleWave);
  }

  /* ---------------------------------------------------------------- snow */
  const cv = $("#snow"), ctx = cv.getContext("2d");
  let flakes = [], W = 0, Hh = 0, wind = 0;
  function sizeSnow() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; Hh = innerHeight;
    cv.width = W * dpr; cv.height = Hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(calm ? 90 : 220, (W * Hh) / (calm ? 16000 : 9000)));
    flakes = Array.from({ length: n }, (_, i) => mk(true, i < 9));
  }
  function mk(any, big) {
    const z = big ? 1 : Math.random();
    return {
      x: Math.random() * W, y: any ? Math.random() * Hh : -20,
      r: big ? 5 + Math.random() * 9 : 0.5 + z * 2.1,
      vy: big ? 0.5 + Math.random() * 0.4 : 0.25 + z * 0.9,
      ph: Math.random() * 6.28, a: big ? 0.08 + Math.random() * 0.1 : 0.35 + z * 0.55, big,
    };
  }
  function snow() {
    ctx.clearRect(0, 0, W, Hh);
    wind += ((mouse.x > 0 ? (mouse.x / W - 0.5) * 0.9 : 0) - wind) * 0.02;
    for (const f of flakes) {
      f.ph += 0.01; f.y += f.vy; f.x += Math.sin(f.ph) * 0.3 + wind * (f.big ? 1.4 : 0.6 + f.r * 0.2);
      if (f.y > Hh + 20) Object.assign(f, mk(false, f.big));
      if (f.x > W + 20) f.x = -20; if (f.x < -20) f.x = W + 20;
      if (f.big) {
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(255,255,255,${f.a})`); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${f.a})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
    }
    if (!reduce) requestAnimationFrame(snow);
  }

  /* ---------------------------------------------------------------- cursor + magnets */
  const cur = $(".cursor"), ring = $(".cursor__ring"), dot = $(".cursor__dot");
  if (fine) {
    let rx = innerWidth / 2, ry = innerHeight / 2;
    (function loop() {
      rx += (mouse.x - rx) * 0.2; ry += (mouse.y - ry) * 0.2;
      ring.style.transform = `translate(${rx}px, ${ry}px)`; dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => cur.classList.toggle("is-hover", !!e.target.closest("a, button")));
    document.addEventListener("pointerleave", () => cur.classList.add("is-hidden"));
    document.addEventListener("pointerenter", () => cur.classList.remove("is-hidden"));
    $$(".dock__btn, .arrow, .where, .logo").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        el.style.translate = `${(e.clientX - b.left - b.width / 2) * 0.22}px ${(e.clientY - b.top - b.height / 2) * 0.3}px`;
      });
      el.addEventListener("pointerleave", () => { el.style.translate = "0 0"; });
      el.style.transition += ", translate .5s cubic-bezier(.22,.9,.24,1)";
    });
  }

  /* ---------------------------------------------------------------- intro */
  splitInto(nameEl, DRINKS[0].name, "");
  tiles.forEach((t, k) => t.classList.toggle("is-active", k === 0));
  addEventListener("resize", () => { fit(); sizeSnow(); });
  fit(); sizeSnow(); snow(); titleWave();

  const wait = (ms) => new Promise((res) => setTimeout(res, reduce ? 0 : ms));
  const keyImgs = $$(".st-back, .st-front, .cup__glass, .drink.is-on, .top.is-on", stage);
  const ready = Promise.race([
    Promise.all(keyImgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()))),
    wait(3000),
  ]);

  ready.then(async () => {
    // tiles wait below the ice, each on its own side
    tiles.forEach((t, i) => { const p = norm(i - r + 2); intro[i] = p < 1.5 ? -0.5 : 3.5; });
    placeTiles();
    requestAnimationFrame(() => body.classList.remove("is-loading"));   // 1. ice, then the cup
    await wait(1900);
    body.classList.add("s-nav");                                       // 2. top plates
    cup.classList.add("is-shine");
    await wait(550);
    tiles.forEach((t) => t.classList.add("is-ready"));                 // 3. tiles rise from behind the ice
    const order = [1, 2, 0, 3].map((p) => tiles.findIndex((_, i) => Math.round(norm(i - r + 2)) === p));
    order.forEach((ti, k) => {
      const from = intro[ti], to = norm(ti - r + 2);
      setTimeout(() => tween(1300, (e) => { intro[ti] = from + (to - from) * e; placeTiles(); }, easeOut)
        .then(() => { intro[ti] = null; placeTiles(); }), reduce ? 0 : k * 150);
    });
    await wait(700);
    body.classList.add("s-title");                                     // 4. the line under it all
    await wait(1700);
    body.classList.add("s-done");
  });
})();
