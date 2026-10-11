/* Vitrina · vistas de texto: ficha de tienda y notas de versión. */
(function (V) {
  'use strict';
  const { h, $$, toast, debounce } = V;
  V.views = V.views || {};
  const app = () => V.app;
  const P = () => V.app.project;
  const LEVEL = { error: ['error', 'Error'], warn: ['warn', 'Aviso'], tip: ['tip', 'Sugerencia'] };

  /* Barra de idiomas compartida por Ficha y Notas */
  function localeBar(onChange) {
    const p = P(), A = app();
    const chips = h('div', { class: 'chips' });
    for (const loc of p.locales) {
      const isBase = loc === p.defaultLocale;
      const chip = h('button', { type: 'button', class: 'chip' + (loc === A.locale ? ' active' : ''), title: V.LOCALES[loc] || loc, onclick: () => { A.setLocale(loc); } }, loc, isBase ? h('span', { class: 'pill', style: { padding: '0 6px' } }, 'base') : null);
      if (!isBase) {
        const x = h('span', { class: 'x', role: 'button', tabindex: '0', title: `Quitar ${loc}`, 'aria-label': `Quitar ${loc}`, html: V.ICONS.trash });
        const kill = (e) => { e.stopPropagation(); V.confirmDialog('Quitar idioma', `Se borrarán los textos en ${V.LOCALES[loc] || loc} de la ficha, las capturas y las notas.`, 'Quitar', () => removeLocale(loc), true); };
        x.addEventListener('click', kill); x.addEventListener('keydown', (e) => { if (e.key === 'Enter') kill(e); });
        chip.append(x);
      }
      chips.append(chip);
    }
    const avail = Object.keys(V.LOCALES).filter((l) => !p.locales.includes(l));
    const sel = V.selectEl([['', 'Agregar idioma…'], ...avail.map((l) => [l, `${l} · ${V.LOCALES[l]}`])], '', (v) => { if (v) addLocale(v); }, { style: { width: 'auto', height: '30px', fontSize: '12.5px' }, 'aria-label': 'Agregar idioma' });
    const actions = h('div', { class: 'row' }, sel);
    if (A.locale !== p.defaultLocale) {
      actions.append(
        h('button', { class: 'btn small', type: 'button', onclick: () => copyFromBase(onChange) }, V.icon('copy'), `Copiar textos de ${p.defaultLocale}`),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => { p.defaultLocale = A.locale; A.save(); A.render(); toast(`${A.locale} es ahora el idioma base`); } }, 'Hacer base'));
    }
    return h('div', { class: 'card', style: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', padding: '12px 14px' } }, chips, actions);
  }
  function addLocale(loc) {
    const p = P();
    p.locales.push(loc);
    p.listing[loc] = { title: '', short: '', full: '' };
    for (const s of p.slides) { s.text = s.text || {}; s.text[loc] = { h: '', s: '', badge: '' }; }
    app().save(); app().setLocale(loc);
    toast(`${V.LOCALES[loc]} agregado. Copia los textos base y tradúcelos.`);
  }
  function removeLocale(loc) {
    const p = P();
    p.locales = p.locales.filter((l) => l !== loc);
    delete p.listing[loc];
    for (const s of p.slides) if (s.text) delete s.text[loc];
    if (p.feature.tagline) delete p.feature.tagline[loc];
    for (const v of p.notes.versions) { for (const it of v.items) if (it.text) delete it.text[loc]; if (v.output) delete v.output[loc]; }
    app().save();
    app().setLocale(p.defaultLocale);
  }
  function copyFromBase(after) {
    const p = P(), A = app(), base = p.defaultLocale, loc = A.locale;
    p.listing[loc] = { ...p.listing[base] };
    for (const s of p.slides) if (s.text && s.text[base]) s.text[loc] = { ...s.text[base] };
    if (p.feature.tagline && p.feature.tagline[base]) p.feature.tagline[loc] = p.feature.tagline[base];
    for (const v of p.notes.versions) for (const it of v.items) if (it.text && it.text[base]) it.text[loc] = it.text[base];
    A.save(); after ? after() : A.render();
    toast('Textos copiados. Ahora tradúcelos.');
  }

  /* ═════════════ Ficha de tienda ═════════════ */
  V.views.ficha = function (root) {
    const A = app(), p = P(), loc = A.locale;
    p.listing[loc] = p.listing[loc] || { title: '', short: '', full: '' };
    const L = p.listing[loc];

    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Paso 4'), h('h1', {}, 'Ficha de tienda'), h('p', {}, 'Nombre, descripción breve y completa por idioma, con revisión de límites y de términos que la tienda suele rechazar.')),
      h('div', { class: 'head-actions' }, h('button', { class: 'btn', type: 'button', onclick: copyAll }, V.icon('copy'), 'Copiar todo'))));
    page.append(localeBar(() => A.render()));

    const scoreBox = h('div', { class: 'score' });
    const issuesList = h('ul', { class: 'issues' });
    const kwTable = h('table', { class: 'kw' });
    const store = h('div', { class: 'store' });

    const titleF = V.field({ label: 'Nombre de la app', value: L.title, max: V.LIMITS.title, onInput: (v) => { L.title = v; changed(); }, help: 'Lo que la gente ve bajo el ícono. Marca primero; puedes añadir una palabra que describa la app.' });
    const shortF = V.field({ label: 'Descripción breve', value: L.short, max: V.LIMITS.short, rows: 2, onInput: (v) => { L.short = v; changed(); }, help: 'Se muestra antes de abrir la ficha. Di el beneficio principal en una frase.' });
    const fullF = V.field({ label: 'Descripción completa', value: L.full, max: V.LIMITS.full, rows: 16, onInput: (v) => { L.full = v; changed(); } });
    const ta = fullF.input;
    const wrapSel = (pre, post) => {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const sel = ta.value.slice(a, b) || 'texto';
      ta.setRangeText(pre + sel + post, a, b, 'select');
      ta.dispatchEvent(new Event('input')); ta.focus();
    };
    const prefixLines = (pfx) => {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const start = ta.value.lastIndexOf('\n', a - 1) + 1;
      const block = ta.value.slice(start, b);
      const out = block.split('\n').map((l) => (l.startsWith(pfx) ? l.slice(pfx.length) : pfx + l)).join('\n');
      ta.setRangeText(out, start, b, 'select'); ta.dispatchEvent(new Event('input')); ta.focus();
    };
    const tplLang = V.langOf(loc) === 'es' ? 'es' : 'en';
    const tplSel = V.selectEl([['', 'Plantilla…'], ...V.TEMPLATES[tplLang].map((t, i) => [String(i), t.name])], '', (v) => {
      if (v === '') return;
      const t = V.TEMPLATES[tplLang][+v];
      const apply = () => { L.full = t.text.replace(/\{App\}/g, (L.title || p.name).split(/[:\-–|]/)[0].trim()).replace(/\{correo\}|\{email\}/g, p.meta.email || ''); ta.value = L.full; ta.dispatchEvent(new Event('input')); };
      if (L.full.trim()) V.confirmDialog('Usar plantilla', 'Se reemplazará la descripción completa actual por la plantilla.', 'Reemplazar', apply); else apply();
      tplSel.value = '';
    }, { style: { width: 'auto', height: '30px', fontSize: '12.5px' }, 'aria-label': 'Plantilla de descripción' });
    const fmtBar = h('div', { class: 'fmt-bar' },
      h('button', { class: 'btn small', type: 'button', title: 'Negrita', 'aria-label': 'Negrita', onclick: () => wrapSel('<b>', '</b>') }, V.icon('bold')),
      h('button', { class: 'btn small', type: 'button', title: 'Cursiva', 'aria-label': 'Cursiva', onclick: () => wrapSel('<i>', '</i>') }, V.icon('italic')),
      h('button', { class: 'btn small', type: 'button', title: 'Viñetas', 'aria-label': 'Viñetas', onclick: () => prefixLines('• ') }, V.icon('list')),
      h('button', { class: 'btn small', type: 'button', onclick: () => prefixLines('★ ') }, '★'),
      h('button', { class: 'btn small', type: 'button', title: 'Quitar etiquetas HTML', onclick: () => { ta.value = V.stripTags(ta.value); ta.dispatchEvent(new Event('input')); } }, 'Sin formato'),
      tplSel);
    fullF.insertBefore(fmtBar, ta);

    const copyBtn = (getter, label) => h('button', { class: 'btn small ghost', type: 'button', onclick: async () => { toast((await V.copyText(getter())) ? `${label} copiado` : 'No se pudo copiar', ''); } }, V.icon('copy'), 'Copiar');
    [titleF, shortF, fullF].forEach((f, i) => f.firstChild.append(copyBtn(() => [L.title, L.short, L.full][i], ['Nombre', 'Descripción breve', 'Descripción completa'][i])));

    const m = p.meta;
    const metaCard = h('div', { class: 'card stack' }, h('h2', {}, 'Datos de la ficha'), h('p', { class: 'sub', style: { margin: 0 } }, 'Comunes a todos los idiomas.'),
      h('div', { class: 'grid-2' },
        V.field({ label: 'Desarrollador', value: p.developer, onInput: (v) => { p.developer = v; changed(); } }),
        V.field({ label: 'Paquete', value: p.packageName, mono: true, onInput: (v) => { p.packageName = v; A.save(); } }),
        h('div', { class: 'field' }, h('label', {}, 'Categoría'), V.selectEl(V.CATEGORIES, m.category, (v) => { m.category = v; changed(); })),
        V.field({ label: 'Correo de contacto', type: 'email', value: m.email, onInput: (v) => { m.email = v; changed(); } }),
        V.field({ label: 'Sitio web', type: 'url', value: m.website, placeholder: 'https://', onInput: (v) => { m.website = v; changed(); } }),
        V.field({ label: 'Política de privacidad', type: 'url', value: m.privacy, placeholder: 'https://', onInput: (v) => { m.privacy = v; changed(); } })),
      V.field({ label: 'Palabras clave internas', value: m.tags, help: 'Sólo para ti: términos que quieres que aparezcan en la descripción. Se marcan en el análisis.', onInput: (v) => { m.tags = v; changed(); } }));

    page.append(h('div', { class: 'listing' },
      h('div', { class: 'stack' }, h('div', { class: 'card stack' }, titleF, shortF, fullF), metaCard),
      h('div', { class: 'stack' },
        h('div', { class: 'card stack' }, h('div', { class: 'card-head' }, h('h2', {}, 'Revisión'), h('span', { class: 'pill' }, loc)), scoreBox, issuesList),
        h('div', { class: 'card' }, h('h2', { style: { marginBottom: '10px' } }, 'Vista previa en la tienda'), store),
        h('div', { class: 'card' }, h('h2', {}, 'Palabras más usadas'), h('p', { class: 'sub' }, 'En la descripción completa. Las marcadas son tus palabras clave.'), kwTable))));
    root.append(page);

    function renderReview() {
      const issues = V.lint(p, loc);
      const sc = V.score(issues);
      scoreBox.innerHTML = '';
      const counts = { error: 0, warn: 0, tip: 0 };
      issues.forEach((i) => counts[i.level]++);
      scoreBox.append(V.ring(sc), h('div', {}, h('strong', { style: { fontFamily: 'var(--f-display)', fontSize: '17px' } }, sc >= 90 ? 'Lista para publicar' : sc >= 70 ? 'Casi lista' : 'Requiere cambios'),
        h('div', { class: 'row', style: { marginTop: '6px' } }, h('span', { class: 'pill error' }, `${counts.error} errores`), h('span', { class: 'pill warn' }, `${counts.warn} avisos`), h('span', { class: 'pill tip' }, `${counts.tip} sugerencias`))));
      issuesList.innerHTML = '';
      if (!issues.length) issuesList.append(h('li', { class: 'empty' }, 'Sin observaciones para este idioma.'));
      const order = { error: 0, warn: 1, tip: 2 };
      issues.sort((a, b) => order[a.level] - order[b.level]).forEach((i) => issuesList.append(h('li', {}, h('span', { class: 'pill ' + LEVEL[i.level][0] }, LEVEL[i.level][1]), h('span', {}, i.msg))));

      kwTable.innerHTML = '';
      const tags = (m.tags || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
      const kws = V.keywords(V.stripTags(L.full), V.langOf(loc)).slice(0, 10);
      const max = kws.length ? kws[0][1] : 1;
      if (!kws.length) kwTable.append(h('tr', {}, h('td', { colspan: 3, style: { color: 'var(--muted)' } }, 'Escribe la descripción para ver el análisis.')));
      kws.forEach(([w, n]) => {
        const bar = h('div', { class: 'bar' }); bar.style.width = (n / max) * 100 + '%';
        const isTag = tags.some((t) => t.split(/\s+/).includes(w));
        kwTable.append(h('tr', {}, h('td', { style: { width: '38%', fontWeight: isTag ? 700 : 400 } }, w, isTag ? ' ★' : ''), h('td', {}, bar), h('td', {}, String(n))));
      });
      const missing = tags.filter((t) => !V.stripTags(L.full).toLowerCase().includes(t));
      if (missing.length) kwTable.append(h('tr', {}, h('td', { colspan: 3, style: { color: 'var(--warn)', fontSize: '12.5px' } }, `No aparecen: ${missing.join(', ')}`)));
      A.updateDots();
    }

    function renderStore() {
      store.innerHTML = '';
      const ic = h('canvas'); V.renderIcon(ic, p.icon, 144, { mask: 'rounded' });
      const shots = h('div', { class: 'store-shots' });
      p.slides.forEach((_, i) => { const c = h('canvas'); V.renderSlide(c, p, i, loc, 'phone', 0.2); shots.append(c); });
      const full = h('p', { class: 'full' });
      full.innerHTML = escapeAllowed(L.full || '');
      const more = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { full.classList.toggle('open'); more.textContent = full.classList.contains('open') ? 'Ver menos' : 'Ver más'; } }, 'Ver más');
      store.append(
        h('div', { class: 'store-top' }, ic, h('div', { style: { minWidth: 0 } }, h('h3', {}, L.title || 'Nombre de la app'), h('div', { class: 'dev' }, p.developer || 'Desarrollador'), h('div', { class: 'meta' }, m.category || ''))),
        h('div', { class: 'store-stats' }, h('div', {}, h('b', {}, '4.8 ★'), 'reseñas'), h('div', {}, h('b', {}, 'Nueva'), 'versión'), h('div', {}, h('b', {}, 'Todos'), 'clasificación')),
        h('button', { class: 'store-install', type: 'button', tabindex: '-1' }, 'Instalar'),
        shots,
        h('div', { class: 'store-about' }, h('h4', {}, 'Acerca de esta app', V.icon('arrow')), h('p', {}, L.short || 'Tu descripción breve aparece aquí.'), full, more));
    }
    function escapeAllowed(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>').replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    }

    const refresh = debounce(() => { renderReview(); renderStore(); }, 220);
    function changed() { A.save(); refresh(); }
    async function copyAll() {
      const text = `${L.title}\n\n${L.short}\n\n${L.full}`;
      toast((await V.copyText(text)) ? 'Ficha copiada' : 'No se pudo copiar');
    }
    renderReview(); renderStore();
    return { redraw: renderStore };
  };

  /* ═════════════ Notas de versión ═════════════ */
  V.views.notas = function (root) {
    const A = app(), p = P(), loc = A.locale;
    const N = p.notes;
    N.current = Math.min(N.current || 0, N.versions.length - 1);
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Paso 5'), h('h1', {}, 'Notas de versión'), h('p', {}, 'Escribe los cambios una vez y obtén el texto de “Novedades” en cada idioma, con el límite de 500 caracteres a la vista.')),
      h('div', { class: 'head-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: copyForConsole }, V.icon('copy'), 'Copiar para Play Console'))));
    page.append(localeBar(() => A.render()));

    const list = h('div', { class: 'versions' });
    const editor = h('div', { class: 'stack' });
    page.append(h('div', { class: 'notes' }, h('div', { class: 'stack' }, list, h('button', { class: 'btn', type: 'button', onclick: newVersion }, V.icon('plus'), 'Nueva versión')), editor));
    root.append(page);

    const V0 = () => N.versions[N.current];
    function buildList() {
      list.innerHTML = '';
      N.versions.forEach((v, i) => list.append(h('button', { type: 'button', class: 'version-btn' + (i === N.current ? ' active' : ''), onclick: () => { N.current = i; A.save(); buildList(); buildEditor(); } }, h('b', {}, v.name || '—'), h('small', {}, `código ${v.code}`))));
    }
    function newVersion() {
      const last = N.versions[0];
      const parts = (last ? last.name : '1.0.0').split('.').map((x) => parseInt(x, 10) || 0);
      while (parts.length < 3) parts.push(0);
      parts[1]++; parts[2] = 0;
      const v = { id: V.uid(), name: parts.join('.'), code: (last ? +last.code : 0) + 1, tone: last ? last.tone : 'cercano', emoji: last ? last.emoji : true, items: [{ type: 'new', text: {} }], output: {} };
      N.versions.unshift(v); N.current = 0; A.save(); buildList(); buildEditor();
    }
    function textFor(v, l) { return (v.output && v.output[l]) || V.buildNotes(p, v, l); }
    function buildEditor() {
      editor.innerHTML = '';
      const v = V0();
      if (!v) return;
      const rebuildOutputs = () => { A.save(); renderOutputs(); };
      const head = h('div', { class: 'card stack' },
        h('div', { class: 'card-head' }, h('h2', {}, `Versión ${v.name}`), N.versions.length > 1 ? h('button', { class: 'btn small danger', type: 'button', onclick: () => V.confirmDialog('Eliminar versión', `Se borrarán las notas de la versión ${v.name}.`, 'Eliminar', () => { N.versions.splice(N.current, 1); N.current = 0; A.save(); buildList(); buildEditor(); }, true) }, V.icon('trash'), 'Eliminar') : null),
        h('div', { class: 'grid-3' },
          V.field({ label: 'Nombre de versión', value: v.name, mono: true, onInput: (x) => { v.name = x; A.save(); buildList(); renderOutputs(); } }),
          V.field({ label: 'Código de versión', type: 'number', value: String(v.code), mono: true, onInput: (x) => { v.code = parseInt(x, 10) || 1; A.save(); buildList(); } }),
          h('div', { class: 'field' }, h('label', {}, 'Tono'), V.seg([['cercano', 'Cercano'], ['formal', 'Formal'], ['breve', 'Breve']], v.tone, (x) => { v.tone = x; v.output = {}; rebuildOutputs(); }, { full: true }))),
        V.switchRow('Usar emojis en los encabezados', !!v.emoji, (x) => { v.emoji = x; v.output = {}; rebuildOutputs(); }));

      const items = h('div', { class: 'stack', style: { gap: '8px' } });
      const renderItems = () => {
        items.innerHTML = '';
        v.items.forEach((it, i) => {
          it.text = it.text || {};
          const input = h('input', { class: 'input', value: it.text[loc] || '', placeholder: it.text[p.defaultLocale] && loc !== p.defaultLocale ? `Traduce: ${it.text[p.defaultLocale]}` : 'Describe el cambio en una frase', 'aria-label': `Cambio ${i + 1}` });
          input.addEventListener('input', () => { it.text[loc] = input.value; if (v.output) delete v.output[loc]; A.save(); renderOutputs(); });
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); v.items.splice(i + 1, 0, { type: it.type, text: {} }); A.save(); renderItems(); setTimeout(() => $$('input', items)[i + 1]?.focus(), 0); } });
          items.append(h('div', { class: 'note-item' },
            V.selectEl([['new', 'Nuevo'], ['improve', 'Mejora'], ['fix', 'Corrección']], it.type, (x) => { it.type = x; v.output = {}; rebuildOutputs(); }, { 'aria-label': 'Tipo de cambio' }),
            input,
            h('button', { class: 'icon-btn', type: 'button', title: 'Quitar', 'aria-label': 'Quitar cambio', html: V.ICONS.trash, onclick: () => { v.items.splice(i, 1); v.output = {}; A.save(); renderItems(); renderOutputs(); } })));
        });
      };
      renderItems();
      const itemsCard = h('div', { class: 'card stack' }, h('div', { class: 'card-head' }, h('h2', {}, 'Cambios'), h('span', { class: 'pill' }, loc)), h('p', { class: 'sub', style: { margin: 0 } }, 'Enter agrega una línea nueva. Los textos se guardan por idioma.'), items,
        h('button', { class: 'btn small', type: 'button', style: { alignSelf: 'flex-start' }, onclick: () => { v.items.push({ type: 'new', text: {} }); A.save(); renderItems(); setTimeout(() => { const all = $$('input', items); all[all.length - 1]?.focus(); }, 0); } }, V.icon('plus'), 'Agregar cambio'));

      const outGrid = h('div', { class: 'out-grid' });
      function renderOutputs() {
        outGrid.innerHTML = '';
        for (const l of p.locales) {
          const text = textFor(v, l);
          const f = V.field({ label: `${l} · ${V.LOCALES[l] || ''}`, value: text, rows: 9, max: V.LIMITS.notes, onInput: (x) => { v.output = v.output || {}; v.output[l] = x; A.save(); } });
          f.append(h('div', { class: 'row' },
            h('button', { class: 'btn small', type: 'button', onclick: async () => toast((await V.copyText(f.input.value)) ? 'Copiado' : 'No se pudo copiar') }, V.icon('copy'), 'Copiar'),
            v.output && v.output[l] ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => { delete v.output[l]; A.save(); renderOutputs(); } }, 'Regenerar') : null));
          outGrid.append(f);
        }
      }
      renderOutputs();
      editor.append(head, itemsCard, h('div', { class: 'card stack' }, h('h2', {}, 'Texto final'), h('p', { class: 'sub', style: { margin: 0 } }, 'Puedes editarlo; tus cambios se conservan hasta que pulses Regenerar.'), outGrid));
    }
    async function copyForConsole() {
      const v = V0();
      const text = p.locales.map((l) => `<${l}>\n${textFor(v, l)}\n</${l}>`).join('\n');
      toast((await V.copyText(text)) ? 'Copiado con etiquetas por idioma, listo para pegar en Play Console' : 'No se pudo copiar');
    }
    buildList(); buildEditor();
    return {};
  };

  V.notesText = (p, v, l) => (v.output && v.output[l]) || V.buildNotes(p, v, l);
})(window.Vitrina);
