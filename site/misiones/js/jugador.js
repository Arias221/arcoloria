/* =====================================================================
   Sección de JUGADORES
   ===================================================================== */
(function () {
  'use strict';
  var D = window.Datos, C = window.Comun, ic = C.ic, esc = C.esc;
  var vista = document.getElementById('vista');
  var filtro = { tipo: 'todas', npc: '' };
  var cache = null;

  var RUTAS = { inicio: ['inicio', 'Inicio'], misiones: ['pergamino', 'Misiones'], cronicas: ['libro', 'Crónicas'], aventura: ['persona', 'Mi aventura'] };
  document.querySelectorAll('[data-ruta]').forEach(function (a) { var r = RUTAS[a.dataset.ruta]; a.innerHTML = ic(r[0]) + '<span>' + r[1] + '</span>'; });
  document.getElementById('marca-sello').innerHTML = C.SELLO;

  /* ---------- carga de datos ---------- */
  async function cargar(forzar) {
    if (cache && !forzar) return cache;
    var r = await Promise.all([D.obtenerConfiguracion(), D.listarNpcs(), D.listarCapitulos(), D.listarMisiones(), D.estadoSesionJugador()]);
    var sesion = r[4];
    var progreso = sesion ? await D.miProgreso() : [];
    cache = C.contexto({ config: r[0], npcs: r[1], capitulos: r[2], misiones: r[3], sesion: sesion, progreso: progreso });
    pintarSesion();
    return cache;
  }
  function pintarSesion() {
    var chip = document.getElementById('sesion-chip');
    if (cache && cache.sesion) chip.innerHTML = '<i>' + esc(cache.sesion.gamertag.charAt(0).toUpperCase()) + '</i><span>' + esc(cache.sesion.gamertag) + '</span>';
    else chip.innerHTML = '<i>' + ic('enlace') + '</i><span>Vincular</span>';
  }

  /* ---------- rutas ---------- */
  function ruta() {
    var h = decodeURIComponent(location.hash.replace(/^#/, '')) || 'inicio';
    var partes = h.split('/');
    return { nombre: partes[0], id: partes.slice(1).join('/') };
  }
  async function navegar() {
    var r = ruta();
    var activa = r.nombre === 'mision' ? 'misiones' : r.nombre;
    document.querySelectorAll('[data-ruta]').forEach(function (a) {
      var on = a.dataset.ruta === activa;
      a.classList.toggle('activo', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    vista.innerHTML = C.cargando();
    try {
      var d = await cargar();
      if (r.nombre === 'misiones') verMisiones(d);
      else if (r.nombre === 'mision') await verMision(d, r.id);
      else if (r.nombre === 'cronicas') await verCronicas(d);
      else if (r.nombre === 'aventura') await verAventura(d);
      else verInicio(d);
    } catch (e) {
      console.error(e);
      vista.innerHTML = '<section class="perg"><p>No pudimos abrir el libro de misiones. Revisa tu conexión e inténtalo de nuevo.</p><div class="acciones"><button class="boton" type="button" onclick="location.reload()">Reintentar</button></div></section>';
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', navegar);

  /* ---------- Inicio ---------- */
  function verInicio(d) {
    var activas = d.misiones.filter(function (m) { return m.activa; });
    var hist = activas.filter(function (m) { return m.categoria === 'historia'; }).length;
    vista.innerHTML =
      '<header class="portada entrar"><div class="sello">' + C.SELLO + '</div><span class="runa">Gremio de aventureros</span><h1>Libro de Misiones</h1>' +
      '<p class="lema">Cada misión es una página nueva de tu leyenda. Elige tu camino, cumple tu palabra y reclama tu recompensa.</p></header>' +
      '<div class="adorno" aria-hidden="true"><span></span>' + ic('destello') + '<span></span></div>' +
      '<div class="accesos">' +
        acceso('#misiones', 'pergamino', 'Misiones', activas.length + ' misiones esperan en el tablón del gremio.') +
        acceso('#cronicas', 'libro', 'Crónicas', hist ? 'La historia del reino, capítulo a capítulo.' : 'La historia del reino.') +
        acceso('#aventura', 'persona', 'Mi aventura', d.sesion ? 'Tu progreso, ' + d.sesion.gamertag + '.' : 'Vincula tu cuenta del juego.') +
      '</div>' +
      '<section class="perg entrar" style="margin-top:34px"><div class="perg-brillo"></div><span class="runa">Cómo funciona</span>' +
        '<ol class="pasos-inicio">' +
          '<li><span>En el juego escribe <b>/misiones</b> y elige «Vincular con la página» para obtener tu código.</span></li>' +
          '<li><span>Mira aquí las misiones y acéptalas en el juego junto al NPC que las entrega, con <b>/misiones</b>. Las de <b>historia</b> cuentan la leyenda del reino; las <b>independientes</b> se pueden repetir.</span></li>' +
          '<li><span>Juega con normalidad: tu avance se guarda solo mientras cumples los objetivos.</span></li>' +
          '<li><span>Al terminar, vuelve con ese NPC y entrégala para recibir tu recompensa. Si es de historia, se desbloquea su capítulo en las Crónicas.</span></li>' +
        '</ol></section>';
  }
  function acceso(href, icono, titulo, texto) {
    return '<a class="perg acceso entrar" href="' + href + '"><div class="perg-brillo"></div><span class="emblema">' + ic(icono) + '</span><div><h3>' + titulo + '</h3><p>' + esc(texto) + '</p></div>' + ic('der') + '</a>';
  }

  /* ---------- Misiones ---------- */
  function verMisiones(d) {
    var npcsUsados = d.npcs.filter(function (n) { return d.misiones.some(function (m) { var x = C.npcDe(m, d); return x && x.id === n.id; }); });
    vista.innerHTML =
      '<div class="titulo-seccion entrar"><span class="runa">Tablón del gremio</span><h2>Misiones</h2><p>Toca una misión para ver qué tienes que hacer y qué ganas.</p></div>' +
      '<div class="filtros" role="toolbar" aria-label="Filtrar misiones">' +
        ['todas:Todas', 'historia:Historia', 'independiente:Independientes'].concat(d.sesion ? ['disponibles:Disponibles para mí'] : []).map(function (x) { var p = x.split(':'); return '<button type="button" class="filtro' + (filtro.tipo === p[0] ? ' activo' : '') + '" data-filtro="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
        '<select class="filtro" id="filtro-npc" aria-label="Filtrar por NPC"><option value="">Todos los NPC</option>' + npcsUsados.map(function (n) { return '<option value="' + esc(n.id) + '"' + (filtro.npc === n.id ? ' selected' : '') + '>' + esc(n.nombre) + '</option>'; }).join('') + '</select>' +
      '</div><div class="lista-misiones" id="lista"></div>';
    pintarLista(d);
    vista.querySelectorAll('[data-filtro]').forEach(function (b) {
      b.addEventListener('click', function () { filtro.tipo = b.dataset.filtro; vista.querySelectorAll('[data-filtro]').forEach(function (x) { x.classList.toggle('activo', x === b); }); pintarLista(d); });
    });
    document.getElementById('filtro-npc').addEventListener('change', function () { filtro.npc = this.value; pintarLista(d); });
  }
  function pintarLista(d) {
    var orden = { aceptada: 0, disponible: 1, sin_sesion: 1, limite: 2, espera: 3, bloqueada: 4, completada: 5, inactiva: 6 };
    var lista = d.misiones.filter(function (m) {
      if (!m.activa) return false;
      if (filtro.tipo === 'historia' && m.categoria !== 'historia') return false;
      if (filtro.tipo === 'independiente' && m.categoria !== 'independiente') return false;
      if (filtro.tipo === 'disponibles' && C.estadoMision(m, d).clave !== 'disponible') return false;
      if (filtro.npc) { var n = C.npcDe(m, d); if (!n || n.id !== filtro.npc) return false; }
      return true;
    }).sort(function (a, b) {
      var ea = orden[C.estadoMision(a, d).clave] || 0, eb = orden[C.estadoMision(b, d).clave] || 0;
      if (ea !== eb) return ea - eb;
      if (a.categoria !== b.categoria) return a.categoria === 'historia' ? -1 : 1;
      var ca = d.capitulos.find(function (c) { return c.id === a.capitulo_id; }), cb = d.capitulos.find(function (c) { return c.id === b.capitulo_id; });
      return ((ca ? ca.orden : 0) - (cb ? cb.orden : 0)) || (a.orden - b.orden);
    });
    var cont = document.getElementById('lista');
    cont.innerHTML = lista.length ? lista.map(function (m) { return C.tarjetaMision(m, d); }).join('') :
      '<section class="perg" style="grid-column:1/-1"><p class="vacio">No hay misiones con estos filtros. Prueba con otro.</p></section>';
  }
  vista.addEventListener('click', function (e) {
    var t = e.target.closest('[data-mision]');
    if (t) { location.hash = '#mision/' + encodeURIComponent(t.dataset.mision); return; }
    var a = e.target.closest('[data-aceptar]');
    if (a) aceptar(a);
    var v = e.target.closest('[data-volver]');
    if (v) { e.preventDefault(); if (history.length > 1 && document.referrer.indexOf(location.host) >= 0) history.back(); else location.hash = '#misiones'; }
  });
  vista.addEventListener('keydown', function (e) {
    var t = e.target.closest && e.target.closest('[data-mision]');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = '#mision/' + encodeURIComponent(t.dataset.mision); }
  });

  /* ---------- Detalle ---------- */
  async function verMision(d, id) {
    var m = d.misiones.find(function (x) { return x.id === id; });
    if (!m || !m.activa) {
      vista.innerHTML = '<a class="volver" href="#misiones">' + ic('izq') + 'Volver a misiones</a><section class="perg" style="margin-top:22px"><p>Esta misión ya no está en el tablón.</p></section>';
      return;
    }
    vista.innerHTML = '<a class="volver" href="#misiones">' + ic('izq') + 'Volver a misiones</a><div style="margin-top:22px">' + C.detalleMision(m, d) + '</div>';
  }
  async function aceptar(btn) {
    btn.disabled = true; btn.innerHTML = ic('destello') + 'Aceptando…';
    var r = await D.aceptarMision(btn.dataset.aceptar);
    if (r.ok) {
      C.toast('Tu misión se activará en el juego en unos segundos.', 'magico');
      await cargar(true); navegar();
    } else {
      C.toast(r.motivo || 'No se pudo aceptar la misión.', 'error');
      btn.disabled = false; btn.innerHTML = ic('destello') + 'Aceptar misión';
    }
  }

  /* ---------- Crónicas ---------- */
  async function verCronicas(d) {
    var historias = d.sesion ? await D.miHistoria() : [];
    var porCap = {}; historias.forEach(function (h) { porCap[h.capitulo_id] = h; });
    var caps = d.capitulos.filter(function (c) { return c.activo; });
    vista.innerHTML =
      '<div class="titulo-seccion entrar"><span class="runa">La leyenda del reino</span><h2>Crónicas</h2><p>' +
      (d.sesion ? 'Cada capítulo que completas se escribe aquí para siempre.' : 'Vincula tu cuenta para leer los capítulos que ya completaste.') + '</p></div>' +
      (caps.length ? '<div class="linea-tiempo">' + caps.map(function (c) {
        var h = porCap[c.id];
        var nMis = d.misiones.filter(function (m) { return m.categoria === 'historia' && m.capitulo_id === c.id && m.activa; }).length;
        return '<article class="capitulo entrar' + (h ? '' : ' bloqueado') + '"><span class="punto">' + c.orden + '</span><div class="perg"><div class="perg-brillo"></div>' +
          '<span class="num-cap">Capítulo ' + c.orden + '</span><h3>' + esc(c.titulo) + '</h3>' + (c.resumen ? '<p class="resumen">' + esc(c.resumen) + '</p>' : '') +
          (h ? (h.texto ? '<div class="texto-historia">' + esc(h.texto) + '</div>' : '') + (h.imagen_url ? '<img class="historia-img" src="' + esc(h.imagen_url) + '" alt="Ilustración del capítulo" loading="lazy" onerror="this.remove()">' : '')
             : '<p class="candado">' + ic('candado') + (d.sesion ? 'Completa ' + (nMis === 1 ? 'su misión' : 'sus ' + nMis + ' misiones') + ' para leer este capítulo' : 'Capítulo sellado') + '</p>') +
          '</div></article>';
      }).join('') + '</div>' : '<section class="perg"><p class="vacio">Las crónicas todavía no tienen capítulos.</p></section>') +
      (d.sesion ? '' : '<div class="acciones" style="justify-content:center"><a class="boton magico" href="#aventura">' + ic('enlace') + 'Vincular mi cuenta</a></div>');
  }

  /* ---------- Mi aventura ---------- */
  async function verAventura(d) {
    if (!d.sesion) {
      vista.innerHTML =
        '<div class="titulo-seccion entrar"><span class="runa">Tu aventura</span><h2>Vincula tu cuenta</h2><p>Así podrás ver aquí tu progreso, tus misiones en curso y las crónicas que vayas desbloqueando.</p></div>' +
        '<section class="perg entrar"><div class="perg-brillo"></div>' +
          '<ol class="pasos-inicio">' +
            '<li><span>Entra al servidor y escribe <b>/misiones</b> en el chat.</span></li>' +
            '<li><span>Elige <b>Vincular con la página</b> y anota tu código. Son 6 letras o números y vence en 10 minutos.</span></li>' +
            '<li><span>Escríbelo aquí abajo y toca <b>Vincular</b>.</span></li>' +
          '</ol>' +
          '<form class="codigo-form" id="form-codigo" autocomplete="off"><label class="sr" for="codigo">Código de vinculación</label>' +
            '<input class="codigo-input" id="codigo" maxlength="6" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="······" required>' +
            '<button class="boton magico ancho" type="submit">' + ic('enlace') + 'Vincular</button></form>' +
        '</section>';
      var inp = document.getElementById('codigo');
      inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
      document.getElementById('form-codigo').addEventListener('submit', async function (e) {
        e.preventDefault();
        var b = this.querySelector('button'); b.disabled = true;
        var r = await D.vincularCuenta(inp.value);
        b.disabled = false;
        if (r.ok) { C.toast('¡Bienvenido, ' + r.jugador.gamertag + '! Tu cuenta quedó vinculada.', 'magico'); await cargar(true); navegar(); }
        else { C.toast(r.motivo || 'No se pudo vincular.', 'error'); inp.focus(); }
      });
      return;
    }
    var prog = d.progreso;
    var aceptadas = d.misiones.filter(function (m) { return d.porMision[m.id] && d.porMision[m.id].estado === 'aceptada'; });
    var completadas = d.misiones.filter(function (m) { return d.hechas[m.id]; });
    var caps = d.capitulos.filter(function (c) { return c.activo && d.capCompleto(c.id); });
    var vecesTotal = prog.reduce(function (s, p) { return s + (p.veces_completada || 0); }, 0);
    vista.innerHTML =
      '<div class="titulo-seccion entrar"><span class="runa">Tu aventura</span><h2>Mi aventura</h2></div>' +
      '<section class="perg entrar"><div class="perg-brillo"></div><div class="perfil"><span class="avatar">' + esc(d.sesion.gamertag.charAt(0).toUpperCase()) + '</span><div><h2>' + esc(d.sesion.gamertag) + '</h2><p style="color:var(--tinta-suave)">Aventurero del gremio</p></div></div>' +
        '<div class="resumen-nums"><div><b>' + aceptadas.length + '</b><span>En curso</span></div><div><b>' + vecesTotal + '</b><span>Completadas</span></div><div><b>' + caps.length + '</b><span>Capítulos</span></div></div></section>' +
      '<section class="perg entrar"><div class="perg-brillo"></div><div class="bloque" style="margin-top:0"><h3>Misiones en curso</h3>' +
        (aceptadas.length ? '<div class="lista-mini">' + aceptadas.map(function (m) { return mini(m, d, true); }).join('') + '</div>' : '<p class="vacio">No tienes misiones en curso. <a href="#misiones" style="color:var(--oro)">Busca una en el tablón</a>.</p>') + '</div></section>' +
      '<section class="perg entrar"><div class="perg-brillo"></div><div class="bloque" style="margin-top:0"><h3>Completadas</h3>' +
        (completadas.length ? '<div class="lista-mini">' + completadas.map(function (m) { return mini(m, d, false); }).join('') + '</div>' : '<p class="vacio">Aún no completas ninguna misión.</p>') + '</div></section>' +
      '<section class="perg entrar"><div class="perg-brillo"></div><div class="bloque" style="margin-top:0"><h3>Capítulos alcanzados</h3>' +
        (caps.length ? '<div class="lista-mini">' + caps.map(function (c) { return '<a class="mini-mision" href="#cronicas" style="text-decoration:none"><div class="cab"><span class="orden-num" style="width:36px;height:36px;font-size:.9rem">' + c.orden + '</span><b>' + esc(c.titulo) + '</b>' + ic('libro') + '</div></a>'; }).join('') + '</div>' : '<p class="vacio">Completa las misiones de historia para escribir tu primer capítulo.</p>') + '</div></section>' +
      '<div class="acciones" style="justify-content:center"><button class="boton peligro" type="button" id="desvincular">' + ic('salir') + 'Desvincular cuenta</button></div>';
    document.getElementById('desvincular').addEventListener('click', async function () {
      if (!window.confirm('¿Desvincular tu cuenta en este dispositivo? Tu progreso en el juego no se pierde.')) return;
      await D.cerrarSesionJugador(); C.toast('Cuenta desvinculada.'); await cargar(true); navegar();
    });
  }
  function mini(m, d, conBarras) {
    var p = d.porMision[m.id], e = C.estadoMision(m, d);
    return '<div class="mini-mision" data-mision="' + esc(m.id) + '" tabindex="0" role="link"><div class="cab">' + C.imgIcono(m.icono, '') + '<b>' + esc(m.titulo) + '</b>' + C.etiquetaEstado(e) + '</div>' +
      (conBarras ? C.barras(m, p) : (p && p.veces_completada > 1 ? '<small style="color:var(--tinta-suave)">Completada ' + p.veces_completada + ' veces</small>' : '')) + '</div>';
  }

  C.iniciarChispas();
  C.iniciarNiebla();
  navegar();
})();
