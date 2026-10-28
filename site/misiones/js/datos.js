/* =====================================================================
   CAPA DE DATOS — Sistema de misiones
   ---------------------------------------------------------------------
   Toda la lectura y escritura de datos pasa por este archivo.
   Ahora mismo usa DATOS SIMULADOS (en memoria, guardados en este
   navegador para poder probar). Para conectar con Supabase solo hay que
   reemplazar este archivo manteniendo los mismos nombres de funciones
   y las mismas formas de respuesta. Todas las funciones son async.
   ===================================================================== */
(function () {
  'use strict';

  var CLAVE_BD = 'misiones-simuladas-v1';
  var CLAVE_JUGADOR = 'misiones-sesion-jugador';
  var CLAVE_ADMIN = 'misiones-sesion-admin';
  var RETRASO = 220; // ms, para simular la red

  /* ---------- utilidades internas ---------- */
  function esperar(valor) {
    return new Promise(function (ok) { setTimeout(function () { ok(copia(valor)); }, RETRASO); });
  }
  function copia(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function ahora() { return new Date().toISOString(); }
  function haceHoras(h) { return new Date(Date.now() - h * 3600e3).toISOString(); }
  function leer(clave, almacen) {
    try { var t = (almacen || localStorage).getItem(clave); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function escribir(clave, valor, almacen) {
    try { (almacen || localStorage).setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }
  function borrar(clave, almacen) { try { (almacen || localStorage).removeItem(clave); } catch (e) {} }
  var ID_VALIDO = /^[a-z0-9_]+$/;

  /* ---------- datos simulados de ejemplo ---------- */
  function datosIniciales() {
    return {
      configuracion: { max_misiones_activas: 3, max_completadas_diarias: 5, hora_reinicio: 4, zona_horaria: 'America/La_Paz' },
      npcs: [
        { id: 'guardian_aurelio', nombre: 'Aurelio, el Guardián', descripcion: 'Custodio de la plaza central. Conoce las leyendas más antiguas del reino.', es_principal: true },
        { id: 'herrera_mira', nombre: 'Mira, la herrera', descripcion: 'Forja armas en el barrio de los artesanos y siempre necesita materiales raros.', es_principal: false }
      ],
      capitulos: [
        { id: 'cap_despertar', orden: 1, titulo: 'El despertar del reino', resumen: 'Llegas a un reino tranquilo… pero algo se mueve bajo las nubes.', npc_id: '', capitulo_previo: '', activo: true },
        { id: 'cap_sombras', orden: 2, titulo: 'Sombras en el bosque', resumen: 'Extrañas criaturas aparecen al caer la noche cerca del bosque de cerezos.', npc_id: '', capitulo_previo: 'cap_despertar', activo: true }
      ],
      historias: {
        cap_despertar: {
          texto: 'Cuando cruzaste el puente de piedra, Aurelio te esperaba con una lámpara en la mano.\n\n«Hace muchos inviernos que nadie nuevo llegaba a Arcoloria», dijo, mirando las nubes que cubren el castillo. «Dicen que el reino despierta cuando alguien construye su primer hogar aquí».\n\nEsa noche, mientras colocabas la última tabla de tu refugio, una luz violeta recorrió el cielo. El reino había despertado.',
          imagen_url: 'img/fondo.jpg'
        },
        cap_sombras: {
          texto: 'Las huellas en el barro no eran de ningún animal conocido. Siguiéndolas, llegaste al corazón del bosque, donde un cristal de amatista latía como un corazón.\n\n«No es una piedra», susurró Aurelio. «Es una puerta».',
          imagen_url: ''
        }
      },
      misiones: [
        {
          id: 'llegada_reino', titulo: 'Llegada al reino', descripcion: 'Preséntate ante Aurelio en la plaza central y recoge provisiones para tus primeros días.',
          icono: 'textures/items/bread', categoria: 'historia', capitulo_id: 'cap_despertar', orden: 1, npc_id: '', mision_previa: '',
          repeticion: 'una_vez', repeticion_veces: 1, repeticion_horas: 0, tiempo_limite_seg: null, recompensa_texto: '16 panes y un mapa del reino', activa: true,
          objetivos: [
            { id: 'o1', orden: 1, tipo: 'interactuar', objetivo: 'minecraft:villager', cantidad: 1, descripcion: 'Habla con Aurelio en la plaza', condiciones: {} },
            { id: 'o2', orden: 2, tipo: 'obtener', objetivo: 'minecraft:wheat', cantidad: 10, descripcion: 'Recoge 10 de trigo', condiciones: {} }
          ]
        },
        {
          id: 'primer_refugio', titulo: 'Tu primer refugio', descripcion: 'Toda aventura empieza con un techo. Construye un pequeño refugio antes de que caiga la noche.',
          icono: 'textures/items/oak_door', categoria: 'historia', capitulo_id: 'cap_despertar', orden: 2, npc_id: '', mision_previa: 'llegada_reino',
          repeticion: 'una_vez', repeticion_veces: 1, repeticion_horas: 0, tiempo_limite_seg: 1800, recompensa_texto: 'Una cama y 8 antorchas', activa: true,
          objetivos: [
            { id: 'o1', orden: 1, tipo: 'colocar', objetivo: 'minecraft:oak_planks', cantidad: 32, descripcion: 'Coloca 32 tablas de roble', condiciones: { dimension: 'overworld' } }
          ]
        },
        {
          id: 'rastro_sombras', titulo: 'El rastro de las sombras', descripcion: 'Algo acecha cerca del bosque. Elimina a los zombis que rondan de noche.',
          icono: 'textures/items/rotten_flesh', categoria: 'historia', capitulo_id: 'cap_sombras', orden: 1, npc_id: '', mision_previa: '',
          repeticion: 'una_vez', repeticion_veces: 1, repeticion_horas: 0, tiempo_limite_seg: null, recompensa_texto: 'Espada de hierro encantada', activa: true,
          objetivos: [
            { id: 'o1', orden: 1, tipo: 'matar', objetivo: 'minecraft:zombie', cantidad: 10, descripcion: 'Derrota 10 zombis', condiciones: { hora_del_dia: 'night', bioma: 'cherry_grove' } },
            { id: 'o2', orden: 2, tipo: 'matar', objetivo: 'minecraft:skeleton', cantidad: 5, descripcion: 'Derrota 5 esqueletos', condiciones: { hora_del_dia: 'night' } }
          ]
        },
        {
          id: 'corazon_bosque', titulo: 'El corazón del bosque', descripcion: 'Encuentra el cristal que late en el centro del bosque de cerezos.',
          icono: 'textures/items/amethyst_shard', categoria: 'historia', capitulo_id: 'cap_sombras', orden: 2, npc_id: 'guardian_aurelio', mision_previa: 'rastro_sombras',
          repeticion: 'una_vez', repeticion_veces: 1, repeticion_horas: 0, tiempo_limite_seg: null, recompensa_texto: 'Fragmento de amatista mágico', activa: true,
          objetivos: [
            { id: 'o1', orden: 1, tipo: 'romper', objetivo: 'minecraft:amethyst_cluster', cantidad: 3, descripcion: 'Rompe 3 racimos de amatista', condiciones: { fase_lunar: 'fullmoon', hora_del_dia: 'midnight' } }
          ]
        },
        {
          id: 'cazador_ghasts', titulo: 'Cazador de Ghasts', descripcion: 'Mira necesita lágrimas de ghast para templar una espada legendaria. Viaja al Nether y caza ghasts con tu arco.',
          icono: 'textures/items/ghast_tear', categoria: 'independiente', capitulo_id: '', orden: 0, npc_id: 'herrera_mira', mision_previa: '',
          repeticion: 'por_dia', repeticion_veces: 1, repeticion_horas: 0, tiempo_limite_seg: null, recompensa_texto: '10 lágrimas de ghast', activa: true,
          objetivos: [
            { id: 'o1', orden: 1, tipo: 'matar', objetivo: 'minecraft:ghast', cantidad: 5, descripcion: 'Derrota 5 ghasts con arco', condiciones: { herramienta: 'bow', metodo: 'projectile', dimension: 'nether' } }
          ]
        },
        {
          id: 'minero_profundo', titulo: 'Minero de las profundidades', descripcion: 'Baja a las cuevas más hondas y trae diamantes para la forja de Mira.',
          icono: 'textures/items/diamond', categoria: 'independiente', capitulo_id: '', orden: 0, npc_id: 'herrera_mira', mision_previa: '',
          repeticion: 'cada_horas', repeticion_veces: 1, repeticion_horas: 12, tiempo_limite_seg: 3600, recompensa_texto: '3 lingotes de oro y 20 de experiencia', activa: true,
          objetivos: [
            { id: 'o1', orden: 1, tipo: 'romper', objetivo: 'minecraft:deepslate_diamond_ore', cantidad: 4, descripcion: 'Rompe 4 menas de diamante', condiciones: { herramienta: 'iron_pickaxe', altura: { tipo: 'debajo', valor: 0 } } }
          ]
        }
      ],
      comandos: {
        llegada_reino: ['give @s bread 16', 'give @s filled_map 1'],
        primer_refugio: ['give @s bed 1', 'give @s torch 8'],
        rastro_sombras: ['give @s iron_sword 1'],
        corazon_bosque: ['give @s amethyst_shard 1'],
        cazador_ghasts: ['give @s ghast_tear 10'],
        minero_profundo: ['give @s gold_ingot 3', 'xp 20 @s']
      },
      jugadores: [{ id: 'jug_1', gamertag: 'SteveAventurero', codigo: 'ABC123' }],
      progreso: {
        jug_1: [
          { mision_id: 'llegada_reino', estado: 'completada', avance: { o1: 1, o2: 10 }, veces_completada: 1, aceptada_en: haceHoras(72), completada_en: haceHoras(70), origen: 'juego' },
          { mision_id: 'primer_refugio', estado: 'completada', avance: { o1: 32 }, veces_completada: 1, aceptada_en: haceHoras(69), completada_en: haceHoras(68), origen: 'web' },
          { mision_id: 'rastro_sombras', estado: 'aceptada', avance: { o1: 6, o2: 2 }, veces_completada: 0, aceptada_en: haceHoras(5), completada_en: null, origen: 'juego' },
          { mision_id: 'cazador_ghasts', estado: 'completada', avance: { o1: 5 }, veces_completada: 3, aceptada_en: haceHoras(2), completada_en: haceHoras(1), origen: 'web' }
        ]
      }
    };
  }

  var bd = leer(CLAVE_BD) || datosIniciales();
  function guardarBd() { escribir(CLAVE_BD, bd); }
  guardarBd();

  function misionConObjetivos(m) {
    var c = copia(m);
    c.objetivos = (c.objetivos || []).slice().sort(function (a, b) { return a.orden - b.orden; });
    return c;
  }
  function jugadorActual() { return leer(CLAVE_JUGADOR); }
  function adminActivo() { return !!leer(CLAVE_ADMIN, sessionStorage); }
  function noAutorizado() { return esperar({ ok: false, motivo: 'Tu sesión de administrador terminó. Vuelve a iniciar sesión.' }); }

  /* =================== PÚBLICAS =================== */
  async function obtenerConfiguracion() { return esperar(bd.configuracion); }
  async function listarNpcs() { return esperar(bd.npcs); }
  async function listarCapitulos() {
    return esperar(bd.capitulos.slice().sort(function (a, b) { return a.orden - b.orden; }));
  }
  async function listarMisiones() { return esperar(bd.misiones.map(misionConObjetivos)); }
  async function obtenerMision(id) {
    var m = bd.misiones.find(function (x) { return x.id === id; });
    return esperar(m ? misionConObjetivos(m) : null);
  }

  /* =================== JUGADOR =================== */
  async function estadoSesionJugador() { return esperar(jugadorActual()); }
  async function vincularCuenta(codigo) {
    var c = String(codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) return esperar({ ok: false, motivo: 'El código tiene 6 letras o números. Revísalo y vuelve a intentarlo.' });
    var j = bd.jugadores.find(function (x) { return x.codigo === c; });
    if (!j) return esperar({ ok: false, motivo: 'Ese código no existe o ya venció. Pide uno nuevo al NPC de misiones.' });
    var sesion = { id: j.id, gamertag: j.gamertag };
    escribir(CLAVE_JUGADOR, sesion);
    return esperar({ ok: true, jugador: sesion });
  }
  async function cerrarSesionJugador() { borrar(CLAVE_JUGADOR); return esperar({ ok: true }); }
  async function miProgreso() {
    var j = jugadorActual();
    return esperar(j ? (bd.progreso[j.id] || []) : []);
  }
  async function miHistoria() {
    var j = jugadorActual();
    if (!j) return esperar([]);
    var prog = bd.progreso[j.id] || [];
    var hechas = {};
    prog.forEach(function (p) { if (p.veces_completada > 0 || p.estado === 'completada') hechas[p.mision_id] = true; });
    var out = [];
    bd.capitulos.forEach(function (cap) {
      var ms = bd.misiones.filter(function (m) { return m.categoria === 'historia' && m.capitulo_id === cap.id && m.activa; });
      if (ms.length && ms.every(function (m) { return hechas[m.id]; })) {
        var h = bd.historias[cap.id] || { texto: '', imagen_url: '' };
        out.push({ capitulo_id: cap.id, texto: h.texto, imagen_url: h.imagen_url });
      }
    });
    return esperar(out);
  }
  async function aceptarMision(misionId) {
    var j = jugadorActual();
    if (!j) return esperar({ ok: false, motivo: 'Primero vincula tu cuenta.' });
    var m = bd.misiones.find(function (x) { return x.id === misionId; });
    if (!m || !m.activa) return esperar({ ok: false, motivo: 'Esta misión no está disponible ahora.' });
    var prog = bd.progreso[j.id] = bd.progreso[j.id] || [];
    var p = prog.find(function (x) { return x.mision_id === misionId; });
    if (p && p.estado === 'aceptada') return esperar({ ok: false, motivo: 'Ya tienes esta misión en curso.' });
    if (m.categoria === 'independiente') {
      var activas = prog.filter(function (x) {
        var mm = bd.misiones.find(function (y) { return y.id === x.mision_id; });
        return x.estado === 'aceptada' && mm && mm.categoria === 'independiente';
      }).length;
      if (activas >= bd.configuracion.max_misiones_activas) return esperar({ ok: false, motivo: 'Ya tienes el máximo de misiones independientes en curso. Termina alguna antes de aceptar otra.' });
    }
    var vacio = {};
    m.objetivos.forEach(function (o) { vacio[o.id] = 0; });
    if (p) { p.estado = 'aceptada'; p.avance = vacio; p.aceptada_en = ahora(); p.origen = 'web'; }
    else prog.push({ mision_id: misionId, estado: 'aceptada', avance: vacio, veces_completada: 0, aceptada_en: ahora(), completada_en: null, origen: 'web' });
    guardarBd();
    return esperar({ ok: true });
  }

  /* =================== ADMINISTRADOR =================== */
  async function iniciarSesionAdmin(correo, contrasena) {
    if (!String(correo || '').trim()) return esperar({ ok: false, motivo: 'Escribe tu correo.' });
    if (contrasena !== 'admin') return esperar({ ok: false, motivo: 'Correo o contraseña incorrectos.' });
    escribir(CLAVE_ADMIN, { correo: String(correo).trim() }, sessionStorage);
    return esperar({ ok: true });
  }
  async function cerrarSesionAdmin() { borrar(CLAVE_ADMIN, sessionStorage); return esperar({ ok: true }); }
  async function esAdmin() { return esperar(adminActivo()); }

  async function guardarMision(mision, objetivos, comandos) {
    if (!adminActivo()) return noAutorizado();
    var m = copia(mision || {});
    if (!ID_VALIDO.test(m.id || '')) return esperar({ ok: false, motivo: 'El id solo puede tener minúsculas, números y guion bajo.' });
    if (!String(m.titulo || '').trim()) return esperar({ ok: false, motivo: 'La misión necesita un título.' });
    if (m.categoria === 'historia') {
      if (!m.capitulo_id) return esperar({ ok: false, motivo: 'Las misiones de historia necesitan un capítulo.' });
      m.repeticion = 'una_vez';
    } else { m.categoria = 'independiente'; m.capitulo_id = ''; }
    var objs = copia(objetivos || []);
    if (!objs.length) return esperar({ ok: false, motivo: 'Agrega al menos un objetivo.' });
    for (var i = 0; i < objs.length; i++) {
      if (!(Number(objs[i].cantidad) > 0)) return esperar({ ok: false, motivo: 'Cada objetivo necesita una cantidad mayor a 0.' });
      objs[i].id = objs[i].id || ('o' + (i + 1) + '_' + Math.random().toString(36).slice(2, 6));
      objs[i].orden = i + 1;
      objs[i].cantidad = Number(objs[i].cantidad);
      objs[i].condiciones = objs[i].condiciones || {};
    }
    m.objetivos = objs;
    var idOriginal = m._id_original || m.id;
    delete m._id_original;
    var idx = bd.misiones.findIndex(function (x) { return x.id === idOriginal; });
    if (idOriginal !== m.id && bd.misiones.some(function (x) { return x.id === m.id; })) return esperar({ ok: false, motivo: 'Ya existe una misión con ese id.' });
    if (idx === -1 && bd.misiones.some(function (x) { return x.id === m.id; })) return esperar({ ok: false, motivo: 'Ya existe una misión con ese id.' });
    if (idx >= 0) bd.misiones[idx] = m; else bd.misiones.push(m);
    if (idOriginal !== m.id) delete bd.comandos[idOriginal];
    bd.comandos[m.id] = (comandos || []).map(function (c) { return String(c).trim(); }).filter(Boolean);
    guardarBd();
    return esperar({ ok: true, mision: misionConObjetivos(m) });
  }
  async function eliminarMision(id) {
    if (!adminActivo()) return noAutorizado();
    bd.misiones = bd.misiones.filter(function (m) { return m.id !== id; });
    delete bd.comandos[id];
    bd.misiones.forEach(function (m) { if (m.mision_previa === id) m.mision_previa = ''; });
    guardarBd();
    return esperar({ ok: true });
  }
  async function obtenerComandos(misionId) {
    if (!adminActivo()) return esperar([]);
    return esperar(bd.comandos[misionId] || []);
  }
  async function guardarCapitulo(capitulo, historia) {
    if (!adminActivo()) return noAutorizado();
    var c = copia(capitulo || {});
    if (!ID_VALIDO.test(c.id || '')) return esperar({ ok: false, motivo: 'El id solo puede tener minúsculas, números y guion bajo.' });
    if (!String(c.titulo || '').trim()) return esperar({ ok: false, motivo: 'El capítulo necesita un título.' });
    c.orden = Number(c.orden);
    if (!(c.orden > 0)) return esperar({ ok: false, motivo: 'El orden debe ser un número mayor a 0.' });
    var idOriginal = c._id_original || c.id; delete c._id_original;
    if (bd.capitulos.some(function (x) { return x.orden === c.orden && x.id !== idOriginal; })) return esperar({ ok: false, motivo: 'Ya hay otro capítulo con ese orden.' });
    if (bd.capitulos.some(function (x) { return x.id === c.id && x.id !== idOriginal; })) return esperar({ ok: false, motivo: 'Ya existe un capítulo con ese id.' });
    if (c.capitulo_previo === c.id) return esperar({ ok: false, motivo: 'Un capítulo no puede depender de sí mismo.' });
    var idx = bd.capitulos.findIndex(function (x) { return x.id === idOriginal; });
    if (idx >= 0) bd.capitulos[idx] = c; else bd.capitulos.push(c);
    if (idOriginal !== c.id) {
      bd.historias[c.id] = bd.historias[idOriginal]; delete bd.historias[idOriginal];
      bd.misiones.forEach(function (m) { if (m.capitulo_id === idOriginal) m.capitulo_id = c.id; });
      bd.capitulos.forEach(function (x) { if (x.capitulo_previo === idOriginal) x.capitulo_previo = c.id; });
    }
    bd.historias[c.id] = { texto: (historia && historia.texto) || '', imagen_url: (historia && historia.imagen_url) || '' };
    guardarBd();
    return esperar({ ok: true, capitulo: c });
  }
  async function obtenerHistoriaAdmin(capituloId) {
    if (!adminActivo()) return esperar({ texto: '', imagen_url: '' });
    return esperar(bd.historias[capituloId] || { texto: '', imagen_url: '' });
  }
  async function eliminarCapitulo(id) {
    if (!adminActivo()) return noAutorizado();
    if (bd.misiones.some(function (m) { return m.capitulo_id === id; })) return esperar({ ok: false, motivo: 'Este capítulo todavía tiene misiones. Muévelas o elimínalas primero.' });
    bd.capitulos = bd.capitulos.filter(function (c) { return c.id !== id; });
    bd.capitulos.forEach(function (c) { if (c.capitulo_previo === id) c.capitulo_previo = ''; });
    delete bd.historias[id];
    guardarBd();
    return esperar({ ok: true });
  }
  async function guardarNpc(npc) {
    if (!adminActivo()) return noAutorizado();
    var n = copia(npc || {});
    if (!ID_VALIDO.test(n.id || '')) return esperar({ ok: false, motivo: 'El id solo puede tener minúsculas, números y guion bajo.' });
    if (!String(n.nombre || '').trim()) return esperar({ ok: false, motivo: 'El NPC necesita un nombre.' });
    var idOriginal = n._id_original || n.id; delete n._id_original;
    if (bd.npcs.some(function (x) { return x.id === n.id && x.id !== idOriginal; })) return esperar({ ok: false, motivo: 'Ya existe un NPC con ese id.' });
    n.es_principal = !!n.es_principal;
    if (n.es_principal) bd.npcs.forEach(function (x) { x.es_principal = false; });
    var idx = bd.npcs.findIndex(function (x) { return x.id === idOriginal; });
    if (idx >= 0) bd.npcs[idx] = n; else bd.npcs.push(n);
    if (idOriginal !== n.id) {
      bd.misiones.forEach(function (m) { if (m.npc_id === idOriginal) m.npc_id = n.id; });
      bd.capitulos.forEach(function (c) { if (c.npc_id === idOriginal) c.npc_id = n.id; });
    }
    if (!bd.npcs.some(function (x) { return x.es_principal; }) && bd.npcs.length) bd.npcs[0].es_principal = true;
    guardarBd();
    return esperar({ ok: true, npc: n });
  }
  async function eliminarNpc(id) {
    if (!adminActivo()) return noAutorizado();
    bd.npcs = bd.npcs.filter(function (n) { return n.id !== id; });
    bd.misiones.forEach(function (m) { if (m.npc_id === id) m.npc_id = ''; });
    bd.capitulos.forEach(function (c) { if (c.npc_id === id) c.npc_id = ''; });
    if (!bd.npcs.some(function (x) { return x.es_principal; }) && bd.npcs.length) bd.npcs[0].es_principal = true;
    guardarBd();
    return esperar({ ok: true });
  }
  async function guardarConfiguracion(config) {
    if (!adminActivo()) return noAutorizado();
    var c = copia(config || {});
    var n = function (v) { return Math.max(0, Math.floor(Number(v) || 0)); };
    bd.configuracion = {
      max_misiones_activas: n(c.max_misiones_activas),
      max_completadas_diarias: n(c.max_completadas_diarias),
      hora_reinicio: Math.min(23, n(c.hora_reinicio)),
      zona_horaria: String(c.zona_horaria || 'America/La_Paz')
    };
    guardarBd();
    return esperar({ ok: true, configuracion: bd.configuracion });
  }

  /* Solo para pruebas: vuelve a los datos de ejemplo (no forma parte de la base real). */
  function reiniciarDatosSimulados() { bd = datosIniciales(); guardarBd(); borrar(CLAVE_JUGADOR); }

  window.Datos = {
    obtenerConfiguracion: obtenerConfiguracion, listarNpcs: listarNpcs, listarCapitulos: listarCapitulos,
    listarMisiones: listarMisiones, obtenerMision: obtenerMision,
    estadoSesionJugador: estadoSesionJugador, vincularCuenta: vincularCuenta, cerrarSesionJugador: cerrarSesionJugador,
    miProgreso: miProgreso, miHistoria: miHistoria, aceptarMision: aceptarMision,
    iniciarSesionAdmin: iniciarSesionAdmin, cerrarSesionAdmin: cerrarSesionAdmin, esAdmin: esAdmin,
    guardarMision: guardarMision, eliminarMision: eliminarMision, obtenerComandos: obtenerComandos,
    guardarCapitulo: guardarCapitulo, obtenerHistoriaAdmin: obtenerHistoriaAdmin, eliminarCapitulo: eliminarCapitulo,
    guardarNpc: guardarNpc, eliminarNpc: eliminarNpc, guardarConfiguracion: guardarConfiguracion,
    reiniciarDatosSimulados: reiniciarDatosSimulados
  };
})();
