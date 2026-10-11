/* Vitrina · utilidades compartidas: DOM, color, almacenamiento, descargas, fuentes. */
(function (global) {
  'use strict';
  const V = (global.Vitrina = global.Vitrina || {});

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  function h(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (k === 'checked' || k === 'selected' || k === 'disabled') e[k] = !!v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
    return e;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const slug = (s) => String(s || 'app').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ───────── Color ───────── */
  const Color = {
    rgb(hex) {
      let x = String(hex || '#000').replace('#', '');
      if (x.length === 3) x = x.split('').map((c) => c + c).join('');
      const n = parseInt(x.slice(0, 6), 16) || 0;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    hex(r, g, b) { const c = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); },
    mix(a, b, t) { const A = Color.rgb(a), B = Color.rgb(b); return Color.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); },
    rgba(hex, a) { const [r, g, b] = Color.rgb(hex); return `rgba(${r},${g},${b},${a})`; },
    lum(hex) {
      const [r, g, b] = Color.rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },
    contrast(a, b) { const x = Color.lum(a), y = Color.lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); },
    hsl(hex) {
      let [r, g, b] = Color.rgb(hex).map((v) => v / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let hh = 0, s = 0; const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60;
      }
      return [hh, s, l];
    },
    fromHsl(hh, s, l) {
      hh = ((hh % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
      const k = (n) => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Color.hex(255 * f(0), 255 * f(8), 255 * f(4));
    },
    readableOn(bg) { return Color.lum(bg) > 0.42 ? '#111613' : '#ffffff'; },
    /* Colores dominantes de una imagen (para sugerir temas a partir del ícono o capturas) */
    dominant(img, k = 4) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 64, 64);
      const d = x.getImageData(0, 0, 64, 64).data;
      const buckets = new Map();
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
        const b = buckets.get(key) || [0, 0, 0, 0];
        b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; buckets.set(key, b);
      }
      const arr = [...buckets.values()].sort((a, b) => b[3] - a[3]).map((b) => Color.hex(b[0] / b[3], b[1] / b[3], b[2] / b[3]));
      const out = [];
      for (const c0 of arr) {
        if (out.every((o) => { const A = Color.rgb(o), B = Color.rgb(c0); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) > 60; })) out.push(c0);
        if (out.length >= k) break;
      }
      return out;
    },
  };

  /* ───────── Almacenamiento (IndexedDB con respaldo en memoria) ───────── */
  const DB_NAME = 'vitrina', STORE = 'projects';
  let dbp = null;
  const mem = new Map();
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
    return dbp;
  }
  const Store = {
    persistent: true,
    async all() {
      const d = await db();
      if (!d) { Store.persistent = false; return [...mem.values()]; }
      return new Promise((res) => {
        try {
          const r = d.transaction(STORE).objectStore(STORE).getAll();
          r.onsuccess = () => res(r.result || []); r.onerror = () => res([...mem.values()]);
        } catch { res([...mem.values()]); }
      });
    },
    async put(p) {
      mem.set(p.id, p);
      const d = await db();
      if (!d) { Store.persistent = false; return false; }
      return new Promise((res) => {
        try {
          const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(p);
          tx.oncomplete = () => res(true); tx.onerror = () => res(false);
        } catch { res(false); }
      });
    },
    async del(id) {
      mem.delete(id);
      const d = await db();
      if (!d) return;
      return new Promise((res) => {
        try { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch { res(false); }
      });
    },
  };
  const prefs = {
    get(k, f) { try { const v = localStorage.getItem('vitrina.' + k); return v == null ? f : JSON.parse(v); } catch { return f; } },
    set(k, v) { try { localStorage.setItem('vitrina.' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };

  /* ───────── Imágenes ───────── */
  const imgCache = new Map();
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    imgCache.set(src, p);
    return p;
  }
  /* Versión síncrona: devuelve la imagen si ya cargó (o null y la pide). */
  const ready = new Map();
  function imageNow(src, onLoad) {
    if (!src) return null;
    if (ready.has(src)) return ready.get(src);
    loadImage(src).then((i) => { if (i) { ready.set(src, i); onLoad && onLoad(); } });
    return null;
  }
  function readFile(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  /* Reduce imágenes enormes antes de guardarlas para no llenar el almacenamiento. */
  async function fileToDataURL(file, maxSide = 2600) {
    const url = await readFile(file);
    const img = await loadImage(url);
    if (!img) throw new Error('imagen no válida');
    const k = Math.min(1, maxSide / Math.max(img.width, img.height));
    if (k === 1 && file.size < 2.5e6) return url;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
  }

  /* ───────── Descargas, portapapeles y avisos ───────── */
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const canvasBlob = (c, type = 'image/png', q = 0.92) => new Promise((res) => c.toBlob(res, type, q));
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  let toastT;
  function toast(msg, kind = '') {
    let t = $('#toast');
    if (!t) { t = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
    t.textContent = msg; t.className = 'toast show ' + kind;
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast ' + kind), 2600);
  }

  /* ───────── Fuentes para los textos de las capturas ───────── */
  const FONTS = [
    { name: 'Bricolage Grotesque', label: 'Bricolage', weights: [600, 800] },
    { name: 'Onest', label: 'Onest', weights: [500, 700] },
    { name: 'Sora', label: 'Sora', weights: [600, 800] },
    { name: 'Fraunces', label: 'Fraunces', weights: [600, 800] },
    { name: 'DM Serif Display', label: 'DM Serif', weights: [400] },
    { name: 'Archivo Black', label: 'Archivo Black', weights: [400] },
    { name: 'Nunito', label: 'Nunito', weights: [700, 900] },
    { name: 'Unbounded', label: 'Unbounded', weights: [600, 800] },
    { name: 'Instrument Serif', label: 'Instrument', weights: [400] },
    { name: 'Rubik', label: 'Rubik', weights: [600, 800] },
  ];
  const fontReady = new Set();
  function ensureFont(name, weight, onLoad) {
    const key = name + weight;
    if (fontReady.has(key) || !document.fonts || !document.fonts.load) return true;
    document.fonts.load(`${weight} 40px "${name}"`).then((r) => { fontReady.add(key); if (r && r.length) onLoad && onLoad(); }).catch(() => fontReady.add(key));
    return false;
  }
  const fontWeight = (name, bold = true) => { const f = FONTS.find((x) => x.name === name) || FONTS[0]; return bold ? f.weights[f.weights.length - 1] : f.weights[0]; };

  Object.assign(V, { $, $$, h, uid, clone, clamp, slug, debounce, Color, Store, prefs, loadImage, imageNow, fileToDataURL, download, canvasBlob, copyText, toast, FONTS, ensureFont, fontWeight });
})(window);
