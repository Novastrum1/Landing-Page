// Live hero chart. The candles in the HTML (from the Figma frame) are the starting
// state; from there the newest candle ticks, new candles close and the plot scrolls.
(function liveChart() {
  const svg = document.getElementById("live-chart");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // Grid: 96px columns (these scroll with the plot) and ~59.3px rows.
  const grid = document.getElementById("grid");
  const gridV = el("g", {}, grid);
  for (let x = -20.5; x < 1440 + 96; x += 96) el("line", { x1: x, y1: 0, x2: x, y2: 594 }, gridV);
  for (let i = 0; i <= 10; i++) {
    const y = Math.round(i * 59.3) + 0.5;
    el("line", { x1: 0, y1: y, x2: 1440, y2: y }, grid);
  }

  // Price <-> y, from the axis: y=508 is 64,000 and y=70 is 72,000.
  const PX_PER_UNIT = 438 / 8000;
  const yOf = (p) => 508 - (p - 64000) * PX_PER_UNIT;
  const pOf = (y) => 64000 + (508 - y) / PX_PER_UNIT;
  const fmt = (p) => Math.round(p).toLocaleString("en-US");

  const scroll = document.getElementById("scroll");
  const candlesG = scroll.querySelector(".candles");
  const labelsG = scroll.querySelector(".labels");
  const timesG = scroll.querySelector(".times");
  const live = document.getElementById("live-price");
  const liveText = live.querySelector("text");

  const candles = [...candlesG.children]
    .map((g) => {
      const [wick, body] = g.querySelectorAll("rect");
      const up = g.classList.contains("up");
      const top = +body.getAttribute("y");
      const bottom = top + +body.getAttribute("height");
      const wy = +wick.getAttribute("y");
      return {
        g, wick, body,
        x: +body.getAttribute("x"),
        high: pOf(wy),
        low: pOf(wy + +wick.getAttribute("height")),
        open: pOf(up ? bottom : top),
        close: pOf(up ? top : bottom),
      };
    })
    .sort((a, b) => a.x - b.x);

  const PITCH = 23.4;
  const BODY = 17.5;
  const LIVE_EDGE = 1274; // newest candle stays here once the plot starts scrolling
  const TICK_MS = 150;
  const TICKS_PER_CANDLE = 16;

  const draw = (c) => {
    c.g.setAttribute("class", c.close >= c.open ? "up" : "dn");
    const top = yOf(Math.max(c.open, c.close));
    const h = Math.max(1, yOf(Math.min(c.open, c.close)) - top);
    const cx = c.x + BODY / 2 - 0.5;
    c.wick.setAttribute("x", cx.toFixed(1));
    c.wick.setAttribute("y", yOf(c.high).toFixed(1));
    c.wick.setAttribute("height", Math.max(1, yOf(c.low) - yOf(c.high)).toFixed(1));
    c.body.setAttribute("y", top.toFixed(1));
    c.body.setAttribute("height", h.toFixed(1));
  };

  const addCandle = (open) => {
    const x = candles[candles.length - 1].x + PITCH;
    const g = el("g", { class: "up fresh" }, candlesG);
    const c = {
      g, x, open, close: open, high: open, low: open,
      wick: el("rect", { x: 0, y: 0, width: 1, height: 1 }, g),
      body: el("rect", { x: x.toFixed(1), y: 0, width: BODY, height: 1 }, g),
    };
    candles.push(c);
    draw(c);
    return c;
  };

  const addLabel = (c, text, kind, below) => {
    const cx = c.x + BODY / 2;
    const g = el("g", { class: "fresh" }, labelsG);
    const cls = kind ? { class: kind } : {};
    if (below) {
      const y1 = yOf(c.low) + 6;
      el("line", { ...cls, x1: cx, x2: cx, y1, y2: y1 + 17 }, g);
      el("text", { ...cls, x: cx - 20, y: y1 + 31 }, g).textContent = text;
    } else {
      const y2 = yOf(c.high) - 6;
      el("line", { ...cls, x1: cx, x2: cx, y1: y2 - 17, y2 }, g);
      el("text", { ...cls, x: cx - 20, y: y2 - 21 }, g).textContent = text;
    }
  };

  // Hour labels continue on from the last one in the design (16:00 at x=1283.5).
  let nextTimeX = 1283.5 + 182;
  let nextHour = 17;
  const addTimes = (offset) => {
    while (nextTimeX - offset < 1500) {
      const t = el("text", { x: nextTimeX, y: 550 }, timesG);
      t.textContent = String(nextHour % 24).padStart(2, "0") + ":00";
      nextTimeX += 182;
      nextHour++;
    }
  };

  // Random walk with slow-changing trend and a pull back toward the middle of the axis.
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.63;
  let trend = 0;
  let current = addCandle(candles[candles.length - 1].close);
  let ticks = 0;
  let position = null; // { entry, tp, stop } while a simulated trade is open
  let sinceLabel = 0;

  const tick = () => {
    const p = current.close;
    const pull = (68000 - p) * 0.004 + (p > 70800 ? -60 : p < 65200 ? 60 : 0);
    const next = p + trend + pull + gauss() * 110;
    current.close = next;
    current.high = Math.max(current.high, next + Math.random() * 40);
    current.low = Math.min(current.low, next - Math.random() * 40);
    draw(current);

    if (++ticks >= TICKS_PER_CANDLE) {
      ticks = 0;
      closeCandle(current);
      if (Math.random() < 0.25) trend = gauss() * 35;
      current = addCandle(current.close);
    }
    updateLivePrice();
  };

  const closeCandle = (c) => {
    sinceLabel++;
    if (position) {
      if (c.high >= position.tp) {
        addLabel(c, "TP · " + fmt(position.tp), "up");
        position = null;
        sinceLabel = 0;
      } else if (c.low <= position.stop) {
        addLabel(c, "STOP · " + fmt(position.stop), "dn", true);
        position = null;
        sinceLabel = 0;
      }
    } else if (sinceLabel > 4 && Math.random() < 0.3) {
      position = { tp: c.close * 1.012, stop: c.close * 0.992 };
      addLabel(c, "ENTRY · " + fmt(c.close));
      sinceLabel = 0;
    }
  };

  const updateLivePrice = () => {
    live.setAttribute("visibility", "visible");
    live.setAttribute("class", "live-price " + (current.close >= current.open ? "up" : "dn"));
    live.setAttribute("transform", `translate(0 ${yOf(current.close).toFixed(1)})`);
    liveText.textContent = fmt(current.close);
  };

  // Smooth scrolling: ease the offset toward keeping the newest candle at LIVE_EDGE.
  let offset = 0;
  const target = () => Math.max(0, current.x - LIVE_EDGE);
  const frame = () => {
    offset += (target() - offset) * 0.08;
    scroll.setAttribute("transform", `translate(${(-offset).toFixed(2)} 0)`);
    gridV.setAttribute("transform", `translate(${(-(offset % 96)).toFixed(2)} 0)`);
    addTimes(offset);
    prune();
    if (running) requestAnimationFrame(frame);
  };

  const prune = () => {
    while (candles.length && candles[0].x - offset < -60) candles.shift().g.remove();
    for (const node of [...labelsG.children, ...timesG.children]) {
      const x = +(node.getAttribute("x") ?? node.getAttribute("x1") ?? node.querySelector("line").getAttribute("x1"));
      if (x - offset < -200) node.remove();
    }
  };

  updateLivePrice();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Only animate while the chart is on screen and the tab is visible.
  let running = false;
  let timer = null;
  const setRunning = (on) => {
    on = on && !document.hidden;
    if (on === running) return;
    running = on;
    if (on) {
      timer = setInterval(tick, TICK_MS);
      requestAnimationFrame(frame);
    } else {
      clearInterval(timer);
    }
  };
  let visible = true;
  new IntersectionObserver(([e]) => setRunning((visible = e.isIntersecting))).observe(svg);
  document.addEventListener("visibilitychange", () => setRunning(visible));
})();

// World map in the funding section: hovering (or tapping) a country fills it with its flag.
(function worldMap() {
  const root = document.querySelector("[data-world]");
  if (!root) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = root.querySelector("svg");
  const defs = svg.querySelector("defs");
  const countriesG = svg.querySelector(".countries");
  const litG = svg.querySelector(".lit");
  const tip = root.querySelector(".world-tip");
  const tipImg = tip.querySelector("img");
  const tipName = tip.querySelector("span");

  const flagUrl = (code) => `assets/flags/${code}.svg`;
  const loaded = new Map(); // code -> Promise that resolves once the flag image is decoded

  const loadFlag = (code) => {
    if (!loaded.has(code)) {
      const img = new Image();
      img.src = flagUrl(code);
      loaded.set(code, img.decode().catch(() => {}));
    }
    return loaded.get(code);
  };

  // One pattern per country, sized to its bounding box so the flag keeps its proportions.
  const patternFor = (path, code) => {
    const id = "flag-" + path.dataset.i;
    if (!document.getElementById(id)) {
      const b = path.getBBox();
      const pattern = document.createElementNS(NS, "pattern");
      const attrs = { id, patternUnits: "userSpaceOnUse", x: b.x, y: b.y, width: b.width, height: b.height };
      for (const k in attrs) pattern.setAttribute(k, attrs[k]);
      const image = document.createElementNS(NS, "image");
      // Pattern content is positioned relative to the tile, so the image sits at 0,0.
      const iattrs = { href: flagUrl(code), x: 0, y: 0, width: b.width, height: b.height, preserveAspectRatio: "xMidYMid slice" };
      for (const k in iattrs) image.setAttribute(k, iattrs[k]);
      pattern.appendChild(image);
      defs.appendChild(pattern);
    }
    return `url(#${id})`;
  };

  let active = null; // { path, overlay }

  const light = (path) => {
    if (active && active.path === path) return;
    unlight();
    const code = path.dataset.code;
    const overlay = path.cloneNode();
    litG.appendChild(overlay);
    active = { path, overlay };
    // Glow in brand blue straight away, then swap to the flag once it has loaded.
    requestAnimationFrame(() => overlay.classList.add("on"));
    loadFlag(code).then(() => {
      if (active && active.overlay === overlay) overlay.style.fill = patternFor(path, code);
    });
    tipImg.src = flagUrl(code);
    tipName.textContent = path.dataset.name;
    tip.hidden = false;
  };

  const unlight = () => {
    if (!active) return;
    const { overlay } = active;
    overlay.classList.remove("on");
    setTimeout(() => overlay.remove(), 300);
    active = null;
    tip.hidden = true;
  };

  const placeTip = (x, y) => {
    const r = root.getBoundingClientRect();
    tip.style.left = x - r.left + "px";
    tip.style.top = y - r.top + "px";
  };

  countriesG.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch" || e.target.tagName !== "path") return;
    light(e.target);
    placeTip(e.clientX, e.clientY);
  });
  countriesG.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" && active) placeTip(e.clientX, e.clientY);
  });
  svg.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "touch") unlight();
  });

  // Touch: a tap lights a country and keeps it lit until another tap.
  svg.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    if (e.target.tagName === "path" && e.target.parentNode === countriesG) {
      light(e.target);
      const b = e.target.getBoundingClientRect();
      placeTip(b.left + b.width / 2, b.top + b.height / 2);
    } else {
      unlight();
    }
  });

  fetch("assets/world.json")
    .then((r) => r.json())
    .then(({ countries }) => {
      const frag = document.createDocumentFragment();
      countries.forEach((c, i) => {
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", c.d);
        p.dataset.code = c.code;
        p.dataset.name = c.name;
        p.dataset.i = i;
        frag.appendChild(p);
      });
      countriesG.appendChild(frag);
    });
})();

// Theme toggle. The initial theme is set by the inline script in <head>; an explicit
// choice is saved, otherwise the page keeps following the system setting.
(function themeToggle() {
  const root = document.documentElement;
  const btn = document.querySelector("[data-theme-toggle]");
  const system = matchMedia("(prefers-color-scheme: light)");
  const saved = () => {
    try { return localStorage.getItem("theme"); } catch { return null; }
  };

  const apply = (theme, animate) => {
    if (animate) {
      root.classList.add("theme-anim");
      setTimeout(() => root.classList.remove("theme-anim"), 350);
    }
    root.dataset.theme = theme;
    if (btn) {
      const next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", `Switch to ${next} mode`);
      btn.title = `Switch to ${next} mode`;
    }
  };

  apply(root.dataset.theme === "light" ? "light" : "dark", false);

  btn?.addEventListener("click", () => {
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", theme); } catch {}
    apply(theme, true);
  });

  system.addEventListener("change", (e) => {
    if (!saved()) apply(e.matches ? "light" : "dark", true);
  });
})();


// Mobile menu.
(function menu() {
  const btn = document.querySelector("[data-menu-toggle]");
  const links = document.getElementById("nav-links");
  if (!btn || !links) return;
  const set = (open) => {
    links.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  btn.addEventListener("click", () => set(!links.classList.contains("open")));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
})();

// Ticker: a second copy of the list makes the marquee loop seamlessly.
(function ticker() {
  const list = document.querySelector(".ticker-list");
  if (!list) return;
  const copy = list.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  list.after(copy);
})();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Hero email: validate, then carry the address into the full waitlist form.
(function heroForm() {
  const form = document.querySelector("[data-hero-form]");
  if (!form) return;
  const input = form.querySelector("input");
  const msg = form.querySelector(".form-note span");
  const setError = (text) => {
    form.classList.toggle("invalid", !!text);
    input.setAttribute("aria-invalid", String(!!text));
    msg.textContent = text || form.querySelector(".form-note").dataset.default;
  };
  input.addEventListener("input", () => { if (form.classList.contains("invalid") && EMAIL_RE.test(input.value.trim())) setError(""); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      setError(email ? "Enter a full email address, like ada@example.com" : "Enter your email address to join the waitlist");
      input.focus();
      return;
    }
    setError("");
    const wl = document.querySelector("[data-waitlist-form]");
    if (!wl) return;
    wl.elements.email.value = email;
    document.getElementById("waitlist").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => wl.elements.first_name.focus({ preventScroll: true }), 500);
  });
})();

// Full waitlist form. There is no backend yet, so it validates and confirms inline.
(function waitlistForm() {
  const form = document.querySelector("[data-waitlist-form]");
  if (!form) return;
  const error = form.querySelector("[data-form-error]");
  const { first_name: name, email, consent } = form.elements;

  const fail = (text, field) => {
    error.textContent = text;
    error.hidden = false;
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  };
  form.addEventListener("input", (e) => {
    e.target.removeAttribute?.("aria-invalid");
    error.hidden = true;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!name.value.trim()) return fail("Add your first name.", name);
    if (!EMAIL_RE.test(email.value.trim())) return fail("Enter a full email address, like ada@example.com", email);
    if (!consent.checked) return fail("Please tick the box to confirm you understand the risks.", consent);

    const done = document.createElement("div");
    done.className = "wl-done";
    done.setAttribute("role", "status");
    done.innerHTML = `
      <span class="done-ico"><img src="/icons/check-teal.svg" alt="" width="18" height="18" /></span>
      <h3></h3>
      <p>We’ll email you when your paper-trading invite is ready. Invites go out in small groups.</p>`;
    done.querySelector("h3").textContent = `You’re on the list, ${name.value.trim()}.`;
    form.replaceChildren(done);
  });
})();

// "Why this trade" links fill the explanation card with that trade's reasoning.
(function whyThisTrade() {
  const card = document.querySelector("[data-why]");
  if (!card) return;
  const title = card.querySelector("[data-why-title]");
  const rows = card.querySelector("[data-why-rows]");
  const text = card.querySelector("[data-why-text]");
  const trades = {
    eurusd: {
      title: "EUR/USD · Buy · 15M",
      rows: [["Daily bias", "Bullish", "green"], ["4H sweep", "Took 1.0830", "green"], ["1H order block", "1.0840 – 1.0845", "green"], ["Entry", "1.08426"], ["Size", "1.0% of balance"], ["Stop loss", "1.08210", "red"]],
      text: "The daily chart pointed up, so the bot only looked for buys. Price swept below a 4-hour low and snapped back. It bought at a 1-hour order block once the 15-minute chart confirmed, with the stop just under the sweep.",
    },
    btcusdt: {
      title: "BTC/USDT · Buy · 15M",
      rows: [["Daily bias", "Bullish", "green"], ["4H sweep", "Took 66,880", "green"], ["1H order block", "66,950 – 67,240", "green"], ["Entry", "67,215"], ["Size", "1.0% of balance"], ["Stop loss", "66,207", "red"]],
      text: "The daily chart pointed up. Price swept a 4-hour low and recovered, so the bot bought the return to a 1-hour order block with its stop under the sweep. Price fell back through the level and the stop closed the trade for a planned loss.",
    },
    xauusd: {
      title: "XAU/USD · Sell · 15M",
      rows: [["Daily bias", "Bearish", "red"], ["4H sweep", "Took 2,398.40", "green"], ["1H order block", "2,390.50 – 2,393.00", "green"], ["Entry", "2,391.20"], ["Size", "1.0% of balance"], ["Stop loss", "2,401.60", "red"]],
      text: "The daily chart pointed down, so the bot only looked for sells. Price ran above a 4-hour high and turned back. It sold once the 15-minute chart shifted lower, and took profit as gold fell toward the target.",
    },
    ethusdt: {
      title: "ETH/USDT · Buy · 15M",
      rows: [["Daily bias", "Bullish", "green"], ["4H sweep", "Took 3,142", "green"], ["1H order block", "3,168 – 3,186", "green"], ["Entry", "3,180"], ["Size", "1.0% of balance"], ["Stop loss", "3,124", "red"]],
      text: "The daily chart pointed up. After a sweep of a 4-hour low, the bot bought the return to a 1-hour order block. The move didn’t hold and the stop closed the trade for a planned loss.",
    },
  };

  document.querySelectorAll("[data-why-trade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = trades[btn.dataset.whyTrade];
      if (!t) return;
      title.textContent = t.title;
      rows.replaceChildren(...t.rows.map(([k, v, cls]) => {
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = k;
        dd.textContent = v;
        if (cls) dd.className = cls;
        row.append(dt, dd);
        return row;
      }));
      text.textContent = t.text;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.focus({ preventScroll: true });
      card.classList.add("flash");
      setTimeout(() => card.classList.remove("flash"), 1200);
    });
  });
})();

// Demo emergency stop: press and hold to stop, tap again to resume.
(function emergencyStop() {
  const card = document.querySelector("[data-stop-card]");
  if (!card) return;
  const btn = card.querySelector("[data-stop]");
  const label = card.querySelector("[data-stop-label]");
  const note = card.querySelector("[data-stop-note]");
  const defaultNote = note.textContent;
  const HOLD_MS = 1200;
  let timer = null;
  let swallowClick = false; // the click that ends a successful hold

  const setStopped = (on) => {
    card.classList.toggle("stopped", on);
    btn.setAttribute("aria-pressed", String(on));
    label.textContent = on ? "Trading stopped · Tap to resume" : "Hold to stop all trading";
    note.textContent = on ? "No new trades will open. Open trades keep their stop loss." : defaultNote;
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    btn.classList.remove("holding");
  };

  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("pointerdown", (e) => {
    swallowClick = false;
    if (card.classList.contains("stopped") || e.button !== 0) return;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add("holding");
    timer = setTimeout(() => { cancel(); setStopped(true); swallowClick = true; }, HOLD_MS);
  });
  btn.addEventListener("pointerup", cancel);
  btn.addEventListener("pointercancel", cancel);
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  btn.addEventListener("click", (e) => {
    if (swallowClick) return void (swallowClick = false);
    // Keyboard users (Enter/Space) can't hold, so a key press stops directly.
    if (card.classList.contains("stopped")) setStopped(false);
    else if (e.detail === 0) setStopped(true);
  });
})();
