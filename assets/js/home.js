// Home-page opening: the name scrambles into place, a typist writes the greeting
// (with one human slip), then lanes, header and contacts cascade in.
// Plays once per tab session; any key, click, wheel or touch skips straight to the end.

const root = document.documentElement;
const hero = document.querySelector('.hero');

/* ---------- Lanes: seamless loop + spotlight layer -------------------- */

const lanes = hero.querySelector('.lanes');
const baseLayer = lanes.querySelector('.lanes-layer');
baseLayer.querySelectorAll('.lane-track').forEach((track) => {
  track.innerHTML += track.innerHTML;
});
const litLayer = baseLayer.cloneNode(true);
litLayer.classList.add('lit');
lanes.append(litLayer);

// The base tracks began animating as soon as CSS applied; restart every track in
// the same frame so the spotlight copy stays glyph-for-glyph on top of the base.
const tracks = lanes.querySelectorAll('.lane-track');
tracks.forEach((track) => (track.style.animationName = 'none'));
void lanes.offsetWidth;
tracks.forEach((track) => (track.style.animationName = ''));

/* ---------- Typist ----------------------------------------------------- */

const COMMON = new Set(
  'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur'.split(' '),
);

// Keystroke timeline: words start a touch slower, common bigrams roll faster,
// punctuation breathes, and the slip word gets its last two letters swapped,
// noticed, deleted and retyped.
function schedule(text, { key, slip, comma = 80, sentence = 160 }) {
  const events = [];
  let at = 0;
  let count = 0;
  let rhythm = 1;
  let slipped = false;
  const delay = (factor) => key * factor * rhythm * (1 + (Math.random() * 2 - 1) * 0.14);

  for (const token of text.match(/\S+|\s+/g) ?? []) {
    if (!token.trim()) {
      at += delay(1.25);
      count += token.length;
      events.push({ at, count });
      continue;
    }
    rhythm += (0.92 + Math.random() * 0.16 - rhythm) * 0.3;
    const word = token.toLowerCase().replace(/[^a-z]/g, '');
    const trail = token.match(/[.,!?;:]+$/)?.[0] ?? '';
    const body = trail ? token.slice(0, -trail.length) : token;
    const doSlip = !slipped && slip === word && body.length >= 3;
    const first = count;

    for (let i = 0; i < body.length; i++) {
      const bigram = i > 0 && COMMON.has(body.slice(i - 1, i + 1).toLowerCase());
      at += delay(i === 0 ? 1.15 : bigram ? 0.85 : 1);
      count++;
      const swapped = doSlip && i >= body.length - 2 ? first + body.length - 2 : undefined;
      events.push({ at, count, swapped });
    }
    if (doSlip) {
      slipped = true;
      at += 280;
      events.push({ at, count: count - 1, swapped: count - 2 });
      at += 75;
      events.push({ at, count: count - 2 });
      at += 110 + delay(1.3);
      events.push({ at, count: count - 1 });
      at += delay(1.3);
      events.push({ at, count });
    }
    for (let i = 0; i < trail.length; i++) {
      at += delay(1);
      events.push({ at, count: ++count });
    }
    if (/[.!?]$/.test(token)) at += sentence;
    else if (/[,;:]$/.test(token)) at += comma;
  }
  return events;
}

function typist(el, options) {
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  el.textContent = '';
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = text;
  el.append(spoken);

  const letters = [];
  for (const token of text.match(/\S+|\s+/g) ?? []) {
    const wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    for (const ch of token) {
      const letter = document.createElement('span');
      letter.className = 'typed-letter';
      letter.textContent = ch;
      letter.setAttribute('data-unseen', '');
      wrap.append(letter);
      letters.push(letter);
    }
    el.append(wrap);
  }
  const chars = letters.map((l) => l.textContent);

  let shown = 0;
  let swappedAt;
  let caret;
  const placeCaret = (count) => {
    caret?.removeAttribute('data-caret');
    caret = letters[Math.max(0, count - 1)];
    caret?.setAttribute('data-caret', count ? 'end' : 'start');
  };
  const render = ({ count, swapped }) => {
    for (let i = Math.min(shown, count); i < Math.max(shown, count); i++) {
      letters[i].toggleAttribute('data-unseen', i >= count);
    }
    shown = count;
    if (swapped !== swappedAt) {
      if (swappedAt !== undefined) {
        letters[swappedAt].textContent = chars[swappedAt];
        letters[swappedAt + 1].textContent = chars[swappedAt + 1];
      }
      if (swapped !== undefined) {
        letters[swapped].textContent = chars[swapped + 1];
        letters[swapped + 1].textContent = chars[swapped];
      }
      swappedAt = swapped;
    }
    placeCaret(count);
  };

  let raf = 0;
  let done = false;
  let resolve;
  const finished = new Promise((r) => (resolve = r));

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    render({ count: letters.length });
    delete el.dataset.typing;
    resolve();
  };

  const start = () => {
    if (done) return finished;
    const events = schedule(text, options);
    const t0 = performance.now();
    let i = 0;
    el.dataset.typing = '';
    const tick = (now) => {
      let event;
      while (i < events.length && events[i].at <= now - t0) event = events[i++];
      if (event) render(event);
      if (i >= events.length) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return finished;
  };

  render({ count: 0 });
  return { start, finish, hideCaret: () => caret?.removeAttribute('data-caret') };
}

/* ---------- Name scramble --------------------------------------------- */

const CHARSET = 'ARPANVERMAarpanverma0123#/+*';

function scramble(nameEl) {
  const glyphs = [];
  nameEl.querySelectorAll('.name-line').forEach((line) => {
    const node = line.querySelector('.name-text')?.firstChild;
    if (!node) return;
    const layer = document.createElement('span');
    layer.className = 'name-scramble';
    layer.setAttribute('aria-hidden', 'true');
    line.append(layer);
    const lineBox = line.getBoundingClientRect();
    const range = document.createRange();
    for (let i = 0; i < node.length; i++) {
      const ch = node.textContent[i];
      if (/\s/.test(ch)) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect();
      const glyph = document.createElement('span');
      glyph.className = 'name-glyph';
      glyph.style.left = `${box.left - lineBox.left}px`;
      const block = document.createElement('span');
      block.className = 'name-block';
      block.style.left = glyph.style.left;
      block.style.width = `${box.width}px`;
      block.style.visibility = 'hidden';
      layer.append(block, glyph);
      glyphs.push({ ch, glyph, block });
    }
  });
  nameEl.classList.add('is-scrambling');

  const stagger = 55;
  const locks = glyphs.map((_, k) => k * stagger + 260 + Math.random() * 360);
  const end = Math.max(...locks) + 140;
  const t0 = performance.now();
  let raf = 0;
  let done = false;
  let resolve;
  const finished = new Promise((r) => (resolve = r));

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    nameEl.classList.add('name-ink');
    nameEl.querySelectorAll('.name-scramble').forEach((layer) => layer.remove());
    nameEl.classList.remove('is-scrambling');
    requestAnimationFrame(() => requestAnimationFrame(() => nameEl.classList.remove('name-ink')));
    resolve();
  };

  const noise = (k, step) => {
    const s = Math.sin((k + 1) * 12.9898 + step * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };

  const tick = (now) => {
    const t = now - t0;
    if (t >= end) return finish();
    const step = Math.floor(t / 50);
    glyphs.forEach(({ ch, glyph, block }, k) => {
      if (t < k * stagger) return;
      if (t >= locks[k]) {
        glyph.textContent = ch;
        glyph.removeAttribute('data-light');
        glyph.style.transform = '';
        block.style.visibility = 'hidden';
        return;
      }
      const n = noise(k, step);
      glyph.textContent = n < 0.1 ? '' : CHARSET[Math.floor(n * 997) % CHARSET.length];
      glyph.toggleAttribute('data-light', n > 0.55);
      glyph.style.transform = `translateY(${n < 0.22 ? -0.04 : n > 0.86 ? 0.03 : 0}em)`;
      if (n > 0.34) {
        block.style.visibility = 'visible';
        block.style.top = `${0.18 + ((n * 7) % 1) * 0.45}em`;
        block.style.height = `${0.1 + ((n * 13) % 1) * 0.34}em`;
        block.dataset.tone = n > 0.8 ? 'deep' : '';
      } else block.style.visibility = 'hidden';
    });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return { finish, finished };
}

/* ---------- Choreography ----------------------------------------------- */

const greeting = typist(hero.querySelector('.greeting'), { key: 27, slip: 'science', comma: 120, sentence: 200 });
const bio = typist(hero.querySelector('.bio'), { key: 7.5, comma: 45, sentence: 90 });

const show = (el) => el?.setAttribute('data-shown', '');
const part = (name) => [...document.querySelectorAll(`[data-opening-part="${name}"]`)];

if (!root.classList.contains('opening')) {
  greeting.finish();
  greeting.hideCaret();
  bio.finish();
} else {
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const listeners = new AbortController();
  let name;
  let over = false;

  const end = () => {
    over = true;
    listeners.abort();
    root.classList.remove('opening');
    try {
      sessionStorage.setItem('av-opened', '1');
    } catch {}
  };

  const skip = () => {
    if (over) return;
    timers.forEach(clearTimeout);
    name?.finish();
    greeting.finish();
    greeting.hideCaret();
    bio.finish();
    document.querySelectorAll('[data-opening-part], .site-header').forEach(show);
    end();
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((type) =>
    addEventListener(type, skip, { passive: true, signal: listeners.signal }),
  );

  const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]);
  fonts.then(() => {
    if (over) return;
    later(() => (name = scramble(hero.querySelector('.hero-name'))), 140);
    later(() => show(document.querySelector('.site-header')), 950);
    later(() => part('eyebrow').forEach(show), 1050);
    later(() => part('contacts').forEach(show), 1500);
    later(async () => {
      show(part('greeting')[0]);
      await greeting.start();
      if (over) return;
      greeting.hideCaret();
      later(async () => {
        show(part('bio')[0]);
        // Lanes come in one after another while the bio is being written.
        const rows = [...baseLayer.children].map((lane, i) => [lane, litLayer.children[i]]);
        rows.forEach((pair, i) => later(() => pair.forEach(show), 240 + i * 140));
        await bio.start();
        if (over) return;
        part('action').forEach(show);
        later(end, 700);
      }, 240);
    }, 1350);
  });
}
