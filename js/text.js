/* Vitrina · textos de la ficha: idiomas, límites, revisión de políticas, palabras clave
   y generador de notas de versión. */
(function (V) {
  'use strict';

  const LOCALES = {
    'es-419': 'Español (Latinoamérica)', 'es-ES': 'Español (España)', 'es-US': 'Español (EE. UU.)',
    'en-US': 'Inglés (EE. UU.)', 'en-GB': 'Inglés (Reino Unido)', 'pt-BR': 'Portugués (Brasil)', 'pt-PT': 'Portugués (Portugal)',
    'fr-FR': 'Francés', 'de-DE': 'Alemán', 'it-IT': 'Italiano', 'nl-NL': 'Neerlandés', 'pl-PL': 'Polaco', 'tr-TR': 'Turco',
    'ru-RU': 'Ruso', 'ja-JP': 'Japonés', 'ko-KR': 'Coreano', 'zh-CN': 'Chino simplificado', 'zh-TW': 'Chino tradicional',
    'hi-IN': 'Hindi', 'id': 'Indonesio', 'ar': 'Árabe',
  };
  const LIMITS = { title: 30, short: 80, full: 4000, notes: 500 };
  const CATEGORIES = ['Arte y diseño', 'Salud y bienestar', 'Comunicación', 'Educación', 'Entretenimiento', 'Estilo de vida', 'Finanzas', 'Fotografía', 'Herramientas', 'Libros y referencias', 'Mapas y navegación', 'Música y audio', 'Noticias y revistas', 'Personalización', 'Productividad', 'Reproductores y editores de video', 'Viajes y guías', 'Clima', 'Compras', 'Comida y bebida', 'Deportes', 'Empresa', 'Social', 'Juegos'];

  /* Términos que la política de la tienda desaconseja en título, ícono o descripción corta
     (rendimiento, ranking, precio o promociones). */
  const PROMO = {
    es: ['mejor', 'número 1', 'n.º 1', 'nº1', '#1', 'top', 'gratis', 'descuento', 'oferta', 'promoción', 'rebaja', 'app del año', 'más descargada', 'nuevo', 'millones de usuarios'],
    en: ['best', 'number one', 'no. 1', '#1', 'top', 'free', 'discount', 'sale', 'deal', 'promo', 'app of the year', 'most downloaded', 'new', 'million users'],
    pt: ['melhor', 'grátis', 'desconto', 'promoção', 'top', 'novo', '#1'],
    fr: ['meilleur', 'gratuit', 'réduction', 'promo', 'top', 'nouveau', '#1'],
    de: ['beste', 'kostenlos', 'rabatt', 'angebot', 'top', 'neu', '#1'],
  };
  const OTHER_STORES = ['app store', 'ios', 'iphone', 'ipad', 'apple'];
  const STOP = new Set(('a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era es esa ese eso esta este esto estos fue ha hay la las le les lo los mas más me mi mis muy no nos o otra otro para pero poco por que qué quien se sea sin sobre su sus también te tiene todo tu tus un una uno unos y ya yo cada sí puedes puede tú '
    + 'the and for with you your are this that from can our all any have has not but will into out about more when what which who how its it is to of in on at by as or be an we us so if do no up').split(' '));

  const lang = (loc) => (loc || 'es').slice(0, 2);
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
  const stripTags = (s) => String(s || '').replace(/<\/?(b|i|u|br)\s*\/?>/gi, '');

  /* Revisa una ficha y devuelve avisos: { level: 'error'|'warn'|'tip', field, msg } */
  function lint(project, loc) {
    const L = project.listing[loc] || {};
    const out = [];
    const add = (level, field, msg) => out.push({ level, field, msg });
    const title = L.title || '', short = L.short || '', full = L.full || '';
    const lg = lang(loc);
    const promo = PROMO[lg] || PROMO.en;
    const hasTerm = (text, term) => new RegExp(`(^|[^\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu').test(text);

    if (!title.trim()) add('error', 'title', 'Falta el nombre de la app.');
    if (title.length > LIMITS.title) add('error', 'title', `El nombre supera ${LIMITS.title} caracteres (${title.length}).`);
    if (emojiRe.test(title)) add('error', 'title', 'Quita los emojis del nombre de la app.');
    promo.forEach((t) => { if (hasTerm(title, t)) add('warn', 'title', `“${t}” en el nombre suele rechazarse: evita ranking, precio o promociones.`); });
    if (/[!?]{2,}/.test(title)) add('warn', 'title', 'Evita signos repetidos en el nombre.');
    if (/\b[A-ZÁÉÍÓÚÑ]{4,}\b/.test(title) && title !== title.toUpperCase()) add('warn', 'title', 'Hay palabras en mayúsculas sostenidas en el nombre; sólo se permiten si son parte de la marca.');

    if (!short.trim()) add('error', 'short', 'Falta la descripción breve.');
    if (short.length > LIMITS.short) add('error', 'short', `La descripción breve supera ${LIMITS.short} caracteres (${short.length}).`);
    if (emojiRe.test(short)) add('warn', 'short', 'Los emojis en la descripción breve pueden provocar rechazos.');
    promo.forEach((t) => { if (hasTerm(short, t)) add('warn', 'short', `“${t}” en la descripción breve puede considerarse promocional.`); });
    if (short && title && short.toLowerCase().startsWith(title.toLowerCase())) add('tip', 'short', 'No repitas el nombre al inicio: aprovecha los 80 caracteres para el beneficio principal.');

    const plain = stripTags(full);
    if (!full.trim()) add('error', 'full', 'Falta la descripción completa.');
    else if (plain.length < 300) add('tip', 'full', 'La descripción completa es muy corta. Entre 1,000 y 2,500 caracteres suelen funcionar bien.');
    if (full.length > LIMITS.full) add('error', 'full', `La descripción completa supera ${LIMITS.full} caracteres (${full.length}).`);
    const badTags = (full.match(/<\/?([a-z0-9]+)[^>]*>/gi) || []).filter((t) => !/^<\/?(b|i|u|br)\s*\/?>$/i.test(t));
    if (badTags.length) add('warn', 'full', `Etiquetas HTML no admitidas: ${[...new Set(badTags)].slice(0, 3).join(' ')}. Sólo se aceptan <b>, <i>, <u> y <br>.`);
    OTHER_STORES.forEach((t) => { if (hasTerm(plain, t)) add('warn', 'full', `Mencionar “${t}” puede considerarse referencia a otra tienda o plataforma.`); });
    if (/\b(5 estrellas|five stars|calif[ií]canos|rate us)\b/i.test(plain)) add('warn', 'full', 'Pedir calificaciones en la descripción va contra las políticas de la tienda.');
    if (/(.)\1{5,}/.test(plain)) add('warn', 'full', 'Hay caracteres repetidos muchas veces seguidas.');
    const kw = keywords(plain, lg);
    const words = plain.split(/\s+/).filter(Boolean).length || 1;
    kw.slice(0, 3).forEach(([w, n]) => { if (n >= 6 && n / words > 0.03) add('warn', 'full', `“${w}” aparece ${n} veces (${(n / words * 100).toFixed(1)}%). La repetición excesiva se considera relleno de palabras clave.`); });
    if (emojiRe.test(plain) && (plain.match(new RegExp(emojiRe.source, 'gu')) || []).length > 12) add('tip', 'full', 'Muchos emojis dificultan la lectura; úsalos como viñetas ocasionales.');

    if (loc === project.defaultLocale) {
      const m = project.meta || {};
      if (!m.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) add('error', 'meta', 'Necesitas un correo de contacto válido.');
      if (!m.privacy) add('error', 'meta', 'Falta la URL de la política de privacidad (obligatoria si pides datos o permisos sensibles, y muy recomendable siempre).');
      else if (!/^https:\/\//.test(m.privacy)) add('warn', 'meta', 'La política de privacidad debería estar en una URL https pública.');
      if (m.website && !/^https?:\/\//.test(m.website)) add('warn', 'meta', 'El sitio web debe empezar con https://');
    }
    return out;
  }

  function score(issues) {
    let s = 100;
    for (const i of issues) s -= i.level === 'error' ? 18 : i.level === 'warn' ? 7 : 2;
    return Math.max(0, s);
  }

  function keywords(text, lg) {
    const counts = new Map();
    const words = String(text || '').toLowerCase().normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]+/gu) || [];
    for (const w of words) {
      if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    void lg;
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  /* Plantillas de descripción */
  const TEMPLATES = {
    es: [
      { name: 'Beneficios en viñetas', text: '{Frase que resume el valor de la app en una línea.}\n\n{Un párrafo corto que explique el problema que resuelve y para quién es.}\n\n<b>Lo que puedes hacer</b>\n• {Función principal}\n• {Segunda función}\n• {Tercera función}\n• {Cuarta función}\n\n<b>Por qué te va a gustar</b>\n{Diferenciador: privacidad, sin anuncios, sin conexión, diseño…}\n\n¿Ideas o problemas? Escríbenos a {correo}.' },
      { name: 'Historia de uso', text: 'Imagina {situación cotidiana}. Con {App} {resultado concreto}.\n\n<b>Así funciona</b>\n1. {Paso uno}\n2. {Paso dos}\n3. {Paso tres}\n\n<b>Incluye</b>\n• {Función}\n• {Función}\n• {Función}\n\n{Cierre con una invitación a probarla.}' },
      { name: 'Corta y directa', text: '{App} es {qué es} para {quién}.\n\n• {Beneficio 1}\n• {Beneficio 2}\n• {Beneficio 3}\n\nSin {fricción que eliminas}. Sólo {lo esencial}.' },
    ],
    en: [
      { name: 'Benefit bullets', text: '{One line that sums up the value of the app.}\n\n{A short paragraph about the problem it solves and who it is for.}\n\n<b>What you can do</b>\n• {Main feature}\n• {Second feature}\n• {Third feature}\n• {Fourth feature}\n\n<b>Why you will like it</b>\n{Differentiator: privacy, no ads, offline, design…}\n\nIdeas or issues? Write to {email}.' },
      { name: 'Use story', text: 'Picture {everyday situation}. With {App} you {concrete outcome}.\n\n<b>How it works</b>\n1. {Step one}\n2. {Step two}\n3. {Step three}\n\n<b>Includes</b>\n• {Feature}\n• {Feature}\n• {Feature}\n\n{Close with an invitation to try it.}' },
      { name: 'Short and direct', text: '{App} is {what it is} for {who}.\n\n• {Benefit 1}\n• {Benefit 2}\n• {Benefit 3}\n\nNo {friction you remove}. Just {the essentials}.' },
    ],
  };

  /* ───────── Notas de versión ───────── */
  const NOTE_WORDS = {
    es: { new: 'Nuevo', improve: 'Mejoras', fix: 'Correcciones', intro: { cercano: '¡Hola! Esto trae la versión {v}:', formal: 'Novedades de la versión {v}:', breve: '' }, outro: { cercano: 'Gracias por usar {app}. Tus comentarios nos ayudan mucho.', formal: 'Gracias por su preferencia.', breve: '' }, fallback: 'Mejoras de estabilidad y rendimiento.' },
    en: { new: 'New', improve: 'Improvements', fix: 'Fixes', intro: { cercano: 'Hi! Here is what is new in {v}:', formal: 'What is new in version {v}:', breve: '' }, outro: { cercano: 'Thanks for using {app}. Your feedback helps a lot.', formal: 'Thank you for using our app.', breve: '' }, fallback: 'Stability and performance improvements.' },
    pt: { new: 'Novidades', improve: 'Melhorias', fix: 'Correções', intro: { cercano: 'Olá! Veja o que chegou na versão {v}:', formal: 'Novidades da versão {v}:', breve: '' }, outro: { cercano: 'Obrigado por usar {app}!', formal: 'Obrigado pela preferência.', breve: '' }, fallback: 'Melhorias de estabilidade e desempenho.' },
    fr: { new: 'Nouveautés', improve: 'Améliorations', fix: 'Corrections', intro: { cercano: 'Bonjour ! Voici les nouveautés de la {v} :', formal: 'Nouveautés de la version {v} :', breve: '' }, outro: { cercano: 'Merci d’utiliser {app} !', formal: 'Merci de votre confiance.', breve: '' }, fallback: 'Améliorations de stabilité et de performances.' },
    de: { new: 'Neu', improve: 'Verbesserungen', fix: 'Fehlerbehebungen', intro: { cercano: 'Hallo! Das ist neu in {v}:', formal: 'Neuerungen in Version {v}:', breve: '' }, outro: { cercano: 'Danke, dass du {app} nutzt!', formal: 'Vielen Dank für Ihr Vertrauen.', breve: '' }, fallback: 'Stabilitäts- und Leistungsverbesserungen.' },
  };
  const EMOJI = { new: '✨', improve: '⚡', fix: '🛠' };

  function buildNotes(project, version, loc) {
    const words = NOTE_WORDS[lang(loc)] || NOTE_WORDS.en;
    const tone = version.tone || 'cercano';
    const appName = ((project.listing[loc] || project.listing[project.defaultLocale] || {}).title || project.name).split(/[:\-–|]/)[0].trim();
    const groups = { new: [], improve: [], fix: [] };
    for (const it of version.items || []) {
      const txt = (it.text && (it.text[loc] || it.text[project.defaultLocale])) || '';
      if (txt.trim()) groups[it.type || 'new'].push(txt.trim().replace(/\.$/, ''));
    }
    const lines = [];
    const intro = words.intro[tone].replace('{v}', version.name || '').replace('{app}', appName);
    if (intro) lines.push(intro, '');
    let any = false;
    for (const key of ['new', 'improve', 'fix']) {
      if (!groups[key].length) continue;
      any = true;
      if (tone === 'breve') groups[key].forEach((t) => lines.push(`${version.emoji ? EMOJI[key] + ' ' : '• '}${t}`));
      else {
        lines.push(`${version.emoji ? EMOJI[key] + ' ' : ''}${words[key]}`);
        groups[key].forEach((t) => lines.push(`• ${t}`));
        lines.push('');
      }
    }
    if (!any) lines.push(words.fallback);
    const outro = words.outro[tone].replace('{app}', appName);
    if (outro) { if (lines[lines.length - 1] !== '') lines.push(''); lines.push(outro); }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  Object.assign(V, { LOCALES, LIMITS, CATEGORIES, lint, score, keywords, TEMPLATES, buildNotes, langOf: lang, stripTags });
})(window.Vitrina);
