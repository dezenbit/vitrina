/* Vitrina · resumen, lista de lanzamiento y exportación (ZIP con estructura fastlane). */
(function (V) {
  'use strict';
  const { h, toast } = V;
  V.views = V.views || {};
  const app = () => V.app;
  const P = () => V.app.project;

  /* ───────── Lista de lanzamiento ───────── */
  const realShots = (p) => p.slides.filter((s) => !!s.img).length;
  const allLocales = (p, fn) => p.locales.every((l) => fn(p.listing[l] || {}, l));
  const CHECKS = [
    { group: 'Recursos gráficos', items: [
      { id: 'icon', title: 'Ícono de 512 × 512 sin transparencia', route: 'icono', auto: (p) => p.icon.bgType !== 'transparent' },
      { id: 'feature', title: 'Gráfico destacado de 1024 × 500', route: 'destacado', auto: (p) => p.locales.every((l) => (p.feature.tagline || {})[l]) || p.feature.layout === 'center' },
      { id: 'shots', title: 'Al menos 2 capturas de teléfono', route: 'capturas', auto: (p) => p.slides.length >= 2 },
      { id: 'realshots', title: 'Capturas reales en lugar de las de ejemplo', route: 'capturas', desc: 'Las pantallas de muestra sirven para diseñar; sustitúyelas por las de tu app.', auto: (p) => realShots(p) === p.slides.length },
      { id: 'shotsTablet', title: 'Capturas para tablet (si la app las admite)', route: 'capturas', desc: 'Sin ellas tu app aparece con menos visibilidad en tablets y Chromebooks.' },
    ] },
    { group: 'Ficha de tienda', items: [
      { id: 'titles', title: 'Nombre en todos los idiomas, máximo 30 caracteres', route: 'ficha', auto: (p) => allLocales(p, (L) => L.title && L.title.length <= 30) },
      { id: 'shorts', title: 'Descripción breve en todos los idiomas', route: 'ficha', auto: (p) => allLocales(p, (L) => L.short && L.short.length <= 80) },
      { id: 'fulls', title: 'Descripción completa con al menos 300 caracteres', route: 'ficha', auto: (p) => allLocales(p, (L) => V.stripTags(L.full || '').length >= 300 && (L.full || '').length <= 4000) },
      { id: 'privacy', title: 'URL pública de la política de privacidad', route: 'ficha', auto: (p) => /^https:\/\//.test(p.meta.privacy || '') },
      { id: 'email', title: 'Correo de contacto', route: 'ficha', auto: (p) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.meta.email || '') },
      { id: 'lint', title: 'Revisión de la ficha sin errores', route: 'ficha', auto: (p) => p.locales.every((l) => !V.lint(p, l).some((i) => i.level === 'error')) },
    ] },
    { group: 'Play Console', items: [
      { id: 'datasafety', title: 'Formulario de seguridad de los datos', desc: 'Declara qué datos recopilas o compartes, incluidos los de SDK de terceros (analítica, anuncios, errores).' },
      { id: 'rating', title: 'Cuestionario de clasificación de contenido' },
      { id: 'audience', title: 'Público objetivo y contenido', desc: 'Si incluyes menores de 13 años aplican requisitos adicionales para familias.' },
      { id: 'access', title: 'Acceso a la app para revisión', desc: 'Si hay inicio de sesión, deja credenciales de prueba para el equipo de revisión.' },
      { id: 'ads', title: 'Declaración de anuncios' },
      { id: 'perms', title: 'Permisos sensibles justificados', desc: 'Ubicación en segundo plano, SMS, llamadas, accesibilidad o todos los archivos requieren declaración.' },
      { id: 'countries', title: 'Países y precio definidos' },
    ] },
    { group: 'Compilación', items: [
      { id: 'aab', title: 'Android App Bundle firmado (.aab)', desc: 'Con Firma de apps de Play activada; guarda tu clave de subida en un lugar seguro.' },
      { id: 'vcode', title: 'versionCode mayor que el de la versión anterior', route: 'notas', descFn: (p) => `Versión actual en Vitrina: ${(p.notes.versions[p.notes.current || 0] || {}).name || '—'} (código ${(p.notes.versions[p.notes.current || 0] || {}).code || '—'}).` },
      { id: 'targetsdk', title: 'targetSdk al nivel que exige Play este año', desc: 'El requisito sube cada año; revisa la fecha límite vigente en la documentación de Play.' },
      { id: 'mapping', title: 'Archivo de mapeo de R8/ProGuard subido', desc: 'Para que los informes de fallos muestren nombres legibles.' },
      { id: 'devices', title: 'Probada en pantallas pequeñas, grandes y en modo oscuro' },
      { id: 'secrets', title: 'Sin claves, registros de depuración ni datos de prueba en el código' },
    ] },
    { group: 'Pruebas y lanzamiento', items: [
      { id: 'closed', title: 'Prueba cerrada con el mínimo de testers exigido', desc: 'Las cuentas personales nuevas deben completar una prueba cerrada (actualmente 12 testers durante 14 días seguidos) antes de pedir producción. Comprueba el requisito vigente en Play Console.' },
      { id: 'prelaunch', title: 'Informe previo al lanzamiento revisado' },
      { id: 'notesAll', title: 'Notas de versión en todos los idiomas', route: 'notas', auto: (p) => { const v = p.notes.versions[p.notes.current || 0]; return !!v && p.locales.every((l) => V.notesText(p, v, l).length <= 500 && v.items.some((it) => it.text && it.text[l])); } },
      { id: 'staged', title: 'Lanzamiento por etapas planeado', desc: 'Empieza con un porcentaje pequeño y vigila fallos y ANR antes de ampliar.' },
      { id: 'replies', title: 'Respuestas a reseñas preparadas' },
      { id: 'share', title: 'Enlace de la ficha listo para compartir', descFn: (p) => `https://play.google.com/store/apps/details?id=${p.packageName || 'tu.paquete'}` },
    ] },
  ];
  function checkState(p) {
    let done = 0, total = 0;
    const flat = [];
    for (const g of CHECKS) for (const it of g.items) {
      const auto = it.auto ? !!it.auto(p) : null;
      const val = auto !== null ? auto : !!p.checklist[it.id];
      total++; if (val) done++;
      flat.push({ ...it, group: g.group, done: val, isAuto: auto !== null });
    }
    return { done, total, pct: total ? (done / total) * 100 : 0, flat };
  }
  V.checkState = checkState;

  V.sectionStatus = (p) => {
    const st = {};
    st.capturas = p.slides.length >= 2 && realShots(p) === p.slides.length ? 'ok' : 'warn';
    st.destacado = p.locales.every((l) => (p.feature.tagline || {})[l]) ? 'ok' : 'warn';
    st.icono = p.icon.bgType !== 'transparent' ? 'ok' : 'warn';
    st.ficha = p.locales.every((l) => !V.lint(p, l).some((i) => i.level === 'error')) ? 'ok' : 'warn';
    const v = p.notes.versions[p.notes.current || 0];
    st.notas = v && p.locales.every((l) => v.items.some((it) => it.text && it.text[l])) ? 'ok' : 'warn';
    const cs = checkState(p);
    st.checklist = cs.pct === 100 ? 'ok' : 'warn';
    return st;
  };

  V.views.checklist = function (root) {
    const A = app(), p = P();
    const page = h('div', { class: 'page' });
    const head = h('div', { class: 'page-head' });
    const groups = h('div', { class: 'check-groups' });
    page.append(head, groups);
    root.append(page);
    function render() {
      const cs = checkState(p);
      head.innerHTML = '';
      head.append(h('div', { class: 'row', style: { gap: '18px', alignItems: 'center' } }, V.ring(cs.pct, true),
        h('div', {}, h('p', { class: 'eyebrow' }, 'Paso 6'), h('h1', {}, 'Lista de lanzamiento'), h('p', {}, `${cs.done} de ${cs.total} listos. Los puntos marcados como automáticos se comprueban con los datos del proyecto.`))),
        h('div', { class: 'head-actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => { p.checklist = {}; A.save(); render(); } }, 'Desmarcar manuales')));
      groups.innerHTML = '';
      for (const g of CHECKS) {
        const card = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, g.group), h('span', { class: 'pill' }, `${cs.flat.filter((x) => x.group === g.group && x.done).length}/${g.items.length}`)));
        for (const it of cs.flat.filter((x) => x.group === g.group)) {
          const id = 'chk-' + it.id;
          const input = h('input', { type: 'checkbox', id, checked: it.done, disabled: it.isAuto });
          input.addEventListener('change', () => { p.checklist[it.id] = input.checked; A.save(); render(); });
          const desc = it.descFn ? it.descFn(p) : it.desc;
          card.append(h('div', { class: 'check-item' + (it.done ? ' done' : '') }, input,
            h('label', { for: id }, it.title, it.isAuto ? h('span', { class: 'pill ' + (it.done ? 'ok' : 'warn') }, 'Automático') : null),
            desc || it.route ? h('p', {}, desc || '', desc && it.route ? ' ' : '', it.route && !it.done ? h('a', { href: '#' + it.route }, 'Ir a la sección') : null) : null));
        }
        groups.append(card);
      }
      A.updateDots();
    }
    render();
    return {};
  };

  /* ───────── Resumen ───────── */
  V.views.resumen = function (root) {
    const A = app(), p = P();
    const cs = checkState(p);
    const ic = h('canvas'); V.renderIcon(ic, p.icon, 192, { mask: 'squircle' });
    const L = p.listing[A.locale] || p.listing[p.defaultLocale] || {};
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Resumen del proyecto'), h('h1', {}, 'Todo para publicar en un solo lugar'), h('p', {}, 'Diseña capturas, gráfico e ícono, revisa la ficha en cada idioma y exporta un paquete listo para subir a mano o con fastlane.'))));

    if (p.isSample) {
      page.append(h('div', { class: 'card', style: { marginBottom: '18px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', background: 'var(--accent-soft)', borderColor: 'transparent' } },
        h('div', {}, h('strong', {}, 'Estás viendo un proyecto de ejemplo.'), h('div', { style: { color: 'var(--muted)', fontSize: '13px' } }, 'Explóralo libremente o crea el de tu app; el ejemplo seguirá disponible en el menú de proyectos.')),
        h('button', { class: 'btn primary', type: 'button', onclick: () => document.getElementById('projectBtn').click() }, V.icon('plus'), 'Crear mi proyecto')));
    }

    const assets = h('div', { class: 'asset-row' });
    p.slides.forEach((_, i) => { const c = h('canvas'); V.renderSlide(c, p, i, A.locale, 'phone', 0.2); assets.append(h('a', { href: '#capturas', title: `Captura ${i + 1}`, onclick: () => (A.slideIndex = i) }, c)); });
    const fg = h('canvas'); V.renderFeature(fg, p, A.locale, 0.38); assets.append(h('a', { href: '#destacado', title: 'Gráfico destacado' }, fg));

    const next = h('ul', { class: 'next-steps' });
    cs.flat.filter((x) => !x.done).slice(0, 5).forEach((x) => next.append(h('li', {}, h('a', { href: '#' + (x.route || 'checklist') }, h('span', { class: 'pill ' + (x.isAuto ? 'warn' : '') }, x.group), x.title, V.icon('arrow')))));
    if (!next.children.length) next.append(h('li', {}, h('a', { href: '#exportar' }, h('span', { class: 'pill ok' }, 'Listo'), 'Todo marcado. Exporta el paquete.', V.icon('arrow'))));

    const scores = h('div');
    p.locales.forEach((l) => { const s = V.score(V.lint(p, l)); scores.append(h('div', { class: 'stat-line' }, h('span', {}, `${l} · ${V.LOCALES[l] || ''}`), h('b', { class: 'pill ' + (s >= 90 ? 'ok' : s >= 70 ? 'warn' : 'error') }, `${s} / 100`))); });
    const v = p.notes.versions[p.notes.current || 0] || {};

    page.append(h('div', { class: 'overview' },
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('div', { class: 'hero-card' }, ic, h('div', { style: { minWidth: 0 } }, h('h2', {}, L.title || p.name), h('div', { class: 'pkg' }, p.packageName), h('div', { style: { color: 'var(--muted)', marginTop: '4px' } }, `${p.developer || 'Sin desarrollador'} · ${p.meta.category || 'Sin categoría'}`)))),
        h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Recursos'), h('a', { class: 'btn small', href: '#capturas' }, 'Editar', V.icon('arrow'))), assets),
        h('div', { class: 'card' }, h('h2', { style: { marginBottom: '10px' } }, 'Siguientes pasos'), next)),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('div', { class: 'row', style: { gap: '16px' } }, V.ring(cs.pct, true), h('div', {}, h('h2', {}, 'Preparación'), h('p', { class: 'sub', style: { margin: 0 } }, `${cs.done} de ${cs.total} puntos de la lista de lanzamiento.`), h('a', { class: 'btn small', href: '#checklist', style: { marginTop: '10px' } }, 'Ver lista', V.icon('arrow'))))),
        h('div', { class: 'card' }, h('h2', { style: { marginBottom: '6px' } }, 'Ficha por idioma'), scores),
        h('div', { class: 'card' }, h('h2', { style: { marginBottom: '6px' } }, 'Datos'),
          h('div', { class: 'stat-line' }, h('span', {}, 'Capturas'), h('b', {}, `${p.slides.length} (${realShots(p)} reales)`)),
          h('div', { class: 'stat-line' }, h('span', {}, 'Idiomas'), h('b', {}, String(p.locales.length))),
          h('div', { class: 'stat-line' }, h('span', {}, 'Versión actual'), h('b', {}, `${v.name || '—'} · código ${v.code || '—'}`)),
          h('div', { class: 'stat-line' }, h('span', {}, 'Última edición'), h('b', {}, new Date(p.updated).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })))))));
    root.append(page);
    return { redraw: () => { assets.querySelectorAll('canvas').forEach((c, i) => { if (i < p.slides.length) V.renderSlide(c, p, i, A.locale, 'phone', 0.2); else V.renderFeature(c, p, A.locale, 0.38); }); V.renderIcon(ic, p.icon, 192, { mask: 'squircle' }); } };
  };

  /* ───────── Exportación ───────── */
  const DENS = [['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]];
  const ADAPTIVE_XML = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n';
  async function addIconKit(folder, ic) {
    const blob = async (opts, size) => { const c = document.createElement('canvas'); V.renderIcon(c, ic, size, opts); return V.canvasBlob(c); };
    for (const [d, legacy, layer] of DENS) {
      const f = folder.folder(`res/mipmap-${d}`);
      f.file('ic_launcher.png', await blob({ mask: 'rounded' }, legacy));
      f.file('ic_launcher_round.png', await blob({ mask: 'circle' }, legacy));
      f.file('ic_launcher_foreground.png', await blob({ part: 'fg', fgScale: 72 / 108 }, layer));
      f.file('ic_launcher_background.png', await blob({ part: 'bg' }, layer));
    }
    folder.folder('res/mipmap-anydpi-v26').file('ic_launcher.xml', ADAPTIVE_XML).file('ic_launcher_round.xml', ADAPTIVE_XML);
    folder.file('ic_launcher-playstore.png', await blob({}, 512));
    folder.file('LEEME.txt', 'Copia la carpeta res/ dentro de app/src/main/ de tu proyecto de Android Studio y acepta reemplazar los archivos.\nEl manifiesto debe usar android:icon="@mipmap/ic_launcher" y android:roundIcon="@mipmap/ic_launcher_round".\n');
  }
  V.exportIconKit = async () => {
    if (!window.JSZip) { toast('No se pudo cargar el compresor ZIP. Revisa tu conexión.', 'error'); return; }
    const zip = new JSZip();
    await addIconKit(zip, P().icon);
    V.download(await zip.generateAsync({ type: 'blob' }), `${V.slug(P().name)}-iconos-android.zip`);
    toast('Kit de íconos descargado');
  };

  const OPT_DEFAULTS = { phone: true, tablet7: false, tablet10: false, feature: true, icon: true, iconKit: true, texts: true, notes: true, allNotes: false, project: true };
  V.views.exportar = function (root) {
    const A = app(), p = P();
    const opts = { ...OPT_DEFAULTS, ...V.prefs.get('exportOpts', {}) };
    let locs = p.locales.slice();
    const tree = h('div', { class: 'tree', 'aria-label': 'Estructura del archivo ZIP' });
    const bar = h('div', { class: 'progress' }, h('i'));
    const status = h('p', { class: 'help', role: 'status', style: { margin: 0, minHeight: '1.4em', color: 'var(--muted)' } });
    const go = h('button', { class: 'btn primary', type: 'button', onclick: build }, V.icon('zip'), 'Descargar paquete .zip');
    const root0 = `${V.slug(p.name)}-launch-kit`;

    const opt = (key, title, desc) => {
      const id = 'o-' + key;
      const input = h('input', { type: 'checkbox', id, checked: opts[key] });
      input.addEventListener('change', () => { opts[key] = input.checked; V.prefs.set('exportOpts', opts); renderTree(); });
      return h('label', { class: 'opt', for: id }, input, h('span', {}, h('b', {}, title), h('small', {}, desc)));
    };
    const locBox = h('div', { class: 'chips' });
    p.locales.forEach((l) => {
      const b = h('button', { type: 'button', class: 'chip active', 'aria-pressed': 'true' }, l);
      b.addEventListener('click', () => { const on = locs.includes(l); if (on && locs.length === 1) return; locs = on ? locs.filter((x) => x !== l) : [...locs, l]; b.classList.toggle('active', !on); b.setAttribute('aria-pressed', String(!on)); renderTree(); });
      locBox.append(b);
    });

    const page = h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Paso final'), h('h1', {}, 'Exportar'), h('p', {}, 'Un ZIP con la estructura de metadatos de fastlane: súbelo con “fastlane supply” o arrastra cada archivo a Play Console. Todo se genera en tu navegador.'))),
      h('div', { class: 'export' },
        h('div', { class: 'stack' },
          h('div', { class: 'card' }, h('h2', {}, 'Qué incluir'), h('p', { class: 'sub' }, 'Tu selección se recuerda para la próxima vez.'),
            opt('phone', 'Capturas de teléfono', '1080 × 1920 px, por idioma.'),
            opt('tablet7', 'Capturas de tablet de 7"', '1440 × 2560 px.'),
            opt('tablet10', 'Capturas de tablet de 10"', '2160 × 3840 px.'),
            opt('feature', 'Gráfico destacado', '1024 × 500 px, por idioma.'),
            opt('icon', 'Ícono de la tienda', '512 × 512 px.'),
            opt('iconKit', 'Kit de íconos de Android', 'mipmap en 5 densidades, ícono adaptable y redondo.'),
            opt('texts', 'Textos de la ficha', 'title.txt, short_description.txt y full_description.txt.'),
            opt('notes', 'Notas de versión', 'changelogs/<versionCode>.txt'),
            opt('allNotes', 'Incluir versiones anteriores', 'Un archivo por cada versión registrada.'),
            opt('project', 'Archivo del proyecto', 'Para volver a abrirlo en Vitrina en otra computadora.')),
          h('div', { class: 'card stack' }, h('h2', {}, 'Idiomas'), locBox)),
        h('div', { class: 'stack' },
          h('div', { class: 'card stack' }, h('div', { class: 'card-head' }, h('h2', {}, 'Contenido del paquete'), h('span', { class: 'pill', id: 'fileCount' })), tree, bar, status, h('div', { class: 'row' }, go,
            h('button', { class: 'btn', type: 'button', onclick: () => A.exportProjectFile() }, V.icon('file'), 'Sólo el proyecto (.json)'))))));
    root.append(page);

    function plan() {
      const files = [];
      const base = `${root0}/fastlane/metadata/android`;
      const vs = opts.allNotes ? p.notes.versions : [p.notes.versions[p.notes.current || 0]].filter(Boolean);
      for (const l of locs) {
        if (opts.texts) ['title', 'short_description', 'full_description'].forEach((k) => files.push({ path: `${base}/${l}/${k}.txt`, kind: 'text', key: k, loc: l }));
        if (opts.notes) vs.forEach((v) => files.push({ path: `${base}/${l}/changelogs/${v.code}.txt`, kind: 'notes', v, loc: l }));
        if (opts.icon) files.push({ path: `${base}/${l}/images/icon.png`, kind: 'icon' });
        if (opts.feature) files.push({ path: `${base}/${l}/images/featureGraphic.png`, kind: 'feature', loc: l });
        for (const t of ['phone', 'tablet7', 'tablet10']) if (opts[t]) p.slides.forEach((_, i) => files.push({ path: `${base}/${l}/images/${V.TARGETS[t].folder}/${i + 1}_${l}.png`, kind: 'shot', target: t, i, loc: l }));
      }
      if (opts.iconKit) files.push({ path: `${root0}/android-icons/`, kind: 'iconKit' });
      if (opts.project) files.push({ path: `${root0}/${V.slug(p.name)}.vitrina.json`, kind: 'project' });
      files.push({ path: `${root0}/LEEME.txt`, kind: 'readme' });
      return files;
    }
    function renderTree() {
      const files = plan();
      document.getElementById('fileCount').textContent = `${files.length} elementos`;
      const lines = [];
      const seen = new Set();
      files.forEach((f) => {
        const parts = f.path.split('/').filter(Boolean);
        parts.forEach((part, d) => {
          const key = parts.slice(0, d + 1).join('/');
          if (seen.has(key)) return;
          seen.add(key);
          const isDir = d < parts.length - 1 || f.path.endsWith('/');
          lines.push(`${'  '.repeat(d)}${isDir ? '▸ ' : '  '}${part}${isDir ? '/' : ''}${f.kind === 'iconKit' && d === parts.length - 1 ? '  (res/mipmap-*, adaptable, playstore)' : ''}`);
        });
      });
      tree.textContent = lines.join('\n');
    }
    async function build() {
      if (!window.JSZip) { toast('No se pudo cargar el compresor ZIP. Revisa tu conexión.', 'error'); return; }
      go.disabled = true;
      const files = plan();
      const zip = new JSZip();
      const setP = (i, msg) => { bar.firstChild.style.width = (i / files.length) * 100 + '%'; status.textContent = msg; };
      try {
        let i = 0;
        const iconBlob = await (async () => { const c = document.createElement('canvas'); V.renderIcon(c, p.icon, 512, {}); return V.canvasBlob(c); })();
        for (const f of files) {
          i++;
          setP(i, `Generando ${f.path.split('/').slice(-1)[0] || 'íconos'}…`);
          await new Promise((r) => setTimeout(r, 0));
          if (f.kind === 'text') { const L = p.listing[f.loc] || {}; zip.file(f.path, ({ title: L.title, short_description: L.short, full_description: L.full })[f.key] || ''); }
          else if (f.kind === 'notes') zip.file(f.path, V.notesText(p, f.v, f.loc));
          else if (f.kind === 'icon') zip.file(f.path, iconBlob);
          else if (f.kind === 'feature') { const c = document.createElement('canvas'); V.renderFeature(c, p, f.loc, 1); zip.file(f.path, await V.canvasBlob(c)); }
          else if (f.kind === 'shot') { const c = document.createElement('canvas'); V.renderSlide(c, p, f.i, f.loc, f.target, 1); zip.file(f.path, await V.canvasBlob(c)); }
          else if (f.kind === 'iconKit') await addIconKit(zip.folder(`${root0}/android-icons`), p.icon);
          else if (f.kind === 'project') zip.file(f.path, JSON.stringify({ app: 'Vitrina', format: 1, project: p }, null, 1));
          else if (f.kind === 'readme') zip.file(f.path, readme(p, locs));
        }
        setP(files.length, 'Comprimiendo…');
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (m) => { bar.firstChild.style.width = m.percent + '%'; });
        V.download(blob, `${root0}.zip`);
        status.textContent = `Listo: ${(blob.size / 1024 / 1024).toFixed(1)} MB, ${files.length} elementos.`;
        toast('Paquete descargado');
      } catch (e) {
        console.error(e);
        status.textContent = 'No se pudo generar el paquete. Prueba con menos capturas de tablet o recarga la página.';
      } finally { go.disabled = false; }
    }
    renderTree();
    return {};
  };

  function readme(p, locs) {
    const v = p.notes.versions[p.notes.current || 0] || {};
    return [
      `${p.name} · kit de lanzamiento`,
      `Generado con Vitrina el ${new Date().toLocaleString('es-MX')}.`,
      '',
      `Paquete: ${p.packageName}`,
      `Versión: ${v.name || '—'} (código ${v.code || '—'})`,
      `Idiomas: ${locs.join(', ')}`,
      '',
      'Subir con fastlane',
      '  1. Copia la carpeta fastlane/ a la raíz de tu proyecto Android.',
      '  2. Ejecuta: fastlane supply --package_name ' + p.packageName + ' --skip_upload_apk --skip_upload_aab',
      '     (usa --json_key con la cuenta de servicio de Play Console).',
      '',
      'Subir a mano',
      '  Play Console > Presencia en la tienda > Ficha principal: copia los .txt y arrastra las imágenes de cada idioma.',
      '  Las notas de versión de changelogs/ se pegan al crear la versión.',
      '',
      'Íconos para Android Studio',
      '  Copia android-icons/res/ dentro de app/src/main/.',
    ].join('\n');
  }
})(window.Vitrina);
