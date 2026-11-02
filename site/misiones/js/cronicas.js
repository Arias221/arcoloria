/* =====================================================================
   CRÓNICAS — el cuento como un camino de estrellas
   ---------------------------------------------------------------------
   Cada constelación es una parte del cuento; cada estrella, un trozo de
   la historia con su misión. La estrella actual se ve cerca, como una
   plataforma; las siguientes se alejan hacia el fondo. Al abrirse una
   nueva, el camino avanza hasta ella.
   La base solo entrega el texto de las estrellas que este visitante
   tiene abiertas (función cronicas()).
   ===================================================================== */
(function () {
  'use strict';
  var D = window.Datos, C = window.Comun, ic = C.ic, esc = C.esc;
  var vista = document.getElementById('vista');
  var MOVIMIENTO = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var REVISAR_CADA = window.__cronicasCada || 30000;

  // Frase que dice el cristal al tocarlo, según la constelación
  var FRASES = {
    principito_01: 'Shh… el cordero duerme dentro de la caja.',
    principito_02: 'Un brote menos. El planeta está a salvo por hoy.',
    principito_03: 'La rosa se acomoda sus cuatro espinas.',
    principito_04: 'Por orden del rey: sigue leyendo.',
    principito_05: 'El sombrero se levanta para saludarte.',
    principito_06: 'Una estrella más en la cuenta… y sigue sumando.',
    principito_07: 'Encendido… apagado… encendido.',
    principito_08: 'Anotado: un explorador nuevo en el libro.',
    principito_09: 'Algo color de luna se escondió en la arena.',
    principito_10: 'El zorro te esperaba desde hace una hora.',
    principito_11: 'La polea canta al subir el balde.',
    principito_12: 'Escucha: las estrellas suenan como cascabeles.'
  };
  var FRASE_BASE = 'Cada estrella guarda un trozo del cuento.';

  var est = { datos: null, d: null, ctx: null, sel: null, cur: 0, firma: '', timer: null, lector: null, obs: null };

  /* =================== utilidades =================== */
  function semilla(texto) { var h = 2166136261; for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function azar(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function parrafos(texto) { return String(texto || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean); }
  function porId(id) { return est.datos.constelaciones.filter(function (c) { return c.id === id; })[0]; }
  function numero(c) { return est.datos.constelaciones.indexOf(c) + 1; }
  function legible(s) { return s && s.estado !== 'apagada'; }
  function legibles() {
    var out = [];
    est.datos.constelaciones.forEach(function (c, i) { c.estrellas.forEach(function (s) { if (legible(s)) out.push({ c: c, n: i + 1, s: s }); }); });
    return out;
  }
  function firmaDe(datos) {
    return JSON.stringify([datos.revision, datos.vinculado, datos.constelaciones.map(function (c) { return [c.id, c.abierta, c.estrellas.map(function (s) { return s.estado; })]; })]);
  }
  function fechaApertura(c) {
    return c.disponible_desde && new Date(c.disponible_desde).getTime() > Date.now() ? C.cuandoAmigable(new Date(c.disponible_desde).getTime(), est.d.config) : '';
  }
  // Estrella donde arranca el camino: la que el jugador tiene abierta ahora, o la última que leyó
  function estrellaInicial(c) {
    var i;
    for (i = 0; i < c.estrellas.length; i++) if (c.estrellas[i].estado === 'abierta') return i;
    for (i = c.estrellas.length - 1; i >= 0; i--) if (c.estrellas[i].estado === 'encendida') return i;
    return 0;
  }

  /* ---------- estrellas ya vistas en este navegador (para animar las nuevas) ---------- */
  function claveVistas() { return 'cronicas-vistas:' + D.servidorActual() + ':' + (est.datos.revision ? 'r' : est.datos.vinculado ? 'j' : 'v'); }
  function leerVistas() { try { var v = localStorage.getItem(claveVistas()); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function guardarVistas(ids) { try { localStorage.setItem(claveVistas(), JSON.stringify(ids)); } catch (e) { /* sin almacenamiento */ } }
  function nuevasEstrellas() {
    var lista = legibles();
    var vistas = leerVistas();
    guardarVistas(lista.map(function (x) { return x.s.id + ':' + x.s.estado; }));
    if (!vistas) return [];
    var antes = vistas.map(function (v) { return v.split(':')[0]; });
    return lista.filter(function (x) { return vistas.indexOf(x.s.id + ':' + x.s.estado) < 0; })
      .map(function (x) { x.tipo = antes.indexOf(x.s.id) < 0 ? 'abierta' : 'encendida'; return x; });
  }
  function avisoNuevas(nuevas) {
    var ab = nuevas.filter(function (x) { return x.tipo === 'abierta'; }), en = nuevas.filter(function (x) { return x.tipo === 'encendida'; });
    if (ab.length === 1) return (en.length ? 'Encendiste «' + en[0].s.titulo + '». ' : '') + 'Se abrió una estrella nueva: «' + ab[0].s.titulo + '».';
    if (ab.length > 1) return 'Se abrieron ' + ab.length + ' estrellas nuevas.';
    if (en.length === 1) return 'Estrella encendida: «' + en[0].s.titulo + '».';
    return en.length ? 'Se encendieron ' + en.length + ' estrellas.' : '';
  }

  /* =================== piezas dibujadas =================== */
  var PUNTAS = '50,4 61.8,36.5 96.5,36.5 68.4,57.6 79.2,92 50,71 20.8,92 31.6,57.6 3.5,36.5 38.2,36.5';
  // Plataforma con forma de estrella, acostada en el piso, con grosor
  function plataforma() {
    return '<svg class="plat-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon class="plat-canto" points="' + PUNTAS + '" transform="translate(0 7)"/>' +
      '<polygon class="plat-cara" points="' + PUNTAS + '"/>' +
      '<polygon class="plat-borde" points="' + PUNTAS + '"/>' +
      '<circle class="plat-centro" cx="50" cy="52" r="9"/></svg>';
  }
  // Cristal que flota sobre la plataforma de la estrella actual
  var CRISTAL = '<svg class="cristal-svg" viewBox="0 0 100 120" aria-hidden="true">' +
    '<defs><linearGradient id="cr-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF8E6"/><stop offset="1" stop-color="#F1C46A"/></linearGradient>' +
    '<linearGradient id="cr-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8D2FF"/><stop offset="1" stop-color="#9F72D6"/></linearGradient></defs>' +
    '<polygon points="50,6 64,46 50,60" fill="url(#cr-a)"/><polygon points="50,6 36,46 50,60" fill="#F7DFA4"/>' +
    '<polygon points="94,46 64,46 50,60" fill="url(#cr-b)"/><polygon points="6,46 36,46 50,60" fill="#C9A2F2"/>' +
    '<polygon points="76,98 64,46 50,60" fill="#E9B860"/><polygon points="24,98 36,46 50,60" fill="url(#cr-a)"/>' +
    '<polygon points="76,98 50,80 50,60" fill="#B98BE8"/><polygon points="24,98 50,80 50,60" fill="#F3D08A"/>' +
    '<polygon points="94,46 76,98 50,60" fill="#D7B0FF" opacity=".55"/><polygon points="6,46 24,98 50,60" fill="#FFF0CC" opacity=".6"/>' +
    '<circle cx="42" cy="34" r="3" fill="#fff" opacity=".9"/></svg>';

  /* =================== vista =================== */
  async function ver(d, idSel, ctx) {
    est.d = d; est.ctx = ctx;
    var datos = await D.cronicas();
    if (!datos.ok || !datos.constelaciones || !datos.constelaciones.length) { ctx.antigua(d); return; }
    est.datos = datos; est.firma = firmaDe(datos);
    elegirConstelacion(idSel);
    pintar();
    var nuevas = nuevasEstrellas();
    if (nuevas.length) C.toast(avisoNuevas(nuevas), 'magico');
    vigilar();
  }

  function elegirConstelacion(idSel) {
    var cs = est.datos.constelaciones;
    var c = (idSel && porId(idSel)) || (est.sel && porId(est.sel)) ||
      cs.filter(function (x) { return x.abierta && !x.completa; })[0] || cs.filter(function (x) { return x.abierta; }).slice(-1)[0] || cs[0];
    est.sel = c.id;
    est.cur = estrellaInicial(c);
  }

  function pintar(sinEntrada) {
    var datos = est.datos, c = porId(est.sel), n = numero(c);
    var total = 0, encendidas = 0;
    datos.constelaciones.forEach(function (x) { total += x.total; encendidas += x.encendidas; });

    var debajo = datos.revision
      ? '<div class="aviso-cielo revision">' + ic('ojo') + '<span><b>Modo revisión.</b> Puedes leer todo el cuento. Los jugadores lo van abriendo estrella por estrella.</span><button class="boton sec peq" type="button" id="salir-revision">Salir del modo revisión</button></div>'
      : datos.vinculado
        ? '<p class="progreso-cielo">' + ic('destello') + '<span>Llevas <b>' + encendidas + '</b> de ' + total + ' estrellas encendidas.</span></p>'
        : '<div class="aviso-cielo">' + ic('enlace') + '<span>Estás leyendo como visitante: solo se abre la primera estrella. Vincula tu cuenta para seguir tu propio camino.</span><a class="boton magico peq" href="#aventura">Vincular</a></div>';
    var formulario = datos.revision ? '' :
      '<details class="codigo-cielo"><summary>' + ic('enlace') + (datos.vinculado ? '¿Tienes un código de revisión?' : '¿Tienes un código del juego o de revisión?') + '</summary>' +
      '<form id="form-codigo-cielo" autocomplete="off"><label class="sr" for="codigo-cielo">Código</label>' +
      '<input class="codigo-input" id="codigo-cielo" maxlength="10" autocapitalize="characters" spellcheck="false" placeholder="Código" required>' +
      '<button class="boton magico" type="submit">Usar código</button></form>' +
      '<small>El código del juego tiene 6 caracteres y se pide con /misiones. El de revisión tiene 10 y abre todo el cuento.</small></details>';

    var estrellas = c.estrellas.map(function (s, i) {
      return '<button type="button" class="astro3d ' + s.estado + '" data-i="' + i + '" aria-label="Estrella ' + s.orden + ': ' + esc(s.titulo) + (s.estado === 'apagada' ? ' (apagada)' : '') + '">' +
        '<span class="plat">' + plataforma(s) + '</span><span class="astro-num">' + (s.estado === 'apagada' ? ic('candado') : s.orden) + '</span></button>';
    }).join('');
    var huellas = '';
    for (var k = 0; k < c.estrellas.length - 1; k++) for (var t = 1; t <= 4; t++) huellas += '<span class="huella' + (c.estrellas[k].estado === 'encendida' ? ' on' : '') + '" data-k="' + k + '" data-t="' + (t / 5) + '"></span>';

    vista.innerHTML =
      '<section class="escena3d entrar" id="escena3d" tabindex="-1" aria-label="Camino de estrellas">' +
        '<canvas class="cielo-fondo" aria-hidden="true"></canvas>' +
        '<div class="esc-superior"><div class="esc-cab"><span class="runa">Constelación ' + n + '</span><h2>' + esc(c.titulo) + '</h2>' +
          '<p>' + (c.completa ? 'Constelación completa' : !c.abierta ? (fechaApertura(c) ? 'Se abre ' + esc(fechaApertura(c)) : 'Se abre al completar la constelación anterior') : c.encendidas + ' de ' + c.total + ' estrellas encendidas') + '</p></div>' +
          '<article class="relato-flotante" id="relato" aria-live="polite"></article></div>' +
        '<button class="boton-const" type="button" id="abrir-cajon" aria-haspopup="dialog">' + ic('estrella') + '<span>Constelaciones</span></button>' +
        '<div class="camino" id="camino">' + huellas + estrellas +
          '<div class="cristal" id="cristal" role="button" tabindex="0" aria-label="Tocar el cristal">' + CRISTAL + '<span class="cristal-sombra"></span></div>' +
        '</div>' +
        '<span class="burbuja" id="burbuja" role="status" aria-live="polite"></span>' +
        '<div class="esc-pie"><button class="nav-astro" type="button" id="astro-ant" aria-label="Estrella anterior">' + ic('izq') + '</button>' +
          '<span class="esc-cuenta" id="esc-cuenta"></span>' +
          '<button class="nav-astro" type="button" id="astro-sig" aria-label="Estrella siguiente">' + ic('der') + '</button></div>' +
      '</section>' + debajo + formulario;

    conectar();
    iniciarCielo();
    if (est.obs) est.obs.disconnect();
    if (window.ResizeObserver) { est.obs = new ResizeObserver(function () { colocar(false); }); est.obs.observe(document.getElementById('escena3d')); }
    if (sinEntrada) { colocar(false); pintarRelato(false); return; }
    // Entrada: el camino llega desde el fondo
    colocar(false, MOVIMIENTO ? 2.2 : 0);
    requestAnimationFrame(function () { requestAnimationFrame(function () { colocar(true); }); });
    pintarRelato(false);
  }

  /* ---------- posición de cada estrella en el camino (perspectiva) ---------- */
  // El camino va desde el piso (estrella actual) hasta el horizonte, justo debajo del cuento
  var vistaCamino = { piso: 0, horizonte: 0 };
  function proyectar(rel, W, H) {
    var piso = vistaCamino.piso || H * 0.83, horizonte = vistaCamino.horizonte || H * 0.45;
    if (rel < 0) return { x: W / 2 + rel * W * 0.25, y: H + 140, s: 1.7, o: 0 };
    var s = 1 / (1 + rel * 0.95);
    var y = horizonte + (piso - horizonte) * s;
    var x = W / 2 + Math.sin(rel * 2.1) * W * 0.52 * (1 - s); // zigzag hacia el fondo
    x = Math.max(W * 0.1, Math.min(W * 0.9, x));
    return { x: x, y: y, s: s, o: rel > 5.2 ? 0 : Math.max(0.25, 1 - rel * 0.13) };
  }
  function colocar(animar, extra) {
    var esc3 = document.getElementById('escena3d'); if (!esc3) return;
    var W = esc3.clientWidth, H = esc3.clientHeight, base = Math.min(320, W * 0.66), altoPlat = base * 0.42;
    var cam = document.getElementById('camino'), rel = document.getElementById('relato');
    // El cuento ocupa la parte de arriba; el camino, el espacio que queda debajo
    var maxRelato = Math.round(H * (W < 600 ? 0.46 : 0.38));
    rel.style.maxHeight = maxRelato + 'px';
    vistaCamino.horizonte = rel.offsetTop + Math.min(maxRelato, rel.offsetHeight) + 30;
    vistaCamino.piso = H - 64 - altoPlat / 2;
    cam.classList.toggle('sin-animar', !animar || !MOVIMIENTO);
    var desfase = extra || 0;
    cam.querySelectorAll('.astro3d').forEach(function (b) {
      var i = +b.dataset.i, p = proyectar(i - est.cur + desfase, W, H);
      b.style.width = base + 'px'; b.style.height = altoPlat + 'px';
      b.style.transform = 'translate3d(' + (p.x - base / 2).toFixed(1) + 'px,' + (p.y - altoPlat / 2).toFixed(1) + 'px,0) scale(' + p.s.toFixed(3) + ')';
      b.style.opacity = desfase ? 0 : p.o;
      b.style.zIndex = String(200 - Math.round((i - est.cur) * 10));
      b.classList.toggle('actual', i === est.cur);
      b.tabIndex = i === est.cur ? -1 : 0;
    });
    cam.querySelectorAll('.huella').forEach(function (h) {
      var p = proyectar(+h.dataset.k + +h.dataset.t - est.cur + desfase, W, H);
      h.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) scale(' + (p.s * 1.6).toFixed(3) + ')';
      h.style.opacity = desfase ? 0 : p.o * 0.9;
      h.style.zIndex = String(190 - Math.round((+h.dataset.k + +h.dataset.t - est.cur) * 10));
    });
    // El cristal descansa sobre la plataforma actual
    var c = porId(est.sel), s = c.estrellas[est.cur], cr = document.getElementById('cristal');
    var p0 = proyectar(0, W, H), alto = Math.max(70, Math.min(150, (vistaCamino.piso - vistaCamino.horizonte) * 0.55));
    cr.style.width = (alto * 0.83) + 'px'; cr.style.height = alto + 'px';
    cr.style.transform = 'translate3d(' + (p0.x - alto * 0.415).toFixed(1) + 'px,' + (p0.y - alto * 1.02).toFixed(1) + 'px,0)';
    cr.classList.toggle('visible', !desfase && legible(s));
    var bur = document.getElementById('burbuja');
    bur.style.left = Math.max(12, Math.min(W - 252, p0.x + alto * 0.45)) + 'px'; bur.style.top = (p0.y - alto * 0.9) + 'px';
    document.getElementById('esc-cuenta').textContent = 'Estrella ' + (est.cur + 1) + ' de ' + c.estrellas.length;
    document.getElementById('astro-ant').disabled = est.cur === 0;
    document.getElementById('astro-sig').disabled = est.cur >= c.estrellas.length - 1 || !legible(c.estrellas[est.cur + 1]);
  }

  /* ---------- el cuento flotando sobre la estrella actual ---------- */
  function pintarRelato(animar) {
    var c = porId(est.sel), s = c.estrellas[est.cur], el = document.getElementById('relato');
    var anterior = est.cur > 0 ? c.estrellas[est.cur - 1] : null;
    var html;
    var m = misionDe(s);
    if (legible(s)) {
      html = '<div class="rf-cab"><span class="rf-sub">Estrella ' + s.orden + (s.estado === 'encendida' ? ' · encendida' : est.datos.revision ? ' · revisión' : '') + '</span>' +
        (m ? '<button class="rf-ampliar" type="button" id="ver-mision" aria-label="Ver la misión de esta estrella" title="Ver la misión">' + ic('pergamino') + '</button>' : '') + '</div>' +
        '<h3>' + esc(s.titulo) + '</h3>' +
        '<div class="rf-texto">' + parrafos(s.texto).map(function (p, k) { return '<p style="--k:' + k + '">' + esc(p) + '</p>'; }).join('') + '</div>' +
        (m ? tiraMision(m) : '');
    } else {
      html = '<div class="rf-cab"><span class="rf-sub">Estrella ' + s.orden + ' · apagada</span></div><h3>' + esc(s.titulo) + '</h3>' +
        '<p class="rf-pista">' + ic('candado') + '<span>' + esc(!c.abierta ? (fechaApertura(c) ? 'Esta constelación se abre ' + fechaApertura(c) + '.' : 'Esta constelación se abre al completar la anterior.')
          : anterior ? 'Se enciende al completar la misión de «' + anterior.titulo + '».' : est.datos.vinculado ? 'Se abre con la constelación.' : 'Vincula tu cuenta para abrirla.') + '</span></p>';
    }
    var poner = function () {
      el.innerHTML = html;
      el.classList.remove('saliendo'); void el.offsetWidth; el.classList.add('llegando');
      el.querySelectorAll('#ver-mision, .rm-cab b').forEach(function (b) {
        b.addEventListener('click', function () { abrirMision(m, b); });
        b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirMision(m, b); } });
      });
    };
    if (animar && MOVIMIENTO && el.innerHTML) { el.classList.remove('llegando'); el.classList.add('saliendo'); setTimeout(poner, 380); } else poner();
  }

  /* ---------- misión de cada estrella ---------- */
  function misionDe(s) {
    return s && s.mision_id ? (est.d.misiones || []).filter(function (m) { return m.id === s.mision_id && m.activa; })[0] || null : null;
  }
  function npcDe(m) {
    var id = m.npc_id;
    var cap = (est.d.capitulos || []).filter(function (c) { return c.id === m.capitulo_id; })[0];
    if (!id && cap) id = cap.npc_id;
    return (est.d.npcs || []).filter(function (n) { return id ? n.id === id : n.es_principal; })[0] || null;
  }
  // Franja con la misión debajo del cuento: estado y lo que se puede hacer
  function tiraMision(m) {
    var e = C.estadoMision(m, est.d), npc = npcDe(m), accion = '';
    if (e.clave === 'disponible' && m.requiere_npc === false) accion = '<button class="boton magico peq" type="button" data-aceptar="' + esc(m.id) + '">' + ic('destello') + 'Aceptar misión</button>';
    else if ((e.clave === 'disponible' || e.clave === 'sin_sesion') && m.requiere_npc !== false) accion = '<small class="rm-pista">' + ic('persona') + '<span>Se acepta en el juego con ' + esc(npc ? npc.nombre : 'su NPC') + '. Escribe /misiones para ver dónde está.</span></small>';
    else if (e.clave === 'sin_sesion') accion = '<small class="rm-pista">' + ic('enlace') + '<span>Vincula tu cuenta para aceptarla desde aquí.</span></small>';
    return '<div class="rf-mision"><div class="rm-cab"><span class="rm-etq">' + ic('pergamino') + 'Misión</span><b>' + esc(m.titulo) + '</b>' + C.etiquetaEstado(e) + '</div>' +
      (accion ? '<div class="rm-acciones">' + accion + '</div>' : '') + '</div>';
  }
  function abrirMision(m, origen) {
    var cap = document.createElement('div');
    cap.className = 'lector modal-mision';
    cap.setAttribute('role', 'dialog'); cap.setAttribute('aria-modal', 'true'); cap.setAttribute('aria-label', 'Misión ' + m.titulo);
    cap.innerHTML = '<div class="lector-velo" data-cerrar></div><div class="mm-caja"><button class="lector-cerrar" type="button" data-cerrar aria-label="Cerrar">' + ic('cerrar') + '</button>' +
      '<div class="mm-scroll">' + C.detalleMision(m, est.d) + '</div></div>';
    document.body.appendChild(cap);
    document.body.classList.add('leyendo');
    est.lector = cap;
    requestAnimationFrame(function () { cap.classList.add('abierto'); });
    cap.querySelector('.lector-cerrar').focus();
    var cerrar = function () {
      est.lector = null; cap.classList.remove('abierto'); document.body.classList.remove('leyendo');
      setTimeout(function () { cap.remove(); }, MOVIMIENTO ? 260 : 0);
      if (origen && document.contains(origen)) origen.focus();
    };
    cap.addEventListener('click', async function (e) {
      if (e.target.closest('[data-cerrar]')) return cerrar();
      var a = e.target.closest('[data-aceptar]');
      if (!a) return;
      a.disabled = true;
      var r = await D.aceptarMision(a.dataset.aceptar);
      if (!r.ok) { a.disabled = false; C.toast(r.motivo || 'No se pudo aceptar la misión.', 'error'); return; }
      C.toast('¡Misión aceptada! Si estás jugando, se activa en unos segundos.', 'magico');
      cerrar();
      await est.ctx.recargar();
    });
    cap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'Tab') {
        var f = [].slice.call(cap.querySelectorAll('button:not([disabled]), a[href]')); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function irA(i) {
    var c = porId(est.sel);
    if (i < 0 || i >= c.estrellas.length || i === est.cur) return;
    if (!legible(c.estrellas[i])) {
      var b = document.querySelector('.astro3d[data-i="' + i + '"]');
      if (b) { b.classList.remove('sacudir'); void b.offsetWidth; b.classList.add('sacudir'); }
      C.toast(i > 0 ? 'Esta estrella se enciende al completar la misión de «' + c.estrellas[i - 1].titulo + '».' : 'Esta estrella todavía está apagada.');
      return;
    }
    est.cur = i;
    colocar(true);
    pintarRelato(true);
  }

  function conectar() {
    var escena = document.getElementById('escena3d');
    escena.querySelectorAll('.astro3d').forEach(function (b) { b.addEventListener('click', function () { irA(+b.dataset.i); }); });
    document.getElementById('astro-ant').addEventListener('click', function () { irA(est.cur - 1); });
    document.getElementById('astro-sig').addEventListener('click', function () { irA(est.cur + 1); });
    escena.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); irA(est.cur - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); irA(est.cur + 1); }
    });
    var x0 = null;
    escena.addEventListener('touchstart', function (e) { if (e.target.closest('.relato-flotante')) return; x0 = e.touches[0].clientX; }, { passive: true });
    escena.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) irA(est.cur + (dx < 0 ? 1 : -1)); }, { passive: true });

    var cr = document.getElementById('cristal'), bur = document.getElementById('burbuja'), tB;
    var tocar = function () {
      cr.classList.remove('salto'); void cr.offsetWidth; cr.classList.add('salto');
      bur.textContent = FRASES[est.sel] || FRASE_BASE; bur.classList.add('ver');
      clearTimeout(tB); tB = setTimeout(function () { bur.classList.remove('ver'); }, 3200);
    };
    cr.addEventListener('click', tocar);
    cr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(); } });

    document.getElementById('abrir-cajon').addEventListener('click', abrirCajon);

    var salir = document.getElementById('salir-revision');
    if (salir) salir.addEventListener('click', async function () {
      salir.disabled = true;
      await D.salirRevision();
      C.toast('Saliste del modo revisión.');
      await est.ctx.recargar();
    });
    var form = document.getElementById('form-codigo-cielo');
    if (form) {
      var inp = document.getElementById('codigo-cielo');
      inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10); });
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var b = form.querySelector('button'); b.disabled = true;
        var r = await D.vincularCuenta(inp.value);
        b.disabled = false;
        if (!r.ok) { C.toast(r.motivo || 'No se pudo usar el código.', 'error'); inp.focus(); return; }
        C.toast(r.revision ? 'Modo revisión activado: ya puedes leer todo el cuento.' : '¡Bienvenido, ' + r.jugador.gamertag + '! Tu cuenta quedó vinculada.', 'magico');
        await est.ctx.recargar();
      });
    }
  }

  /* =================== cajón de constelaciones =================== */
  function mini(c) {
    var r = azar(semilla(c.id)), n = c.estrellas.length, pts = [];
    for (var i = 0; i < n; i++) pts.push({ x: 10 + (i + r()) * (80 / n), y: 10 + r() * 30 });
    var h = '';
    for (i = 1; i < n; i++) h += '<line class="trazo' + (c.estrellas[i - 1].estado === 'encendida' ? ' on' : '') + '" x1="' + pts[i - 1].x.toFixed(1) + '" y1="' + pts[i - 1].y.toFixed(1) + '" x2="' + pts[i].x.toFixed(1) + '" y2="' + pts[i].y.toFixed(1) + '"/>';
    c.estrellas.forEach(function (s, k) { h += '<circle class="pt ' + s.estado + '" cx="' + pts[k].x.toFixed(1) + '" cy="' + pts[k].y.toFixed(1) + '" r="' + (s.estado === 'apagada' ? 1.6 : 2.4) + '"/>'; });
    return '<svg class="mini-const" viewBox="0 0 100 50" aria-hidden="true">' + h + '</svg>';
  }
  function abrirCajon() {
    var origen = document.getElementById('abrir-cajon');
    var el = document.createElement('div');
    el.className = 'cajon';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Constelaciones');
    el.innerHTML = '<div class="cajon-velo" data-cerrar></div><aside class="cajon-panel"><div class="cajon-cab"><h3>Constelaciones</h3><button class="lector-cerrar" type="button" data-cerrar aria-label="Cerrar">' + ic('cerrar') + '</button></div>' +
      '<div class="cajon-lista">' + est.datos.constelaciones.map(function (c, i) {
        var estado = c.completa ? 'Completa' : !c.abierta ? (fechaApertura(c) ? 'Se abre ' + fechaApertura(c) : 'Cerrada') : c.encendidas + ' de ' + c.total + ' encendidas';
        return '<button type="button" class="cajon-item' + (c.id === est.sel ? ' activa' : '') + (c.completa ? ' completa' : '') + (!c.abierta ? ' cerrada' : '') + '" data-const="' + esc(c.id) + '">' +
          '<span class="ci-num">' + (i + 1) + '</span><span class="ci-txt"><b>' + esc(c.titulo) + '</b><small>' + (!c.abierta ? ic('candado') : '') + esc(estado) + '</small></span>' + mini(c) + '</button>';
      }).join('') + '</div></aside>';
    document.body.appendChild(el);
    document.body.classList.add('leyendo');
    requestAnimationFrame(function () { el.classList.add('abierto'); });
    var activa = el.querySelector('.cajon-item.activa') || el.querySelector('.cajon-item');
    activa.focus(); activa.scrollIntoView({ block: 'center' });
    var cerrar = function (despues) {
      el.classList.remove('abierto'); document.body.classList.remove('leyendo');
      setTimeout(function () { el.remove(); if (despues) despues(); else if (document.contains(origen)) origen.focus(); }, MOVIMIENTO ? 260 : 0);
    };
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-cerrar]')) return cerrar();
      var b = e.target.closest('[data-const]');
      if (b) cerrar(function () {
        if (b.dataset.const === est.sel) return;
        est.sel = b.dataset.const; est.cur = estrellaInicial(porId(est.sel));
        history.replaceState(null, '', '#cronicas/' + encodeURIComponent(est.sel));
        pintar();
        document.getElementById('escena3d').focus({ preventScroll: true });
      });
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'Tab') {
        var f = [].slice.call(el.querySelectorAll('button')); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* =================== revisar cambios mientras la página está abierta =================== */
  function vigilar() {
    clearInterval(est.timer);
    est.timer = setInterval(async function () {
      if (!/^#cronicas/.test(location.hash) || !document.getElementById('escena3d')) { clearInterval(est.timer); return; }
      if (document.hidden || est.lector || document.querySelector('.cajon')) return;
      var datos = await D.cronicas();
      if (!datos.ok || !datos.constelaciones || !datos.constelaciones.length) return;
      var f = firmaDe(datos);
      if (f === est.firma) return;
      est.datos = datos; est.firma = f;
      var nuevas = nuevasEstrellas();
      if (!porId(est.sel)) { elegirConstelacion(null); pintar(); }
      else {
        // Si se abrió una estrella en esta constelación, el camino avanza hasta ella
        var abierta = nuevas.filter(function (x) { return x.tipo === 'abierta' && x.c.id === est.sel; })[0];
        var destino = abierta ? porId(est.sel).estrellas.map(function (s) { return s.id; }).indexOf(abierta.s.id) : est.cur;
        var y = window.scrollY;
        pintarSinEntrada(destino);
        window.scrollTo(0, y);
      }
      if (nuevas.length) C.toast(avisoNuevas(nuevas), 'magico');
    }, REVISAR_CADA);
  }
  // Repinta conservando la posición del camino y viaja hasta la estrella indicada
  function pintarSinEntrada(destino) {
    pintar(true);
    var cam = document.getElementById('camino');
    var astro = cam.querySelector('.astro3d[data-i="' + destino + '"]');
    setTimeout(function () {
      if (astro) astro.classList.add('recien');
      est.cur = destino; colocar(true); pintarRelato(true);
    }, MOVIMIENTO ? 500 : 0);
  }

  /* =================== cielo animado =================== */
  function iniciarCielo() {
    var cv = vista.querySelector('.cielo-fondo');
    if (!cv) return;
    var g = cv.getContext('2d'), astros = [], fugaz = null, ancho = 0, alto = 0, ultimo = 0;
    function medir() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      ancho = r.width; alto = r.height;
      cv.width = Math.round(ancho * dpr); cv.height = Math.round(alto * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rnd = azar(semilla('cielo' + Math.round(ancho)));
      astros = [];
      for (var i = 0; i < Math.round(ancho * alto / 2600); i++) astros.push({ x: rnd() * ancho, y: rnd() * alto * 0.75, r: rnd() < .08 ? 1.4 : .6 + rnd() * .5, f: rnd() * 6.28, v: .6 + rnd() * 1.6 });
    }
    function cuadro(t) {
      if (!document.contains(cv)) return;
      if (t - ultimo < 40) { requestAnimationFrame(cuadro); return; }
      ultimo = t;
      g.clearRect(0, 0, ancho, alto);
      for (var i = 0; i < astros.length; i++) {
        var s = astros[i];
        g.globalAlpha = MOVIMIENTO ? .3 + .7 * (.5 + .5 * Math.sin(s.f + t / 1000 * s.v)) : .8;
        g.fillStyle = '#FFF4DC'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      }
      if (MOVIMIENTO) {
        if (!fugaz && Math.random() < .004) fugaz = { x: Math.random() * ancho * .7, y: Math.random() * alto * .3, t: 0 };
        if (fugaz) {
          fugaz.t += 1;
          var fx = fugaz.x + fugaz.t * 9, fy = fugaz.y + fugaz.t * 3.5;
          var gr = g.createLinearGradient(fx - 70, fy - 27, fx, fy);
          gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(1, 'rgba(255,240,210,.9)');
          g.globalAlpha = Math.max(0, 1 - fugaz.t / 26); g.strokeStyle = gr; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(fx - 70, fy - 27); g.lineTo(fx, fy); g.stroke();
          if (fugaz.t > 26) fugaz = null;
        }
      }
      g.globalAlpha = 1;
      if (MOVIMIENTO) requestAnimationFrame(cuadro);
    }
    medir();
    if (window.ResizeObserver) new ResizeObserver(function () { if (document.contains(cv)) { medir(); if (!MOVIMIENTO) cuadro(1e9); } }).observe(cv);
    requestAnimationFrame(cuadro);
  }

  window.Cronicas = { ver: ver };
})();
