/* =====================================================================
   Sección de ADMINISTRACIÓN
   ===================================================================== */
(function () {
  'use strict';
  var D = window.Datos, C = window.Comun, ic = C.ic, esc = C.esc;
  var raiz = document.getElementById('raiz');
  var datos = null;          // configuración, npcs, capítulos y misiones
  var pestana = 'panel';
  var busqueda = { texto: '', categoria: '', estado: '', npc: '' };
  var form = null;           // misión en edición

  document.getElementById('marca-sello').innerHTML = C.SELLO;
  document.getElementById('ver-pagina').innerHTML = ic('ojo') + '<span>Ver página</span>';
  document.getElementById('salir').innerHTML = ic('salir') + '<span>Salir</span>';

  var ID_VALIDO = /^[a-z0-9_]+$/;
  var TIPOS = { matar: 'Matar', romper: 'Romper bloque', colocar: 'Colocar bloque', usar: 'Usar ítem', interactuar: 'Interactuar', consumir: 'Consumir', obtener: 'Obtener ítem' };
  var REPETICION = { una_vez: 'Una sola vez', por_dia: 'Varias veces al día', cada_horas: 'Cada cierto número de horas' };
  var SI_NO = ['bajo_agua', 'agachado', 'en_llamas', 'en_aire', 'sin_armadura', 'sin_dano'];
  var CONDICIONES = [
    ['herramienta', 'Herramienta en la mano'], ['metodo', 'Forma de matar'], ['dimension', 'Dimensión'], ['bioma', 'Bioma'], ['hora_del_dia', 'Hora del día'],
    ['fase_lunar', 'Fase lunar'], ['clima', 'Clima'], ['zona', 'Zona (dos esquinas)'], ['altura', 'Altura (Y)'], ['ubicacion_objetivo', 'Ubicación exacta (interactuar)'],
    ['cerca_de', 'Cerca de una entidad'], ['montado', 'Montado en'], ['sin_dano', 'Sin recibir daño'], ['encantamiento', 'Encantamiento en la herramienta'],
    ['vida', 'Vida del jugador'], ['efecto', 'Efecto activo'], ['hambre', 'Hambre'], ['nivel', 'Nivel de experiencia mínimo'], ['puntaje', 'Puntaje de marcador'],
    ['bajo_agua', 'Bajo el agua'], ['agachado', 'Agachado'], ['en_llamas', 'En llamas'], ['en_aire', 'En el aire'], ['sin_armadura', 'Sin armadura'],
    ['plataforma', 'Plataforma'], ['etiqueta', 'Etiqueta (tag)'], ['equipo', 'Equipo puesto'], ['sobre_bloque', 'Parado sobre un bloque']
  ];
  var NOMBRE_COND = {}; CONDICIONES.forEach(function (c) { NOMBRE_COND[c[0]] = c[1]; });
  var DEF_COND = {
    herramienta: 'bow', metodo: 'entityAttack', dimension: 'overworld', bioma: 'plains', hora_del_dia: 'night', fase_lunar: 'fullmoon', clima: 'clear',
    zona: { x1: 0, y1: 0, z1: 0, x2: 10, y2: 10, z2: 10 }, altura: { tipo: 'encima', valor: 64 }, ubicacion_objetivo: { x: 0, y: 64, z: 0 },
    cerca_de: { entidad: 'villager', radio: 8 }, montado: 'horse', sin_dano: true, encantamiento: { id: 'sharpness', nivel: 1 }, vida: { tipo: 'encima', valor: 10 },
    efecto: { id: 'speed', nivel: 1 }, hambre: { tipo: 'encima', valor: 10 }, nivel: 10, puntaje: { objetivo: '', valor: 1 }, bajo_agua: true, agachado: true,
    en_llamas: true, en_aire: true, sin_armadura: true, plataforma: 'mobile', etiqueta: '', equipo: { ranura: 'helmet', item: 'diamond_helmet' }, sobre_bloque: 'grass_block'
  };
  var SOLO_NETHER = ['ghast', 'wither_skeleton', 'blaze', 'magma_cube', 'piglin', 'piglin_brute', 'hoglin', 'zoglin', 'strider', 'zombified_piglin'];
  var SOLO_END = ['shulker', 'endermite', 'ender_dragon'];
  var HERRAMIENTAS = ['bow', 'crossbow', 'trident', 'mace', 'wooden_sword', 'stone_sword', 'iron_sword', 'golden_sword', 'diamond_sword', 'netherite_sword', 'iron_axe', 'diamond_axe', 'netherite_axe', 'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe', 'iron_shovel', 'diamond_shovel', 'shears', 'fishing_rod', 'flint_and_steel', 'shield'];

  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function opciones(obj, valor, vacio) {
    return (vacio != null ? '<option value="">' + esc(vacio) + '</option>' : '') + Object.keys(obj).map(function (k) {
      var t = Array.isArray(obj[k]) ? obj[k][0] : obj[k];
      return '<option value="' + esc(k) + '"' + (String(valor) === k ? ' selected' : '') + '>' + esc(t.charAt(0).toUpperCase() + t.slice(1)) + '</option>';
    }).join('');
  }
  function aviso(texto, tipo) { C.toast(texto, tipo); }
  function confirmar(texto) { return window.confirm(texto); }
  var selector = document.getElementById('selector-servidor');
  async function recargar() {
    var servidores = await D.listarServidores();
    var r = await Promise.all([D.obtenerConfiguracion(), D.listarNpcs(), D.listarCapitulos(), D.listarMisiones()]);
    datos = { config: r[0], npcs: r[1], capitulos: r[2], misiones: r[3], servidores: servidores };
    var html = C.selectorServidor(servidores, D.servidorActual());
    selector.innerHTML = html; selector.hidden = !html;
  }
  function otrosServidores() {
    return (datos.servidores || []).filter(function (s) { return s.id !== D.servidorActual(); });
  }
  function botonesCopiar(atributo, id) {
    return otrosServidores().map(function (s) {
      return '<button class="boton sec peq" type="button" data-' + atributo + '="' + esc(id) + '" data-destino="' + esc(s.id) + '" title="Copiar a ' + esc(s.nombre) + '">' + ic('copiar') + 'A ' + esc(s.nombre) + '</button>';
    }).join('');
  }
  async function copiarA(tipo, id, destino) {
    var r = tipo === 'mision' ? await D.copiarMision(id, destino) : await D.copiarCapitulo(id, destino);
    if (!(await revisarSesion(r))) return;
    if (r.ok) aviso((tipo === 'mision' ? 'Misión copiada' : 'Capítulo copiado') + ' a ' + D.nombreServidor(destino) + ' como «' + r.id + '». ' + (tipo === 'mision' ? 'Llega inactiva: revísala y actívala allí.' : 'Llega inactivo: revísalo y actívalo allí.'), 'magico');
    else aviso(r.motivo || 'No se pudo copiar.', 'error');
  }
  selector.addEventListener('click', async function (e) {
    var b = e.target.closest('[data-servidor]');
    if (!b || b.dataset.servidor === D.servidorActual()) return;
    if (form && !confirmar('Tienes una misión sin guardar. ¿Cambiar de servidor de todos modos?')) return;
    form = null;
    D.cambiarServidor(b.dataset.servidor);
    raiz.innerHTML = C.cargando('Abriendo ' + D.nombreServidor() + '…');
    await recargar(); pintar(); window.scrollTo(0, 0);
  });

  /* =================== acceso =================== */
  async function iniciar() {
    raiz.innerHTML = C.cargando('Verificando acceso…');
    if (await D.esAdmin()) { document.getElementById('salir').hidden = false; await recargar(); pintar(); }
    else mostrarLogin();
  }
  function mostrarLogin(msg) {
    document.getElementById('salir').hidden = true;
    raiz.innerHTML = '<div class="login"><section class="perg entrar"><div class="perg-brillo"></div><div class="portada" style="padding:6px 0 0"><div class="sello">' + C.SELLO + '</div><span class="runa">Solo administradores</span><h1 style="font-size:2.2rem">Administración</h1></div>' +
      '<form id="form-login" autocomplete="on">' +
        '<label class="campo"><span>Correo</span><input type="email" id="correo" autocomplete="username" required></label>' +
        '<label class="campo"><span>Contraseña</span><input type="password" id="clave" autocomplete="current-password" required></label>' +
        '<button class="boton ancho" type="submit">' + ic('destello') + 'Entrar</button>' +
        '<p class="msg-error" id="login-msg" role="alert">' + esc(msg || '') + '</p></form></section></div>';
    document.getElementById('form-login').addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = this.querySelector('button'); b.disabled = true;
      var r = await D.iniciarSesionAdmin(document.getElementById('correo').value, document.getElementById('clave').value);
      b.disabled = false;
      if (r.ok) { aviso('¡Bienvenido al panel!'); iniciar(); }
      else document.getElementById('login-msg').textContent = r.motivo || 'No se pudo iniciar sesión.';
    });
  }
  document.getElementById('salir').addEventListener('click', async function () {
    if (form && !confirmar('Tienes una misión sin guardar. ¿Salir de todos modos?')) return;
    form = null; await D.cerrarSesionAdmin(); mostrarLogin(); aviso('Sesión cerrada.');
  });
  async function revisarSesion(r) {
    if (r && r.ok === false && /sesión/.test(r.motivo || '')) { mostrarLogin(r.motivo); return false; }
    return true;
  }

  /* =================== estructura =================== */
  var PESTANAS = [['panel', 'panel', 'Panel'], ['misiones', 'pergamino', 'Misiones'], ['capitulos', 'libro', 'Capítulos'], ['npcs', 'grupo', 'NPCs'], ['config', 'ajustes', 'Configuración']];
  function pintar() {
    raiz.innerHTML = '<div class="admin-layout"><nav class="admin-tabs" aria-label="Secciones">' +
      PESTANAS.map(function (p) { return '<button type="button" data-tab="' + p[0] + '"' + (pestana === p[0] ? ' class="activo" aria-current="page"' : '') + '>' + ic(p[1]) + p[2] + '</button>'; }).join('') +
      '</nav><div id="contenido"></div></div>';
    raiz.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (form && !confirmar('Tienes una misión sin guardar. ¿Salir de todos modos?')) return;
        form = null; pestana = b.dataset.tab; pintar(); window.scrollTo(0, 0);
      });
    });
    var c = document.getElementById('contenido');
    if (form) return pintarFormMision(c);
    if (pestana === 'misiones') pintarMisiones(c);
    else if (pestana === 'capitulos') pintarCapitulos(c);
    else if (pestana === 'npcs') pintarNpcs(c);
    else if (pestana === 'config') pintarConfig(c);
    else pintarPanel(c);
  }
  function titulo(runa, texto, extra) { return '<div class="titulo-seccion" style="text-align:left;margin-top:4px"><span class="runa">' + runa + ' · ' + esc(D.nombreServidor()) + '</span><h2>' + texto + '</h2>' + (extra ? '<p style="margin-left:0">' + extra + '</p>' : '') + '</div>'; }

  /* =================== panel =================== */
  function pintarPanel(c) {
    var activas = datos.misiones.filter(function (m) { return m.activa; }).length;
    var principal = datos.npcs.find(function (n) { return n.es_principal; });
    c.innerHTML = titulo('Resumen', 'Panel') +
      '<div class="resumen-admin"><div class="perg"><b>' + datos.misiones.length + '</b><span>Misiones</span></div><div class="perg"><b>' + datos.capitulos.length + '</b><span>Capítulos</span></div><div class="perg"><b>' + datos.npcs.length + '</b><span>NPCs</span></div></div>' +
      '<section class="perg entrar" style="margin-top:22px"><div class="perg-brillo"></div><div class="datos-mision">' +
        '<div class="dato">' + ic('check') + '<span>' + activas + ' misiones activas y ' + (datos.misiones.length - activas) + ' inactivas.</span></div>' +
        '<div class="dato">' + ic('persona') + '<span>NPC principal: <b>' + esc(principal ? principal.nombre : 'ninguno') + '</b></span></div>' +
        '<div class="dato">' + ic('reloj') + '<span>Los límites diarios se reinician a las ' + datos.config.hora_reinicio + ':00 (' + esc(datos.config.zona_horaria) + ').</span></div>' +
        '<div class="dato">' + ic('estrella') + '<span>Máximo ' + datos.config.max_misiones_activas + ' independientes en curso y ' + datos.config.max_completadas_diarias + ' completadas por día.</span></div>' +
      '</div><div class="acciones"><button class="boton" type="button" id="p-nueva">' + ic('mas') + 'Crear misión</button><button class="boton sec" type="button" id="p-cap">' + ic('libro') + 'Ver capítulos</button></div></section>';
    document.getElementById('p-nueva').addEventListener('click', function () { pestana = 'misiones'; abrirFormMision(null); });
    document.getElementById('p-cap').addEventListener('click', function () { pestana = 'capitulos'; pintar(); });
  }

  /* =================== misiones: lista =================== */
  function pintarMisiones(c) {
    c.innerHTML = titulo('Tablón del gremio', 'Misiones') +
      '<div class="barra-herr"><input class="entrada" type="search" id="b-texto" placeholder="Buscar por título o id…" value="' + esc(busqueda.texto) + '" aria-label="Buscar misiones">' +
        '<button class="boton" type="button" id="m-nueva">' + ic('mas') + 'Crear misión</button></div>' +
      '<div class="filtros"><select class="filtro" id="b-cat" aria-label="Categoría"><option value="">Todas las categorías</option><option value="historia"' + (busqueda.categoria === 'historia' ? ' selected' : '') + '>Historia</option><option value="independiente"' + (busqueda.categoria === 'independiente' ? ' selected' : '') + '>Independientes</option></select>' +
        '<select class="filtro" id="b-estado" aria-label="Estado"><option value="">Activas e inactivas</option><option value="1"' + (busqueda.estado === '1' ? ' selected' : '') + '>Solo activas</option><option value="0"' + (busqueda.estado === '0' ? ' selected' : '') + '>Solo inactivas</option></select>' +
        '<select class="filtro" id="b-npc" aria-label="NPC"><option value="">Todos los NPC</option>' + datos.npcs.map(function (n) { return '<option value="' + esc(n.id) + '"' + (busqueda.npc === n.id ? ' selected' : '') + '>' + esc(n.nombre) + '</option>'; }).join('') + '</select></div>' +
      '<div class="lista-admin" id="m-lista"></div>';
    function filtrar() {
      var t = busqueda.texto.toLowerCase();
      var lista = datos.misiones.filter(function (m) {
        if (t && (m.titulo + ' ' + m.id).toLowerCase().indexOf(t) < 0) return false;
        if (busqueda.categoria && m.categoria !== busqueda.categoria) return false;
        if (busqueda.estado && String(m.activa ? 1 : 0) !== busqueda.estado) return false;
        if (busqueda.npc && m.npc_id !== busqueda.npc) return false;
        return true;
      });
      document.getElementById('m-lista').innerHTML = lista.length ? lista.map(function (m) {
        var cap = datos.capitulos.find(function (x) { return x.id === m.capitulo_id; });
        return '<div class="fila-admin">' + C.imgIcono(m.icono, '') + '<div><b>' + esc(m.titulo) + '</b><small>' + esc(m.id) + ' · ' + (m.categoria === 'historia' ? 'Historia' + (cap ? ' · cap. ' + cap.orden : '') : 'Independiente') + ' · ' + m.objetivos.length + (m.objetivos.length === 1 ? ' objetivo' : ' objetivos') + (m.activa ? '' : ' · <span style="color:var(--rojo)">inactiva</span>') + '</small></div>' +
          '<div class="botones"><button class="boton sec peq" type="button" data-editar="' + esc(m.id) + '">' + ic('editar') + 'Editar</button><button class="boton sec peq" type="button" data-duplicar="' + esc(m.id) + '">' + ic('copiar') + 'Duplicar</button>' + botonesCopiar('copiar', m.id) + '<button class="boton peligro peq" type="button" data-eliminar="' + esc(m.id) + '">' + ic('basura') + 'Eliminar</button></div></div>';
      }).join('') : '<section class="perg"><p class="vacio">No hay misiones con esos filtros.</p></section>';
    }
    filtrar();
    document.getElementById('b-texto').addEventListener('input', function () { busqueda.texto = this.value; filtrar(); });
    ['cat', 'estado', 'npc'].forEach(function (k) { document.getElementById('b-' + k).addEventListener('change', function () { busqueda[k === 'cat' ? 'categoria' : k] = this.value; filtrar(); }); });
    document.getElementById('m-nueva').addEventListener('click', function () { abrirFormMision(null); });
    c.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.editar) abrirFormMision(b.dataset.editar);
      if (b.dataset.duplicar) abrirFormMision(b.dataset.duplicar, true);
      if (b.dataset.copiar) await copiarA('mision', b.dataset.copiar, b.dataset.destino);
      if (b.dataset.eliminar) {
        var m = datos.misiones.find(function (x) { return x.id === b.dataset.eliminar; });
        if (!confirmar('¿Eliminar la misión «' + m.titulo + '»? Esta acción no se puede deshacer.')) return;
        var r = await D.eliminarMision(m.id);
        if (!(await revisarSesion(r))) return;
        if (r.ok) { aviso('Misión eliminada.'); await recargar(); pintar(); } else aviso(r.motivo, 'error');
      }
    });
  }

  /* =================== misiones: formulario =================== */
  function misionVacia() {
    var principal = datos.capitulos[0];
    return { id: '', titulo: '', descripcion: '', icono: 'textures/items/', categoria: 'independiente', capitulo_id: principal ? principal.id : '', orden: 1, npc_id: '', mision_previa: '',
      repeticion: 'una_vez', repeticion_veces: 1, repeticion_horas: 24, tiempo_limite_seg: null, recompensa_texto: '', activa: true };
  }
  async function abrirFormMision(id, duplicar) {
    var m, objetivos, comandos = [];
    if (id) {
      var orig = datos.misiones.find(function (x) { return x.id === id; });
      m = copia(orig); objetivos = copia(orig.objetivos || []); delete m.objetivos;
      comandos = await D.obtenerComandos(id);
    } else { m = misionVacia(); objetivos = [{ tipo: 'matar', objetivo: 'minecraft:zombie', cantidad: 5, descripcion: '', condiciones: {} }]; }
    if (duplicar) {
      var base = m.id + '_copia', n = 2, nuevo = base;
      while (datos.misiones.some(function (x) { return x.id === nuevo; })) nuevo = base + n++;
      m.id = nuevo; m.titulo = m.titulo + ' (copia)';
      objetivos.forEach(function (o) { delete o.id; });
    }
    form = { mision: m, objetivos: objetivos, comandos: comandos.join('\n'), idOriginal: (id && !duplicar) ? id : null, errores: {} };
    pestana = 'misiones'; pintar(); window.scrollTo(0, 0);
  }
  function campo(etq, html, ayuda, clave) {
    var err = form && form.errores[clave];
    return '<label class="campo' + (err ? ' error' : '') + '"><span>' + etq + '</span>' + html + (err ? '<span class="msg-error">' + esc(err) + '</span>' : (ayuda ? '<small>' + ayuda + '</small>' : '')) + '</label>';
  }
  function pintarFormMision(c) {
    var m = form.mision, esHist = m.categoria === 'historia';
    if (esHist) m.repeticion = 'una_vez';
    var otras = datos.misiones.filter(function (x) { return x.id !== (form.idOriginal || m.id); });
    c.innerHTML = titulo(form.idOriginal ? 'Editar misión' : 'Nueva misión', esc(m.titulo || 'Misión sin título')) +
      '<form id="f-mision" novalidate>' +
      '<section class="perg"><div class="bloque" style="margin-top:0"><h3>Datos generales</h3><div class="rejilla">' +
        '<div class="rejilla r2">' + campo('Id', '<input type="text" data-m="id" value="' + esc(m.id) + '" placeholder="cazador_ghasts" autocapitalize="off" spellcheck="false">', 'Minúsculas, números y guion bajo. Es el nombre interno.', 'id') +
          campo('Título', '<input type="text" data-m="titulo" value="' + esc(m.titulo) + '" placeholder="Cazador de Ghasts">', '', 'titulo') + '</div>' +
        campo('Descripción', '<textarea data-m="descripcion" placeholder="Qué tiene que hacer el jugador y por qué…">' + esc(m.descripcion) + '</textarea>', 'La lee el jugador. Sin términos técnicos.') +
        '<div class="rejilla r2">' + campo('Ícono', '<input type="text" data-m="icono" value="' + esc(m.icono) + '" placeholder="textures/items/ghast_tear" spellcheck="false">', 'Ruta de la textura del ítem.') +
          '<div class="campo"><span>Vista del ícono</span><div style="display:flex;align-items:center;gap:10px" id="icono-prev">' + C.imgIcono(m.icono, '') + '</div></div></div>' +
        '<div class="rejilla r3">' + campo('Categoría', '<select data-m="categoria"><option value="independiente"' + (!esHist ? ' selected' : '') + '>Independiente</option><option value="historia"' + (esHist ? ' selected' : '') + '>Historia</option></select>') +
          (esHist ? campo('Capítulo', '<select data-m="capitulo_id">' + datos.capitulos.map(function (x) { return '<option value="' + esc(x.id) + '"' + (m.capitulo_id === x.id ? ' selected' : '') + '>' + x.orden + '. ' + esc(x.titulo) + '</option>'; }).join('') + '</select>', '', 'capitulo_id') +
            campo('Orden en el capítulo', '<input type="number" min="1" step="1" data-m="orden" value="' + esc(m.orden) + '">') : '') +
          campo('NPC que la entrega', '<select data-m="npc_id"><option value="">Automático (' + (esHist ? 'el del capítulo o el principal' : 'el principal') + ')</option>' + datos.npcs.map(function (n) { return '<option value="' + esc(n.id) + '"' + (m.npc_id === n.id ? ' selected' : '') + '>' + esc(n.nombre) + '</option>'; }).join('') + '</select>') +
          campo('Misión previa', '<select data-m="mision_previa"><option value="">Ninguna</option>' + otras.map(function (x) { return '<option value="' + esc(x.id) + '"' + (m.mision_previa === x.id ? ' selected' : '') + '>' + esc(x.titulo) + '</option>'; }).join('') + '</select>', 'Debe completarse antes.') + '</div>' +
        '<label class="interruptor"><input type="checkbox" data-m="activa"' + (m.activa ? ' checked' : '') + '>Misión activa (visible para los jugadores)</label>' +
      '</div></div></section>' +

      '<section class="perg"><div class="bloque" style="margin-top:0"><h3>Repetición y tiempo</h3><div class="rejilla r3">' +
        campo('Se puede hacer', '<select data-m="repeticion"' + (esHist ? ' disabled' : '') + '>' + opciones(REPETICION, m.repeticion) + '</select>', esHist ? 'Las misiones de historia siempre son de una sola vez.' : '') +
        (m.repeticion === 'por_dia' ? campo('Veces por día', '<input type="number" min="1" step="1" data-m="repeticion_veces" value="' + esc(m.repeticion_veces || 1) + '">', '', 'repeticion_veces') : '') +
        (m.repeticion === 'cada_horas' ? campo('Horas de espera', '<input type="number" min="1" step="1" data-m="repeticion_horas" value="' + esc(m.repeticion_horas || 24) + '">', '', 'repeticion_horas') : '') +
        campo('Tiempo límite (minutos)', '<input type="number" min="0" step="1" data-m="tiempo_min" value="' + (m.tiempo_limite_seg ? Math.round(m.tiempo_limite_seg / 60) : '') + '" placeholder="Sin límite">', 'Vacío = sin tiempo límite.') +
      '</div></div></section>' +

      '<section class="perg"><div class="bloque" style="margin-top:0"><h3>Objetivos</h3><div class="rejilla" id="objetivos"></div>' +
        '<button class="boton sec ancho" type="button" id="o-agregar" style="margin-top:12px">' + ic('mas') + 'Agregar objetivo</button></div></section>' +

      '<section class="perg"><div class="bloque" style="margin-top:0"><h3>Recompensa</h3><div class="rejilla">' +
        campo('Lo que ve el jugador', '<input type="text" data-m="recompensa_texto" value="' + esc(m.recompensa_texto) + '" placeholder="10 lágrimas de ghast">') +
        campo('Comandos de recompensa (uno por línea)', '<textarea class="comandos" id="comandos" placeholder="give @s diamond 1" spellcheck="false">' + esc(form.comandos) + '</textarea>', 'Nunca se muestran a los jugadores. Usa @s para el jugador que completa la misión.') +
      '</div></div></section>' +

      '<section class="perg"><div class="bloque" style="margin-top:0"><h3>Avisos</h3><div class="avisos-val" id="avisos"></div></div></section>' +
      '<div class="vista-previa"><span class="etq-vp">Vista previa para el jugador</span><div id="vista-previa"></div></div>' +
      '<div class="pie-form"><button class="boton sec" type="button" id="f-cancelar">Cancelar</button><button class="boton" type="submit">' + ic('check') + 'Guardar misión</button></div>' +
      '</form>';
    pintarObjetivos();
    actualizarVista();

    var f = document.getElementById('f-mision');
    f.addEventListener('input', alCambiar);
    f.addEventListener('change', alCambiar);
    f.addEventListener('click', alClic);
    f.addEventListener('submit', guardarFormMision);
    document.getElementById('f-cancelar').addEventListener('click', function () { if (confirmar('¿Descartar los cambios de esta misión?')) { form = null; pintar(); } });
    document.getElementById('o-agregar').addEventListener('click', function () {
      form.objetivos.push({ tipo: 'matar', objetivo: 'minecraft:', cantidad: 1, descripcion: '', condiciones: {} });
      pintarObjetivos(); actualizarVista();
      var todos = document.querySelectorAll('.objetivo-editor'); var ult = todos[todos.length - 1]; if (ult) ult.scrollIntoView({ block: 'center' });
    });
  }
  function pintarObjetivos() {
    var cont = document.getElementById('objetivos');
    cont.innerHTML = form.objetivos.map(function (o, i) {
      var conds = Object.keys(o.condiciones || {});
      var libres = CONDICIONES.filter(function (c) { return conds.indexOf(c[0]) < 0; });
      return '<div class="objetivo-editor" data-o="' + i + '"><div class="cab"><b>Objetivo ' + (i + 1) + '</b>' +
        '<button class="btn-icono" type="button" data-o-mover="-1" data-i="' + i + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + ic('arriba') + '</button>' +
        '<button class="btn-icono" type="button" data-o-mover="1" data-i="' + i + '" title="Bajar"' + (i === form.objetivos.length - 1 ? ' disabled' : '') + '>' + ic('abajo') + '</button>' +
        '<button class="btn-icono" type="button" data-o-quitar="' + i + '" title="Quitar" style="color:var(--rojo)">' + ic('basura') + '</button></div>' +
        '<div class="rejilla r3">' +
          '<label class="campo"><span>Tipo</span><select data-o-campo="tipo" data-i="' + i + '">' + opciones(TIPOS, o.tipo) + '</select></label>' +
          '<label class="campo' + (form.errores['obj' + i] ? ' error' : '') + '"><span>Qué (id de Minecraft)</span><input type="text" data-o-campo="objetivo" data-i="' + i + '" value="' + esc(o.objetivo) + '" placeholder="minecraft:ghast" list="lista-ids" spellcheck="false" autocapitalize="off">' + (form.errores['obj' + i] ? '<span class="msg-error">' + esc(form.errores['obj' + i]) + '</span>' : '') + '</label>' +
          '<label class="campo' + (form.errores['cant' + i] ? ' error' : '') + '"><span>Cantidad</span><input type="number" min="1" step="1" data-o-campo="cantidad" data-i="' + i + '" value="' + esc(o.cantidad) + '">' + (form.errores['cant' + i] ? '<span class="msg-error">' + esc(form.errores['cant' + i]) + '</span>' : '') + '</label>' +
        '</div>' +
        '<label class="campo"><span>Texto para el jugador</span><input type="text" data-o-campo="descripcion" data-i="' + i + '" value="' + esc(o.descripcion) + '" placeholder="' + esc(C.textoObjetivo(Object.assign({}, o, { descripcion: '' }))) + '"><small>Si lo dejas vacío se usa el texto sugerido.</small></label>' +
        '<div class="cond-editor"><span class="etiqueta-campo">Condiciones</span>' +
          conds.map(function (k) { return filaCondicion(i, k, o.condiciones[k]); }).join('') +
          (libres.length ? '<div class="barra-herr"><select class="entrada" data-cond-nueva="' + i + '" aria-label="Elegir condición"><option value="">Agregar condición…</option>' + libres.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + '</option>'; }).join('') + '</select></div>' : '') +
        '</div></div>';
    }).join('') + '<datalist id="lista-ids">' + Object.keys(C.ENTIDADES).map(function (k) { return '<option value="minecraft:' + k + '">'; }).join('') + '</datalist>' +
      '<datalist id="lista-herr">' + HERRAMIENTAS.map(function (k) { return '<option value="' + k + '">'; }).join('') + '</datalist>' +
      '<datalist id="lista-ent">' + Object.keys(C.ENTIDADES).map(function (k) { return '<option value="' + k + '">'; }).join('') + '</datalist>' +
      '<datalist id="lista-biomas">' + Object.keys(C.BIOMAS).map(function (k) { return '<option value="' + k + '">' + esc(C.BIOMAS[k]) + '</option>'; }).join('') + '</datalist>';
  }
  function filaCondicion(i, k, v) {
    var a = 'data-i="' + i + '" data-c="' + k + '"';
    function num(sub, val, ph) { return '<input type="number" ' + a + (sub ? ' data-sub="' + sub + '"' : '') + ' value="' + esc(val == null ? '' : val) + '" placeholder="' + (ph || '') + '">'; }
    function txt(sub, val, ph, lista) { return '<input type="text" ' + a + (sub ? ' data-sub="' + sub + '"' : '') + ' value="' + esc(val == null ? '' : val) + '" placeholder="' + (ph || '') + '"' + (lista ? ' list="' + lista + '"' : '') + ' spellcheck="false" autocapitalize="off">'; }
    function sel(sub, obj, val) { return '<select ' + a + (sub ? ' data-sub="' + sub + '"' : '') + '>' + opciones(obj, val) + '</select>'; }
    var tipoES = { encima: 'Por encima de', debajo: 'Por debajo de' };
    var cuerpo;
    switch (k) {
      case 'herramienta': cuerpo = txt('', v, 'bow', 'lista-herr'); break;
      case 'metodo': cuerpo = sel('', C.METODOS, v); break;
      case 'dimension': cuerpo = sel('', { overworld: 'Mundo normal', nether: 'Nether', end: 'End' }, v); break;
      case 'bioma': cuerpo = txt('', v, 'cherry_grove', 'lista-biomas'); break;
      case 'hora_del_dia': cuerpo = sel('', C.HORAS, v); break;
      case 'fase_lunar': cuerpo = sel('', C.LUNAS, v); break;
      case 'clima': cuerpo = sel('', C.CLIMAS, v); break;
      case 'plataforma': cuerpo = sel('', { console: 'Consola', desktop: 'PC', mobile: 'Celular' }, v); break;
      case 'zona': cuerpo = '<div class="coords">' + ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'].map(function (s) { return '<label class="campo"><small>' + s.toUpperCase() + '</small>' + num(s, v[s]) + '</label>'; }).join('') + '</div>'; break;
      case 'ubicacion_objetivo': cuerpo = '<div class="coords">' + ['x', 'y', 'z'].map(function (s) { return '<label class="campo"><small>' + s.toUpperCase() + '</small>' + num(s, v[s]) + '</label>'; }).join('') + '</div>'; break;
      case 'altura': case 'vida': case 'hambre':
        cuerpo = '<div class="rejilla r2">' + sel('tipo', tipoES, v.tipo) + num('valor', v.valor, k === 'altura' ? 'Y' : k === 'vida' ? '1–20' : '0–20') + '</div>' + (k === 'vida' ? '<small>En medios corazones: 20 = vida completa.</small>' : k === 'hambre' ? '<small>20 = barra de comida llena.</small>' : ''); break;
      case 'cerca_de': cuerpo = '<div class="rejilla r2">' + txt('entidad', v.entidad, 'villager', 'lista-ent') + num('radio', v.radio, 'Radio en bloques') + '</div>'; break;
      case 'montado': cuerpo = txt('', v, 'horse', 'lista-ent'); break;
      case 'encantamiento': cuerpo = '<div class="rejilla r2">' + sel('id', C.ENCANTAMIENTOS, v.id) + num('nivel', v.nivel, 'Nivel') + '</div>'; break;
      case 'efecto': cuerpo = '<div class="rejilla r2">' + sel('id', C.EFECTOS, v.id) + num('nivel', v.nivel, 'Nivel') + '</div>'; break;
      case 'nivel': cuerpo = num('', v, '10'); break;
      case 'puntaje': cuerpo = '<div class="rejilla r2">' + txt('objetivo', v.objetivo, 'Nombre del marcador') + num('valor', v.valor, 'Mínimo') + '</div>'; break;
      case 'etiqueta': cuerpo = txt('', v, 'nombre_de_la_tag'); break;
      case 'equipo': cuerpo = '<div class="rejilla r2">' + sel('ranura', { helmet: 'Cabeza', chestplate: 'Pecho', leggings: 'Piernas', boots: 'Pies', offhand: 'Mano izquierda' }, v.ranura) + txt('item', v.item, 'diamond_helmet') + '</div>'; break;
      case 'sobre_bloque': cuerpo = txt('', v, 'grass_block'); break;
      default: cuerpo = '<small>Activada: se cumple solo si el jugador está ' + esc(NOMBRE_COND[k].toLowerCase()) + '.</small>';
    }
    return '<div class="cond-fila"><div class="cab"><span>' + esc(NOMBRE_COND[k] || k) + '</span><button class="btn-icono" type="button" data-cond-quitar="' + k + '" data-i="' + i + '" title="Quitar condición" style="color:var(--rojo)">' + ic('basura') + '</button></div>' + cuerpo + '</div>';
  }
  function numero(v) { return v === '' || v == null ? '' : Number(v); }
  function alCambiar(e) {
    var t = e.target;
    if (t.dataset.m) {
      var k = t.dataset.m, m = form.mision;
      if (k === 'activa') m.activa = t.checked;
      else if (k === 'tiempo_min') m.tiempo_limite_seg = t.value ? Math.max(0, Math.round(Number(t.value) * 60)) || null : null;
      else if (k === 'orden' || k === 'repeticion_veces' || k === 'repeticion_horas') m[k] = numero(t.value);
      else m[k] = t.value;
      if (k === 'id') { m.id = t.value.toLowerCase().replace(/\s+/g, '_'); if (m.id !== t.value) t.value = m.id; }
      if (k === 'icono') document.getElementById('icono-prev').innerHTML = C.imgIcono(m.icono, '');
      if (e.type === 'change' && (k === 'categoria' || k === 'repeticion')) {
        if (k === 'categoria' && m.categoria === 'historia' && !m.capitulo_id && datos.capitulos[0]) m.capitulo_id = datos.capitulos[0].id;
        var y = window.scrollY; pintar(); window.scrollTo(0, y); return;
      }
    } else if (t.id === 'comandos') form.comandos = t.value;
    else if (t.dataset.oCampo) {
      var o = form.objetivos[+t.dataset.i];
      o[t.dataset.oCampo] = t.dataset.oCampo === 'cantidad' ? numero(t.value) : t.value;
      if (t.dataset.oCampo !== 'descripcion') { var d = document.querySelector('[data-o-campo="descripcion"][data-i="' + t.dataset.i + '"]'); if (d) d.placeholder = C.textoObjetivo(Object.assign({}, o, { descripcion: '' })); }
    } else if (t.dataset.c) {
      var ob = form.objetivos[+t.dataset.i], key = t.dataset.c, sub = t.dataset.sub;
      var val = t.type === 'number' ? numero(t.value) : t.value;
      if (sub) ob.condiciones[key][sub] = val; else ob.condiciones[key] = val;
    } else if (t.dataset.condNueva != null && e.type === 'change' && t.value) {
      form.objetivos[+t.dataset.condNueva].condiciones[t.value] = copia(DEF_COND[t.value]);
      var yy = window.scrollY; pintarObjetivos(); window.scrollTo(0, yy);
    }
    actualizarVista();
  }
  function alClic(e) {
    var b = e.target.closest('button'); if (!b || b.type === 'submit') return;
    if (b.dataset.oQuitar != null) {
      if (form.objetivos.length === 1) { aviso('La misión necesita al menos un objetivo.', 'error'); return; }
      if (!confirmar('¿Quitar el objetivo ' + (+b.dataset.oQuitar + 1) + '?')) return;
      form.objetivos.splice(+b.dataset.oQuitar, 1); pintarObjetivos(); actualizarVista();
    } else if (b.dataset.oMover) {
      var i = +b.dataset.i, j = i + (+b.dataset.oMover), arr = form.objetivos;
      if (j < 0 || j >= arr.length) return;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t; pintarObjetivos(); actualizarVista();
    } else if (b.dataset.condQuitar) {
      delete form.objetivos[+b.dataset.i].condiciones[b.dataset.condQuitar]; pintarObjetivos(); actualizarVista();
    }
  }
  function avisosMision() {
    var m = form.mision, av = [];
    form.objetivos.forEach(function (o, i) {
      var id = String(o.objetivo || '').replace(/^minecraft:/, ''), c = o.condiciones || {}, n = 'Objetivo ' + (i + 1) + ': ';
      if (o.objetivo && o.objetivo.indexOf(':') < 0) av.push(n + 'el id «' + o.objetivo + '» no tiene prefijo. ¿Quisiste decir «minecraft:' + o.objetivo + '»?');
      if (SOLO_NETHER.indexOf(id) >= 0 && c.dimension && c.dimension !== 'nether') av.push(n + 'los ' + C.bonito(id).toLowerCase() + ' aparecen en el Nether, pero la condición pide otra dimensión.');
      if (SOLO_END.indexOf(id) >= 0 && c.dimension && c.dimension !== 'end') av.push(n + 'los ' + C.bonito(id).toLowerCase() + ' aparecen en el End, pero la condición pide otra dimensión.');
      if (id === 'enderman' && c.dimension === 'nether') av.push(n + 'los enderman son raros en el Nether; abundan en el End y de noche en el mundo normal.');
      if (c.metodo === 'projectile' && c.herramienta && ['bow', 'crossbow', 'trident'].indexOf(String(c.herramienta).replace(/^minecraft:/, '')) < 0) av.push(n + 'pide matar con proyectiles, pero la herramienta no es un arco, ballesta ni tridente.');
      if (c.ubicacion_objetivo && o.tipo !== 'interactuar') av.push(n + 'la ubicación exacta solo se usa con el tipo «Interactuar».');
      if (o.tipo !== 'matar' && c.metodo) av.push(n + 'la forma de matar solo sirve para objetivos de tipo «Matar».');
      if (c.zona && (c.zona.x1 === c.zona.x2 || c.zona.z1 === c.zona.z2)) av.push(n + 'la zona tiene ancho 0. Revisa las esquinas.');
    });
    if (m.categoria === 'historia' && m.mision_previa) {
      var mp = datos.misiones.find(function (x) { return x.id === m.mision_previa; });
      if (mp && mp.categoria === 'historia' && mp.capitulo_id !== m.capitulo_id) av.push('La misión previa es de otro capítulo. Normalmente se usa una misión del mismo capítulo.');
    }
    if (!form.comandos.trim()) av.push('No hay comandos de recompensa: el jugador no recibirá nada en el juego.');
    if (form.comandos.split('\n').some(function (l) { return l.trim().charAt(0) === '/'; })) av.push('Los comandos no necesitan la barra «/» al inicio.');
    return av;
  }
  function misionArmada() {
    var m = copia(form.mision);
    m.objetivos = form.objetivos.map(function (o, i) { var x = copia(o); x.id = x.id || 'o' + (i + 1); x.orden = i + 1; return x; });
    return m;
  }
  function actualizarVista() {
    var av = avisosMision();
    document.getElementById('avisos').innerHTML = av.length ? av.map(function (t) { return '<div class="aviso oro">' + ic('alerta') + '<span>' + esc(t) + '</span></div>'; }).join('') :
      '<div class="aviso">' + ic('check') + '<span>Todo se ve bien.</span></div>';
    var ctx = C.contexto({ config: datos.config, npcs: datos.npcs, capitulos: datos.capitulos, misiones: datos.misiones, sesion: null, progreso: [] });
    document.getElementById('vista-previa').innerHTML = C.detalleMision(misionArmada(), ctx, { vistaPrevia: true });
  }
  function validar() {
    var m = form.mision, e = {};
    if (!ID_VALIDO.test(m.id || '')) e.id = 'Solo minúsculas, números y guion bajo (sin espacios).';
    else if (datos.misiones.some(function (x) { return x.id === m.id && x.id !== form.idOriginal; })) e.id = 'Ya existe una misión con ese id.';
    if (!String(m.titulo || '').trim()) e.titulo = 'Escribe un título.';
    if (m.categoria === 'historia' && !m.capitulo_id) e.capitulo_id = 'Elige un capítulo.';
    if (m.repeticion === 'por_dia' && !(Number(m.repeticion_veces) > 0)) e.repeticion_veces = 'Debe ser mayor a 0.';
    if (m.repeticion === 'cada_horas' && !(Number(m.repeticion_horas) > 0)) e.repeticion_horas = 'Debe ser mayor a 0.';
    form.objetivos.forEach(function (o, i) {
      if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(String(o.objetivo || '')) && !/^[a-z0-9_./-]+$/.test(String(o.objetivo || ''))) e['obj' + i] = 'Escribe un id válido, por ejemplo minecraft:zombie.';
      if (!(Number(o.cantidad) > 0)) e['cant' + i] = 'Debe ser mayor a 0.';
    });
    form.errores = e;
    return Object.keys(e).length === 0;
  }
  async function guardarFormMision(e) {
    e.preventDefault();
    if (!validar()) { var y = window.scrollY; pintar(); window.scrollTo(0, y); aviso('Revisa los campos marcados en rojo.', 'error'); var err = document.querySelector('.campo.error'); if (err) err.scrollIntoView({ block: 'center' }); return; }
    var m = copia(form.mision);
    if (form.idOriginal) m._id_original = form.idOriginal;
    if (m.categoria !== 'historia') { m.capitulo_id = ''; m.orden = 0; }
    var objetivos = form.objetivos.map(function (o) { return copia(o); });
    var comandos = form.comandos.split('\n').map(function (l) { return l.trim().replace(/^\//, ''); }).filter(Boolean);
    var b = e.target.querySelector('[type=submit]'); b.disabled = true;
    var r = await D.guardarMision(m, objetivos, comandos);
    b.disabled = false;
    if (!(await revisarSesion(r))) return;
    if (r.ok) { aviso('Misión guardada.'); form = null; await recargar(); pintar(); window.scrollTo(0, 0); }
    else aviso(r.motivo || 'No se pudo guardar.', 'error');
  }

  /* =================== capítulos =================== */
  function pintarCapitulos(c) {
    var caps = datos.capitulos;
    c.innerHTML = titulo('La leyenda del reino', 'Capítulos', 'Usa las flechas para cambiar el orden. El jugador solo ve la historia de los capítulos que completó.') +
      '<div class="barra-herr"><button class="boton" type="button" id="c-nuevo">' + ic('mas') + 'Crear capítulo</button></div>' +
      '<div class="lista-admin">' + (caps.length ? caps.map(function (x, i) {
        var npc = datos.npcs.find(function (n) { return n.id === x.npc_id; });
        var prev = caps.find(function (y) { return y.id === x.capitulo_previo; });
        var nm = datos.misiones.filter(function (m) { return m.capitulo_id === x.id; }).length;
        return '<div class="fila-admin"><span class="orden-num">' + x.orden + '</span><div><b>' + esc(x.titulo) + '</b><small>' + esc(x.id) + ' · ' + nm + (nm === 1 ? ' misión' : ' misiones') + ' · NPC: ' + esc(npc ? npc.nombre : 'principal') + (prev ? ' · después de «' + esc(prev.titulo) + '»' : '') + (x.activo ? '' : ' · <span style="color:var(--rojo)">inactivo</span>') + '</small>' + (x.resumen ? '<small style="display:block;font-style:italic">' + esc(x.resumen) + '</small>' : '') + '</div>' +
          '<div class="botones"><button class="btn-icono" type="button" data-c-mover="-1" data-i="' + i + '" title="Subir"' + (i === 0 ? ' disabled' : '') + '>' + ic('arriba') + '</button><button class="btn-icono" type="button" data-c-mover="1" data-i="' + i + '" title="Bajar"' + (i === caps.length - 1 ? ' disabled' : '') + '>' + ic('abajo') + '</button>' +
          '<button class="boton sec peq" type="button" data-c-editar="' + esc(x.id) + '">' + ic('editar') + 'Editar</button>' + botonesCopiar('c-copiar', x.id) + '<button class="boton peligro peq" type="button" data-c-eliminar="' + esc(x.id) + '">' + ic('basura') + 'Eliminar</button></div></div>';
      }).join('') : '<section class="perg"><p class="vacio">Todavía no hay capítulos.</p></section>') + '</div><div id="c-form"></div>';
    document.getElementById('c-nuevo').addEventListener('click', function () { formCapitulo(null); });
    c.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cEditar) formCapitulo(b.dataset.cEditar);
      if (b.dataset.cCopiar) await copiarA('capitulo', b.dataset.cCopiar, b.dataset.destino);
      if (b.dataset.cEliminar) {
        var x = caps.find(function (y) { return y.id === b.dataset.cEliminar; });
        if (!confirmar('¿Eliminar el capítulo «' + x.titulo + '» y su historia?')) return;
        var r = await D.eliminarCapitulo(x.id);
        if (!(await revisarSesion(r))) return;
        if (r.ok) { aviso('Capítulo eliminado.'); await recargar(); pintar(); } else aviso(r.motivo, 'error');
      }
      if (b.dataset.cMover) {
        var i = +b.dataset.i, j = i + (+b.dataset.cMover);
        var a = copia(caps[i]), z = copia(caps[j]);
        var ha = await D.obtenerHistoriaAdmin(a.id), hz = await D.obtenerHistoriaAdmin(z.id);
        var oa = a.orden, oz = z.orden, temp = Math.max.apply(null, caps.map(function (y) { return y.orden; })) + 1000;
        var r1 = await D.guardarCapitulo(Object.assign({}, a, { orden: temp }), ha);
        var r2 = r1.ok ? await D.guardarCapitulo(Object.assign({}, z, { orden: oa }), hz) : r1;
        var r3 = r2.ok ? await D.guardarCapitulo(Object.assign({}, a, { orden: oz }), ha) : r2;
        if (!(await revisarSesion(r3))) return;
        if (r3.ok) aviso('Orden actualizado.'); else aviso(r3.motivo, 'error');
        await recargar(); pintar();
      }
    });
  }
  async function formCapitulo(id) {
    var x = id ? copia(datos.capitulos.find(function (y) { return y.id === id; })) : { id: '', orden: (datos.capitulos.reduce(function (mx, y) { return Math.max(mx, y.orden); }, 0) + 1), titulo: '', resumen: '', npc_id: '', capitulo_previo: '', activo: true };
    var h = id ? await D.obtenerHistoriaAdmin(id) : { texto: '', imagen_url: '' };
    var cont = document.getElementById('c-form');
    cont.innerHTML = '<section class="perg entrar"><div class="perg-brillo"></div><div class="bloque" style="margin-top:0"><h3>' + (id ? 'Editar capítulo' : 'Nuevo capítulo') + '</h3>' +
      '<form id="f-cap" class="rejilla" novalidate>' +
        '<div class="rejilla r3"><label class="campo"><span>Id</span><input type="text" name="id" value="' + esc(x.id) + '" placeholder="cap_despertar" spellcheck="false" autocapitalize="off"></label>' +
          '<label class="campo"><span>Orden</span><input type="number" min="1" step="1" name="orden" value="' + esc(x.orden) + '"></label>' +
          '<label class="campo"><span>Título</span><input type="text" name="titulo" value="' + esc(x.titulo) + '"></label></div>' +
        '<label class="campo"><span>Resumen público</span><textarea name="resumen" placeholder="Sin spoilers: lo ven todos los jugadores.">' + esc(x.resumen) + '</textarea></label>' +
        '<div class="rejilla r2"><label class="campo"><span>NPC del capítulo</span><select name="npc_id"><option value="">El NPC principal</option>' + datos.npcs.map(function (n) { return '<option value="' + esc(n.id) + '"' + (x.npc_id === n.id ? ' selected' : '') + '>' + esc(n.nombre) + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo"><span>Capítulo previo</span><select name="capitulo_previo"><option value="">Ninguno</option>' + datos.capitulos.filter(function (y) { return y.id !== id; }).map(function (y) { return '<option value="' + esc(y.id) + '"' + (x.capitulo_previo === y.id ? ' selected' : '') + '>' + y.orden + '. ' + esc(y.titulo) + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="interruptor"><input type="checkbox" name="activo"' + (x.activo ? ' checked' : '') + '>Capítulo activo</label>' +
        '<label class="campo"><span>Historia (la ve el jugador al completar el capítulo)</span><textarea class="historia-editor" name="texto" placeholder="Escribe aquí la historia del capítulo…">' + esc(h.texto) + '</textarea><small>Deja una línea en blanco para separar párrafos.</small></label>' +
        '<label class="campo"><span>Imagen (URL)</span><input type="url" name="imagen_url" value="' + esc(h.imagen_url) + '" placeholder="https://…"></label>' +
        '<img class="img-previa" id="cap-img" alt="Vista previa de la imagen" ' + (h.imagen_url ? 'src="' + esc(h.imagen_url) + '"' : 'hidden') + ' onerror="this.hidden=true">' +
        '<div class="acciones"><button class="boton sec" type="button" id="cap-cancelar">Cancelar</button><button class="boton" type="submit">' + ic('check') + 'Guardar capítulo</button></div>' +
      '</form></div></section>';
    cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var f = document.getElementById('f-cap');
    f.imagen_url.addEventListener('input', function () { var im = document.getElementById('cap-img'); if (this.value) { im.hidden = false; im.src = this.value; } else im.hidden = true; });
    document.getElementById('cap-cancelar').addEventListener('click', function () { cont.innerHTML = ''; });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var cap = { id: f.elements['id'].value.trim(), orden: Number(f.orden.value), titulo: f.titulo.value.trim(), resumen: f.resumen.value.trim(), npc_id: f.npc_id.value, capitulo_previo: f.capitulo_previo.value, activo: f.activo.checked };
      if (!ID_VALIDO.test(cap.id)) { aviso('El id solo puede tener minúsculas, números y guion bajo.', 'error'); f.elements['id'].focus(); return; }
      if (!cap.titulo) { aviso('Escribe un título.', 'error'); f.titulo.focus(); return; }
      if (id) cap._id_original = id;
      var r = await D.guardarCapitulo(cap, { texto: f.texto.value, imagen_url: f.imagen_url.value.trim() });
      if (!(await revisarSesion(r))) return;
      if (r.ok) { aviso('Capítulo guardado.'); await recargar(); pintar(); } else aviso(r.motivo, 'error');
    });
  }

  /* =================== NPCs =================== */
  function pintarNpcs(c) {
    c.innerHTML = titulo('Habitantes del reino', 'NPCs', 'Registra los NPC que ya tienes en el mundo para asignarlos a misiones y capítulos.') +
      '<div class="aviso oro">' + ic('info') + '<span>En el juego, marca al NPC con <span class="nota-npc">/tag @e[type=!player,c=1] add npc:&lt;id&gt;</span> estando cerca de él.</span></div>' +
      '<div class="barra-herr" style="margin-top:14px"><button class="boton" type="button" id="n-nuevo">' + ic('mas') + 'Agregar NPC</button></div>' +
      '<div class="lista-admin">' + datos.npcs.map(function (n) {
        var usos = datos.misiones.filter(function (m) { return m.npc_id === n.id; }).length;
        return '<div class="fila-admin"><span class="orden-num">' + (n.es_principal ? ic('corona') : esc(n.nombre.charAt(0))) + '</span><div><b>' + esc(n.nombre) + (n.es_principal ? ' <span class="etq independiente" style="margin-left:6px">Principal</span>' : '') + '</b><small>' + esc(n.id) + ' · ' + usos + (usos === 1 ? ' misión asignada' : ' misiones asignadas') + '</small>' + (n.descripcion ? '<small style="display:block">' + esc(n.descripcion) + '</small>' : '') + '<small style="display:block">Comando: <span class="nota-npc">/tag @e[type=!player,c=1] add npc:' + esc(n.id) + '</span></small></div>' +
          '<div class="botones"><button class="boton sec peq" type="button" data-n-editar="' + esc(n.id) + '">' + ic('editar') + 'Editar</button><button class="boton peligro peq" type="button" data-n-eliminar="' + esc(n.id) + '">' + ic('basura') + 'Eliminar</button></div></div>';
      }).join('') + '</div><div id="n-form"></div>';
    document.getElementById('n-nuevo').addEventListener('click', function () { formNpc(null); });
    c.addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.nEditar) formNpc(b.dataset.nEditar);
      if (b.dataset.nEliminar) {
        var n = datos.npcs.find(function (x) { return x.id === b.dataset.nEliminar; });
        if (!confirmar('¿Eliminar a «' + n.nombre + '»? Sus misiones pasarán al NPC principal.')) return;
        var r = await D.eliminarNpc(n.id);
        if (!(await revisarSesion(r))) return;
        if (r.ok) { aviso('NPC eliminado.'); await recargar(); pintar(); } else aviso(r.motivo, 'error');
      }
    });
  }
  function formNpc(id) {
    var n = id ? copia(datos.npcs.find(function (x) { return x.id === id; })) : { id: '', nombre: '', descripcion: '', es_principal: !datos.npcs.length };
    var cont = document.getElementById('n-form');
    cont.innerHTML = '<section class="perg entrar"><div class="perg-brillo"></div><div class="bloque" style="margin-top:0"><h3>' + (id ? 'Editar NPC' : 'Nuevo NPC') + '</h3>' +
      '<form id="f-npc" class="rejilla" novalidate><div class="rejilla r2"><label class="campo"><span>Id</span><input type="text" name="id" value="' + esc(n.id) + '" placeholder="herrero" spellcheck="false" autocapitalize="off"><small>Es el que va en la etiqueta npc:&lt;id&gt;.</small></label>' +
        '<label class="campo"><span>Nombre</span><input type="text" name="nombre" value="' + esc(n.nombre) + '" placeholder="Mira, la herrera"></label></div>' +
        '<label class="campo"><span>Descripción</span><textarea name="descripcion">' + esc(n.descripcion) + '</textarea></label>' +
        '<label class="interruptor"><input type="checkbox" name="es_principal"' + (n.es_principal ? ' checked' : '') + '>NPC principal (solo puede haber uno)</label>' +
        '<div class="aviso oro" id="npc-tag">' + ic('info') + '<span>Comando para el juego: <span class="nota-npc">/tag @e[type=!player,c=1] add npc:' + esc(n.id || '&lt;id&gt;') + '</span></span></div>' +
        '<div class="acciones"><button class="boton sec" type="button" id="npc-cancelar">Cancelar</button><button class="boton" type="submit">' + ic('check') + 'Guardar NPC</button></div></form></div></section>';
    cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var f = document.getElementById('f-npc');
    f.elements['id'].addEventListener('input', function () { this.value = this.value.toLowerCase().replace(/\s+/g, '_'); document.querySelector('#npc-tag .nota-npc').textContent = '/tag @e[type=!player,c=1] add npc:' + (this.value || '<id>'); });
    document.getElementById('npc-cancelar').addEventListener('click', function () { cont.innerHTML = ''; });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var npc = { id: f.elements['id'].value.trim(), nombre: f.nombre.value.trim(), descripcion: f.descripcion.value.trim(), es_principal: f.es_principal.checked };
      if (!ID_VALIDO.test(npc.id)) { aviso('El id solo puede tener minúsculas, números y guion bajo.', 'error'); f.elements['id'].focus(); return; }
      if (!npc.nombre) { aviso('Escribe el nombre del NPC.', 'error'); f.nombre.focus(); return; }
      if (id) npc._id_original = id;
      var r = await D.guardarNpc(npc);
      if (!(await revisarSesion(r))) return;
      if (r.ok) { aviso('NPC guardado.'); await recargar(); pintar(); } else aviso(r.motivo, 'error');
    });
  }

  /* =================== configuración =================== */
  function pintarConfig(c) {
    var k = datos.config;
    var zonas = ['America/La_Paz', 'America/Lima', 'America/Bogota', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Mexico_City', 'America/Caracas', 'America/Guayaquil', 'America/Asuncion', 'America/Montevideo', 'Europe/Madrid', 'UTC'];
    if (zonas.indexOf(k.zona_horaria) < 0) zonas.unshift(k.zona_horaria);
    c.innerHTML = titulo('Reglas del gremio', 'Configuración', 'Los límites solo aplican a las misiones independientes, no a la historia.') +
      '<section class="perg"><div class="perg-brillo"></div><form id="f-config" class="rejilla" novalidate><div class="rejilla r2">' +
        '<label class="campo"><span>Misiones independientes en curso a la vez</span><input type="number" min="0" step="1" name="max_misiones_activas" value="' + esc(k.max_misiones_activas) + '"><small>0 = sin límite.</small></label>' +
        '<label class="campo"><span>Independientes completables por día</span><input type="number" min="0" step="1" name="max_completadas_diarias" value="' + esc(k.max_completadas_diarias) + '"><small>0 = sin límite.</small></label>' +
        '<label class="campo"><span>Hora de reinicio de los límites</span><select name="hora_reinicio">' + Array.from({ length: 24 }, function (_, h) { return '<option value="' + h + '"' + (Number(k.hora_reinicio) === h ? ' selected' : '') + '>' + (h < 10 ? '0' : '') + h + ':00</option>'; }).join('') + '</select></label>' +
        '<label class="campo"><span>Zona horaria</span><select name="zona_horaria">' + zonas.map(function (z) { return '<option value="' + esc(z) + '"' + (k.zona_horaria === z ? ' selected' : '') + '>' + esc(z) + '</option>'; }).join('') + '</select></label>' +
      '</div><div class="acciones"><button class="boton" type="submit">' + ic('check') + 'Guardar configuración</button></div></form></section>';
    document.getElementById('f-config').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = this;
      var cfg = { max_misiones_activas: Number(f.max_misiones_activas.value), max_completadas_diarias: Number(f.max_completadas_diarias.value), hora_reinicio: Number(f.hora_reinicio.value), zona_horaria: f.zona_horaria.value };
      if (cfg.max_misiones_activas < 0 || cfg.max_completadas_diarias < 0) { aviso('Los límites no pueden ser negativos.', 'error'); return; }
      var r = await D.guardarConfiguracion(cfg);
      if (!(await revisarSesion(r))) return;
      if (r.ok) { aviso('Configuración guardada.'); await recargar(); pintar(); } else aviso(r.motivo, 'error');
    });
  }

  window.addEventListener('beforeunload', function (e) { if (form) { e.preventDefault(); e.returnValue = ''; } });
  C.iniciarChispas();
  C.iniciarNiebla();
  iniciar();
})();
