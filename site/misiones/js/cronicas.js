/* =====================================================================
   CRÓNICAS — el cuento por constelaciones y estrellas
   ---------------------------------------------------------------------
   Cada constelación es una parte del cuento; cada estrella, un trozo de
   la historia con su misión. La base solo entrega el texto de las
   estrellas que este visitante tiene abiertas (función cronicas()).
   ===================================================================== */
(function () {
  'use strict';
  var D = window.Datos, C = window.Comun, ic = C.ic, esc = C.esc;
  var vista = document.getElementById('vista');
  var MOVIMIENTO = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var REVISAR_CADA = window.__cronicasCada || 30000;

  /* ---------- emblemas de cada constelación (se pueden tocar) ---------- */
  var E = function (cuerpo) { return '<svg viewBox="0 0 48 48" aria-hidden="true">' + cuerpo + '</svg>'; };
  var EMBLEMAS = {
    principito_01: [E('<rect x="9" y="16" width="30" height="22" rx="2"/><path d="M9 16l6-6h30l-6 6M39 16l6-6v22l-6 6"/><circle cx="18" cy="26" r="1.6"/><circle cx="24" cy="29" r="1.6"/><circle cx="30" cy="25" r="1.6"/>'), 'Shh… el cordero duerme dentro de la caja.'],
    principito_02: [E('<circle cx="24" cy="38" r="8"/><path d="M24 30V12M24 20l-8-6M24 16l7-6M24 24l9-4M24 24l-9-2"/>'), 'Un brote menos. El planeta está a salvo por hoy.'],
    principito_03: [E('<path d="M12 40c0-16 5-26 12-26s12 10 12 26"/><path d="M24 34v-9M24 25c-4 0-6-3-6-6 3 0 4 1 6 3 2-2 3-3 6-3 0 3-2 6-6 6z"/><path d="M20 30l-3-2M28 30l3-2"/>'), 'La rosa se acomoda sus cuatro espinas.'],
    principito_04: [E('<path d="M10 34l3-18 8 9 3-12 3 12 8-9 3 18z"/><path d="M10 38h28"/><circle cx="24" cy="12" r="1.5"/>'), 'Por orden del rey: sigue leyendo.'],
    principito_05: [E('<path d="M14 32V16h20v16"/><path d="M8 32h32"/><path d="M14 26h20"/>'), 'El sombrero se levanta para saludarte.'],
    principito_06: [E('<path d="M24 8l3.5 7.5 8 1-6 5.5 1.5 8-7-4-7 4 1.5-8-6-5.5 8-1z"/><path d="M12 40h24M16 36h16"/>'), 'Una estrella más en la cuenta… y sigue sumando.'],
    principito_07: [E('<path d="M24 6v6M18 12h12l-2 18H20z"/><path d="M24 30v10M16 40h16"/><circle cx="24" cy="20" r="3"/>'), 'Encendido… apagado… encendido.'],
    principito_08: [E('<path d="M8 12c6-2 11-2 16 2 5-4 10-4 16-2v24c-6-2-11-2-16 2-5-4-10-4-16-2z"/><path d="M24 14v24"/>'), 'Anotado: un explorador nuevo en el libro.'],
    principito_09: [E('<path d="M8 34c4-6 8-6 12 0s8 6 12 0 5-7 8-10"/><circle cx="40" cy="22" r="2.5"/>'), 'Algo color de luna se escondió en la arena.'],
    principito_10: [E('<path d="M12 12l6 10M36 12l-6 10"/><path d="M12 12l2 14c2 8 6 12 10 12s8-4 10-12l2-14"/><circle cx="20" cy="27" r="1.4"/><circle cx="28" cy="27" r="1.4"/><path d="M22 33h4"/>'), 'El zorro te esperaba desde hace una hora.'],
    principito_11: [E('<path d="M12 40V22h24v18"/><path d="M8 22l16-10 16 10"/><path d="M24 22v10"/><path d="M20 32h8v5h-8z"/>'), 'La polea canta al subir el balde.'],
    principito_12: [E('<path d="M24 8c-7 0-11 6-11 14v8l-3 4h28l-3-4v-8c0-8-4-14-11-14z"/><path d="M20 38a4 4 0 0 0 8 0"/>'), 'Escucha: las estrellas suenan como cascabeles.']
  };
  var EMBLEMA_BASE = [E('<path d="M24 8l3.5 7.5 8 1-6 5.5 1.5 8-7-4-7 4 1.5-8-6-5.5 8-1z"/>'), 'Cada estrella guarda un trozo del cuento.'];

  var est = { datos: null, d: null, ctx: null, sel: null, firma: '', timer: null, lector: null, cielo: null };

  /* =================== utilidades =================== */
  function semilla(texto) { var h = 2166136261; for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function azar(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // Posición de las estrellas de una constelación (siempre la misma para cada una)
  function puntos(id, n) {
    var r = azar(semilla(id)), lista = [], intentos = 0;
    while (lista.length < n && intentos < 400) {
      intentos++;
      var x = 10 + (lista.length + r()) * (80 / n), y = 10 + r() * 40;
      if (lista.every(function (p) { return Math.hypot(p.x - x, p.y - y) > 16; })) lista.push({ x: x, y: y });
    }
    while (lista.length < n) lista.push({ x: 10 + lista.length * (80 / n), y: 30 });
    return lista;
  }
  function legibles() {
    var out = [];
    est.datos.constelaciones.forEach(function (c, ic2) {
      c.estrellas.forEach(function (s) { if (s.estado !== 'apagada') out.push({ c: c, n: ic2 + 1, s: s }); });
    });
    return out;
  }
  function firmaDe(datos) {
    return JSON.stringify([datos.revision, datos.vinculado, datos.constelaciones.map(function (c) { return [c.id, c.abierta, c.estrellas.map(function (s) { return s.estado; })]; })]);
  }
  function parrafos(texto) { return String(texto || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean); }
  function adelanto(texto) { var t = parrafos(texto)[0] || ''; return t.length > 170 ? t.slice(0, 165).replace(/\s+\S*$/, '') + '…' : t; }
  function numero(c) { return est.datos.constelaciones.indexOf(c) + 1; }
  function porId(id) { return est.datos.constelaciones.filter(function (c) { return c.id === id; })[0]; }

  /* ---------- estrellas ya vistas en este navegador (para animar las nuevas) ---------- */
  function claveVistas() { return 'cronicas-vistas:' + D.servidorActual() + ':' + (est.datos.revision ? 'r' : est.datos.vinculado ? 'j' : 'v'); }
  function leerVistas() { try { var v = localStorage.getItem(claveVistas()); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function guardarVistas(ids) { try { localStorage.setItem(claveVistas(), JSON.stringify(ids)); } catch (e) { /* sin almacenamiento */ } }
  // Devuelve las estrellas que cambiaron desde la última visita: abiertas nuevas y recién encendidas
  function nuevasEstrellas() {
    var lista = legibles();
    var ids = lista.map(function (x) { return x.s.id + ':' + x.s.estado; });
    var vistas = leerVistas();
    guardarVistas(ids);
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

  /* =================== dibujo de una constelación =================== */
  function dibujo(c, grande) {
    var pts = puntos(c.id, c.estrellas.length);
    var lineas = '', estrellas = '';
    for (var i = 1; i < pts.length; i++) {
      var on = c.estrellas[i - 1].estado === 'encendida' && c.estrellas[i].estado !== 'apagada';
      lineas += '<line class="trazo' + (on ? ' on' : '') + '" x1="' + pts[i - 1].x.toFixed(1) + '" y1="' + pts[i - 1].y.toFixed(1) + '" x2="' + pts[i].x.toFixed(1) + '" y2="' + pts[i].y.toFixed(1) + '"/>';
    }
    c.estrellas.forEach(function (s, i) {
      var p = pts[i];
      var a = grande ? ' data-ir-estrella="' + esc(s.id) + '" tabindex="0" role="button" aria-label="Estrella ' + s.orden + ': ' + esc(s.titulo) + ' (' + s.estado + ')"' : '';
      estrellas += '<g class="astro ' + s.estado + '" transform="translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')"' + a + '>' +
        '<circle class="halo" r="' + (grande ? 6 : 7) + '"/><path class="punta" d="M0 -3.6L1 -1 3.6 0 1 1 0 3.6 -1 1 -3.6 0 -1 -1z"/>' +
        (grande ? '<text y="9.5">' + s.orden + '</text>' : '') + '</g>';
    });
    return '<svg class="dibujo-const' + (grande ? ' grande' : '') + '" viewBox="0 0 100 60" aria-hidden="' + (grande ? 'false' : 'true') + '">' + lineas + estrellas + '</svg>';
  }

  /* =================== vista =================== */
  async function ver(d, idSel, ctx) {
    est.d = d; est.ctx = ctx;
    var datos = await D.cronicas();
    if (!datos.ok || !datos.constelaciones || !datos.constelaciones.length) { ctx.antigua(d); return; }
    est.datos = datos; est.firma = firmaDe(datos);
    elegir(idSel);
    pintar(nuevasEstrellas());
    vigilar();
  }

  function elegir(idSel) {
    var cs = est.datos.constelaciones;
    var c = idSel && porId(idSel);
    if (!c) c = (est.sel && porId(est.sel)) || cs.filter(function (x) { return x.abierta && !x.completa; })[0] || cs.filter(function (x) { return x.abierta; }).slice(-1)[0] || cs[0];
    est.sel = c.id;
  }

  function pintar(nuevas) {
    var datos = est.datos, cs = datos.constelaciones, c = porId(est.sel), n = numero(c);
    var total = 0, encendidas = 0;
    cs.forEach(function (x) { total += x.total; encendidas += x.encendidas; });
    var emb = EMBLEMAS[c.id] || EMBLEMA_BASE;
    var nuevasIds = (nuevas || []).map(function (x) { return x.s.id; });

    var aviso = datos.revision
      ? '<div class="aviso-cielo revision">' + ic('ojo') + '<span><b>Modo revisión.</b> Puedes leer todo el cuento. Los jugadores lo van abriendo estrella por estrella.</span><button class="boton sec peq" type="button" id="salir-revision">Salir del modo revisión</button></div>'
      : datos.vinculado
        ? '<p class="progreso-cielo">' + ic('destello') + '<span>Llevas <b>' + encendidas + '</b> de ' + total + ' estrellas encendidas.</span></p>'
        : '<div class="aviso-cielo">' + ic('enlace') + '<span>Estás leyendo como visitante: solo se abre la primera estrella. Vincula tu cuenta para seguir tu propio camino.</span><a class="boton magico peq" href="#aventura">Vincular</a></div>';

    var mapa = cs.map(function (x, i) {
      var cerrada = !x.abierta;
      var fecha = cerrada && x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now();
      var estado = x.completa ? 'Completa' : cerrada ? (fecha ? 'Se abre ' + C.cuandoAmigable(new Date(x.disponible_desde).getTime(), est.d.config) : 'Cerrada') : x.encendidas + ' de ' + x.total;
      return '<button type="button" class="mapa-const' + (x.id === c.id ? ' activa' : '') + (x.completa ? ' completa' : '') + (cerrada ? ' cerrada' : '') + '" data-const="' + esc(x.id) + '" aria-pressed="' + (x.id === c.id) + '">' +
        dibujo(x, false) + '<span class="mc-num">Constelación ' + (i + 1) + '</span><b>' + esc(x.titulo) + '</b><small>' + (cerrada ? ic('candado') : '') + esc(estado) + '</small></button>';
    }).join('');

    var anterior = null;
    var tarjetas = c.estrellas.map(function (s) {
      var h = '<article class="tarjeta-estrella ' + s.estado + (nuevasIds.indexOf(s.id) >= 0 ? ' recien' : '') + '" id="estrella-' + esc(s.id) + '">' +
        '<div class="te-cab"><span class="te-num" aria-hidden="true">' + s.orden + '</span><div><span class="te-sub">Estrella ' + s.orden + '</span><h4>' + esc(s.titulo) + '</h4></div>' +
        '<span class="te-chip">' + (s.estado === 'encendida' ? 'Encendida' : s.estado === 'abierta' ? (datos.revision ? 'Abierta para revisar' : 'Abierta') : 'Apagada') + '</span></div>';
      if (s.estado !== 'apagada') {
        h += '<p class="te-adelanto">' + esc(adelanto(s.texto)) + '</p><div class="te-acciones"><button class="boton peq" type="button" data-leer="' + esc(s.id) + '">' + ic('libro') + 'Leer</button>' +
          (s.mision_id && s.estado === 'abierta' && !datos.revision ? '<a class="boton sec peq" href="#mision/' + encodeURIComponent(s.mision_id) + '">' + ic('pergamino') + 'Ver su misión</a>' : '') + '</div>';
      } else {
        h += '<p class="te-pista">' + ic('candado') + '<span>' + esc(!c.abierta ? 'Se abre cuando se abra esta constelación.' : anterior ? 'Se enciende al completar la misión de «' + anterior.titulo + '».' : datos.vinculado ? 'Se abre con la constelación.' : 'Vincula tu cuenta para abrirla.') + '</span></p>';
      }
      anterior = s;
      return h + '</article>';
    }).join('');

    var linkedForm = datos.revision ? '' :
      '<details class="codigo-cielo"><summary>' + ic('enlace') + (datos.vinculado ? '¿Tienes un código de revisión?' : '¿Tienes un código del juego o de revisión?') + '</summary>' +
      '<form id="form-codigo-cielo" autocomplete="off"><label class="sr" for="codigo-cielo">Código</label>' +
      '<input class="codigo-input" id="codigo-cielo" maxlength="10" autocapitalize="characters" spellcheck="false" placeholder="Código" required>' +
      '<button class="boton magico" type="submit">Usar código</button></form>' +
      '<small>El código del juego tiene 6 caracteres y se pide con /misiones. El de revisión tiene 10 y abre todo el cuento.</small></details>';

    vista.innerHTML =
      '<div class="titulo-seccion entrar"><span class="runa">Crónicas del cielo</span><h2>Crónicas</h2><p>Cada constelación es una parte del cuento y cada estrella, un trozo de la historia. Completa la misión de una estrella para encender la siguiente.</p></div>' +
      aviso +
      '<section class="cielo entrar" aria-label="Mapa del cielo"><canvas class="cielo-fondo" aria-hidden="true"></canvas>' +
        '<div class="mapa-cielo" role="group" aria-label="Constelaciones">' + mapa + '</div>' +
        '<div class="const-detalle" id="const-detalle">' +
          '<div class="cd-cab"><button type="button" class="emblema" id="emblema" aria-label="Tocar el emblema">' + emb[0] + '</button>' +
            '<div><span class="runa">Constelación ' + n + '</span><h3>' + esc(c.titulo) + '</h3>' + (c.resumen ? '<p>' + esc(c.resumen) + '</p>' : '') + '</div>' +
            '<span class="burbuja" id="burbuja" role="status" aria-live="polite"></span></div>' +
          dibujo(c, true) +
          '<p class="cd-estado">' + (c.completa ? ic('check') + 'Constelación completa' : !c.abierta ? ic('candado') + (c.disponible_desde && new Date(c.disponible_desde).getTime() > Date.now() ? 'Se abre ' + esc(C.cuandoAmigable(new Date(c.disponible_desde).getTime(), est.d.config)) : 'Se abre al completar la constelación anterior') : ic('destello') + c.encendidas + ' de ' + c.total + ' estrellas encendidas') + '</p>' +
        '</div>' +
      '</section>' +
      '<div class="lista-estrellas">' + tarjetas + '</div>' +
      '<div class="acciones nav-const">' +
        (n > 1 ? '<button class="boton sec" type="button" data-const="' + esc(cs[n - 2].id) + '">' + ic('izq') + 'Constelación ' + (n - 1) + '</button>' : '<span></span>') +
        (n < cs.length ? '<button class="boton sec" type="button" data-const="' + esc(cs[n].id) + '">Constelación ' + (n + 1) + ic('der') + '</button>' : '') +
      '</div>' + linkedForm;

    conectar();
    iniciarCielo();
    if (nuevas && nuevas.length) {
      C.toast(avisoNuevas(nuevas), 'magico');
    }
  }

  function conectar() {
    vista.querySelectorAll('[data-const]').forEach(function (b) {
      b.addEventListener('click', function () {
        est.sel = b.dataset.const;
        var y = window.scrollY;
        history.replaceState(null, '', '#cronicas/' + encodeURIComponent(est.sel));
        pintar([]);
        if (b.classList.contains('mapa-const')) window.scrollTo(0, y);
        else document.getElementById('const-detalle').scrollIntoView({ behavior: MOVIMIENTO ? 'smooth' : 'auto', block: 'start' });
      });
    });
    vista.querySelectorAll('[data-leer]').forEach(function (b) { b.addEventListener('click', function () { abrirLector(b.dataset.leer, b); }); });
    vista.querySelectorAll('[data-ir-estrella]').forEach(function (g) {
      var ir = function () {
        var s = porId(est.sel).estrellas.filter(function (x) { return x.id === g.dataset.irEstrella; })[0];
        if (s && s.estado !== 'apagada') abrirLector(s.id, g);
        else { var t = document.getElementById('estrella-' + g.dataset.irEstrella); if (t) { t.scrollIntoView({ behavior: MOVIMIENTO ? 'smooth' : 'auto', block: 'center' }); t.classList.remove('sacudir'); void t.offsetWidth; t.classList.add('sacudir'); } }
      };
      g.addEventListener('click', ir);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
    });
    var emb = document.getElementById('emblema'), burbuja = document.getElementById('burbuja'), tBurbuja;
    emb.addEventListener('click', function () {
      emb.classList.remove('animar'); void emb.offsetWidth; emb.classList.add('animar');
      burbuja.textContent = (EMBLEMAS[est.sel] || EMBLEMA_BASE)[1];
      burbuja.classList.add('ver');
      clearTimeout(tBurbuja); tBurbuja = setTimeout(function () { burbuja.classList.remove('ver'); }, 3200);
    });
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

  /* =================== revisar cambios mientras la página está abierta =================== */
  function vigilar() {
    clearInterval(est.timer);
    est.timer = setInterval(async function () {
      if (!/^#cronicas/.test(location.hash) || !document.contains(vista.querySelector('.cielo'))) { clearInterval(est.timer); return; }
      if (document.hidden || est.lector) return;
      var datos = await D.cronicas();
      if (!datos.ok || !datos.constelaciones || !datos.constelaciones.length) return;
      var f = firmaDe(datos);
      if (f === est.firma) return;
      est.datos = datos; est.firma = f;
      elegir(null);
      var y = window.scrollY;
      pintar(nuevasEstrellas());
      window.scrollTo(0, y);
    }, REVISAR_CADA);
  }

  /* =================== lector =================== */
  function abrirLector(id, origen) {
    var lista = legibles();
    var i = lista.map(function (x) { return x.s.id; }).indexOf(id);
    if (i < 0) return;
    var cap = document.createElement('div');
    cap.className = 'lector';
    cap.setAttribute('role', 'dialog'); cap.setAttribute('aria-modal', 'true'); cap.setAttribute('aria-label', 'Lectura del cuento');
    cap.innerHTML = '<div class="lector-velo" data-cerrar></div><div class="lector-libro"><button class="lector-cerrar" type="button" data-cerrar aria-label="Cerrar">' + ic('cerrar') + '</button><div class="lector-pagina" id="lector-pagina"></div>' +
      '<div class="lector-pie"><button class="boton sec peq" type="button" id="lector-ant">' + ic('izq') + '<span>Anterior</span></button><span class="lector-cuenta" id="lector-cuenta"></span><button class="boton sec peq" type="button" id="lector-sig"><span>Siguiente</span>' + ic('der') + '</button></div></div>';
    document.body.appendChild(cap);
    document.body.classList.add('leyendo');
    est.lector = { el: cap, lista: lista, i: i, origen: origen };
    mostrarPagina(0);
    requestAnimationFrame(function () { cap.classList.add('abierto'); });
    cap.querySelector('.lector-cerrar').focus();

    cap.addEventListener('click', function (e) { if (e.target.closest('[data-cerrar]')) cerrarLector(); });
    document.getElementById('lector-ant').addEventListener('click', function () { pasar(-1); });
    document.getElementById('lector-sig').addEventListener('click', function () { pasar(1); });
    cap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarLector();
      else if (e.key === 'ArrowLeft') pasar(-1);
      else if (e.key === 'ArrowRight') pasar(1);
      else if (e.key === 'Tab') { // mantener el foco dentro del lector
        var f = [].slice.call(cap.querySelectorAll('button:not([disabled])'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    var x0 = null;
    cap.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    cap.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) pasar(dx < 0 ? 1 : -1); }, { passive: true });
  }
  function pasar(dir) {
    var L = est.lector; if (!L) return;
    var j = L.i + dir; if (j < 0 || j >= L.lista.length) return;
    L.i = j; mostrarPagina(dir);
  }
  function mostrarPagina(dir) {
    var L = est.lector, x = L.lista[L.i], pag = document.getElementById('lector-pagina');
    var html = '<span class="runa">Constelación ' + x.n + ' · ' + esc(x.c.titulo) + '</span>' +
      '<h3><span>Estrella ' + x.s.orden + '</span>' + esc(x.s.titulo) + '</h3>' +
      '<div class="lector-texto">' + parrafos(x.s.texto).map(function (p, k) { return '<p style="--k:' + k + '">' + esc(p) + '</p>'; }).join('') + '</div>' +
      (x.s.estado === 'encendida' ? '<p class="lector-sello">' + ic('destello') + 'Estrella encendida</p>' : '');
    var poner = function () {
      pag.innerHTML = html; pag.scrollTop = 0;
      pag.classList.remove('girar-izq', 'girar-der', 'salir-izq', 'salir-der');
      if (dir && MOVIMIENTO) { void pag.offsetWidth; pag.classList.add(dir > 0 ? 'girar-der' : 'girar-izq'); }
    };
    if (dir && MOVIMIENTO && pag.innerHTML) { pag.classList.add(dir > 0 ? 'salir-izq' : 'salir-der'); setTimeout(poner, 220); } else poner();
    document.getElementById('lector-cuenta').textContent = (L.i + 1) + ' / ' + L.lista.length;
    document.getElementById('lector-ant').disabled = L.i === 0;
    document.getElementById('lector-sig').disabled = L.i === L.lista.length - 1;
  }
  function cerrarLector() {
    var L = est.lector; if (!L) return;
    est.lector = null;
    L.el.classList.remove('abierto');
    document.body.classList.remove('leyendo');
    var cual = L.lista[L.i];
    setTimeout(function () { L.el.remove(); }, MOVIMIENTO ? 260 : 0);
    // Si pasó a otra constelación mientras leía, la deja elegida
    if (cual && cual.c.id !== est.sel) { est.sel = cual.c.id; history.replaceState(null, '', '#cronicas/' + encodeURIComponent(est.sel)); pintar([]); }
    var t = document.querySelector('[data-leer="' + cual.s.id + '"]') || L.origen;
    if (t && document.contains(t)) t.focus();
  }

  /* =================== cielo animado =================== */
  function iniciarCielo() {
    var cv = vista.querySelector('.cielo-fondo');
    if (!cv) return;
    var ctx2 = cv.getContext('2d'), estrellas = [], fugaz = null, ancho = 0, alto = 0, ultimo = 0;
    function medir() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      ancho = r.width; alto = r.height;
      cv.width = Math.round(ancho * dpr); cv.height = Math.round(alto * dpr);
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rnd = azar(semilla('cielo' + Math.round(ancho)));
      estrellas = [];
      for (var i = 0; i < Math.round(ancho * alto / 3200); i++) estrellas.push({ x: rnd() * ancho, y: rnd() * alto, r: rnd() < .08 ? 1.4 : .7 + rnd() * .5, f: rnd() * 6.28, v: .6 + rnd() * 1.6 });
    }
    function cuadro(t) {
      if (!document.contains(cv)) return;
      if (t - ultimo < 40) { requestAnimationFrame(cuadro); return; }
      ultimo = t;
      ctx2.clearRect(0, 0, ancho, alto);
      for (var i = 0; i < estrellas.length; i++) {
        var s = estrellas[i], a = MOVIMIENTO ? .35 + .65 * (.5 + .5 * Math.sin(s.f + t / 1000 * s.v)) : .8;
        ctx2.globalAlpha = a; ctx2.fillStyle = '#FFF4DC';
        ctx2.beginPath(); ctx2.arc(s.x, s.y, s.r, 0, 6.283); ctx2.fill();
      }
      if (MOVIMIENTO) {
        if (!fugaz && Math.random() < .004) fugaz = { x: Math.random() * ancho * .7, y: Math.random() * alto * .35, t: 0 };
        if (fugaz) {
          fugaz.t += 1;
          var fx = fugaz.x + fugaz.t * 9, fy = fugaz.y + fugaz.t * 3.5;
          var g = ctx2.createLinearGradient(fx - 70, fy - 27, fx, fy);
          g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(255,240,210,.9)');
          ctx2.globalAlpha = Math.max(0, 1 - fugaz.t / 26); ctx2.strokeStyle = g; ctx2.lineWidth = 1.6;
          ctx2.beginPath(); ctx2.moveTo(fx - 70, fy - 27); ctx2.lineTo(fx, fy); ctx2.stroke();
          if (fugaz.t > 26) fugaz = null;
        }
      }
      ctx2.globalAlpha = 1;
      if (MOVIMIENTO) requestAnimationFrame(cuadro);
    }
    medir();
    if (window.ResizeObserver) new ResizeObserver(function () { if (document.contains(cv)) { medir(); if (!MOVIMIENTO) cuadro(1e9); } }).observe(cv);
    requestAnimationFrame(cuadro);
  }

  window.Cronicas = { ver: ver };
})();
