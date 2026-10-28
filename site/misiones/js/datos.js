/* =====================================================================
   CAPA DE DATOS — Sistema de misiones (conectada a Supabase)
   ---------------------------------------------------------------------
   Toda la lectura y escritura de datos pasa por este archivo.
   Requiere cargar antes la librería de Supabase:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

   Seguridad: aquí solo va la clave PUBLICABLE (es pública por diseño).
   Lo que cada visitante puede ver o cambiar lo deciden las reglas (RLS)
   y funciones de la base de datos, no esta página.
   ===================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://dmmnebecrsndkukuwavu.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_2NpfuuhagaSM10qigxkdBA_17cDEyPM';

  // Jugadores y admins guardan su sesión por separado para no pisarse
  var ES_ADMIN = document.body.classList.contains('admin') || /admin\.html$/.test(location.pathname);
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storageKey: ES_ADMIN ? 'misiones-sesion-admin' : 'misiones-sesion-jugador',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  /* ---------- mensajes ---------- */
  var SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  var SIN_SESION_ADMIN = 'Tu sesión de administrador terminó. Vuelve a iniciar sesión.';
  var ID_VALIDO = /^[a-z0-9_]+$/;

  function fallo(motivo) { return { ok: false, motivo: motivo }; }
  function aviso(error) { if (error) console.error('[Misiones]', error); }

  async function rpc(nombre, parametros) {
    try {
      var r = await sb.rpc(nombre, parametros || {});
      if (r.error) { aviso(r.error); return fallo(SIN_CONEXION); }
      return r.data || fallo(SIN_CONEXION);
    } catch (e) { aviso(e); return fallo(SIN_CONEXION); }
  }
  async function sesionActual() {
    try { var r = await sb.auth.getSession(); return (r.data && r.data.session) || null; }
    catch (e) { aviso(e); return null; }
  }
  function txt(v) { return v == null ? '' : v; }

  /* ---------- normalizar lo que llega de la base ---------- */
  function normObjetivo(o) {
    return {
      id: String(o.id), orden: o.orden, tipo: o.tipo, objetivo: o.objetivo, cantidad: o.cantidad,
      descripcion: txt(o.descripcion), condiciones: o.condiciones || {}
    };
  }
  function normMision(m) {
    return {
      id: m.id, titulo: m.titulo, descripcion: txt(m.descripcion), icono: txt(m.icono),
      categoria: m.categoria, capitulo_id: txt(m.capitulo_id), orden: m.orden || 0,
      npc_id: txt(m.npc_id), mision_previa: txt(m.mision_previa),
      repeticion: m.repeticion, repeticion_veces: m.repeticion_veces || 1, repeticion_horas: m.repeticion_horas || 0,
      tiempo_limite_seg: m.tiempo_limite_seg || null, recompensa_texto: txt(m.recompensa_texto), activa: !!m.activa,
      objetivos: (m.objetivos || []).map(normObjetivo).sort(function (a, b) { return a.orden - b.orden; })
    };
  }
  function normCapitulo(c) {
    return {
      id: c.id, orden: c.orden, titulo: c.titulo, resumen: txt(c.resumen),
      npc_id: txt(c.npc_id), capitulo_previo: txt(c.capitulo_previo), activo: !!c.activo
    };
  }
  function normNpc(n) { return { id: n.id, nombre: n.nombre, descripcion: txt(n.descripcion), es_principal: !!n.es_principal }; }

  /* =================== PÚBLICAS =================== */
  var CONFIG_POR_DEFECTO = { max_misiones_activas: 5, max_completadas_diarias: 10, hora_reinicio: 20, zona_horaria: 'America/La_Paz' };

  async function obtenerConfiguracion() {
    try {
      var r = await sb.from('configuracion')
        .select('max_misiones_activas, max_completadas_diarias, hora_reinicio, zona_horaria')
        .eq('id', 1).maybeSingle();
      aviso(r.error);
      return r.data || Object.assign({}, CONFIG_POR_DEFECTO);
    } catch (e) { aviso(e); return Object.assign({}, CONFIG_POR_DEFECTO); }
  }
  async function listarNpcs() {
    try {
      var r = await sb.from('npcs').select('id, nombre, descripcion, es_principal').order('nombre');
      aviso(r.error);
      return (r.data || []).map(normNpc);
    } catch (e) { aviso(e); return []; }
  }
  async function listarCapitulos() {
    try {
      var r = await sb.from('capitulos').select('id, orden, titulo, resumen, npc_id, capitulo_previo, activo').order('orden');
      aviso(r.error);
      return (r.data || []).map(normCapitulo);
    } catch (e) { aviso(e); return []; }
  }
  async function listarMisiones() {
    try {
      var r = await sb.from('misiones').select('*, objetivos(*)').order('orden').order('titulo');
      aviso(r.error);
      return (r.data || []).map(normMision);
    } catch (e) { aviso(e); return []; }
  }
  async function obtenerMision(id) {
    try {
      var r = await sb.from('misiones').select('*, objetivos(*)').eq('id', id).maybeSingle();
      aviso(r.error);
      return r.data ? normMision(r.data) : null;
    } catch (e) { aviso(e); return null; }
  }

  /* =================== JUGADOR =================== */
  async function estadoSesionJugador() {
    var s = await sesionActual();
    if (!s) return null;
    try {
      var r = await sb.from('jugadores').select('id, gamertag').eq('auth_uid', s.user.id).maybeSingle();
      aviso(r.error);
      return r.data || null;
    } catch (e) { aviso(e); return null; }
  }
  async function vincularCuenta(codigo) {
    var c = String(codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) return fallo('El código tiene 6 letras o números. Revísalo y vuelve a intentarlo.');
    // Sesión invisible: el jugador no crea cuenta ni contraseña
    if (!(await sesionActual())) {
      try {
        var a = await sb.auth.signInAnonymously();
        if (a.error) { aviso(a.error); return fallo(SIN_CONEXION); }
      } catch (e) { aviso(e); return fallo(SIN_CONEXION); }
    }
    return rpc('vincular_cuenta', { p_codigo: c });
  }
  async function cerrarSesionJugador() {
    if (await sesionActual()) {
      await rpc('desvincular_cuenta');
      try { await sb.auth.signOut(); } catch (e) { aviso(e); }
    }
    return { ok: true };
  }
  async function miProgreso() {
    if (!(await sesionActual())) return [];
    try {
      var r = await sb.from('progreso')
        .select('mision_id, estado, avance, veces_completada, aceptada_en, completada_en, origen');
      aviso(r.error);
      return (r.data || []).map(function (p) { p.avance = p.avance || {}; return p; });
    } catch (e) { aviso(e); return []; }
  }
  async function miHistoria() {
    if (!(await sesionActual())) return [];
    try {
      // La base solo devuelve los capítulos que este jugador completó
      var r = await sb.from('capitulos_historia').select('capitulo_id, texto, imagen_url');
      aviso(r.error);
      return (r.data || []).map(function (h) { return { capitulo_id: h.capitulo_id, texto: txt(h.texto), imagen_url: txt(h.imagen_url) }; });
    } catch (e) { aviso(e); return []; }
  }
  async function aceptarMision(misionId) {
    if (!(await sesionActual())) return fallo('Primero vincula tu cuenta.');
    return rpc('aceptar_mision', { p_mision: misionId });
  }

  /* =================== ADMINISTRADOR =================== */
  async function cuentaEsAdmin(uid) {
    try {
      var r = await sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle();
      aviso(r.error);
      return !!r.data;
    } catch (e) { aviso(e); return false; }
  }
  async function iniciarSesionAdmin(correo, contrasena) {
    var c = String(correo || '').trim();
    if (!c) return fallo('Escribe tu correo.');
    try {
      var r = await sb.auth.signInWithPassword({ email: c, password: String(contrasena || '') });
      if (r.error) return fallo(/invalid/i.test(r.error.message || '') ? 'Correo o contraseña incorrectos.' : SIN_CONEXION);
      if (!(await cuentaEsAdmin(r.data.user.id))) {
        await sb.auth.signOut();
        return fallo('Esta cuenta no tiene permisos de administrador.');
      }
      return { ok: true };
    } catch (e) { aviso(e); return fallo(SIN_CONEXION); }
  }
  async function cerrarSesionAdmin() {
    try { await sb.auth.signOut(); } catch (e) { aviso(e); }
    return { ok: true };
  }
  async function esAdmin() {
    var s = await sesionActual();
    return s ? cuentaEsAdmin(s.user.id) : false;
  }
  async function exigirAdmin() { return (await sesionActual()) ? null : fallo(SIN_SESION_ADMIN); }

  async function guardarMision(mision, objetivos, comandos) {
    var m = JSON.parse(JSON.stringify(mision || {}));
    if (!ID_VALIDO.test(m.id || '')) return fallo('El id solo puede tener minúsculas, números y guion bajo.');
    if (!String(m.titulo || '').trim()) return fallo('La misión necesita un título.');
    if (m.categoria === 'historia' && !m.capitulo_id) return fallo('Las misiones de historia necesitan un capítulo.');
    var objs = (objetivos || []).map(function (o) {
      return {
        id: o.id == null ? '' : String(o.id), tipo: o.tipo, objetivo: String(o.objetivo || '').trim(),
        cantidad: Number(o.cantidad), descripcion: o.descripcion || '', condiciones: o.condiciones || {}
      };
    });
    if (!objs.length) return fallo('Agrega al menos un objetivo.');
    if (objs.some(function (o) { return !(o.cantidad > 0); })) return fallo('Cada objetivo necesita una cantidad mayor a 0.');
    var no = await exigirAdmin(); if (no) return no;

    var idOriginal = m._id_original || null;
    delete m._id_original; delete m.objetivos;
    var cmds = (comandos || []).map(function (c) { return String(c).trim().replace(/^\//, ''); }).filter(Boolean);
    return rpc('admin_guardar_mision', { p_mision: m, p_objetivos: objs, p_comandos: cmds, p_id_original: idOriginal });
  }
  async function eliminarMision(id) {
    var no = await exigirAdmin(); if (no) return no;
    try {
      var r = await sb.from('misiones').delete().eq('id', id).select('id');
      if (r.error) { aviso(r.error); return fallo(SIN_CONEXION); }
      return (r.data && r.data.length) ? { ok: true } : fallo(SIN_SESION_ADMIN);
    } catch (e) { aviso(e); return fallo(SIN_CONEXION); }
  }
  async function obtenerComandos(misionId) {
    try {
      var r = await sb.from('misiones_comandos').select('comandos').eq('mision_id', misionId).maybeSingle();
      aviso(r.error);
      return (r.data && r.data.comandos) || [];
    } catch (e) { aviso(e); return []; }
  }
  async function guardarCapitulo(capitulo, historia) {
    var c = JSON.parse(JSON.stringify(capitulo || {}));
    if (!ID_VALIDO.test(c.id || '')) return fallo('El id solo puede tener minúsculas, números y guion bajo.');
    if (!String(c.titulo || '').trim()) return fallo('El capítulo necesita un título.');
    var no = await exigirAdmin(); if (no) return no;
    var idOriginal = c._id_original || null; delete c._id_original;
    return rpc('admin_guardar_capitulo', {
      p_capitulo: c,
      p_historia: { texto: (historia && historia.texto) || '', imagen_url: (historia && historia.imagen_url) || '' },
      p_id_original: idOriginal
    });
  }
  async function obtenerHistoriaAdmin(capituloId) {
    try {
      var r = await sb.from('capitulos_historia').select('texto, imagen_url').eq('capitulo_id', capituloId).maybeSingle();
      aviso(r.error);
      return { texto: txt(r.data && r.data.texto), imagen_url: txt(r.data && r.data.imagen_url) };
    } catch (e) { aviso(e); return { texto: '', imagen_url: '' }; }
  }
  async function eliminarCapitulo(id) {
    var no = await exigirAdmin(); if (no) return no;
    return rpc('admin_eliminar_capitulo', { p_id: id });
  }
  async function guardarNpc(npc) {
    var n = JSON.parse(JSON.stringify(npc || {}));
    if (!ID_VALIDO.test(n.id || '')) return fallo('El id solo puede tener minúsculas, números y guion bajo.');
    if (!String(n.nombre || '').trim()) return fallo('El NPC necesita un nombre.');
    var no = await exigirAdmin(); if (no) return no;
    var idOriginal = n._id_original || null; delete n._id_original;
    return rpc('admin_guardar_npc', { p_npc: n, p_id_original: idOriginal });
  }
  async function eliminarNpc(id) {
    var no = await exigirAdmin(); if (no) return no;
    return rpc('admin_eliminar_npc', { p_id: id });
  }
  async function guardarConfiguracion(config) {
    var c = config || {};
    var n = function (v) { return Math.max(0, Math.floor(Number(v) || 0)); };
    var zona = String(c.zona_horaria || 'America/La_Paz').trim();
    try { new Intl.DateTimeFormat('es', { timeZone: zona }); }
    catch (e) { return fallo('La zona horaria no es válida. Usa un nombre como America/La_Paz.'); }
    var datos = {
      max_misiones_activas: n(c.max_misiones_activas),
      max_completadas_diarias: n(c.max_completadas_diarias),
      hora_reinicio: Math.min(23, n(c.hora_reinicio)),
      zona_horaria: zona
    };
    var no = await exigirAdmin(); if (no) return no;
    try {
      var r = await sb.from('configuracion').update(datos).eq('id', 1).select('id');
      if (r.error) { aviso(r.error); return fallo(SIN_CONEXION); }
      return (r.data && r.data.length) ? { ok: true, configuracion: datos } : fallo(SIN_SESION_ADMIN);
    } catch (e) { aviso(e); return fallo(SIN_CONEXION); }
  }

  /* Ya no hay datos simulados; se deja para que nada falle si alguien la llama. */
  function reiniciarDatosSimulados() { console.info('[Misiones] La página ya usa la base de datos real.'); }

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
