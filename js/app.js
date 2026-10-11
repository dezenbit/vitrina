/* Vitrina · arranque, proyectos, guardado automático y navegación. */
(function (V) {
  'use strict';
  const { $, $$, h, Store, prefs, toast, debounce, clone } = V;

  const ROUTES = ['resumen', 'capturas', 'destacado', 'icono', 'ficha', 'notas', 'checklist', 'exportar'];
  const app = (V.app = {
    projects: [],
    project: null,
    route: 'resumen',
    locale: 'es-419',
    view: null,
  });

  /* ───────── Guardado ───────── */
  const saveState = $('#saveState');
  const persist = debounce(async () => {
    const p = app.project;
    p.updated = Date.now();
    const ok = await Store.put(p);
    saveState.className = 'save-state' + (ok ? '' : ' memory');
    saveState.textContent = ok ? 'Guardado' : 'Sin guardado permanente';
    saveState.title = ok ? 'Todo se guarda en este navegador.' : 'Este navegador no permite guardar. Exporta el proyecto antes de cerrar.';
    updateDots();
  }, 500);
  app.save = () => { saveState.className = 'save-state saving'; saveState.textContent = 'Guardando…'; persist(); };

  /* Redibujado diferido de los lienzos de la vista actual (p. ej. al cargar fuentes o imágenes) */
  let redrawQueued = false;
  V.requestRedraw = () => {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(() => { redrawQueued = false; app.view && app.view.redraw && app.view.redraw(); drawProjectIcon(); });
  };

  /* ───────── Proyectos ───────── */
  async function loadProjects() {
    app.projects = (await Store.all()).sort((a, b) => b.updated - a.updated);
    if (!app.projects.length) {
      const p = V.sampleProject();
      app.projects = [p];
      await Store.put(p);
    }
    const last = prefs.get('lastProject', null);
    app.project = app.projects.find((p) => p.id === last) || app.projects[0];
    migrate(app.project);
  }
  function migrate(p) {
    const s = V.sampleProject();
    for (const k of Object.keys(s)) if (p[k] == null) p[k] = clone(s[k]);
    p.theme = { ...s.theme, ...p.theme };
    p.icon = { ...s.icon, ...p.icon };
    p.meta = { ...s.meta, ...p.meta };
    p.feature = { ...s.feature, ...p.feature };
    p.checklist = p.checklist || {};
    for (const loc of p.locales) if (!p.listing[loc]) p.listing[loc] = { title: '', short: '', full: '' };
    if (!p.locales.includes(p.defaultLocale)) p.defaultLocale = p.locales[0];
  }
  function switchProject(id) {
    const p = app.projects.find((x) => x.id === id);
    if (!p) return;
    migrate(p);
    app.project = p;
    prefs.set('lastProject', p.id);
    app.locale = p.locales.includes(app.locale) ? app.locale : p.defaultLocale;
    refreshChrome();
    render();
  }
  app.switchProject = switchProject;
  async function addProject(p) {
    app.projects.unshift(p);
    await Store.put(p);
    switchProject(p.id);
  }
  app.addProject = addProject;

  function newProjectDialog() {
    const name = V.field({ label: 'Nombre de la app', value: '', placeholder: 'Por ejemplo: Kibo', max: 30 });
    V.modal('Nuevo proyecto', [name, h('p', { class: 'help', style: { margin: 0, color: 'var(--muted)', fontSize: '13px' } }, 'Empieza con capturas de ejemplo y un tema; luego sube tus pantallas reales.')], [
      ['Cancelar', null, 'ghost'],
      ['Crear', async () => { const n = name.input.value.trim() || 'Mi app'; await addProject(V.blankProject(n)); toast('Proyecto creado'); location.hash = '#resumen'; }, 'primary'],
    ]);
    name.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#modalBody .btn.primary').click(); });
  }
  async function duplicateProject() {
    const p = clone(app.project);
    p.id = V.uid(); p.name = p.name + ' (copia)'; p.created = p.updated = Date.now(); p.isSample = false;
    await addProject(p);
    toast('Proyecto duplicado');
  }
  function deleteProject() {
    V.confirmDialog('Eliminar proyecto', `Se borrará “${app.project.name}” de este navegador, con sus capturas y textos. Exporta el proyecto antes si quieres conservarlo.`, 'Eliminar', async () => {
      await Store.del(app.project.id);
      app.projects = app.projects.filter((p) => p.id !== app.project.id);
      if (!app.projects.length) { const s = V.sampleProject(); app.projects = [s]; await Store.put(s); }
      switchProject(app.projects[0].id);
      toast('Proyecto eliminado');
    }, true);
  }
  function exportProjectFile() {
    const blob = new Blob([JSON.stringify({ app: 'Vitrina', format: 1, project: app.project }, null, 1)], { type: 'application/json' });
    V.download(blob, `${V.slug(app.project.name)}.vitrina.json`);
  }
  app.exportProjectFile = exportProjectFile;
  function importProjectFile(file) {
    const r = new FileReader();
    r.onload = async () => {
      try {
        const data = JSON.parse(r.result);
        const p = data.project || data;
        if (!p.slides || !p.listing) throw new Error('formato');
        p.id = V.uid(); p.updated = Date.now();
        migrate(p);
        await addProject(p);
        toast('Proyecto importado');
      } catch { toast('Ese archivo no es un proyecto de Vitrina', 'error'); }
    };
    r.readAsText(file);
  }
  app.importProjectFile = importProjectFile;

  /* ───────── Menú de proyectos ───────── */
  const menu = $('#projectMenu'), menuBtn = $('#projectBtn');
  function buildMenu() {
    menu.innerHTML = '';
    menu.append(h('div', { class: 'menu-label' }, 'Tus proyectos'));
    for (const p of app.projects) {
      const c = h('canvas', { width: 52, height: 52 });
      V.renderIcon(c, p.icon, 52, { mask: 'squircle' });
      menu.append(h('button', { role: 'menuitem', class: p.id === app.project.id ? 'current' : '', onclick: () => { closeMenu(); switchProject(p.id); } }, c, h('span', {}, p.name)));
    }
    const file = h('input', { type: 'file', accept: '.json,application/json' });
    file.addEventListener('change', () => { if (file.files[0]) importProjectFile(file.files[0]); closeMenu(); });
    menu.append(
      h('hr'),
      h('button', { role: 'menuitem', onclick: () => { closeMenu(); newProjectDialog(); } }, V.icon('plus'), 'Nuevo proyecto'),
      h('button', { role: 'menuitem', onclick: () => { closeMenu(); duplicateProject(); } }, V.icon('dup'), 'Duplicar este proyecto'),
      h('button', { role: 'menuitem', onclick: () => { closeMenu(); renameDialog(); } }, V.icon('file'), 'Renombrar'),
      h('button', { role: 'menuitem', onclick: () => { closeMenu(); exportProjectFile(); } }, V.icon('down'), 'Guardar como archivo .json'),
      h('button', { role: 'menuitem', class: 'file-item' }, V.icon('upload'), 'Abrir archivo de proyecto', file),
      h('hr'),
      h('button', { role: 'menuitem', class: 'danger', onclick: () => { closeMenu(); deleteProject(); } }, V.icon('trash'), 'Eliminar proyecto'),
    );
  }
  function renameDialog() {
    const f = V.field({ label: 'Nombre del proyecto', value: app.project.name });
    V.modal('Renombrar proyecto', f, [['Cancelar', null, 'ghost'], ['Guardar', () => { app.project.name = f.input.value.trim() || app.project.name; app.save(); refreshChrome(); }, 'primary']]);
  }
  function openMenu() { buildMenu(); menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? openMenu() : closeMenu(); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });

  /* ───────── Barra superior ───────── */
  function drawProjectIcon() {
    if (!app.project) return;
    V.renderIcon($('#projectIcon'), app.project.icon, 56, { mask: 'squircle' });
  }
  app.drawIcon = drawProjectIcon;
  function buildLocaleSelect() {
    const s = $('#localeSelect');
    s.innerHTML = '';
    for (const loc of app.project.locales) s.append(h('option', { value: loc, selected: loc === app.locale }, `${loc} · ${V.LOCALES[loc] || loc}`));
  }
  $('#localeSelect').addEventListener('change', (e) => { app.locale = e.target.value; render(); });
  app.setLocale = (loc) => { app.locale = loc; buildLocaleSelect(); render(); };
  function refreshChrome() {
    $('#projectName').textContent = app.project.name;
    drawProjectIcon();
    buildLocaleSelect();
    updateDots();
  }
  app.refreshChrome = refreshChrome;

  /* Estado de cada sección en la navegación */
  function updateDots() {
    const p = app.project;
    if (!p) return;
    const st = V.sectionStatus ? V.sectionStatus(p) : {};
    $$('.sidenav .dot').forEach((d) => { d.className = 'dot ' + (st[d.dataset.dot] || ''); });
  }
  app.updateDots = updateDots;

  /* Tema claro/oscuro */
  const root = document.documentElement;
  const savedTheme = prefs.get('theme', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  $('#themeToggle').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    prefs.set('theme', root.dataset.theme);
  });

  /* ───────── Navegación ───────── */
  function currentRoute() { const r = location.hash.replace('#', ''); return ROUTES.includes(r) ? r : 'resumen'; }
  function render() {
    app.route = currentRoute();
    $$('.sidenav a').forEach((a) => { const on = a.dataset.route === app.route; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const view = $('#view');
    view.innerHTML = '';
    app.view = null;
    const fn = V.views && V.views[app.route];
    if (fn) app.view = fn(view) || null;
    updateDots();
  }
  app.render = render;
  window.addEventListener('hashchange', () => { render(); $('#view').focus({ preventScroll: true }); window.scrollTo(0, 0); });

  // Modal: cerrar con fondo, botón o Escape
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) V.closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { V.closeModal(); closeMenu(); } });

  // Pegar imágenes desde el portapapeles en la vista activa
  document.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item && app.view && app.view.onPasteImage) { e.preventDefault(); app.view.onPasteImage(item.getAsFile()); }
  });

  /* ───────── Arranque ───────── */
  (async function start() {
    await loadProjects();
    app.locale = app.project.defaultLocale;
    prefs.set('lastProject', app.project.id);
    refreshChrome();
    render();
    saveState.textContent = Store.persistent ? 'Guardado' : 'Sin guardado permanente';
    if (!Store.persistent) saveState.classList.add('memory');
    if (document.fonts) document.fonts.ready.then(() => V.requestRedraw());
  })();
})(window.Vitrina);
