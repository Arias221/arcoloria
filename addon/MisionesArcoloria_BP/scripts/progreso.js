// Estado de cada jugador conectado y conteo del avance de sus misiones.

import { world, system } from "@minecraft/server";
import { rpc } from "./api.js";
import { contenido, npcDeMision } from "./contenido.js";
import { cumple, mismoId } from "./condiciones.js";
import { PREFIJO, SEG_GUARDAR, SEG_REVISION } from "./config.js";

/** id del jugador -> { cargado, progreso: Map, hoy, inicioDia, sucios:Set, avisados:Set } */
const estados = new Map();

export function estadoDe(jugador) {
  return estados.get(jugador.id);
}

/* =================== cargar y registrar =================== */

export async function cargarJugador(jugador) {
  const id = jugador.id;
  const nombre = jugador.name;
  try {
    await guardarJugador(id); // no perder avance sin guardar al recargar
    await rpc("_registrar_jugador", { p_jugador: id, p_gamertag: nombre });
    const r = await rpc("_estado_jugador", { p_jugador: id });
    const anterior = estados.get(id);
    const est = {
      cargado: true,
      progreso: new Map((r.progreso || []).map((p) => [p.mision_id, { ...p, avance: p.avance || {} }])),
      hoy: r.hoy || {},
      inicioDia: new Date(r.inicio_dia).getTime(),
      sucios: new Set(),
      avisados: anterior ? anterior.avisados : new Set(),
      ultimoDanoAviso: 0,
    };
    estados.set(id, est);
    return est;
  } catch (e) {
    console.warn(`[Misiones] No se pudo cargar a ${nombre}: ${e}`);
    return null;
  }
}

export function quitarJugador(id) {
  estados.delete(id);
}

/* =================== helpers =================== */

export function misionesEnCurso(est) {
  const lista = [];
  if (!est) return lista;
  for (const p of est.progreso.values()) {
    if (p.estado !== "aceptada") continue;
    const m = contenido.misiones.get(p.mision_id);
    if (m && m.activa) lista.push({ m, p });
  }
  return lista;
}

function marcar(est, misionId) {
  est.sucios.add(misionId);
}

export function cantidadEnInventario(jugador, itemId) {
  const inv = jugador.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && mismoId(it.typeId, itemId)) n += it.amount;
  }
  return n;
}

/** Quita objetos del inventario (para entregar misiones de "obtener"). */
export function quitarDelInventario(jugador, itemId, cantidad) {
  const inv = jugador.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let falta = cantidad;
  for (let i = 0; i < inv.size && falta > 0; i++) {
    const it = inv.getItem(i);
    if (!it || !mismoId(it.typeId, itemId)) continue;
    if (it.amount <= falta) {
      falta -= it.amount;
      inv.setItem(i, undefined);
    } else {
      it.amount -= falta;
      inv.setItem(i, it);
      falta = 0;
    }
  }
  return cantidad - falta;
}

/** ¿Todos los objetivos están cumplidos? (los de "obtener" se miran en el inventario) */
export function objetivosCompletos(jugador, m, p) {
  return m.objetivos.every((o) =>
    o.tipo === "obtener" ? cantidadEnInventario(jugador, o.objetivo) >= o.cantidad : Number(p.avance[o.id] || 0) >= o.cantidad
  );
}

function avisoBarra(jugador, texto) {
  try { jugador.onScreenDisplay.setActionBar(texto); } catch { /* jugador desconectado */ }
}

/* =================== sumar avance =================== */

/**
 * Suma avance a los objetivos que coincidan.
 * evento: { tipo, id (entidad/bloque/ítem), causa, objeto, ubicacion }
 */
export function registrarAccion(jugador, evento) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;

  for (const { m, p } of misionesEnCurso(est)) {
    let cambio = false;
    for (const o of m.objetivos) {
      if (o.tipo !== evento.tipo || o.tipo === "obtener") continue;
      if (!mismoId(o.objetivo, evento.id)) continue;
      const actual = Number(p.avance[o.id] || 0);
      if (actual >= o.cantidad) continue;
      if (!cumple(jugador, o.condiciones, evento)) continue;

      p.avance[o.id] = actual + 1;
      if (!p.avance._inicio) p.avance._inicio = Date.now(); // el tiempo límite empieza con el primer avance
      cambio = true;
      avisoBarra(jugador, `§e${m.titulo}§r: ${p.avance[o.id]}/${o.cantidad}`);
    }
    if (cambio) {
      marcar(est, m.id);
      revisarLista(jugador, est, m, p);
    }
  }
}

function revisarLista(jugador, est, m, p) {
  if (est.avisados.has(m.id) || !objetivosCompletos(jugador, m, p)) return;
  est.avisados.add(m.id);
  const npc = npcDeMision(m);
  jugador.sendMessage(`${PREFIJO}§a¡Completaste los objetivos de §e${m.titulo}§a! §7Vuelve con §f${npc ? npc.nombre : "el NPC"}§7 y usa §f/misiones§7 para entregarla.`);
  try { jugador.playSound("random.orb"); } catch {}
}

/** Si recibe daño, los objetivos "sin recibir daño" vuelven a cero. */
export function registrarDano(jugador) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;
  for (const { m, p } of misionesEnCurso(est)) {
    let reinicio = false;
    for (const o of m.objetivos) {
      if (!o.condiciones || !o.condiciones.sin_dano) continue;
      if (Number(p.avance[o.id] || 0) > 0 && Number(p.avance[o.id]) < o.cantidad) {
        p.avance[o.id] = 0;
        reinicio = true;
      }
    }
    if (reinicio) {
      marcar(est, m.id);
      if (Date.now() - est.ultimoDanoAviso > 5000) {
        est.ultimoDanoAviso = Date.now();
        avisoBarra(jugador, `§c${m.titulo}: recibiste daño, el avance volvió a 0`);
      }
    }
  }
}

/* =================== revisión periódica =================== */

async function revisarJugador(jugador) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;

  // Pasó la hora de reinicio diario: recargar contadores del día
  if (Date.now() >= est.inicioDia + 24 * 3600e3) {
    await guardarJugador(jugador.id);
    await cargarJugador(jugador);
    return;
  }

  for (const { m, p } of misionesEnCurso(est)) {
    // Objetivos de "obtener": el avance es lo que lleva en el inventario
    for (const o of m.objetivos) {
      if (o.tipo !== "obtener") continue;
      const n = Math.min(o.cantidad, cantidadEnInventario(jugador, o.objetivo));
      if (n !== Number(p.avance[o.id] || 0)) {
        p.avance[o.id] = n;
        marcar(est, m.id);
      }
    }

    // Tiempo límite
    if (m.tiempo_limite_seg && p.avance._inicio && Date.now() - p.avance._inicio > m.tiempo_limite_seg * 1000
        && !objetivosCompletos(jugador, m, p)) {
      jugador.sendMessage(`${PREFIJO}§c Se acabó el tiempo de §e${m.titulo}§c. Puedes volver a aceptarla con el NPC.`);
      await abandonar(jugador, m.id);
      continue;
    }

    revisarLista(jugador, est, m, p);
  }
}

/* =================== guardar en la base =================== */

export async function guardarJugador(id) {
  const est = estados.get(id);
  if (!est || !est.sucios.size) return;
  const pendientes = [...est.sucios];
  est.sucios.clear();
  for (const misionId of pendientes) {
    const p = est.progreso.get(misionId);
    if (!p || p.estado !== "aceptada") continue;
    try {
      await rpc("_guardar_avance", { p_jugador: id, p_mision: misionId, p_avance: p.avance });
    } catch (e) {
      est.sucios.add(misionId); // se reintenta en la próxima vuelta
      console.warn(`[Misiones] No se pudo guardar avance: ${e}`);
    }
  }
}

/* =================== acciones del menú =================== */

export async function aceptar(jugador, misionId) {
  const r = await rpc("_aceptar_mision", { p_jugador: jugador.id, p_mision: misionId, p_origen: "juego" });
  if (r && r.ok) {
    const est = estadoDe(jugador);
    if (est) est.avisados.delete(misionId);
    await cargarJugador(jugador);
  }
  return r || { ok: false, motivo: "No se pudo conectar con el servidor de misiones." };
}

export async function abandonar(jugador, misionId) {
  const r = await rpc("_abandonar_mision", { p_jugador: jugador.id, p_mision: misionId });
  const est = estadoDe(jugador);
  if (est) {
    est.sucios.delete(misionId);
    est.avisados.delete(misionId);
  }
  await cargarJugador(jugador);
  return r;
}

/** Entrega: quita los objetos pedidos, marca completada y ejecuta las recompensas. */
export async function entregar(jugador, m) {
  const est = estadoDe(jugador);
  const p = est?.progreso.get(m.id);
  if (!p || p.estado !== "aceptada") return { ok: false, motivo: "Esta misión no está en curso." };
  if (!objetivosCompletos(jugador, m, p)) return { ok: false, motivo: "Todavía te faltan objetivos por cumplir." };

  for (const o of m.objetivos) if (o.tipo === "obtener") p.avance[o.id] = o.cantidad;
  const avance = { ...p.avance };
  delete avance._inicio;

  const r = await rpc("_completar_mision", { p_jugador: jugador.id, p_mision: m.id, p_avance: avance });
  if (!r || !r.ok) return r || { ok: false, motivo: "No se pudo conectar con el servidor de misiones." };

  for (const o of m.objetivos) if (o.tipo === "obtener") quitarDelInventario(jugador, o.objetivo, o.cantidad);

  for (const cmd of r.comandos || []) {
    try { jugador.runCommand(cmd); }
    catch (e) { console.warn(`[Misiones] Comando de recompensa falló («${cmd}»): ${e}`); }
  }
  est.sucios.delete(m.id);
  est.avisados.delete(m.id);
  await cargarJugador(jugador);
  return { ok: true };
}

/* =================== ciclos =================== */

export function iniciarCiclos() {
  system.runInterval(() => {
    for (const j of world.getAllPlayers()) revisarJugador(j).catch((e) => console.warn("[Misiones] " + e));
  }, SEG_REVISION * 20);

  system.runInterval(() => {
    for (const id of estados.keys()) guardarJugador(id).catch((e) => console.warn("[Misiones] " + e));
  }, SEG_GUARDAR * 20);
}
