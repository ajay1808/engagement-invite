// Shreya & Ajay · Save the Date
// 1. The film opens on a tap (so it can play with sound).
// 2. The reply scroll unrolls below it; replies go to /save-the-date/api/rsvp.
// 3. The browser keeps a private token so a guest can change their reply later.

const HOME = 'https://shreya-ajay.pages.dev/save-the-date/';

// The GitHub Pages copy of this site has no backend, so send guests to Cloudflare.
if (location.hostname.endsWith('github.io')) location.replace(HOME + location.hash);

const API = '/save-the-date/api';
const STORE_KEY = 'shreya-ajay:save-the-date';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, root = document) => root.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const COUNTRIES = [
  ['+91', '🇮🇳', 'India'],
  ['+1', '🇺🇸', 'United States / Canada'],
  ['+44', '🇬🇧', 'United Kingdom'],
  ['+971', '🇦🇪', 'UAE'],
  ['+65', '🇸🇬', 'Singapore'],
  ['+61', '🇦🇺', 'Australia'],
  ['+64', '🇳🇿', 'New Zealand'],
  ['+60', '🇲🇾', 'Malaysia'],
  ['+974', '🇶🇦', 'Qatar'],
  ['+966', '🇸🇦', 'Saudi Arabia'],
  ['+968', '🇴🇲', 'Oman'],
  ['+965', '🇰🇼', 'Kuwait'],
  ['+973', '🇧🇭', 'Bahrain'],
  ['+94', '🇱🇰', 'Sri Lanka'],
  ['+977', '🇳🇵', 'Nepal'],
  ['+49', '🇩🇪', 'Germany'],
  ['+33', '🇫🇷', 'France'],
  ['+31', '🇳🇱', 'Netherlands'],
  ['+41', '🇨🇭', 'Switzerland'],
  ['+353', '🇮🇪', 'Ireland'],
  ['+46', '🇸🇪', 'Sweden'],
  ['+81', '🇯🇵', 'Japan'],
  ['+852', '🇭🇰', 'Hong Kong'],
  ['+27', '🇿🇦', 'South Africa'],
  ['', '🌐', 'Other (type + and code)'],
];

const MESSAGES = {
  yes: "We can't wait to celebrate with you.",
  maybe: "We really hope you can make it. We'll check in again with the formal invite.",
  no: "You'll be missed. Thank you for your blessings.",
};
const REPLY_TEXT = { yes: "Yes, I'll be there", maybe: 'Hoping to, not sure yet', no: "Sorry, I can't make it" };

/* ───────────── Saved reply (this browser only) ───────────── */

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
  } catch {
    return null;
  }
}
function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Private browsing: the reply is still sent, it just can't be changed from this device.
  }
}

/* ───────────── 1 · The film ───────────── */

function setupFilm() {
  const stage = $('#stage');
  const film = $('#film');
  const opener = $('#opener');
  const sound = $('#sound');
  let resumeWhenBack = false;

  const syncSound = () => {
    sound.setAttribute('aria-pressed', String(film.muted));
    sound.setAttribute('aria-label', film.muted ? 'Turn sound on' : 'Mute');
  };

  opener.addEventListener('click', () => {
    // play() must start inside the tap for phones to allow sound.
    film.muted = false;
    film.play().catch(() => {
      film.muted = true;
      film.play().catch(() => stage.classList.add('has-played'));
    }).finally(syncSound);
    stage.classList.add('is-open');
    setTimeout(() => { opener.hidden = true; }, reduceMotion ? 0 : 900);
  });

  sound.addEventListener('click', () => {
    film.muted = !film.muted;
    syncSound();
  });

  film.addEventListener('click', () => {
    if (!stage.classList.contains('is-open')) return;
    film.paused ? film.play() : film.pause();
  });

  film.addEventListener('waiting', () => stage.classList.add('is-buffering'));
  film.addEventListener('playing', () => stage.classList.remove('is-buffering'));

  // The film and its song loop until the guest moves on to the reply (see the pause below).
  // Each time round, hold the last frame and fade into the restart instead of jumping.
  const loopFade = $('#loop-fade');
  film.addEventListener('ended', () => {
    stage.classList.add('has-played');
    loopFade.classList.add('is-on');
    film.currentTime = 0;
    film.play()
      .then(() => requestAnimationFrame(() => loopFade.classList.remove('is-on')))
      .catch(() => {}); // if the phone refuses, the last frame (with the date) stays up
  });

  film.addEventListener('error', () => {
    // If the film can't load, show its last frame (it carries the date) and the reply link.
    film.poster = 'media/end.jpg';
    stage.classList.remove('is-buffering');
    stage.classList.add('is-open', 'has-played');
    opener.hidden = true;
  });

  // Pause while the film is scrolled away (the guest has moved on to the reply)
  // or the page is in the background; carry on if they come back.
  const pauseFor = () => {
    if (!film.paused && !film.ended) {
      film.pause();
      resumeWhenBack = true;
    }
  };
  const resume = () => {
    if (resumeWhenBack) film.play().catch(() => {});
    resumeWhenBack = false;
  };
  new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio < 0.3) pauseFor();
    else if (entry.intersectionRatio > 0.6) resume();
  }, { threshold: [0, 0.3, 0.6, 1] }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? pauseFor() : resume()));
}

/* ───────────── 2 · The reply form ───────────── */

function setupForm() {
  const form = $('#rsvp');
  const formView = $('#form-view');
  const thanksView = $('#thanks-view');
  const f = {
    name: $('#name'),
    cc: $('#cc'),
    phone: $('#phone'),
    email: $('#email'),
    guests: $('#guests'),
    website: $('#website'),
  };
  const ccShown = $('#cc-shown');
  const reveal = $('#guests-reveal');
  const send = $('#send');
  const formError = $('#form-error');
  const status = $('#status');
  let saved = loadSaved();
  let editing = false;
  let turnstile = null;

  // Country codes, defaulting from the guest's time zone.
  for (const [code, flag, country] of COUNTRIES) {
    f.cc.add(new Option(`${flag} ${code || '+…'}  ${country}`, code));
  }
  f.cc.value = guessCountryCode();
  const syncCc = () => {
    const [code, flag] = COUNTRIES.find(([c]) => c === f.cc.value) || COUNTRIES.at(-1);
    ccShown.textContent = `${flag} ${code || '+…'}`;
    f.phone.placeholder = code === '+91' ? '98765 43210' : code === '+1' ? '570 555 0123' : code ? 'Phone number' : '+ code and number';
  };
  f.cc.addEventListener('change', () => { syncCc(); clearError('phone'); });
  syncCc();

  // Guests range
  const ticks = $('.ticks');
  for (let n = 1; n <= 10; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.textContent = n;
    b.addEventListener('click', () => setGuests(n));
    ticks.append(b);
  }
  const num = $('#guests-num');
  const unit = $('#guests-unit');
  const [minus, plus] = document.querySelectorAll('.step');
  function setGuests(n, bump = true) {
    n = Math.min(10, Math.max(1, Math.round(n)));
    const changed = String(n) !== num.textContent;
    f.guests.value = n;
    f.guests.style.setProperty('--pct', `${((n - 1) / 9) * 100}%`);
    const text = n === 1 ? 'just me' : 'guests';
    num.textContent = n;
    unit.textContent = text;
    f.guests.setAttribute('aria-valuetext', n === 1 ? 'Just me' : `${n} guests`);
    minus.disabled = n === 1;
    plus.disabled = n === 10;
    ticks.querySelectorAll('button').forEach((b, i) => b.classList.toggle('is-on', i + 1 === n));
    if (bump && changed && !reduceMotion) {
      num.classList.remove('bump');
      void num.offsetWidth;
      num.classList.add('bump');
    }
    clearError('guests');
  }
  f.guests.addEventListener('input', () => setGuests(Number(f.guests.value)));
  minus.addEventListener('click', () => setGuests(Number(f.guests.value) - 1));
  plus.addEventListener('click', () => setGuests(Number(f.guests.value) + 1));
  setGuests(1, false);

  // Show the guests question for "yes" and "hoping to".
  const attendingValue = () => form.elements.attending.value;
  const syncReveal = () => {
    const show = attendingValue() === 'yes' || attendingValue() === 'maybe';
    reveal.classList.toggle('is-shown', show);
    reveal.inert = !show;
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'attending') {
      clearError('attending');
      syncReveal();
    }
  });

  for (const key of ['name', 'phone', 'email']) f[key].addEventListener('input', () => clearError(key));

  // Turnstile spam check, only if it's been switched on.
  fetch(`${API}/config`)
    .then((r) => r.json())
    .then(({ turnstileSiteKey }) => turnstileSiteKey && loadTurnstile(turnstileSiteKey))
    .catch(() => {});

  function loadTurnstile(sitekey) {
    window.onTurnstileLoad = () => {
      turnstile = {
        id: window.turnstile.render('#turnstile-box', {
          sitekey,
          appearance: 'interaction-only',
          'refresh-expired': 'auto',
        }),
      };
    };
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    s.async = true;
    document.head.append(s);
  }

  async function turnstileToken() {
    if (!turnstile) return null;
    for (let i = 0; i < 40; i++) {
      const token = window.turnstile.getResponse(turnstile.id);
      if (token) return token;
      await wait(250);
    }
    return null;
  }

  // ── Validation (the server checks the same things) ──
  function phoneValue() {
    const raw = f.phone.value.trim();
    if (raw.startsWith('+') || !f.cc.value) return `+${raw.replace(/[^\d]/g, '')}`;
    return f.cc.value + raw.replace(/[^\d]/g, '').replace(/^0+/, '');
  }

  function check() {
    const errors = {};
    const name = f.name.value.replace(/\s+/g, ' ').trim();
    if (name.length < 2) errors.name = 'Please enter your name.';
    const digits = phoneValue().slice(1);
    if (!f.phone.value.trim()) errors.phone = 'Please enter your phone number.';
    else if (digits.length < 8 || digits.length > 15) errors.phone = 'Please check the number and country code.';
    const email = f.email.value.trim();
    if (!email) errors.email = 'Please enter your email.';
    else if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) errors.email = 'Please check your email address.';
    if (!attendingValue()) errors.attending = 'Please choose one.';
    return errors;
  }

  function showErrors(errors) {
    for (const [key, message] of Object.entries(errors)) {
      const el = $(`#${key}-error`);
      if (!el) continue;
      el.textContent = message;
      el.closest('.field')?.classList.add('has-error');
      const input = key === 'attending' ? form.querySelector('[name=attending]') : f[key];
      input?.setAttribute('aria-invalid', 'true');
    }
    const first = ['name', 'phone', 'email', 'attending', 'guests'].find((k) => errors[k]);
    if (first) {
      const target = first === 'attending' ? form.querySelector('[name=attending]') : f[first];
      target.focus({ preventScroll: true });
      target.closest('.field').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function clearError(key) {
    const el = $(`#${key}-error`);
    if (!el || !el.textContent) return;
    el.textContent = '';
    el.closest('.field')?.classList.remove('has-error');
    const input = key === 'attending' ? form.querySelector('[name=attending]') : f[key];
    input?.removeAttribute('aria-invalid');
  }

  // ── Send ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    const errors = check();
    if (Object.keys(errors).length) return showErrors(errors);

    const attending = attendingValue();
    const reply = {
      name: f.name.value.replace(/\s+/g, ' ').trim(),
      phone: phoneValue(),
      email: f.email.value.trim(),
      attending,
      guests: attending === 'no' ? null : Number(f.guests.value),
    };

    busy(true);
    try {
      let result;
      if (editing && saved?.id) {
        result = await call('PUT', { ...reply, id: saved.id, token: saved.token });
        if (result.status === 404) editing = false; // reply was removed; send it as new
      }
      if (!editing || !saved?.id) {
        result = await call('POST', { ...reply, website: f.website.value, turnstile: await turnstileToken() });
      }

      if (!result.ok) {
        if (result.data?.fields) showErrors(result.data.fields);
        else if (result.data?.error === 'verification') {
          formError.textContent = 'Please wait a moment, then send again.';
          if (turnstile) window.turnstile.reset(turnstile.id);
        } else formError.textContent = "Sorry, that didn't go through. Please try again.";
        return;
      }

      const id = result.data.id || saved.id;
      const token = result.data.token || saved.token;
      saved = { id, token, reply, ui: { cc: f.cc.value, phone: f.phone.value.trim() }, at: new Date().toISOString() };
      save(saved);
      editing = false;
      status.textContent = 'Your reply has been sent.';
      await flyAway();
      showThanks(true);
    } catch {
      formError.textContent = "Couldn't send. Please check your connection and try again.";
    } finally {
      busy(false);
    }
  });

  async function call(method, body) {
    const res = await fetch(`${API}/rsvp`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { ok: res.ok && data?.ok, status: res.status, data };
  }

  function busy(on) {
    send.setAttribute('aria-busy', String(on));
    send.querySelector('.send__label').textContent = on ? 'Sending…' : editing ? 'Update reply' : 'Send reply';
    for (const el of form.elements) if (el !== send) el.disabled = on;
    if (!on) setGuests(Number(f.guests.value), false); // restores the +/- disabled states
  }

  // ── Envelope animation ──
  // Each step is capped by a timer: if the phone pauses animations (app switched
  // mid-send), the thank-you still appears.
  const settle = (animation, ms) => Promise.race([animation.finished.catch(() => {}), wait(ms)]);

  async function flyAway() {
    if (reduceMotion) return;
    const flight = $('#flight');
    const paper = $('.scroll__paper').getBoundingClientRect();
    const w = 132;
    const x = paper.left + paper.width / 2 - w / 2;
    const y = Math.min(Math.max(paper.top + paper.height / 2 - 46, 80), innerHeight - 200);

    formView.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.96)' }], { duration: 350, fill: 'forwards' });
    flight.classList.remove('is-sealed');
    const appear = flight.animate(
      [
        { opacity: 0, transform: `translate(${x}px, ${y + 40}px) scale(.6)` },
        { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` },
      ],
      { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' },
    );
    await settle(appear, 600);
    flight.classList.add('is-sealed');
    await wait(700);
    const fly = flight.animate(
      [
        { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1) rotate(0)` },
        { opacity: 1, transform: `translate(${x + innerWidth * 0.12}px, ${y - innerHeight * 0.25}px) scale(.75) rotate(-10deg)`, offset: 0.45 },
        { opacity: 0, transform: `translate(${x + innerWidth * 0.45}px, ${y - innerHeight * 0.75}px) scale(.3) rotate(-22deg)` },
      ],
      { duration: 1000, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' },
    );
    await settle(fly, 1300);
    appear.cancel();
    fly.cancel();
    flight.classList.remove('is-sealed');
  }

  // ── Views ──
  function showThanks(fresh) {
    const { reply } = saved;
    const first = reply.name.split(' ')[0];
    $('#thanks-title').textContent = fresh ? `Thank you, ${first}!` : `Welcome back, ${first}`;
    $('#thanks-msg').textContent = fresh ? MESSAGES[reply.attending] : 'We have your reply.';
    const summary = $('#thanks-summary');
    summary.replaceChildren('Your reply: ', Object.assign(document.createElement('b'), { textContent: REPLY_TEXT[reply.attending] }));
    if (reply.guests) summary.append(` · ${reply.guests === 1 ? 'just you' : `${reply.guests} guests`}`);
    $('#calendar').hidden = reply.attending === 'no';

    formView.getAnimations().forEach((a) => a.cancel());
    formView.hidden = true;
    thanksView.hidden = false;
    if (fresh) {
      thanksView.classList.remove('is-entering');
      void thanksView.offsetWidth;
      thanksView.classList.add('is-entering');
      $('#thanks-title').focus({ preventScroll: true });
    }
  }

  function showForm({ prefill }) {
    form.reset();
    for (const key of ['name', 'phone', 'email', 'attending', 'guests']) clearError(key);
    formError.textContent = '';
    f.cc.value = guessCountryCode();
    setGuests(1, false);
    if (prefill && saved) {
      const { reply, ui } = saved;
      f.name.value = reply.name;
      f.email.value = reply.email;
      f.cc.value = ui?.cc ?? '';
      f.phone.value = ui?.phone ?? reply.phone;
      form.querySelector(`[name=attending][value=${reply.attending}]`).checked = true;
      if (reply.guests) setGuests(reply.guests, false);
    }
    syncCc();
    syncReveal();
    editing = Boolean(prefill && saved);
    $('#reply-title').textContent = editing ? 'Change your reply' : 'Kindly reply';
    send.querySelector('.send__label').textContent = editing ? 'Update reply' : 'Send reply';

    thanksView.hidden = true;
    formView.hidden = false;
    formView.classList.remove('is-entering');
    void formView.offsetWidth;
    formView.classList.add('is-entering');
    $('#scroll').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    f.name.focus({ preventScroll: true });
  }

  $('#change').addEventListener('click', () => showForm({ prefill: true }));
  $('#another').addEventListener('click', () => showForm({ prefill: false }));

  if (saved?.reply) showThanks(false);
}

function guessCountryCode() {
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {}
  const byZone = [
    [/^Asia\/(Kolkata|Calcutta)$/, '+91'],
    [/^America\//, '+1'],
    [/^Europe\/(London|Belfast)$/, '+44'],
    [/^Asia\/Dubai$/, '+971'],
    [/^Asia\/Singapore$/, '+65'],
    [/^Australia\//, '+61'],
    [/^Pacific\/Auckland$/, '+64'],
    [/^Asia\/Kuala_Lumpur$/, '+60'],
    [/^Asia\/Qatar$/, '+974'],
    [/^Asia\/Riyadh$/, '+966'],
    [/^Asia\/Muscat$/, '+968'],
    [/^Asia\/Kuwait$/, '+965'],
    [/^Asia\/Bahrain$/, '+973'],
    [/^Asia\/Colombo$/, '+94'],
    [/^Asia\/(Kathmandu|Katmandu)$/, '+977'],
    [/^Europe\/Berlin$/, '+49'],
    [/^Europe\/Paris$/, '+33'],
    [/^Europe\/Amsterdam$/, '+31'],
    [/^Europe\/Zurich$/, '+41'],
    [/^Europe\/Dublin$/, '+353'],
    [/^Europe\/Stockholm$/, '+46'],
    [/^Asia\/Tokyo$/, '+81'],
    [/^Asia\/Hong_Kong$/, '+852'],
    [/^Africa\/Johannesburg$/, '+27'],
  ];
  return byZone.find(([re]) => re.test(zone))?.[1] ?? '+91';
}

/* ───────────── The scroll unrolls into view ───────────── */

function setupUnroll() {
  const scroll = $('#scroll');
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  // Already scrolled down (e.g. a returning guest)? Leave it open.
  if (scroll.getBoundingClientRect().top < innerHeight) return;
  scroll.classList.add('will-unroll');
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      scroll.classList.add('is-open');
      io.disconnect();
    }
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  io.observe(scroll);
}

/* ───────────── Falling wisteria petals ───────────── */

function setupPetals() {
  const canvas = $('.petals');
  if (reduceMotion || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const colors = ['#f29bbb', '#ec6a9a', '#f6b3cb', '#e5508a', '#fbd3e1'];
  const petals = [];
  let w = 0, h = 0, dpr = 1, last = 0, running = false, visible = false;

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  };
  const spawn = (p, anywhere) => {
    p.x = Math.random() * w;
    p.y = anywhere ? Math.random() * h : -20;
    p.r = 4 + Math.random() * 6;
    p.vy = 16 + Math.random() * 24;
    p.vx = -10 + Math.random() * 20;
    p.rot = Math.random() * Math.PI * 2;
    p.vr = (Math.random() - 0.5) * 1.6;
    p.flip = Math.random() * Math.PI * 2;
    p.c = colors[(Math.random() * colors.length) | 0];
    return p;
  };

  const frame = (t) => {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const p of petals) {
      p.flip += dt * 2.2;
      p.x += (p.vx + Math.sin(p.flip) * 14) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 20) spawn(p, false);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.sin(p.flip)));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.8, p.r * 0.7, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.8, p.r * 0.7, -p.r, -p.r * 0.6, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(frame);
  };

  const update = () => {
    const should = visible && !document.hidden;
    if (should && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!should) running = false;
  };

  resize();
  const count = Math.round(Math.min(22, Math.max(12, w / 30)));
  for (let i = 0; i < count; i++) petals.push(spawn({}, true));
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }).observe(canvas);
  document.addEventListener('visibilitychange', update);
}

setupFilm();
setupForm();
setupUnroll();
setupPetals();
