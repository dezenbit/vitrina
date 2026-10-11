/* Vitrina · piezas de interfaz reutilizables. */
(function (V) {
  'use strict';
  const { h, $ } = V;

  const ICONS = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m10 6 6 6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
    dup: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="11" height="11" rx="2"/><rect x="9" y="9" width="11" height="11" rx="2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    wand: '<svg viewBox="0 0 24 24"><path d="m4 20 11-11M14 4v3M20 10h-3M18.5 5.5l-2 2M9 4l.6 1.4L11 6l-1.4.6L9 8l-.6-1.4L7 6l1.4-.6z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>',
    tip: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg>',
    zip: '<svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5z"/><path d="M10 3v2h2v2h-2v2h2v2h-2v3h2"/></svg>',
    bold: '<svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',
    italic: '<svg viewBox="0 0 24 24"><path d="M10 5h8M6 19h8M14 5l-4 14"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  const icon = (name) => { const s = h('span', { html: ICONS[name] || '' }); return s.firstChild; };

  function counterFor(len, max) {
    const ratio = len / max;
    return { cls: ratio > 1 ? 'over' : ratio > 0.9 ? 'near' : '', pct: Math.min(100, ratio * 100) };
  }

  /* Campo de texto con contador opcional */
  function field({ label, value = '', onInput, onChange, max, type = 'text', rows, help, mono, placeholder, id }) {
    id = id || 'f' + Math.random().toString(36).slice(2, 8);
    const isArea = !!rows;
    const input = isArea
      ? h('textarea', { class: 'textarea' + (mono ? ' mono' : ''), id, rows, placeholder, spellcheck: 'true' })
      : h('input', { class: 'input' + (mono ? ' mono' : ''), id, type, placeholder, spellcheck: type === 'text' ? 'true' : 'false', autocomplete: 'off' });
    input.value = value || '';
    const counter = max ? h('span', { class: 'counter' }) : null;
    const meter = max ? h('div', { class: 'meter' }, h('i')) : null;
    const sync = () => {
      if (!max) return;
      const c = counterFor(input.value.length, max);
      counter.textContent = `${input.value.length} / ${max}`;
      counter.className = 'counter ' + c.cls;
      meter.className = 'meter ' + c.cls;
      meter.firstChild.style.width = c.pct + '%';
    };
    sync();
    input.addEventListener('input', () => { sync(); onInput && onInput(input.value); });
    if (onChange) input.addEventListener('change', () => onChange(input.value));
    const wrap = h('div', { class: 'field' }, h('label', { for: id }, h('span', {}, label), counter), input, meter, help ? h('p', { class: 'help' }, help) : null);
    wrap.input = input;
    return wrap;
  }

  function colorField(label, value, onInput) {
    const pick = h('input', { type: 'color', value: value, 'aria-label': label });
    const txt = h('input', { type: 'text', value: value, maxlength: 7, 'aria-label': `${label} en hexadecimal` });
    pick.addEventListener('input', () => { txt.value = pick.value; onInput(pick.value); });
    txt.addEventListener('change', () => {
      let v = txt.value.trim(); if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) { pick.value = v; onInput(v); } else txt.value = pick.value;
    });
    const wrap = h('label', { class: 'color-field', title: label }, pick, txt, h('span', {}, label));
    wrap.set = (v) => { pick.value = v; txt.value = v; };
    return wrap;
  }

  function rangeRow(label, { min, max, step, value, onInput, onChange, fmt }) {
    const id = 'r' + Math.random().toString(36).slice(2, 8);
    const out = h('output', { for: id });
    const input = h('input', { type: 'range', id, min, max, step, value });
    const show = () => (out.textContent = fmt ? fmt(+input.value) : input.value);
    show();
    input.addEventListener('input', () => { show(); onInput && onInput(+input.value); });
    if (onChange) input.addEventListener('change', () => onChange(+input.value));
    return h('div', { class: 'range-row' }, h('label', { for: id }, label), input, out);
  }

  function seg(options, value, onChange, { full, label } = {}) {
    const wrap = h('div', { class: 'seg' + (full ? ' full' : ''), role: 'radiogroup', 'aria-label': label || '' });
    for (const [v, l] of options) {
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === value), class: v === value ? 'active' : '' }, l);
      b.addEventListener('click', () => {
        [...wrap.children].forEach((x) => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('active'); b.setAttribute('aria-checked', 'true');
        onChange(v);
      });
      wrap.append(b);
    }
    return wrap;
  }

  function switchRow(label, checked, onChange, help) {
    const id = 's' + Math.random().toString(36).slice(2, 8);
    const input = h('input', { type: 'checkbox', id, checked });
    input.addEventListener('change', () => onChange(input.checked));
    return h('div', { class: 'stack', style: { gap: '4px' } },
      h('div', { class: 'switch-row' }, h('label', { for: id, class: 'label', style: { cursor: 'pointer' } }, label), h('span', { class: 'switch' }, input, h('span'))),
      help ? h('p', { class: 'help', style: { margin: 0, fontSize: '12px', color: 'var(--faint)' } }, help) : null);
  }

  function selectEl(options, value, onChange, attrs = {}) {
    const s = h('select', { class: 'select', ...attrs });
    for (const o of options) {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      s.append(h('option', { value: v, selected: v === value }, l));
    }
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }

  function ring(pct, big) {
    const r = 30, c = 2 * Math.PI * r;
    const el = h('div', { class: 'ring' + (big ? ' big' : ''), role: 'img', 'aria-label': `${Math.round(pct)} por ciento` });
    el.innerHTML = `<svg viewBox="0 0 74 74"><circle class="track" cx="37" cy="37" r="${r}"/><circle class="val" cx="37" cy="37" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg><b>${Math.round(pct)}</b>`;
    return el;
  }

  /* Modal sencillo */
  function modal(title, body, actions = []) {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    const b = $('#modalBody');
    b.innerHTML = '';
    (Array.isArray(body) ? body : [body]).forEach((n) => n && b.append(n));
    if (actions.length) {
      const row = h('div', { class: 'modal-actions' });
      actions.forEach(([label, fn, cls]) => row.append(h('button', { class: 'btn ' + (cls || ''), type: 'button', onclick: async () => { const r = fn ? await fn() : true; if (r !== false) closeModal(); } }, label)));
      b.append(row);
    }
    m.hidden = false;
    const f = b.querySelector('input, textarea, select, button'); f && f.focus();
  }
  function closeModal() { $('#modal').hidden = true; }
  function confirmDialog(title, text, okLabel, onOk, danger) {
    modal(title, h('p', { style: { margin: 0, color: 'var(--muted)' } }, text), [['Cancelar', null, 'ghost'], [okLabel, onOk, danger ? 'primary danger-fill' : 'primary']]);
  }

  /* Zona para soltar o elegir imágenes */
  function dropzone({ title, hint, src, onFile, onClear, extra }) {
    const thumb = src ? h('img', { class: 'thumb', src, alt: '' }) : h('div', { class: 'thumb' });
    const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp' });
    input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
    const dz = h('div', { class: 'dropzone' }, thumb,
      h('div', { class: 'dz-text' }, h('strong', {}, title), hint,
        h('div', { class: 'row' }, h('span', { class: 'btn small file-btn' }, src ? 'Reemplazar' : 'Elegir imagen', input), src && onClear ? h('button', { class: 'btn small ghost', type: 'button', onclick: onClear }, 'Quitar') : null, extra || null)));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) onFile(f); });
    return dz;
  }

  function section(title, ...kids) {
    return h('section', { class: 'insp-section' }, h('h3', {}, ...(Array.isArray(title) ? title : [title])), ...kids);
  }

  Object.assign(V, { ICONS, icon, field, colorField, rangeRow, seg, switchRow, selectEl, ring, modal, closeModal, confirmDialog, dropzone, section, counterFor });
})(window.Vitrina);
