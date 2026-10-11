/* Vitrina · proyecto de ejemplo y pantallas de muestra dibujadas por código.
   Sirven para que la herramienta abra con contenido real a la vista; se reemplazan subiendo tus capturas. */
(function (V) {
  'use strict';
  const { Color } = V;
  const SW = 1080, SH = 2340;
  const cache = new Map();

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function txt(ctx, s, x, y, size, color, weight = 500, align = 'left') {
    ctx.font = `${weight} ${size}px "Onest", system-ui, sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
  }
  function check(ctx, cx, cy, r, color, done) {
    ctx.lineWidth = 7; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (done) { ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx - r * 0.42, cy); ctx.lineTo(cx - r * 0.1, cy + r * 0.32); ctx.lineTo(cx + r * 0.45, cy - r * 0.3); ctx.stroke(); }
    else ctx.stroke();
  }
  function statusBar(ctx, fg) {
    txt(ctx, '9:41', 70, 92, 38, fg, 600);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(SW / 2, 70, 18, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) rr(ctx, SW - 250 + i * 18, 82 - i * 9, 11, 14 + i * 9, 3), ctx.fill();
    rr(ctx, SW - 150, 62, 70, 32, 8); ctx.lineWidth = 3; ctx.strokeStyle = fg; ctx.stroke();
    rr(ctx, SW - 145, 67, 48, 22, 5); ctx.fill();
  }
  function navBar(ctx, bg, fg, accent, active) {
    ctx.fillStyle = bg; ctx.fillRect(0, SH - 230, SW, 230);
    ctx.fillStyle = Color.rgba(fg, 0.08); ctx.fillRect(0, SH - 230, SW, 2);
    const labels = ['Hoy', 'Progreso', 'Calendario', 'Ajustes'];
    labels.forEach((l, i) => {
      const x = (i + 0.5) * (SW / 4);
      const on = i === active;
      if (on) { ctx.fillStyle = Color.rgba(accent, 0.18); rr(ctx, x - 70, SH - 200, 140, 64, 32); ctx.fill(); }
      ctx.fillStyle = on ? accent : Color.rgba(fg, 0.55);
      rr(ctx, x - 20, SH - 188, 40, 40, 10); ctx.fill();
      txt(ctx, l, x, SH - 100, 30, on ? fg : Color.rgba(fg, 0.6), on ? 700 : 500, 'center');
    });
    ctx.fillStyle = Color.rgba(fg, 0.5); rr(ctx, SW / 2 - 110, SH - 34, 220, 10, 5); ctx.fill();
  }

  const HABITS = [
    ['Leer 20 minutos', '12 días seguidos', true],
    ['Tomar 2 L de agua', '5 de 8 vasos', false],
    ['Caminar 6,000 pasos', 'Meta diaria', true],
    ['Meditar', '10 min · mañana', true],
    ['Sin pantallas tras las 22:00', 'Noche', false],
    ['Practicar guitarra', '3 veces por semana', false],
  ];

  const SCREENS = {
    hoy(ctx, a) {
      const bg = '#f6f7f2', fg = '#141a16';
      ctx.fillStyle = bg; ctx.fillRect(0, 0, SW, SH); statusBar(ctx, fg);
      txt(ctx, 'Sábado 10 de octubre', 70, 230, 38, Color.rgba(fg, 0.55));
      txt(ctx, 'Hoy', 70, 330, 100, fg, 800);
      // anillo de progreso
      const cx = SW - 190, cy = 290, r = 95;
      ctx.lineWidth = 26; ctx.strokeStyle = Color.rgba(a, 0.18); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = a; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.62); ctx.stroke(); ctx.lineCap = 'butt';
      txt(ctx, '62%', cx, cy + 18, 54, fg, 800, 'center');
      // chips de días
      const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      days.forEach((d, i) => {
        const x = 70 + i * 136, on = i === 5;
        ctx.fillStyle = on ? fg : '#ffffff'; rr(ctx, x, 430, 116, 150, 36); ctx.fill();
        txt(ctx, d, x + 58, 485, 32, on ? '#fff' : Color.rgba(fg, 0.5), 600, 'center');
        txt(ctx, String(5 + i), x + 58, 548, 44, on ? '#fff' : fg, 700, 'center');
      });
      HABITS.forEach(([t, s, done], i) => {
        const y = 650 + i * 225;
        ctx.fillStyle = '#ffffff'; rr(ctx, 50, y, SW - 100, 195, 44); ctx.fill();
        ctx.fillStyle = Color.rgba(a, done ? 0.95 : 0.14); rr(ctx, 90, y + 47, 100, 100, 30); ctx.fill();
        txt(ctx, t, 225, y + 92, 44, fg, 650);
        txt(ctx, s, 225, y + 145, 34, Color.rgba(fg, 0.5));
        check(ctx, SW - 135, y + 97, 38, a, done);
      });
      navBar(ctx, '#ffffff', fg, a, 0);
    },
    progreso(ctx, a) {
      const bg = '#ffffff', fg = '#141a16';
      ctx.fillStyle = bg; ctx.fillRect(0, 0, SW, SH); statusBar(ctx, fg);
      txt(ctx, 'Progreso', 70, 300, 92, fg, 800);
      const cards = [['Racha actual', '12', 'días'], ['Completados', '87%', 'este mes']];
      cards.forEach(([l, v, u], i) => {
        const x = 50 + i * 500;
        ctx.fillStyle = i ? '#f2f3ee' : a; rr(ctx, x, 380, 480, 330, 50); ctx.fill();
        const c = i ? fg : Color.readableOn(a);
        txt(ctx, l, x + 50, 470, 36, Color.rgba(c, 0.75), 500);
        txt(ctx, v, x + 50, 620, 140, c, 800);
        txt(ctx, u, x + 50 + (v.length * 72), 620, 40, Color.rgba(c, 0.7), 600);
      });
      txt(ctx, 'Últimos 7 días', 70, 850, 44, fg, 700);
      const vals = [0.5, 0.75, 0.6, 1, 0.85, 0.4, 0.92];
      const base = 1450, maxH = 480;
      ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => {
        const x = 85 + i * 135, hh = vals[i] * maxH;
        ctx.fillStyle = '#eef0ea'; rr(ctx, x, base - maxH, 86, maxH, 28); ctx.fill();
        ctx.fillStyle = i === 3 ? a : Color.mix(a, '#ffffff', 0.45); rr(ctx, x, base - hh, 86, hh, 28); ctx.fill();
        txt(ctx, d, x + 43, base + 70, 34, Color.rgba(fg, 0.55), 600, 'center');
      });
      ctx.fillStyle = '#f2f3ee'; rr(ctx, 50, 1620, SW - 100, 380, 50); ctx.fill();
      txt(ctx, 'Hábito más constante', 100, 1710, 36, Color.rgba(fg, 0.55));
      txt(ctx, 'Leer 20 minutos', 100, 1800, 56, fg, 750);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 5 === 3 ? '#dde0d8' : a; rr(ctx, 100 + i * 62, 1870, 48, 48, 12); ctx.fill(); }
      navBar(ctx, '#ffffff', fg, a, 1);
    },
    calendario(ctx, a) {
      const bg = '#121714', fg = '#eef2ee';
      ctx.fillStyle = bg; ctx.fillRect(0, 0, SW, SH); statusBar(ctx, fg);
      txt(ctx, 'Octubre', 70, 300, 92, fg, 800);
      txt(ctx, '2026', 470, 300, 92, Color.rgba(fg, 0.35), 800);
      ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => txt(ctx, d, 130 + i * 137, 440, 34, Color.rgba(fg, 0.5), 600, 'center'));
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let k = 0; k < 35; k++) {
        const i = k % 7, j = Math.floor(k / 7);
        const x = 70 + i * 137, y = 490 + j * 150;
        const day = k - 2;
        if (day < 1 || day > 31) continue;
        const v = day > 10 ? 0 : rnd();
        ctx.fillStyle = day > 10 ? Color.rgba(fg, 0.06) : Color.mix('#1e2621', a, 0.25 + v * 0.75);
        rr(ctx, x, y, 120, 120, 30); ctx.fill();
        txt(ctx, String(day), x + 60, y + 75, 38, day === 10 ? '#ffffff' : Color.rgba(fg, day > 10 ? 0.4 : 0.9), day === 10 ? 800 : 500, 'center');
        if (day === 10) { ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; rr(ctx, x - 3, y - 3, 126, 126, 32); ctx.stroke(); }
      }
      ctx.fillStyle = '#1b221e'; rr(ctx, 50, 1300, SW - 100, 640, 50); ctx.fill();
      txt(ctx, 'Resumen del mes', 100, 1400, 44, fg, 700);
      [['Días perfectos', '6'], ['Hábitos activos', '6'], ['Mejor racha', '12']].forEach(([l, v], i) => {
        const y = 1500 + i * 140;
        txt(ctx, l, 100, y + 30, 40, Color.rgba(fg, 0.7));
        txt(ctx, v, SW - 100, y + 30, 56, a, 800, 'right');
        if (i < 2) { ctx.fillStyle = Color.rgba(fg, 0.08); ctx.fillRect(100, y + 80, SW - 200, 2); }
      });
      navBar(ctx, '#121714', fg, a, 2);
    },
    enfoque(ctx, a) {
      const fg = '#ffffff';
      const g = ctx.createLinearGradient(0, 0, 0, SH);
      g.addColorStop(0, Color.mix(a, '#000000', 0.55)); g.addColorStop(1, Color.mix(a, '#000000', 0.85));
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH); statusBar(ctx, fg);
      txt(ctx, 'Meditar', SW / 2, 380, 72, fg, 800, 'center');
      txt(ctx, 'Respira con el círculo', SW / 2, 460, 40, Color.rgba(fg, 0.6), 500, 'center');
      const cx = SW / 2, cy = 1050;
      for (let i = 5; i >= 1; i--) { ctx.fillStyle = Color.rgba(a, 0.08 * i); ctx.beginPath(); ctx.arc(cx, cy, 120 + i * 70, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 22; ctx.strokeStyle = Color.rgba(fg, 0.15); ctx.beginPath(); ctx.arc(cx, cy, 330, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = fg; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, 330, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.7); ctx.stroke(); ctx.lineCap = 'butt';
      txt(ctx, '07:00', cx, cy + 40, 150, fg, 300, 'center');
      ctx.fillStyle = fg; rr(ctx, SW / 2 - 300, 1650, 600, 170, 85); ctx.fill();
      txt(ctx, 'Pausar', SW / 2, 1760, 54, Color.mix(a, '#000000', 0.6), 700, 'center');
      txt(ctx, 'Sesión 3 de 4', SW / 2, 1950, 38, Color.rgba(fg, 0.55), 500, 'center');
    },
    recordatorios(ctx, a) {
      const bg = '#f6f7f2', fg = '#141a16';
      ctx.fillStyle = bg; ctx.fillRect(0, 0, SW, SH); statusBar(ctx, fg);
      txt(ctx, 'Recordatorios', 70, 300, 88, fg, 800);
      const items = [['07:30', 'Meditar', 'Todos los días', true], ['13:00', 'Tomar agua', 'Cada 2 horas', true], ['18:30', 'Caminar', 'Lun · Mié · Vie', false], ['21:45', 'Leer', 'Todos los días', true], ['22:00', 'Apagar pantallas', 'Entre semana', true]];
      items.forEach(([t, n, d, on], i) => {
        const y = 400 + i * 290;
        ctx.fillStyle = '#ffffff'; rr(ctx, 50, y, SW - 100, 250, 50); ctx.fill();
        txt(ctx, t, 100, y + 120, 90, on ? fg : Color.rgba(fg, 0.35), 300);
        txt(ctx, n + ' · ' + d, 100, y + 190, 36, Color.rgba(fg, 0.55));
        ctx.fillStyle = on ? a : '#d9ddd5'; rr(ctx, SW - 260, y + 85, 160, 86, 43); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(on ? SW - 143 : SW - 217, y + 128, 34, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = a; rr(ctx, SW - 280, SH - 470, 200, 200, 64); ctx.fill();
      ctx.fillStyle = Color.readableOn(a); ctx.fillRect(SW - 186, SH - 420, 12, 100); ctx.fillRect(SW - 230, SH - 376, 100, 12);
      navBar(ctx, '#ffffff', fg, a, 3);
    },
  };

  function sampleScreen(kind, accent) {
    const key = kind + accent;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = SW; c.height = SH;
    const ctx = c.getContext('2d');
    (SCREENS[kind] || SCREENS.hoy)(ctx, accent);
    cache.set(key, c);
    return c;
  }

  function sampleProject() {
    const id = V.uid();
    const L = (es, en) => ({ 'es-419': es, 'en-US': en });
    return {
      id, version: 1, created: Date.now(), updated: Date.now(), isSample: true,
      name: 'Pulso (ejemplo)',
      developer: 'Dezen',
      packageName: 'com.dezen.pulso',
      locales: ['es-419', 'en-US'],
      defaultLocale: 'es-419',
      listing: {
        'es-419': {
          title: 'Pulso: hábitos diarios',
          short: 'Crea hábitos que duran: rachas, recordatorios y progreso claro, sin anuncios.',
          full: 'Pulso te ayuda a construir rutinas pequeñas que se sostienen en el tiempo.\n\nMarca tus hábitos con un toque, mira tu racha crecer y recibe recordatorios a la hora que tú eliges. Sin cuentas obligatorias y sin anuncios.\n\n<b>Lo que puedes hacer</b>\n• Crear hábitos diarios, semanales o con días específicos\n• Ver tu progreso por semana y por mes\n• Consultar un calendario con tus días perfectos\n• Programar recordatorios flexibles\n• Usar el modo enfoque con respiración guiada\n• Exportar tus datos cuando quieras\n\n<b>Pensado para durar</b>\nPulso funciona sin conexión y guarda todo en tu teléfono. Tú decides qué compartir.\n\n¿Tienes ideas? Escríbenos, leemos cada mensaje.',
        },
        'en-US': {
          title: 'Pulso: Daily Habits',
          short: 'Build habits that last: streaks, reminders and clear progress. No ads.',
          full: 'Pulso helps you build small routines that stick.\n\nCheck off habits with one tap, watch your streak grow and get reminders at the time you choose. No account required and no ads.\n\n<b>What you can do</b>\n• Create daily, weekly or custom-day habits\n• See your progress by week and month\n• Browse a calendar of your perfect days\n• Schedule flexible reminders\n• Use focus mode with guided breathing\n• Export your data anytime\n\n<b>Built to last</b>\nPulso works offline and keeps everything on your phone. You decide what to share.\n\nGot ideas? Write to us, we read every message.',
        },
      },
      meta: { category: 'Salud y bienestar', email: 'dezen.dev@gmail.com', website: 'https://github.com/dezenbit', privacy: '', tags: 'hábitos, rutina, productividad' },
      theme: {
        preset: 'bosque', bgType: 'mesh', c1: '#0f3d2e', c2: '#1d7a55', c3: '#9be3b9', text: '#ffffff', accent: '#ffd166',
        font: 'Bricolage Grotesque', align: 'center', textPos: 'top', headSize: 1, subSize: 1,
        frame: 'modern', frameColor: '#111412', shadow: 0.55, deviceScale: 0.8, tilt: 0, panorama: true, pattern: 'none', noise: 0.05, badgeBg: '#ffd166',
      },
      slides: [
        { id: V.uid(), sample: 'hoy', img: null, img2: null, layout: 'device', text: { ...wrap(L('Tus hábitos, *un toque* a la vez', 'Your habits, *one tap* at a time'), L('Marca, suma racha y sigue', 'Check off, build streaks, keep going'), L('Nuevo', 'New')) } },
        { id: V.uid(), sample: 'progreso', img: null, img2: null, layout: 'tilt', text: { ...wrap(L('Mira tu *progreso* real', 'See your *real* progress'), L('Semanas, meses y rachas claras', 'Weeks, months and clear streaks')) } },
        { id: V.uid(), sample: 'calendario', img: null, img2: 'sample:recordatorios', layout: 'duo', text: { ...wrap(L('Cada día *cuenta*', 'Every day *counts*'), L('Calendario y recordatorios a tu medida', 'Calendar and reminders your way')) } },
        { id: V.uid(), sample: 'enfoque', img: null, img2: null, layout: 'bleed', text: { ...wrap(L('Respira y *enfócate*', 'Breathe and *focus*'), L('Modo enfoque con respiración guiada', 'Focus mode with guided breathing')) } },
        { id: V.uid(), sample: 'recordatorios', img: null, img2: null, layout: 'hero', text: { ...wrap(L('Sin anuncios. *Sin ruido.*', 'No ads. *No noise.*'), L('Tus datos se quedan en tu teléfono', 'Your data stays on your phone'), L('Gratis', 'Free')) } },
      ],
      feature: { layout: 'split', tagline: L('Hábitos que *duran*', 'Habits that *last*'), showIcon: true, slide: 0 },
      icon: { mode: 'glyph', glyph: 'P', symbol: 'pulse', font: 'Bricolage Grotesque', fg: '#ffffff', bgType: 'gradient', bg1: '#1d7a55', bg2: '#0f3d2e', img: null, scale: 0.62, rotate: 0, shadow: 0.25, longShadow: false, shape: 'squircle' },
      notes: {
        current: 0,
        versions: [{ id: V.uid(), name: '1.2.0', code: 12, tone: 'cercano', emoji: true, items: [
          { type: 'new', text: L('Modo enfoque con respiración guiada', 'Focus mode with guided breathing') },
          { type: 'improve', text: L('El calendario carga más rápido', 'The calendar loads faster') },
          { type: 'fix', text: L('Los recordatorios ya respetan el horario de verano', 'Reminders now respect daylight saving time') },
        ], output: {} }],
      },
      checklist: {},
    };
    function wrap(hd, sb, bd) {
      const o = {};
      for (const loc of Object.keys(hd)) o[loc] = { h: hd[loc], s: sb ? sb[loc] : '', badge: bd ? bd[loc] : '' };
      return o;
    }
  }

  function blankProject(name = 'Mi app') {
    const p = sampleProject();
    p.isSample = false;
    p.name = name;
    p.packageName = 'com.ejemplo.' + V.slug(name).replace(/-/g, '');
    p.listing = { 'es-419': { title: name, short: '', full: '' }, 'en-US': { title: name, short: '', full: '' } };
    p.meta = { ...p.meta, privacy: '', tags: '' };
    p.slides = p.slides.slice(0, 3).map((s, i) => ({ ...s, id: V.uid(), text: { 'es-419': { h: ['Tu *idea* aquí', 'Una ventaja *clara*', 'Termina con *fuerza*'][i], s: 'Sustituye la captura de ejemplo por la tuya', badge: '' }, 'en-US': { h: ['Your *idea* here', 'One *clear* benefit', 'End *strong*'][i], s: 'Replace the sample with your screenshot', badge: '' } } }));
    p.feature.tagline = { 'es-419': 'Tu frase *principal*', 'en-US': 'Your *main* line' };
    p.icon.glyph = name.trim().charAt(0).toUpperCase() || 'A';
    p.notes.versions = [{ id: V.uid(), name: '1.0.0', code: 1, tone: 'cercano', emoji: true, items: [{ type: 'new', text: { 'es-419': 'Primera versión', 'en-US': 'First release' } }], output: {} }];
    return p;
  }

  V.sampleScreen = sampleScreen;
  V.SAMPLE_KINDS = Object.keys(SCREENS);
  V.sampleProject = sampleProject;
  V.blankProject = blankProject;
})(window.Vitrina);
