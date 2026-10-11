/* Vitrina · motor de dibujo: fondos, marcos de dispositivo, texto con resaltado,
   capturas para la tienda, gráfico destacado e ícono. Todo en Canvas 2D. */
(function (V) {
  'use strict';
  const { Color, clamp } = V;

  /* ───────── Temas listos para usar ───────── */
  const THEMES = {
    bosque: { label: 'Bosque', bgType: 'mesh', c1: '#0f3d2e', c2: '#1d7a55', c3: '#9be3b9', text: '#ffffff', accent: '#ffd166', badgeBg: '#ffd166', frameColor: '#111412' },
    medianoche: { label: 'Medianoche', bgType: 'mesh', c1: '#0b1026', c2: '#3a2d8f', c3: '#00c2ff', text: '#ffffff', accent: '#7cf4ff', badgeBg: '#7cf4ff', frameColor: '#0a0a0f' },
    coral: { label: 'Coral', bgType: 'linear', c1: '#ff7a59', c2: '#ffb36b', c3: '#fff1e0', text: '#2b1208', accent: '#ffffff', badgeBg: '#2b1208', frameColor: '#2b1208' },
    arena: { label: 'Arena', bgType: 'solid', c1: '#f1e8d8', c2: '#e5d6bd', c3: '#c9a46c', text: '#2a2118', accent: '#b4532a', badgeBg: '#2a2118', frameColor: '#2a2118' },
    lavanda: { label: 'Lavanda', bgType: 'radial', c1: '#efe9ff', c2: '#c9b8ff', c3: '#6f4bd8', text: '#22164a', accent: '#6f4bd8', badgeBg: '#6f4bd8', frameColor: '#1b1437' },
    grafito: { label: 'Grafito', bgType: 'linear', c1: '#1b1d20', c2: '#2c3036', c3: '#ff5d3a', text: '#f4f4f2', accent: '#ff5d3a', badgeBg: '#ff5d3a', frameColor: '#000000' },
    menta: { label: 'Menta', bgType: 'split', c1: '#dff6ec', c2: '#9fe0c4', c3: '#0b6e4f', text: '#0b2a20', accent: '#0b6e4f', badgeBg: '#0b6e4f', frameColor: '#0b2a20' },
    oaxaca: { label: 'Oaxaca', bgType: 'mesh', c1: '#b3203a', c2: '#f2a541', c3: '#e86a92', text: '#fff8ec', accent: '#2a1b10', badgeBg: '#1f3b70', frameColor: '#2a1b10' },
    oceano: { label: 'Océano', bgType: 'linear', c1: '#03213a', c2: '#0a6b8f', c3: '#90e0ef', text: '#ffffff', accent: '#ffd166', badgeBg: '#ffd166', frameColor: '#020d18' },
    papel: { label: 'Papel', bgType: 'solid', c1: '#fafaf7', c2: '#efefe9', c3: '#111111', text: '#111111', accent: '#e63946', badgeBg: '#111111', frameColor: '#111111' },
  };

  const TARGETS = {
    phone: { label: 'Teléfono', w: 1080, h: 1920, kind: 'phone', folder: 'phoneScreenshots' },
    tablet7: { label: 'Tablet 7"', w: 1440, h: 2560, kind: 'tablet', folder: 'sevenInchScreenshots' },
    tablet10: { label: 'Tablet 10"', w: 2160, h: 3840, kind: 'tablet', folder: 'tenInchScreenshots' },
  };

  /* ───────── Azar determinista para fondos ───────── */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, r)); else ctx.rect(x, y, w, h); }

  /* ───────── Fondo ─────────
     offset/total permiten pintar una franja de un fondo panorámico continuo. */
  function paintBackground(ctx, W, H, t, offset = 0, total = 1, seed = 'v') {
    const PW = W * total; // ancho del panorama completo
    ctx.save();
    ctx.translate(-offset * W, 0);
    switch (t.bgType) {
      case 'solid': ctx.fillStyle = t.c1; ctx.fillRect(0, 0, PW, H); break;
      case 'linear': {
        const g = ctx.createLinearGradient(0, 0, PW * (total > 1 ? 1 : 0.35), H);
        g.addColorStop(0, t.c1); g.addColorStop(1, t.c2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, PW, H); break;
      }
      case 'radial': {
        ctx.fillStyle = t.c1; ctx.fillRect(0, 0, PW, H);
        for (let i = 0; i < total; i++) {
          const g = ctx.createRadialGradient(W * (i + 0.5), H * 0.72, 0, W * (i + 0.5), H * 0.72, H * 0.75);
          g.addColorStop(0, t.c2); g.addColorStop(1, Color.rgba(t.c2, 0));
          ctx.fillStyle = g; ctx.fillRect(W * i, 0, W, H);
        }
        break;
      }
      case 'split': {
        ctx.fillStyle = t.c1; ctx.fillRect(0, 0, PW, H);
        ctx.fillStyle = t.c2;
        ctx.beginPath(); ctx.moveTo(0, H * 0.62);
        for (let x = 0; x <= PW; x += W / 8) ctx.lineTo(x, H * 0.55 + Math.sin(x / W * Math.PI * 1.3) * H * 0.06);
        ctx.lineTo(PW, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
        break;
      }
      default: { // mesh: manchas grandes y difusas
        ctx.fillStyle = t.c1; ctx.fillRect(0, 0, PW, H);
        const r = rng(hash(seed + t.c1 + t.c2 + t.c3));
        const blobs = 3 + total * 2;
        for (let i = 0; i < blobs; i++) {
          const x = r() * PW, y = r() * H, rad = H * (0.35 + r() * 0.4);
          const col = i % 2 ? t.c3 : t.c2;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, Color.rgba(col, 0.85)); g.addColorStop(1, Color.rgba(col, 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, PW, H);
        }
      }
    }
    // patrones
    if (t.pattern && t.pattern !== 'none') {
      const col = Color.rgba(t.text, 0.09);
      const step = W * 0.045;
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, W * 0.002);
      if (t.pattern === 'dots') for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < PW; x += step) { ctx.beginPath(); ctx.arc(x, y, W * 0.0035, 0, Math.PI * 2); ctx.fill(); }
      if (t.pattern === 'grid') { ctx.beginPath(); for (let x = 0; x < PW; x += step * 1.5) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y < H; y += step * 1.5) { ctx.moveTo(0, y); ctx.lineTo(PW, y); } ctx.stroke(); }
      if (t.pattern === 'lines') { ctx.beginPath(); for (let x = -H; x < PW; x += step) { ctx.moveTo(x, H); ctx.lineTo(x + H, 0); } ctx.stroke(); }
      if (t.pattern === 'rings') { for (let i = 0; i < total; i++) for (let k = 1; k < 14; k++) { ctx.beginPath(); ctx.arc(W * (i + 0.5), H * 0.7, k * step * 1.4, 0, Math.PI * 2); ctx.stroke(); } }
    }
    ctx.restore();
    if (t.noise > 0) grain(ctx, W, H, t.noise, seed);
  }

  const grainTiles = new Map();
  function grain(ctx, W, H, amount, seed) {
    let tile = grainTiles.get('g');
    if (!tile) {
      tile = document.createElement('canvas'); tile.width = tile.height = 200;
      const x = tile.getContext('2d'); const img = x.createImageData(200, 200); const r = rng(42);
      for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0); grainTiles.set('g', tile);
    }
    ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
    const p = ctx.createPattern(tile, 'repeat'); p.setTransform(new DOMMatrix().scale(Math.max(1, W / 1080)));
    ctx.fillStyle = p; ctx.fillRect(0, 0, W, H); ctx.restore();
    void seed;
  }

  /* ───────── Texto con *resaltado* ─────────
     Las palabras entre asteriscos usan el color de acento. Devuelve la altura usada. */
  function tokenize(text) {
    const out = [];
    let hl = false;
    for (const part of String(text || '').split('*')) {
      for (const w of part.split(/(\s+)/)) if (w) out.push({ w, hl });
      hl = !hl;
    }
    return out;
  }
  function layoutText(ctx, text, maxW, size, font, weight) {
    ctx.font = `${weight} ${size}px "${font}", system-ui, sans-serif`;
    const lines = [];
    const forced = String(text || '').split('\n');
    for (const para of forced) {
      const toks = tokenize(para);
      let line = [], lw = 0;
      for (const tk of toks) {
        const isSpace = /^\s+$/.test(tk.w);
        const w = ctx.measureText(tk.w).width;
        if (!isSpace && lw + w > maxW && line.length) {
          while (line.length && /^\s+$/.test(line[line.length - 1].w)) { lw -= line[line.length - 1].width; line.pop(); }
          lines.push({ toks: line, width: lw }); line = []; lw = 0;
        }
        if (isSpace && !line.length) continue;
        line.push({ ...tk, width: w }); lw += w;
      }
      while (line.length && /^\s+$/.test(line[line.length - 1].w)) { lw -= line[line.length - 1].width; line.pop(); }
      lines.push({ toks: line, width: lw });
    }
    return lines;
  }
  function drawText(ctx, text, x, y, maxW, o) {
    const { size, font, weight, color, accent, align = 'center', lh = 1.08, highlight = 'color' } = o;
    const lines = layoutText(ctx, text, maxW, size, font, weight);
    ctx.font = `${weight} ${size}px "${font}", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    let cy = y + size * 0.86;
    for (const ln of lines) {
      let cx = align === 'center' ? x + (maxW - ln.width) / 2 : align === 'right' ? x + maxW - ln.width : x;
      for (const tk of ln.toks) {
        if (tk.hl && highlight === 'marker' && !/^\s+$/.test(tk.w)) {
          ctx.fillStyle = accent; rr(ctx, cx - size * 0.08, cy - size * 0.82, tk.width + size * 0.16, size * 1.02, size * 0.16); ctx.fill();
          ctx.fillStyle = Color.readableOn(accent);
        } else ctx.fillStyle = tk.hl ? accent : color;
        ctx.textAlign = 'left';
        ctx.fillText(tk.w, cx, cy);
        cx += tk.width;
      }
      cy += size * lh;
    }
    return { height: lines.length * size * lh, lines: lines.length };
  }
  function measureText(ctx, text, maxW, size, font, weight, lh = 1.08) {
    return layoutText(ctx, text, maxW, size, font, weight).length * size * lh;
  }
  function badge(ctx, text, cx, y, size, bg, font, align, x0, maxW) {
    if (!text) return 0;
    ctx.font = `700 ${size}px "${font}", system-ui, sans-serif`;
    const tw = ctx.measureText(text.toUpperCase()).width;
    const pw = tw + size * 1.6, ph = size * 1.9;
    const bx = align === 'left' ? x0 : align === 'right' ? x0 + maxW - pw : cx - pw / 2;
    ctx.fillStyle = bg; rr(ctx, bx, y, pw, ph, ph / 2); ctx.fill();
    ctx.fillStyle = Color.readableOn(bg); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.font = `700 ${size}px "${font}", system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.08}px`;
    ctx.fillText(text.toUpperCase(), bx + size * 0.8, y + ph / 2 + size * 0.04); ctx.restore();
    return ph;
  }

  /* ───────── Dispositivo genérico ───────── */
  function screenSource(slide, which, accent) {
    const src = which === 2 ? slide.img2 : slide.img;
    if (src && src.startsWith('sample:')) return V.sampleScreen(src.slice(7), accent);
    if (src) return V.imageNow(src, () => V.requestRedraw && V.requestRedraw());
    if (which === 1) return V.sampleScreen(slide.sample || 'hoy', accent);
    return null;
  }

  /* Dibuja un dispositivo centrado en (cx, cy) con ancho dw. */
  function drawDevice(ctx, img, cx, cy, dw, t, o = {}) {
    const kind = o.kind || 'phone';
    const style = t.frame || 'modern';
    const ratio = img ? clamp(img.width / img.height, kind === 'tablet' ? 0.55 : 0.4, kind === 'tablet' ? 0.82 : 0.75) : (kind === 'tablet' ? 0.62 : 9 / 19.5);
    const bez = style === 'flat' ? 0 : style === 'outline' ? dw * 0.012 : style === 'clay' ? dw * 0.06 : kind === 'tablet' ? dw * 0.045 : dw * 0.032;
    const sw = dw - bez * 2, sh = sw / ratio;
    const dh = sh + bez * 2;
    const R = kind === 'tablet' ? dw * 0.06 : dw * 0.135;
    const sR = Math.max(4, R - bez * 0.9);
    ctx.save();
    ctx.translate(cx, cy);
    if (o.rotate) ctx.rotate((o.rotate * Math.PI) / 180);
    const x = -dw / 2, y = -dh / 2;
    // sombra
    if (t.shadow > 0) {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${0.55 * t.shadow})`;
      ctx.shadowBlur = dw * 0.12 * t.shadow; ctx.shadowOffsetY = dw * 0.05 * t.shadow;
      ctx.fillStyle = style === 'clay' ? '#ffffff' : t.frameColor;
      rr(ctx, x, y, dw, dh, R); ctx.fill();
      ctx.restore();
    }
    if (style !== 'flat') {
      // botones laterales
      if (kind === 'phone' && style !== 'outline') {
        ctx.fillStyle = style === 'clay' ? '#e8e8e4' : Color.mix(t.frameColor, '#888888', 0.25);
        rr(ctx, x + dw - dw * 0.004, y + dh * 0.2, dw * 0.018, dh * 0.08, dw * 0.008); ctx.fill();
        rr(ctx, x + dw - dw * 0.004, y + dh * 0.31, dw * 0.018, dh * 0.12, dw * 0.008); ctx.fill();
      }
      ctx.fillStyle = style === 'clay' ? '#f4f3ef' : style === 'outline' ? 'rgba(0,0,0,0)' : t.frameColor;
      rr(ctx, x, y, dw, dh, R); ctx.fill();
      if (style === 'modern') {
        // filo metálico
        ctx.strokeStyle = Color.rgba('#ffffff', 0.14); ctx.lineWidth = Math.max(1, dw * 0.004);
        rr(ctx, x + dw * 0.004, y + dw * 0.004, dw - dw * 0.008, dh - dw * 0.008, R - dw * 0.004); ctx.stroke();
      }
      if (style === 'outline') { ctx.strokeStyle = t.text; ctx.lineWidth = dw * 0.01; rr(ctx, x, y, dw, dh, R); ctx.stroke(); }
    }
    // pantalla
    ctx.save();
    rr(ctx, x + bez, y + bez, sw, sh, sR); ctx.clip();
    if (img) {
      const ir = img.width / img.height, sr = sw / sh;
      let dw2 = sw, dh2 = sh, ox = 0, oy = 0;
      if (ir > sr) { dw2 = sh * ir; ox = (sw - dw2) / 2; } else { dh2 = sw / ir; oy = (sh - dh2) / 2; }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x + bez + ox, y + bez + oy, dw2, dh2);
    } else {
      ctx.fillStyle = Color.mix(t.c1, '#ffffff', 0.85); ctx.fillRect(x + bez, y + bez, sw, sh);
      ctx.fillStyle = Color.rgba('#000000', 0.35); ctx.font = `600 ${sw * 0.06}px Onest, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Sube tu captura', 0, 0);
    }
    ctx.restore();
    // cámara perforada
    if (kind === 'phone' && style !== 'flat' && o.camera !== false) {
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(0, y + bez + sw * 0.045, sw * 0.022, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return { w: dw, h: dh };
  }
  function deviceHeight(img, dw, t, kind = 'phone') {
    const style = t.frame || 'modern';
    const ratio = img ? clamp(img.width / img.height, kind === 'tablet' ? 0.55 : 0.4, kind === 'tablet' ? 0.82 : 0.75) : (kind === 'tablet' ? 0.62 : 9 / 19.5);
    const bez = style === 'flat' ? 0 : style === 'outline' ? dw * 0.012 : style === 'clay' ? dw * 0.06 : kind === 'tablet' ? dw * 0.045 : dw * 0.032;
    return (dw - bez * 2) / ratio + bez * 2;
  }

  /* ───────── Captura de tienda ───────── */
  function slideText(slide, locale, fallback) {
    const t = (slide.text && (slide.text[locale] || slide.text[fallback])) || {};
    return { h: t.h || '', s: t.s || '', badge: t.badge || '' };
  }

  function renderSlide(canvas, project, index, locale, targetKey = 'phone', scale = 1) {
    const T = TARGETS[targetKey];
    const W = Math.round(T.w * scale), H = Math.round(T.h * scale);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const t = project.theme;
    const slide = project.slides[index];
    const n = project.slides.length;
    const font = t.font || 'Bricolage Grotesque';
    const wB = V.fontWeight(font, true), wR = V.fontWeight(font, false);
    V.ensureFont(font, wB, () => V.requestRedraw && V.requestRedraw());
    V.ensureFont(font, wR, () => V.requestRedraw && V.requestRedraw());
    const bgTheme = slide.bg ? { ...t, ...slide.bg } : t;
    paintBackground(ctx, W, H, bgTheme, t.panorama && !slide.bg ? index : 0, t.panorama && !slide.bg ? n : 1, project.id);

    const txt = slideText(slide, locale, project.defaultLocale);
    const pad = W * 0.08;
    const maxW = W - pad * 2;
    const isTab = T.kind === 'tablet';
    const hs = W * (isTab ? 0.072 : 0.088) * (t.headSize || 1);
    const ss = W * (isTab ? 0.036 : 0.044) * (t.subSize || 1);
    const bs = W * 0.03;
    const align = t.align || 'center';
    const top = t.textPos !== 'bottom';
    const img1 = screenSource(slide, 1, t.accent);
    const layout = slide.layout || 'device';
    const textOpts = { size: hs, font, weight: wB, color: t.text, accent: t.accent, align, highlight: t.highlight || 'color' };

    const textBlock = (y0) => {
      let y = y0;
      if (txt.badge) { y += badge(ctx, txt.badge, W / 2, y, bs, t.badgeBg || t.accent, font, align, pad, maxW) + hs * 0.35; }
      y += drawText(ctx, txt.h, pad, y, maxW, textOpts).height;
      if (txt.s) { y += ss * 0.55; y += drawText(ctx, txt.s, pad, y, maxW, { size: ss, font, weight: wR, color: Color.rgba(t.text, 0.82), accent: t.accent, align, lh: 1.25 }).height; }
      return y;
    };
    const textHeight = () => {
      let hgt = 0;
      if (txt.badge) hgt += bs * 1.9 + hs * 0.35;
      hgt += measureText(ctx, txt.h, maxW, hs, font, wB);
      if (txt.s) hgt += ss * 0.55 + measureText(ctx, txt.s, maxW, ss, font, wR, 1.25);
      return hgt;
    };
    const dwBase = W * (isTab ? 0.78 : 0.66) * (t.deviceScale || 0.8) / 0.8;
    const kind = T.kind;

    if (layout === 'full') {
      if (img1) {
        const ir = img1.width / img1.height, cr = W / H;
        let dw = W, dh = H, ox = 0, oy = 0;
        if (ir > cr) { dw = H * ir; ox = (W - dw) / 2; } else { dh = W / ir; oy = (H - dh) / 2; }
        ctx.drawImage(img1, ox, oy, dw, dh);
      }
      const th = textHeight() + H * 0.14;
      const g = ctx.createLinearGradient(0, top ? 0 : H, 0, top ? th : H - th);
      g.addColorStop(0, Color.rgba(t.c1, 0.96)); g.addColorStop(1, Color.rgba(t.c1, 0));
      ctx.fillStyle = g; ctx.fillRect(0, top ? 0 : H - th * 1.2, W, th * 1.2);
      textBlock(top ? H * 0.07 : H - textHeight() - H * 0.07);
      return canvas;
    }

    if (layout === 'hero') {
      const iconSize = W * 0.2;
      const ic = document.createElement('canvas');
      renderIcon(ic, project.icon, Math.round(iconSize), { mask: 'squircle' });
      let y = H * 0.09;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = iconSize * 0.15; ctx.shadowOffsetY = iconSize * 0.05;
      const ix = align === 'left' ? pad : align === 'right' ? W - pad - iconSize : (W - iconSize) / 2;
      ctx.drawImage(ic, ix, y, iconSize, iconSize); ctx.restore();
      y += iconSize + H * 0.035;
      const big = { ...textOpts, size: hs * 1.12 };
      if (txt.badge) { y += badge(ctx, txt.badge, W / 2, y, bs, t.badgeBg || t.accent, font, align, pad, maxW) + hs * 0.35; }
      y += drawText(ctx, txt.h, pad, y, maxW, big).height;
      if (txt.s) { y += ss * 0.55; y += drawText(ctx, txt.s, pad, y, maxW, { size: ss, font, weight: wR, color: Color.rgba(t.text, 0.82), accent: t.accent, align, lh: 1.25 }).height; }
      // estrellas
      y += ss * 0.9;
      ctx.fillStyle = t.accent; ctx.font = `${ss * 1.2}px system-ui, sans-serif`; ctx.textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center'; ctx.textBaseline = 'top';
      ctx.fillText('★★★★★', align === 'left' ? pad : align === 'right' ? W - pad : W / 2, y);
      const dw = dwBase * 0.92;
      const devTop = Math.max(y + ss * 3, H * 0.6);
      const dh = deviceHeight(img1, dw, t, kind);
      drawDevice(ctx, img1, W / 2, devTop + dh / 2, dw, t, { kind });
      return canvas;
    }

    const th = textHeight();
    const textY = top ? H * 0.065 : H - th - H * 0.06;
    const gap = H * 0.04;
    const areaTop = top ? textY + th + gap : H * 0.04;
    const areaBot = top ? H : textY - gap;

    if (layout === 'duo') {
      const img2 = screenSource(slide, 2, t.accent) || screenSource(project.slides[(index + 1) % n], 1, t.accent);
      const dw = dwBase * 0.84;
      const dh = deviceHeight(img1, dw, t, kind);
      const cy = top ? areaTop + dh / 2 + H * 0.03 : areaBot - dh / 2 - H * 0.02;
      drawDevice(ctx, img2, W * 0.34, cy + H * 0.05, dw * 0.94, t, { kind, rotate: -7 });
      drawDevice(ctx, img1, W * 0.64, cy, dw, t, { kind, rotate: 5 });
    } else if (layout === 'bleed') {
      const dw = dwBase * 1.3;
      const dh = deviceHeight(img1, dw, t, kind);
      const cy = top ? areaTop + dh / 2 : areaBot - dh / 2;
      drawDevice(ctx, img1, W / 2, cy, dw, t, { kind });
    } else {
      const dw = layout === 'tilt' ? dwBase * 1.04 : dwBase;
      const dh = deviceHeight(img1, dw, t, kind);
      const avail = areaBot - areaTop;
      let cy;
      if (dh <= avail) cy = areaTop + avail / 2 + (top ? avail * 0.04 : -avail * 0.04);
      else cy = top ? areaTop + dh / 2 : areaBot - dh / 2;
      const rot = layout === 'tilt' ? (t.tilt || -8) : (t.tilt || 0) * 0.3;
      drawDevice(ctx, img1, W / 2 + (layout === 'tilt' ? W * 0.03 : 0), cy + (layout === 'tilt' ? H * 0.02 : 0), dw, t, { kind, rotate: rot });
    }
    textBlock(textY);
    return canvas;
  }

  /* ───────── Gráfico destacado 1024×500 ───────── */
  function renderFeature(canvas, project, locale, scale = 1) {
    const W = Math.round(1024 * scale), H = Math.round(500 * scale);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const t = project.theme, f = project.feature;
    const font = t.font || 'Bricolage Grotesque';
    const wB = V.fontWeight(font, true), wR = V.fontWeight(font, false);
    V.ensureFont(font, wB, () => V.requestRedraw && V.requestRedraw());
    paintBackground(ctx, W, H, { ...t, noise: t.noise }, 0, 1, project.id + 'f');
    const L = project.listing[locale] || project.listing[project.defaultLocale] || {};
    const name = (L.title || project.name || '').split(/[:\-–|]/)[0].trim();
    const tagline = (f.tagline && (f.tagline[locale] || f.tagline[project.defaultLocale])) || '';
    const slide = project.slides[clamp(f.slide || 0, 0, project.slides.length - 1)] || project.slides[0];
    const img = slide ? screenSource(slide, 1, t.accent) : null;
    const ic = document.createElement('canvas');
    const iconPx = Math.round(H * 0.26);
    renderIcon(ic, project.icon, iconPx, { mask: 'squircle' });
    const shadowed = (fn) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = H * 0.05; ctx.shadowOffsetY = H * 0.015; fn(); ctx.restore(); };

    switch (f.layout) {
      case 'center': {
        shadowed(() => ctx.drawImage(ic, (W - iconPx) / 2, H * 0.14, iconPx, iconPx));
        drawText(ctx, name, W * 0.1, H * 0.47, W * 0.8, { size: H * 0.15, font, weight: wB, color: t.text, accent: t.accent, align: 'center' });
        drawText(ctx, tagline, W * 0.1, H * 0.66, W * 0.8, { size: H * 0.075, font, weight: wR, color: Color.rgba(t.text, 0.85), accent: t.accent, align: 'center' });
        break;
      }
      case 'showcase': {
        drawText(ctx, tagline || name, W * 0.06, H * 0.08, W * 0.88, { size: H * 0.11, font, weight: wB, color: t.text, accent: t.accent, align: 'center' });
        const dw = H * 0.44;
        const imgs = [0, 1, 2].map((k) => { const s = project.slides[(clamp(f.slide || 0, 0, 99) + k) % project.slides.length]; return s ? screenSource(s, 1, t.accent) : null; });
        drawDevice(ctx, imgs[1], W * 0.3, H * 0.92, dw * 0.9, t, { rotate: -10 });
        drawDevice(ctx, imgs[2], W * 0.7, H * 0.92, dw * 0.9, t, { rotate: 10 });
        drawDevice(ctx, imgs[0], W * 0.5, H * 0.86, dw, t, {});
        break;
      }
      case 'minimal': {
        drawText(ctx, tagline || name, W * 0.07, H * 0.24, W * 0.58, { size: H * 0.15, font, weight: wB, color: t.text, accent: t.accent, align: 'left', highlight: 'marker' });
        const big = Math.round(H * 0.5);
        const ic2 = document.createElement('canvas'); renderIcon(ic2, project.icon, big, { mask: 'squircle' });
        shadowed(() => ctx.drawImage(ic2, W * 0.72, (H - big) / 2, big, big));
        break;
      }
      default: { // split
        const x0 = W * 0.07;
        if (f.showIcon !== false) shadowed(() => ctx.drawImage(ic, x0, H * 0.17, iconPx, iconPx));
        const ty = f.showIcon !== false ? H * 0.5 : H * 0.28;
        const nh = drawText(ctx, name, x0, ty, W * 0.5, { size: H * 0.12, font, weight: wB, color: t.text, accent: t.accent, align: 'left' }).height;
        drawText(ctx, tagline, x0, ty + nh + H * 0.03, W * 0.48, { size: H * 0.07, font, weight: wR, color: Color.rgba(t.text, 0.86), accent: t.accent, align: 'left', lh: 1.2 });
        const dw = H * 0.5;
        drawDevice(ctx, img, W * 0.79, H * 0.86, dw, t, { rotate: -12 });
      }
    }
    return canvas;
  }

  /* ───────── Ícono ───────── */
  const SYMBOLS = {
    pulse: { d: 'M2 12h4l2-5 4 10 3-7 2 2h5', mode: 'stroke' },
    check: { d: 'M5 12.5l4.5 4.5L19 7.5', mode: 'stroke' },
    bolt: { d: 'M13.5 2 5 13.5h6L10 22l9-12h-6.2z', mode: 'fill' },
    leaf: { d: 'M5 19C5 10 10 5 20 4c0 10-5 15-14 15m0 0 6-6', mode: 'stroke' },
    star: { d: 'm12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z', mode: 'fill' },
    heart: { d: 'M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 9 2.6C21 15 12 20.5 12 20.5z', mode: 'fill' },
    drop: { d: 'M12 2.8S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.8 12 2.8z', mode: 'fill' },
    spark: { d: 'M12 2c.6 5.3 4.7 9.4 10 10-5.3.6-9.4 4.7-10 10-.6-5.3-4.7-9.4-10-10 5.3-.6 9.4-4.7 10-10z', mode: 'fill' },
    wave: { d: 'M2 9c3-3 5-3 7 0s4 3 7 0 4-3 6 0M2 15c3-3 5-3 7 0s4 3 7 0 4-3 6 0', mode: 'stroke' },
    ring: { d: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', mode: 'fill-evenodd' },
    chart: { d: 'M4 20V12h4v8zM10 20V5h4v15zM16 20v-6h4v6z', mode: 'fill' },
    bell: { d: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0', mode: 'stroke' },
    flame: { d: 'M12 22c4 0 7-2.8 7-7 0-5-4.5-7-5.5-12-2.5 2-3.5 5-3 7.5C9 9.5 8 8 8 6c-2 2-3 5-3 9 0 4.2 3 7 7 7z', mode: 'fill' },
    sun: { d: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1', mode: 'stroke' },
    moon: { d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5z', mode: 'fill' },
    note: { d: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3z', mode: 'stroke' },
    book: { d: 'M4 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4zM20 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z', mode: 'stroke' },
    camera: { d: 'M3 8h3.5L8 5.5h8L17.5 8H21v11H3zM12 10a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z', mode: 'stroke' },
    scan: { d: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16', mode: 'stroke' },
    wallet: { d: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3.5V7M16.5 13.5h.01', mode: 'stroke' },
    sound: { d: 'M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2', mode: 'stroke' },
    calendar: { d: 'M4 6h16v14H4zM4 10h16M9 3v5M15 3v5', mode: 'stroke' },
  };

  const MASKS = {
    square: (ctx, s) => ctx.rect(0, 0, s, s),
    rounded: (ctx, s) => rr(ctx, 0, 0, s, s, s * 0.2),
    circle: (ctx, s) => { ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); },
    squircle: (ctx, s) => {
      ctx.beginPath();
      const n = 5, r = s / 2;
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const c = Math.cos(a), sn = Math.sin(a);
        const x = r + r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = r + r * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    },
    teardrop: (ctx, s) => { ctx.beginPath(); ctx.moveTo(s / 2, 0); ctx.arcTo(s, 0, s, s / 2, s / 2); ctx.arcTo(s, s, s / 2, s, s / 2); ctx.arcTo(0, s, 0, s / 2, s / 2); ctx.arcTo(0, 0, s / 2, 0, s / 2); ctx.closePath(); },
  };

  function paintIconBg(ctx, ic, s) {
    switch (ic.bgType) {
      case 'solid': ctx.fillStyle = ic.bg1; ctx.fillRect(0, 0, s, s); break;
      case 'radial': {
        const g = ctx.createRadialGradient(s * 0.3, s * 0.25, 0, s * 0.5, s * 0.5, s * 0.8);
        g.addColorStop(0, ic.bg1); g.addColorStop(1, ic.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); break;
      }
      case 'mesh': {
        ctx.fillStyle = ic.bg2; ctx.fillRect(0, 0, s, s);
        [[0.2, 0.2, ic.bg1], [0.85, 0.75, Color.mix(ic.bg1, '#ffffff', 0.35)], [0.1, 0.9, ic.bg1]].forEach(([x, y, c]) => {
          const g = ctx.createRadialGradient(s * x, s * y, 0, s * x, s * y, s * 0.7); g.addColorStop(0, Color.rgba(c, 0.95)); g.addColorStop(1, Color.rgba(c, 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
        });
        break;
      }
      case 'transparent': break;
      default: {
        const g = ctx.createLinearGradient(0, 0, s, s);
        g.addColorStop(0, ic.bg1); g.addColorStop(1, ic.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      }
    }
  }

  /* Dibuja sólo la figura del primer plano en un lienzo transparente de lado s. */
  function paintIconFg(ctx, ic, s, k = 1) {
    const box = s * (ic.scale || 0.6) * k;
    ctx.save();
    ctx.translate(s / 2, s / 2);
    if (ic.rotate) ctx.rotate((ic.rotate * Math.PI) / 180);
    if (ic.mode === 'image' && ic.img) {
      const img = V.imageNow(ic.img, () => V.requestRedraw && V.requestRedraw());
      if (img) {
        const r = img.width / img.height;
        const w = r >= 1 ? box : box * r, hh = r >= 1 ? box / r : box;
        ctx.drawImage(img, -w / 2, -hh / 2, w, hh);
      }
    } else if (ic.mode === 'symbol') {
      const sym = SYMBOLS[ic.symbol] || SYMBOLS.pulse;
      const p = new Path2D(sym.d);
      const sc = box / 24;
      ctx.scale(sc, sc); ctx.translate(-12, -12);
      ctx.fillStyle = ic.fg; ctx.strokeStyle = ic.fg; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (sym.mode === 'stroke') ctx.stroke(p); else ctx.fill(p, sym.mode === 'fill-evenodd' ? 'evenodd' : 'nonzero');
    } else {
      const font = ic.font || 'Bricolage Grotesque';
      const wt = V.fontWeight(font, true);
      V.ensureFont(font, wt, () => V.requestRedraw && V.requestRedraw());
      const text = (ic.glyph || 'A').slice(0, 3);
      let size = box * (text.length > 1 ? 0.95 / Math.sqrt(text.length) : 1.15);
      ctx.font = `${wt} ${size}px "${font}", system-ui, sans-serif`;
      const m = ctx.measureText(text);
      if (m.width > box * 1.05) { size *= (box * 1.05) / m.width; ctx.font = `${wt} ${size}px "${font}", system-ui, sans-serif`; }
      const m2 = ctx.measureText(text);
      const asc = m2.actualBoundingBoxAscent || size * 0.72, desc = m2.actualBoundingBoxDescent || 0;
      ctx.fillStyle = ic.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 0, (asc - desc) / 2);
    }
    ctx.restore();
  }

  /* opts: { mask, part: 'full'|'fg'|'bg', fgScale, plain } */
  function renderIcon(canvas, ic, size, opts = {}) {
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const s = size;
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    if (opts.mask && MASKS[opts.mask]) { MASKS[opts.mask](ctx, s); ctx.clip(); }
    if (opts.part !== 'fg') paintIconBg(ctx, ic, s);
    if (opts.part !== 'bg') {
      // capa del primer plano en un lienzo aparte para sombras
      const fg = document.createElement('canvas'); fg.width = fg.height = s;
      paintIconFg(fg.getContext('2d'), ic, s, opts.fgScale || 1);
      if (ic.longShadow && opts.part !== 'fg') {
        const sh = document.createElement('canvas'); sh.width = sh.height = s;
        const sx = sh.getContext('2d'); sx.drawImage(fg, 0, 0); sx.globalCompositeOperation = 'source-in';
        sx.fillStyle = 'rgba(0,0,0,0.22)'; sx.fillRect(0, 0, s, s);
        for (let i = 1; i < s * 0.5; i += Math.max(1, s / 256)) ctx.drawImage(sh, i, i);
      }
      if (ic.shadow > 0) { ctx.shadowColor = `rgba(0,0,0,${0.45 * ic.shadow})`; ctx.shadowBlur = s * 0.06 * ic.shadow; ctx.shadowOffsetY = s * 0.025 * ic.shadow; }
      ctx.drawImage(fg, 0, 0);
    }
    ctx.restore();
    return canvas;
  }

  Object.assign(V, { THEMES, TARGETS, SYMBOLS, MASKS, paintBackground, drawDevice, drawText, renderSlide, renderFeature, renderIcon, slideText, rr });
})(window.Vitrina);
