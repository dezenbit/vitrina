/* Vitrina · vistas visuales: capturas, gráfico destacado e ícono. */
(function (V) {
  'use strict';
  const { h, $$, toast, Color } = V;
  V.views = V.views || {};
  const app = () => V.app;
  const P = () => V.app.project;
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  /* Bocetos de composición para las tarjetas */
  const LAYOUT_ICONS = {
    device: '<svg viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="3"/><path d="M9 6h16M12 9.5h10" /><rect x="10" y="14" width="14" height="27" rx="3"/></svg>',
    tilt: '<svg viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="3"/><path d="M9 6h16M12 9.5h10"/><rect x="11" y="15" width="14" height="26" rx="3" transform="rotate(-10 18 28)"/></svg>',
    duo: '<svg viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="3"/><path d="M9 6h16"/><rect x="5" y="15" width="12" height="24" rx="3" transform="rotate(-8 11 27)"/><rect x="16" y="13" width="12" height="24" rx="3" transform="rotate(6 22 25)"/></svg>',
    bleed: '<svg viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="3"/><path d="M9 6h16M12 9.5h10"/><path d="M6 43V19a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v24"/></svg>',
    full: '<svg viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="3"/><path d="M1 14h32" stroke-dasharray="2 2"/><path d="M8 6h18M11 10h12"/><path d="M6 20h22M6 25h16M6 30h20"/></svg>',
    hero: '<svg viewBox="0 0 34 44"><rect x="1" y="1" width="32" height="42" rx="3"/><rect x="13" y="5" width="8" height="8" rx="2.5"/><path d="M7 17h20M10 21h14"/><path d="M11 43V32a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v11"/></svg>',
  };
  const LAYOUTS = [['device', 'Teléfono'], ['tilt', 'Inclinado'], ['duo', 'Dúo'], ['bleed', 'Asomado'], ['full', 'Completa'], ['hero', 'Portada']];
  const SAMPLE_LABELS = { hoy: 'Hoy', progreso: 'Progreso', calendario: 'Calendario', enfoque: 'Enfoque', recordatorios: 'Recordatorios' };

  /* ═════════════ Capturas ═════════════ */
  V.views.capturas = function (root) {
    const A = app();
    A.target = A.target || 'phone';
    A.slideIndex = Math.min(A.slideIndex || 0, P().slides.length - 1);
    A.inspTab = A.inspTab || 'slide';
    let shotH = V.prefs.get('shotH', 430);
    const canvases = [];

    const page = h('div', { class: 'page' });
    const targetSeg = V.seg(Object.entries(V.TARGETS).map(([k, t]) => [k, t.label]), A.target, (v) => { A.target = v; buildStrip(); }, { label: 'Dispositivo' });
    page.append(h('div', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Paso 1'), h('h1', {}, 'Capturas de pantalla'), h('p', {}, 'Entre 2 y 8 imágenes por tipo de dispositivo. Con el fondo continuo, la tira se lee como un solo panorama al deslizar en la tienda.')),
      h('div', { class: 'head-actions' }, targetSeg,
        h('button', { class: 'btn', type: 'button', onclick: downloadCurrent }, V.icon('down'), 'Esta captura'),
        h('button', { class: 'btn primary', type: 'button', onclick: downloadAll }, V.icon('zip'), 'Todas (.zip)'))));

    const strip = h('div', { class: 'strip' });
    const stripWrap = h('div', { class: 'strip-wrap' }, strip);
    const counter = h('span', { class: 'pill' });
    const valid = h('span');
    const toolbar = h('div', { class: 'toolbar' },
      h('button', { class: 'btn small', type: 'button', title: 'Mover a la izquierda', onclick: () => move(-1) }, V.icon('left')),
      h('button', { class: 'btn small', type: 'button', title: 'Mover a la derecha', onclick: () => move(1) }, V.icon('right')),
      h('button', { class: 'btn small', type: 'button', onclick: duplicate }, V.icon('dup'), 'Duplicar'),
      h('button', { class: 'btn small danger', type: 'button', onclick: remove }, V.icon('trash'), 'Eliminar'),
      counter,
      h('span', { class: 'spacer' }),
      h('label', { class: 'row', style: { gap: '8px', fontSize: '12px', color: 'var(--muted)' } }, 'Tamaño',
        (() => { const r = h('input', { type: 'range', min: 240, max: 640, step: 10, value: shotH, style: { width: '110px' }, 'aria-label': 'Tamaño de la vista previa' }); r.addEventListener('input', () => { shotH = +r.value; V.prefs.set('shotH', shotH); strip.style.setProperty('--shot-h', shotH + 'px'); drawAll(); }); return r; })()));
    const left = h('div', { class: 'stack', style: { gap: '0' } }, toolbar, stripWrap,
      h('div', { class: 'strip-note' }, h('span', {}, 'Arrastra para reordenar o usa ← → (Mayús para mover). Pega una imagen con Ctrl+V para la captura activa.'), valid));
    const insp = h('div', { class: 'card inspector' });
    page.append(h('div', { class: 'editor' }, left, insp));
    root.append(page);
    strip.style.setProperty('--shot-h', shotH + 'px');

    function T() { return V.TARGETS[A.target]; }
    function drawOne(i) {
      const c = canvases[i]; if (!c) return;
      const scale = (shotH * dpr()) / T().h;
      V.renderSlide(c, P(), i, A.locale, A.target, scale);
      c.style.height = shotH + 'px';
    }
    function drawAll() { P().slides.forEach((_, i) => drawOne(i)); }
    let rafAll = 0;
    const drawAllSoon = () => { cancelAnimationFrame(rafAll); rafAll = requestAnimationFrame(drawAll); };
    function changed(all = true) { A.save(); if (all) drawAllSoon(); else drawOne(A.slideIndex); }

    function buildStrip() {
      strip.innerHTML = ''; canvases.length = 0;
      strip.classList.toggle('gapped', !P().theme.panorama);
      P().slides.forEach((s, i) => {
        const c = h('canvas', { role: 'img', 'aria-label': `Captura ${i + 1}: ${V.stripTags(V.slideText(s, A.locale, P().defaultLocale).h.replace(/\*/g, ''))}` });
        canvases.push(c);
        const b = h('button', { class: 'shot' + (i === A.slideIndex ? ' active' : ''), type: 'button', draggable: 'true', 'aria-pressed': String(i === A.slideIndex) }, c, h('span', { class: 'num' }, String(i + 1)));
        b.addEventListener('click', () => select(i));
        b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); b.classList.add('dragging'); });
        b.addEventListener('dragend', () => b.classList.remove('dragging'));
        b.addEventListener('dragover', (e) => e.preventDefault());
        b.addEventListener('drop', async (e) => {
          e.preventDefault();
          const f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (f && f.type.startsWith('image/')) { select(i); await setImage(f, 'img'); return; }
          const from = +e.dataTransfer.getData('text/plain');
          if (!isNaN(from) && from !== i) { const [it] = P().slides.splice(from, 1); P().slides.splice(i, 0, it); A.slideIndex = i; A.save(); buildStrip(); buildInspector(); }
        });
        strip.append(b);
      });
      if (P().slides.length < 8) {
        const add = h('button', { class: 'shot add', type: 'button', onclick: addSlide }, h('div', {}, V.icon('plus'), 'Agregar captura'));
        strip.append(add);
      }
      counter.textContent = `${A.slideIndex + 1} de ${P().slides.length}`;
      const n = P().slides.length;
      valid.innerHTML = '';
      valid.append(n >= 2 && n <= 8 ? h('span', { class: 'pill ok' }, V.icon('check'), `${n} capturas · ${T().w}×${T().h}`) : h('span', { class: 'pill warn' }, V.icon('warn'), 'Necesitas al menos 2'));
      drawAll();
    }
    function select(i) {
      A.slideIndex = i;
      $$('.shot', strip).forEach((b, k) => { b.classList.toggle('active', k === i); b.setAttribute('aria-pressed', String(k === i)); });
      counter.textContent = `${i + 1} de ${P().slides.length}`;
      buildInspector();
    }
    function addSlide() {
      const p = P();
      if (p.slides.length >= 8) { toast('La tienda admite hasta 8 capturas por dispositivo'); return; }
      const base = p.slides[A.slideIndex] || p.slides[0];
      const kinds = V.SAMPLE_KINDS;
      const s = { id: V.uid(), sample: kinds[p.slides.length % kinds.length], img: null, img2: null, layout: base ? base.layout : 'device', text: {} };
      for (const loc of p.locales) s.text[loc] = { h: loc.startsWith('es') ? 'Nueva *ventaja*' : 'New *benefit*', s: '', badge: '' };
      p.slides.splice(A.slideIndex + 1, 0, s);
      A.slideIndex++;
      A.save(); buildStrip(); buildInspector();
      requestAnimationFrame(() => { const el = $$('.shot', strip)[A.slideIndex]; el && el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); });
    }
    function duplicate() {
      const p = P(); if (p.slides.length >= 8) { toast('La tienda admite hasta 8 capturas por dispositivo'); return; }
      const copy = V.clone(p.slides[A.slideIndex]); copy.id = V.uid();
      p.slides.splice(A.slideIndex + 1, 0, copy); A.slideIndex++;
      A.save(); buildStrip(); buildInspector();
    }
    function remove() {
      const p = P();
      if (p.slides.length <= 1) { toast('Debe quedar al menos una captura'); return; }
      p.slides.splice(A.slideIndex, 1);
      A.slideIndex = Math.max(0, A.slideIndex - 1);
      A.save(); buildStrip(); buildInspector(); toast('Captura eliminada');
    }
    function move(d) {
      const p = P(), i = A.slideIndex, j = i + d;
      if (j < 0 || j >= p.slides.length) return;
      [p.slides[i], p.slides[j]] = [p.slides[j], p.slides[i]];
      A.slideIndex = j; A.save(); buildStrip(); buildInspector();
    }
    async function setImage(file, key) {
      try {
        const url = await V.fileToDataURL(file);
        await V.loadImage(url);
        const s = P().slides[A.slideIndex];
        s[key] = url;
        const img = await V.loadImage(url);
        if (img && key === 'img') {
          const r = img.width / img.height;
          if (r > 1) toast('La captura es horizontal; se recortará para ajustarse a la pantalla del teléfono');
        }
        A.save(); V.imageNow(url); setTimeout(drawAll, 30); buildInspector();
      } catch { toast('No se pudo leer la imagen', 'error'); }
    }

    /* ───── Inspector ───── */
    function buildInspector() {
      insp.innerHTML = '';
      const tabs = h('div', { class: 'tabs', role: 'tablist' });
      [['slide', 'Captura ' + (A.slideIndex + 1)], ['style', 'Estilo general']].forEach(([k, l]) => {
        tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': String(A.inspTab === k), class: A.inspTab === k ? 'active' : '', onclick: () => { A.inspTab = k; buildInspector(); } }, l));
      });
      const body = h('div', { class: 'insp-body' });
      insp.append(tabs, body);
      if (A.inspTab === 'slide') slidePanel(body); else stylePanel(body);
    }

    function sampleSelect(slide, key) {
      const cur = key === 'img' ? (slide.img ? '' : slide.sample) : (slide.img2 && slide.img2.startsWith('sample:') ? slide.img2.slice(7) : '');
      const opts = [['', key === 'img' ? 'Muestra…' : 'Usar la siguiente captura'], ...V.SAMPLE_KINDS.map((k) => [k, SAMPLE_LABELS[k] || k])];
      const s = V.selectEl(opts, slide.img && key === 'img' ? '' : cur, (v) => {
        if (key === 'img') { if (v) { slide.sample = v; slide.img = null; } }
        else slide.img2 = v ? 'sample:' + v : null;
        A.save(); drawAll(); buildInspector();
      }, { style: { height: '30px', fontSize: '12.5px', width: 'auto' }, 'aria-label': 'Pantalla de ejemplo' });
      return s;
    }

    function slidePanel(body) {
      const p = P(), s = p.slides[A.slideIndex];
      const thumbSrc = s.img || V.sampleScreen(s.sample || 'hoy', p.theme.accent).toDataURL('image/jpeg', 0.6);
      body.append(V.section('Pantalla', V.dropzone({
        title: s.img ? 'Tu captura' : 'Pantalla de ejemplo',
        hint: s.img ? 'Se ajusta a la pantalla del marco.' : 'Sube la tuya: PNG o JPG vertical.',
        src: thumbSrc,
        onFile: (f) => setImage(f, 'img'),
        onClear: s.img ? () => { s.img = null; A.save(); drawAll(); buildInspector(); } : null,
        extra: sampleSelect(s, 'img'),
      })));

      const cards = h('div', { class: 'layout-cards' });
      LAYOUTS.forEach(([k, l]) => cards.append(h('button', { type: 'button', class: 'layout-card' + ((s.layout || 'device') === k ? ' active' : ''), 'aria-pressed': String((s.layout || 'device') === k), onclick: () => { s.layout = k; A.save(); drawAll(); buildInspector(); } }, h('span', { html: LAYOUT_ICONS[k] }), l)));
      body.append(V.section('Composición', cards));

      if (s.layout === 'duo') {
        const src2 = s.img2 && !s.img2.startsWith('sample:') ? s.img2 : null;
        body.append(V.section('Segunda pantalla', V.dropzone({
          title: src2 ? 'Segunda captura' : 'Opcional',
          hint: 'Si no subes una, se usa la siguiente captura.',
          src: src2,
          onFile: (f) => setImage(f, 'img2'),
          onClear: src2 ? () => { s.img2 = null; A.save(); drawAll(); buildInspector(); } : null,
          extra: sampleSelect(s, 'img2'),
        })));
      }

      const loc = A.locale;
      s.text = s.text || {};
      s.text[loc] = s.text[loc] || { h: '', s: '', badge: '' };
      const tx = s.text[loc];
      const upd = (k) => (v) => { tx[k] = v; A.save(); drawOne(A.slideIndex); };
      const textSec = V.section([`Texto`, h('span', { class: 'pill' }, loc)],
        V.field({ label: 'Etiqueta', value: tx.badge, max: 18, onInput: upd('badge'), placeholder: 'Nuevo, Gratis, 4.8 ★…' }),
        V.field({ label: 'Titular', value: tx.h, max: 48, rows: 2, onInput: upd('h'), help: 'Encierra palabras entre *asteriscos* para resaltarlas. Usa Enter para forzar un salto de línea.' }),
        V.field({ label: 'Subtítulo', value: tx.s, max: 80, rows: 2, onInput: upd('s') }));
      if (loc !== p.defaultLocale) {
        textSec.append(h('button', { class: 'btn small', type: 'button', onclick: () => { const src = s.text[p.defaultLocale] || {}; Object.assign(tx, { h: src.h || '', s: src.s || '', badge: src.badge || '' }); A.save(); drawOne(A.slideIndex); buildInspector(); toast('Texto copiado; ahora tradúcelo'); } }, V.icon('copy'), `Copiar desde ${p.defaultLocale}`));
      }
      const ideas = p.defaultLocale.startsWith('es') || loc.startsWith('es')
        ? ['Todo en *un solo lugar*', 'Hecho para *tu día*', 'Sin anuncios. *Sin ruido.*', 'Funciona *sin conexión*', 'Tus datos, *tu teléfono*', 'Empieza en *segundos*']
        : ['Everything in *one place*', 'Made for *your day*', 'No ads. *No noise.*', 'Works *offline*', 'Your data, *your phone*', 'Start in *seconds*'];
      const chips = h('div', { class: 'chips' });
      ideas.forEach((t) => chips.append(h('button', { class: 'chip', type: 'button', onclick: () => { tx.h = t; A.save(); drawOne(A.slideIndex); buildInspector(); } }, t.replace(/\*/g, ''))));
      textSec.append(h('div', { class: 'label' }, 'Ideas de titular'), chips);
      body.append(textSec);

      const own = !!s.bg;
      const bgSec = V.section('Fondo de esta captura', V.switchRow('Usar un fondo propio', own, (on) => {
        s.bg = on ? { bgType: p.theme.bgType, c1: p.theme.c2, c2: p.theme.c1, c3: p.theme.c3 } : null; A.save(); drawAll(); buildInspector();
      }, 'Rompe el panorama continuo sólo en esta captura.'));
      if (own) {
        bgSec.append(V.seg([['solid', 'Sólido'], ['linear', 'Degradado'], ['radial', 'Radial'], ['mesh', 'Malla']], s.bg.bgType, (v) => { s.bg.bgType = v; changed(false); }, { full: true }),
          h('div', { class: 'grid-3' }, V.colorField('1', s.bg.c1, (v) => { s.bg.c1 = v; changed(false); }), V.colorField('2', s.bg.c2, (v) => { s.bg.c2 = v; changed(false); }), V.colorField('3', s.bg.c3, (v) => { s.bg.c3 = v; changed(false); })));
      }
      body.append(bgSec);
    }

    function stylePanel(body) {
      const p = P(), t = p.theme;
      const themeGrid = h('div', { class: 'theme-grid' });
      Object.entries(V.THEMES).forEach(([k, th]) => {
        const sw = h('i'); sw.style.background = `linear-gradient(135deg, ${th.c1} 0 45%, ${th.c2} 45% 75%, ${th.accent} 75%)`;
        themeGrid.append(h('button', { type: 'button', class: 'theme-card' + (t.preset === k ? ' active' : ''), onclick: () => { Object.assign(t, th, { preset: k }); delete t.label; A.save(); buildStrip(); buildInspector(); } }, sw, th.label));
      });
      body.append(V.section('Temas', themeGrid,
        h('button', { class: 'btn small', type: 'button', onclick: themeFromIcon }, V.icon('wand'), 'Colores desde el ícono')));

      const set = (k, all = true) => (v) => { t[k] = v; t.preset = null; changed(all); };
      body.append(V.section('Fondo',
        V.seg([['solid', 'Sólido'], ['linear', 'Degradado'], ['radial', 'Radial'], ['mesh', 'Malla'], ['split', 'Ola']], t.bgType, set('bgType'), { full: true, label: 'Tipo de fondo' }),
        h('div', { class: 'grid-3' }, V.colorField('Base', t.c1, set('c1')), V.colorField('2', t.c2, set('c2')), V.colorField('3', t.c3, set('c3'))),
        h('div', { class: 'field' }, h('label', {}, 'Patrón'), V.selectEl([['none', 'Ninguno'], ['dots', 'Puntos'], ['grid', 'Cuadrícula'], ['lines', 'Diagonales'], ['rings', 'Anillos']], t.pattern || 'none', set('pattern'))),
        V.rangeRow('Grano', { min: 0, max: 0.3, step: 0.01, value: t.noise || 0, onInput: set('noise'), fmt: (v) => Math.round(v * 100) + '%' }),
        V.switchRow('Fondo continuo (panorama)', !!t.panorama, (v) => { t.panorama = v; A.save(); buildStrip(); }, 'El fondo fluye de una captura a la siguiente.')));

      const contrast = h('span', { class: 'contrast' });
      const syncContrast = () => {
        const r = Color.contrast(t.text, t.c1);
        contrast.innerHTML = '';
        contrast.append(h('span', { class: 'pill ' + (r >= 4.5 ? 'ok' : r >= 3 ? 'warn' : 'error') }, `Contraste ${r.toFixed(1)}:1`), r < 3 ? 'El texto puede leerse mal sobre el fondo.' : r < 4.5 ? 'Aceptable para titulares grandes.' : 'Buena legibilidad.');
      };
      syncContrast();
      const fontSel = V.selectEl(V.FONTS.map((f) => [f.name, f.label]), t.font, (v) => { t.font = v; V.ensureFont(v, V.fontWeight(v), () => drawAll()); V.ensureFont(v, V.fontWeight(v, false), () => drawAll()); changed(); });
      body.append(V.section('Texto',
        h('div', { class: 'field' }, h('label', {}, 'Tipografía'), fontSel),
        h('div', { class: 'grid-3' }, V.colorField('Texto', t.text, (v) => { t.text = v; syncContrast(); changed(); }), V.colorField('Acento', t.accent, set('accent')), V.colorField('Etiqueta', t.badgeBg || t.accent, set('badgeBg'))),
        contrast,
        h('div', { class: 'grid-2' },
          V.seg([['left', 'Izq.'], ['center', 'Centro'], ['right', 'Der.']], t.align, set('align'), { full: true, label: 'Alineación' }),
          V.seg([['top', 'Arriba'], ['bottom', 'Abajo']], t.textPos, set('textPos'), { full: true, label: 'Posición del texto' })),
        V.seg([['color', 'Resaltar con color'], ['marker', 'Con marcador']], t.highlight || 'color', set('highlight'), { full: true, label: 'Estilo de resaltado' }),
        V.rangeRow('Tamaño del titular', { min: 0.6, max: 1.5, step: 0.05, value: t.headSize || 1, onInput: set('headSize'), fmt: (v) => Math.round(v * 100) + '%' }),
        V.rangeRow('Tamaño del subtítulo', { min: 0.6, max: 1.6, step: 0.05, value: t.subSize || 1, onInput: set('subSize'), fmt: (v) => Math.round(v * 100) + '%' })));

      body.append(V.section('Dispositivo',
        V.seg([['modern', 'Moderno'], ['flat', 'Sin marco'], ['outline', 'Contorno'], ['clay', 'Arcilla']], t.frame, set('frame'), { full: true, label: 'Estilo del marco' }),
        V.colorField('Color del marco', t.frameColor, set('frameColor')),
        V.rangeRow('Escala', { min: 0.55, max: 1.1, step: 0.01, value: t.deviceScale || 0.8, onInput: set('deviceScale'), fmt: (v) => Math.round(v * 100) + '%' }),
        V.rangeRow('Inclinación', { min: -20, max: 20, step: 1, value: t.tilt || 0, onInput: set('tilt'), fmt: (v) => v + '°' }),
        V.rangeRow('Sombra', { min: 0, max: 1, step: 0.05, value: t.shadow, onInput: set('shadow'), fmt: (v) => Math.round(v * 100) + '%' })));
    }

    async function themeFromIcon() {
      const p = P();
      const c = document.createElement('canvas');
      V.renderIcon(c, p.icon, 128, {});
      const cols = Color.dominant(c, 4);
      if (!cols.length) { toast('El ícono no tiene colores suficientes'); return; }
      const sorted = cols.slice().sort((a, b) => Color.lum(a) - Color.lum(b));
      const t = p.theme;
      t.c1 = sorted[0]; t.c2 = sorted[1] || Color.mix(sorted[0], '#ffffff', 0.3); t.c3 = sorted[sorted.length - 1];
      t.text = Color.readableOn(t.c1);
      const [hh, ss] = Color.hsl(t.c2);
      t.accent = Color.fromHsl(hh + 150, Math.max(0.6, ss), 0.62);
      t.badgeBg = t.accent; t.preset = null;
      A.save(); buildStrip(); buildInspector(); toast('Tema creado a partir del ícono');
    }

    /* ───── Descargas ───── */
    async function downloadCurrent() {
      const c = document.createElement('canvas');
      V.renderSlide(c, P(), A.slideIndex, A.locale, A.target, 1);
      const blob = await V.canvasBlob(c);
      V.download(blob, `${String(A.slideIndex + 1).padStart(2, '0')}_${A.locale}_${A.target}.png`);
    }
    async function downloadAll() {
      if (!window.JSZip) { toast('No se pudo cargar el compresor ZIP. Revisa tu conexión.', 'error'); return; }
      const zip = new JSZip();
      for (let i = 0; i < P().slides.length; i++) {
        const c = document.createElement('canvas');
        V.renderSlide(c, P(), i, A.locale, A.target, 1);
        zip.file(`${String(i + 1).padStart(2, '0')}_${A.locale}.png`, await V.canvasBlob(c));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      V.download(blob, `${V.slug(P().name)}-capturas-${A.target}-${A.locale}.zip`);
      toast('Capturas descargadas');
    }

    buildStrip();
    buildInspector();
    // Atajos: flechas para cambiar de captura, Mayús+flechas para moverla, D para duplicar
    const onKey = (e) => {
      if (!document.body.contains(strip)) { document.removeEventListener('keydown', onKey); return; }
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const d = e.key === 'ArrowRight' ? 1 : -1;
        e.preventDefault();
        if (e.shiftKey) move(d); else select(Math.max(0, Math.min(P().slides.length - 1, A.slideIndex + d)));
      } else if (e.key.toLowerCase() === 'd') duplicate();
    };
    document.addEventListener('keydown', onKey);
    return {
      redraw: drawAll,
      async onPasteImage(file) { await setImage(file, 'img'); toast('Imagen pegada en la captura ' + (A.slideIndex + 1)); },
    };
  };

  /* ═════════════ Gráfico destacado ═════════════ */
  V.views.destacado = function (root) {
    const A = app();
    const p = P();
    let safe = V.prefs.get('safeZone', false);
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Gráfico destacado' });
    const overlay = h('div', { class: 'safe-zone', hidden: !safe }, h('span', {}, 'Zona segura'));
    const draw = () => V.renderFeature(canvas, P(), A.locale, 2);
    const page = h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', {}, h('p', { class: 'eyebrow' }, 'Paso 2'), h('h1', {}, 'Gráfico destacado'), h('p', {}, '1024 × 500 px, sin transparencia. Encabeza tu ficha y aparece en promociones; deja lo importante lejos de los bordes.')),
        h('div', { class: 'head-actions' },
          V.switchRow('Zona segura', safe, (v) => { safe = v; V.prefs.set('safeZone', v); overlay.hidden = !v; }),
          h('button', { class: 'btn primary', type: 'button', onclick: async () => { const c = document.createElement('canvas'); V.renderFeature(c, P(), A.locale, 1); V.download(await V.canvasBlob(c), `featureGraphic_${A.locale}.png`); } }, V.icon('down'), 'Descargar PNG'))),
    );
    page.append(h('div', { class: 'feature-stage' }, canvas, overlay));

    const cards = h('div', { class: 'layout-cards four' });
    const FL = [['split', 'Dividido', '<svg viewBox="0 0 34 44"><rect x="1" y="12" width="32" height="18" rx="2"/><rect x="4" y="15" width="5" height="5" rx="1.5"/><path d="M4 23h10M4 26h7"/><rect x="21" y="16" width="8" height="15" rx="2" transform="rotate(-12 25 23)"/></svg>'], ['center', 'Centrado', '<svg viewBox="0 0 34 44"><rect x="1" y="12" width="32" height="18" rx="2"/><rect x="14" y="14.5" width="6" height="6" rx="1.8"/><path d="M10 23.5h14M12 26.5h10"/></svg>'], ['showcase', 'Escaparate', '<svg viewBox="0 0 34 44"><rect x="1" y="12" width="32" height="18" rx="2"/><path d="M9 15.5h16"/><rect x="7" y="21" width="6" height="11" rx="1.5" transform="rotate(-10 10 26)"/><rect x="14" y="19" width="6" height="11" rx="1.5"/><rect x="21" y="21" width="6" height="11" rx="1.5" transform="rotate(10 24 26)"/></svg>'], ['minimal', 'Minimal', '<svg viewBox="0 0 34 44"><rect x="1" y="12" width="32" height="18" rx="2"/><path d="M4 18h14M4 22h11M4 26h13"/><rect x="22" y="16" width="9" height="9" rx="2.5"/></svg>']];
    FL.forEach(([k, l, svg]) => cards.append(h('button', { type: 'button', class: 'layout-card' + (p.feature.layout === k ? ' active' : ''), onclick: (e) => { p.feature.layout = k; $$('.layout-card', cards).forEach((x) => x.classList.toggle('active', x === e.currentTarget)); A.save(); draw(); } }, h('span', { html: svg }), l)));

    p.feature.tagline = p.feature.tagline || {};
    const tagline = V.field({ label: `Frase (${A.locale})`, value: p.feature.tagline[A.locale] || '', max: 40, onInput: (v) => { p.feature.tagline[A.locale] = v; A.save(); draw(); }, help: 'Usa *asteriscos* para resaltar. En la composición Minimal se dibuja con marcador.' });
    const slideSel = V.selectEl(p.slides.map((s, i) => [String(i), `Captura ${i + 1}: ${V.slideText(s, A.locale, p.defaultLocale).h.replace(/\*/g, '').slice(0, 30)}`]), String(p.feature.slide || 0), (v) => { p.feature.slide = +v; A.save(); draw(); });
    const themeChips = h('div', { class: 'chips' });
    Object.entries(V.THEMES).forEach(([k, th]) => themeChips.append(h('button', { class: 'chip' + (p.theme.preset === k ? ' active' : ''), type: 'button', onclick: (e) => { Object.assign(p.theme, th, { preset: k }); delete p.theme.label; $$('.chip', themeChips).forEach((x) => x.classList.toggle('active', x === e.currentTarget)); A.save(); draw(); } }, h('span', { class: 'dots' }, ...[th.c1, th.c2, th.accent].map((c) => { const i = h('i'); i.style.background = c; return i; })), th.label)));

    page.append(h('div', { class: 'grid-2', style: { marginTop: '18px', alignItems: 'start' } },
      h('div', { class: 'card stack' }, h('h2', {}, 'Composición'), cards, tagline,
        V.switchRow('Mostrar ícono', p.feature.showIcon !== false, (v) => { p.feature.showIcon = v; A.save(); draw(); }),
        h('div', { class: 'field' }, h('label', {}, 'Captura que aparece'), slideSel)),
      h('div', { class: 'card stack' }, h('h2', {}, 'Estilo'), h('p', { class: 'sub', style: { margin: 0 } }, 'Comparte tema, tipografía y marco con las capturas para que todo se vea como una sola campaña.'), themeChips,
        h('a', { class: 'btn small', href: '#capturas', style: { alignSelf: 'flex-start' } }, 'Ajustar estilo en Capturas', V.icon('arrow')))));
    root.append(page);
    draw();
    return { redraw: draw };
  };

  /* ═════════════ Ícono ═════════════ */
  V.views.icono = function (root) {
    const A = app();
    const ic = P().icon;
    let safe = V.prefs.get('iconSafe', false);
    const big = h('canvas', { role: 'img', 'aria-label': 'Ícono de la app' });
    const overlay = h('canvas', { style: { position: 'absolute', pointerEvents: 'none' }, 'aria-hidden': 'true' });
    const sizes = h('div', { class: 'icon-sizes' });
    const home = h('div', { class: 'homescreen' });
    const preview = h('div', { class: 'icon-preview' }, big, overlay);

    function draw() {
      V.renderIcon(big, ic, 512, { mask: ic.shape || 'squircle' });
      // guía de zona segura (círculo de 66/108 para íconos adaptables)
      overlay.width = overlay.height = 512;
      overlay.style.width = big.clientWidth + 'px'; overlay.style.height = big.clientHeight + 'px';
      const o = overlay.getContext('2d'); o.clearRect(0, 0, 512, 512);
      if (safe) {
        o.setLineDash([10, 8]); o.lineWidth = 3; o.strokeStyle = 'rgba(255,255,255,.95)';
        o.beginPath(); o.arc(256, 256, 256 * (66 / 108) / (72 / 108), 0, Math.PI * 2); o.stroke();
        o.strokeStyle = 'rgba(0,0,0,.6)'; o.lineDashOffset = 9; o.stroke();
      }
      sizes.innerHTML = '';
      [192, 144, 96, 72, 48].forEach((s) => { const c = h('canvas', { style: { width: s / 1.5 + 'px', height: s / 1.5 + 'px' } }); V.renderIcon(c, ic, s, { mask: ic.shape || 'squircle' }); sizes.append(h('figure', {}, c, h('figcaption', {}, s + ' px'))); });
      // pantalla de inicio de ejemplo
      home.innerHTML = '';
      const wall = h('canvas'); wall.width = 400; wall.height = 300;
      V.paintBackground(wall.getContext('2d'), 400, 300, { ...P().theme, noise: 0, pattern: 'none' }, 0, 1, 'home');
      home.style.backgroundImage = `url(${wall.toDataURL('image/jpeg', 0.7)})`; home.style.backgroundSize = 'cover';
      const name = ((P().listing[A.locale] || {}).title || P().name).split(/[:\-–|]/)[0].trim();
      for (let i = 0; i < 8; i++) {
        if (i === 5) { const c = h('canvas'); V.renderIcon(c, ic, 104, { mask: 'circle' }); home.append(h('div', { class: 'app' }, c, h('span', {}, name))); }
        else home.append(h('div', { class: 'app' }, h('div', { class: 'ph' }), h('span', {}, ['Fotos', 'Reloj', 'Mapas', 'Notas', 'Correo', '', 'Música', 'Clima'][i])));
      }
      A.updateDots(); A.drawIcon && A.drawIcon();
    }
    const changed = () => { A.save(); draw(); };
    const page = h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', {}, h('p', { class: 'eyebrow' }, 'Paso 3'), h('h1', {}, 'Ícono de la app'), h('p', {}, 'La tienda pide un PNG de 512 × 512 sin esquinas recortadas: la máscara la aplica el sistema. También puedes descargar el juego completo para Android Studio.')),
        h('div', { class: 'head-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => V.exportIconKit && V.exportIconKit() }, V.icon('zip'), 'Kit Android (.zip)'),
          h('button', { class: 'btn primary', type: 'button', onclick: async () => { const c = document.createElement('canvas'); V.renderIcon(c, ic, 512, {}); V.download(await V.canvasBlob(c), 'icon-512.png'); } }, V.icon('down'), 'PNG 512'))));

    const maskSeg = V.seg([['square', 'Cuadrado'], ['rounded', 'Redondeado'], ['squircle', 'Squircle'], ['circle', 'Círculo'], ['teardrop', 'Gota']], ic.shape || 'squircle', (v) => { ic.shape = v; changed(); }, { label: 'Máscara de vista previa' });
    const left = h('div', { class: 'stack' },
      h('div', { class: 'card stack' }, h('div', { class: 'card-head' }, h('h2', {}, 'Vista previa'), V.switchRow('Zona segura adaptable', safe, (v) => { safe = v; V.prefs.set('iconSafe', v); draw(); })), maskSeg, preview, sizes),
      h('div', { class: 'card stack' }, h('h2', {}, 'En la pantalla de inicio'), home));

    const right = h('div', { class: 'card stack' });
    function buildControls() {
      right.innerHTML = '';
      right.append(h('h2', {}, 'Primer plano'),
        V.seg([['glyph', 'Letra'], ['symbol', 'Símbolo'], ['image', 'Imagen']], ic.mode, (v) => { ic.mode = v; changed(); buildControls(); }, { full: true }));
      if (ic.mode === 'glyph') {
        right.append(h('div', { class: 'grid-2' },
          V.field({ label: 'Letras (1 a 3)', value: ic.glyph, max: 3, onInput: (v) => { ic.glyph = v; changed(); } }),
          h('div', { class: 'field' }, h('label', {}, 'Tipografía'), V.selectEl(V.FONTS.map((f) => [f.name, f.label]), ic.font, (v) => { ic.font = v; V.ensureFont(v, V.fontWeight(v), draw); changed(); }))));
      } else if (ic.mode === 'symbol') {
        const grid = h('div', { class: 'symbol-grid' });
        Object.entries(V.SYMBOLS).forEach(([k, s]) => {
          const svg = s.mode === 'stroke' ? `<svg viewBox="0 0 24 24"><path d="${s.d}"/></svg>` : `<svg viewBox="0 0 24 24"><path d="${s.d}" fill="currentColor" stroke="none" fill-rule="${s.mode === 'fill-evenodd' ? 'evenodd' : 'nonzero'}"/></svg>`;
          grid.append(h('button', { type: 'button', class: ic.symbol === k ? 'active' : '', title: k, 'aria-label': k, html: svg, onclick: () => { ic.symbol = k; changed(); buildControls(); } }));
        });
        right.append(grid);
      } else {
        right.append(V.dropzone({ title: ic.img ? 'Tu logotipo' : 'Sube un logotipo', hint: 'PNG con transparencia funciona mejor.', src: ic.img, onFile: async (f) => { ic.img = await V.fileToDataURL(f, 1024); await V.loadImage(ic.img); V.imageNow(ic.img); changed(); buildControls(); setTimeout(draw, 50); }, onClear: ic.img ? () => { ic.img = null; changed(); buildControls(); } : null }));
      }
      if (ic.mode !== 'image') right.append(V.colorField('Color del primer plano', ic.fg, (v) => { ic.fg = v; changed(); }));
      right.append(
        V.rangeRow('Tamaño', { min: 0.2, max: 1, step: 0.01, value: ic.scale, onInput: (v) => { ic.scale = v; changed(); }, fmt: (v) => Math.round(v * 100) + '%' }),
        V.rangeRow('Rotación', { min: -45, max: 45, step: 1, value: ic.rotate || 0, onInput: (v) => { ic.rotate = v; changed(); }, fmt: (v) => v + '°' }),
        V.rangeRow('Sombra', { min: 0, max: 1, step: 0.05, value: ic.shadow || 0, onInput: (v) => { ic.shadow = v; changed(); }, fmt: (v) => Math.round(v * 100) + '%' }),
        V.switchRow('Sombra larga', !!ic.longShadow, (v) => { ic.longShadow = v; changed(); }),
        h('h2', { style: { marginTop: '8px' } }, 'Fondo'),
        V.seg([['solid', 'Sólido'], ['linear', 'Degradado'], ['radial', 'Radial'], ['mesh', 'Malla'], ['transparent', 'Vacío']], ic.bgType === 'gradient' ? 'linear' : ic.bgType, (v) => { ic.bgType = v === 'linear' ? 'gradient' : v; changed(); buildControls(); }, { full: true }),
        h('div', { class: 'grid-2' }, V.colorField('Color 1', ic.bg1, (v) => { ic.bg1 = v; changed(); }), V.colorField('Color 2', ic.bg2, (v) => { ic.bg2 = v; changed(); })),
        h('p', { class: 'pill warn', hidden: ic.bgType !== 'transparent' }, V.icon('warn'), 'La tienda no acepta íconos transparentes; úsalo sólo para el kit adaptable.'),
        h('button', { class: 'btn small', type: 'button', style: { alignSelf: 'flex-start' }, onclick: () => { ic.bg1 = P().theme.c2; ic.bg2 = P().theme.c1; ic.fg = P().theme.text; changed(); buildControls(); } }, V.icon('wand'), 'Usar colores del tema'));
    }
    buildControls();
    page.append(h('div', { class: 'icon-stage' }, left, right));
    root.append(page);
    draw();
    const ro = window.ResizeObserver ? new ResizeObserver(() => { overlay.style.width = big.clientWidth + 'px'; overlay.style.height = big.clientHeight + 'px'; }) : null;
    ro && ro.observe(big);
    return { redraw: draw, async onPasteImage(f) { ic.mode = 'image'; ic.img = await V.fileToDataURL(f, 1024); await V.loadImage(ic.img); V.imageNow(ic.img); changed(); buildControls(); setTimeout(draw, 50); } };
  };
})(window.Vitrina);
