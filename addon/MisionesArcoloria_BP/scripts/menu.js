// Menús del libro de misiones.
//   /misiones  -> panel general: misiones disponibles (con dónde está su NPC), en curso y vinculación.
//   Tocar NPC  -> panel de ese NPC: aceptar y entregar sus misiones.
// Las misiones que no piden NPC se aceptan y entregan desde /misiones, estés donde estés.

import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { contenido, npcDeMision, misionesDeNpc, aperturaPendiente } from "./contenido.js";
import {
  estadoDe, cargarJugador, misionesEnCurso, objetivosCompletos, valorObjetivo,
  aceptar, abandonar, entregar, recontarConstruccion,
} from "./progreso.js";
import { rpc } from "./api.js";
import { textoObjetivo, frasesCondiciones, textoRepeticion, textoDuracion } from "./textos.js";
import { dimensionCorta, distancia, NOMBRE_DIMENSION } from "./util.js";
import { PREFIJO, RADIO_NPC, ETIQUETA_NPC, URL_PAGINA } from "./config.js";

/* =================== mostrar formularios =================== */

// Al escribir el comando el chat sigue abierto: se reintenta hasta que el jugador pueda ver el menú
async function mostrar(form, jugador) {
  for (let i = 0; i < 40; i++) {
    const r = await form.show(jugador);
    if (r.cancelationReason !== FormCancelationReason.UserBusy) return r;
    await new Promise((ok) => system.runTimeout(ok, 5));
  }
  return { canceled: true };
}

async function mensaje(jugador, titulo, cuerpo) {
  await mostrar(new ActionFormData().title(titulo).body(cuerpo).button("Volver"), jugador);
}

/* =================== NPC =================== */

export function npcsCercanos(jugador) {
  const vistos = new Map();
  try {
    const entidades = jugador.dimension.getEntities({ location: jugador.location, maxDistance: RADIO_NPC, excludeTypes: ["minecraft:player"] });
    for (const e of entidades) {
      for (const t of e.getTags()) {
        if (!t.startsWith(ETIQUETA_NPC)) continue;
        const npc = contenido.npcs.get(t.slice(ETIQUETA_NPC.length));
        if (npc) vistos.set(npc.id, npc);
      }
    }
  } catch (e) {
    console.warn("[Misiones] " + e);
  }
  return [...vistos.values()];
}

function estaCercaDe(jugador, npcId) {
  return npcsCercanos(jugador).some((n) => n.id === npcId);
}

/** "Aurelio, en 120, 64, -30 (Mundo normal), a 85 bloques" */
function dondeEsta(jugador, npc) {
  if (!npc) return "el NPC de misiones";
  if (npc.x == null) return `§f${npc.nombre}§7`;
  let t = `§f${npc.nombre}§7, en §f${npc.x}, ${npc.y}, ${npc.z}§7 (${NOMBRE_DIMENSION[npc.dimension] || npc.dimension})`;
  if (dimensionCorta(jugador.dimension.id) === npc.dimension) t += `, a ${Math.round(distancia(jugador.location, npc))} bloques`;
  return t;
}

/** ¿Esta misión se acepta y entrega junto a su NPC? */
function pideNpc(m) {
  return m.requiere_npc !== false && !!npcDeMision(m);
}

/* =================== estado de una misión =================== */

function completada(est, misionId) {
  const p = est.progreso.get(misionId);
  return !!p && p.veces_completada > 0;
}

function capituloCompleto(est, capId) {
  const ms = [...contenido.misiones.values()].filter((m) => m.categoria === "historia" && m.capitulo_id === capId && m.activa);
  return ms.length > 0 && ms.every((m) => completada(est, m.id));
}

// El motor de scripts no trae zonas horarias: se deduce la diferencia con UTC a partir
// del último reinicio diario, que la base calcula en la hora local configurada.
function aLocal(est, ms) {
  const ini = new Date(est.inicioDia);
  let dif = ini.getUTCHours() * 60 + ini.getUTCMinutes() - Number(contenido.config.hora_reinicio || 0) * 60;
  dif = ((dif % 1440) + 1440) % 1440;
  if (dif > 720) dif -= 1440;
  return new Date(ms - dif * 60000);
}
const dos = (n) => String(n).padStart(2, "0");
function horaTexto(est, ms) {
  const d = aLocal(est, ms);
  return `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}
function fechaTexto(est, ms) {
  const d = aLocal(est, ms);
  return `el ${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} a las ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

export function estadoMision(jugador, est, m) {
  const p = est.progreso.get(m.id);
  if (p && p.estado === "aceptada") {
    return objetivosCompletos(jugador, m, p)
      ? { clave: "lista", texto: "§2¡Lista para entregar!" }
      : { clave: "en_curso", texto: "§9En curso" };
  }

  if (m.categoria === "historia") {
    const cap = contenido.capitulos.get(m.capitulo_id);
    if (!cap || !cap.activo) return { clave: "bloqueada", texto: "§8Próximamente", detalle: "Este capítulo todavía no está disponible." };
    const abre = aperturaPendiente(m);
    if (abre) return { clave: "proxima", texto: "§8Próximamente", detalle: `Esta parte de la historia se abre ${fechaTexto(est, abre)}.` };
    if (cap.capitulo_previo && !capituloCompleto(est, cap.capitulo_previo)) {
      const prev = contenido.capitulos.get(cap.capitulo_previo);
      return { clave: "bloqueada", texto: "§8Bloqueada", detalle: `Primero completa «${prev ? prev.titulo : cap.capitulo_previo}».` };
    }
  }
  if (m.mision_previa && !completada(est, m.mision_previa)) {
    const mp = contenido.misiones.get(m.mision_previa);
    return { clave: "bloqueada", texto: "§8Bloqueada", detalle: `Primero completa la misión «${mp ? mp.titulo : m.mision_previa}».` };
  }

  if (p && p.veces_completada > 0) {
    if (m.categoria === "historia" || m.repeticion === "una_vez") return { clave: "completada", texto: "§2Completada" };
    if (m.repeticion === "por_dia" && (est.hoy[m.id] || 0) >= m.repeticion_veces) {
      return { clave: "espera", texto: "§6Completada hoy", detalle: `Vuelve a estar disponible a las ${horaTexto(est, est.inicioDia + 864e5)}.` };
    }
    if (m.repeticion === "cada_horas" && p.completada_en) {
      const prox = new Date(p.completada_en).getTime() + m.repeticion_horas * 3600e3;
      if (prox > Date.now()) return { clave: "espera", texto: "§6En espera", detalle: `Vuelve a estar disponible a las ${horaTexto(est, prox)}.` };
    }
  }

  if (m.categoria === "independiente") {
    const cfg = contenido.config;
    const esInd = (id) => contenido.misiones.get(id)?.categoria === "independiente";
    const hoy = Object.entries(est.hoy).reduce((s, [id, n]) => s + (esInd(id) ? n : 0), 0);
    if (cfg.max_completadas_diarias > 0 && hoy >= cfg.max_completadas_diarias) {
      return { clave: "limite", texto: "§cLímite diario", detalle: `Ya completaste ${hoy} misiones independientes hoy. Podrás hacer más después de las ${horaTexto(est, est.inicioDia + 864e5)}.` };
    }
    const activas = misionesEnCurso(est).filter(({ m: x }) => x.categoria === "independiente").length;
    if (cfg.max_misiones_activas > 0 && activas >= cfg.max_misiones_activas) {
      return { clave: "limite", texto: "§cMáximo en curso", detalle: `Tienes ${activas} misiones independientes en curso. Termina alguna para aceptar otra.` };
    }
  }
  return { clave: "disponible", texto: "§1Disponible" };
}

/** Misiones que el jugador puede aceptar ahora mismo. */
export function disponibles(jugador, est) {
  const lista = [...contenido.misiones.values()].filter((m) => m.activa && estadoMision(jugador, est, m).clave === "disponible");
  const ordenCap = (m) => (m.categoria === "historia" ? contenido.capitulos.get(m.capitulo_id)?.orden ?? 9999 : 99999);
  return lista.sort((a, b) => ordenCap(a) - ordenCap(b) || a.orden - b.orden || a.titulo.localeCompare(b.titulo));
}

/* =================== textos del detalle =================== */

function cuerpoMision(jugador, est, m, e) {
  const p = est.progreso.get(m.id);
  const enCurso = p && p.estado === "aceptada";
  const lineas = [];
  const npc = npcDeMision(m);
  if (m.categoria === "historia") {
    const cap = contenido.capitulos.get(m.capitulo_id);
    if (cap) lineas.push(`§5Parte ${cap.orden}: ${cap.titulo}`);
  }
  if (pideNpc(m)) lineas.push(`§7Te la da: ${dondeEsta(jugador, npc)}`);
  else lineas.push("§7Se acepta y entrega desde §f/misiones§7, estés donde estés.");
  lineas.push(`§7Estado: ${e.texto}`, "");
  if (m.descripcion) lineas.push(`§f${m.descripcion}`, "");

  lineas.push("§6§lObjetivos§r");
  for (const o of m.objetivos) {
    let linea = `§f• ${textoObjetivo(o)}`;
    if (enCurso) {
      const n = valorObjetivo(jugador, o, p);
      linea += ` ${n >= o.cantidad ? "§a" : "§e"}(${n}/${o.cantidad})`;
    }
    lineas.push(linea);
    const fr = frasesCondiciones(o.condiciones);
    if (fr.length) lineas.push(`  §7${fr.join(", ")}`);
    if (o.tipo === "obtener" && !(o.condiciones && (o.condiciones.fijar || o.condiciones.no_quitar))) lineas.push("  §8Se entregan al completar la misión");
  }
  lineas.push("");
  if (m.recompensa_texto) lineas.push(`§6Recompensa: §f${m.recompensa_texto}`);
  lineas.push(`§7${textoRepeticion(m)}`);
  if (m.tiempo_limite_seg) lineas.push(`§7Tiempo límite: ${textoDuracion(m.tiempo_limite_seg)} (empieza con tu primer avance)`);
  if (e.detalle) lineas.push("", `§c${e.detalle}`);
  return lineas.join("\n");
}

/* =================== pantallas =================== */

async function prepararEstado(jugador) {
  let est = estadoDe(jugador);
  if (!est || !est.cargado) est = await cargarJugador(jugador);
  if (!est) {
    jugador.sendMessage(`${PREFIJO}§cNo se pudo conectar con el libro de misiones. Inténtalo en unos segundos.`);
    return null;
  }
  if (!contenido.misiones.size) {
    jugador.sendMessage(`${PREFIJO}§7Todavía no hay misiones.`);
    return null;
  }
  recontarConstruccion(jugador);
  return est;
}

/** Panel general (/misiones). */
export async function abrirMenu(jugador) {
  const est = await prepararEstado(jugador);
  if (!est) return;

  const cerca = npcsCercanos(jugador);
  const libres = disponibles(jugador, est);
  const enCurso = misionesEnCurso(est);
  const listas = enCurso.filter(({ m, p }) => objetivosCompletos(jugador, m, p)).length;

  const f = new ActionFormData().title("§l§6Libro de Misiones");
  let cuerpo = cerca.length ? `Estás junto a: §e${cerca.map((n) => n.nombre).join(", ")}§r\n` : "";
  cuerpo += libres.length ? `§aTienes ${libres.length} ${libres.length === 1 ? "misión disponible" : "misiones disponibles"}.` : "§7No tienes misiones nuevas por ahora.";
  if (listas) cuerpo += `\n§2${listas} lista${listas === 1 ? "" : "s"} para entregar.`;
  f.body(cuerpo);

  const acciones = [];
  for (const npc of cerca) {
    f.button(`§lHablar con ${npc.nombre}`, "textures/items/book_writable");
    acciones.push(() => menuNpc(jugador, npc));
  }
  f.button(`§lMisiones disponibles §r§8(${libres.length})`, "textures/items/map_filled");
  acciones.push(() => menuLista(jugador, "Misiones disponibles", () => disponibles(jugador, estadoDe(jugador)), "No hay misiones disponibles por ahora."));
  f.button(`§lMis misiones en curso §r§8(${enCurso.length})`, "textures/items/clock_item");
  acciones.push(() => menuLista(jugador, "Mis misiones en curso", () => misionesEnCurso(estadoDe(jugador)).map(({ m }) => m), "No tienes misiones en curso."));
  f.button("§lVincular con la página", "textures/items/name_tag");
  acciones.push(() => vincular(jugador));

  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  await acciones[r.selection]();
}

/** Panel de un NPC (al tocarlo o desde /misiones). */
export async function menuNpc(jugador, npc) {
  const est = await prepararEstado(jugador);
  if (!est) return;
  const lista = misionesDeNpc(npc.id).filter((m) => pideNpc(m) || estadoDe(jugador).progreso.has(m.id));
  if (!lista.length) return mensaje(jugador, npc.nombre, "§7Por ahora no tengo misiones para ti.");

  const f = new ActionFormData().title(`§l${npc.nombre}`).body("§7Elige una misión:");
  for (const m of lista) {
    const e = estadoMision(jugador, est, m);
    f.button(`§l${m.titulo}§r\n${e.texto}`, m.icono || undefined);
  }
  f.button("§lCerrar");
  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined || r.selection === lista.length) return;
  await detalle(jugador, lista[r.selection], () => menuNpc(jugador, npc));
}

async function menuLista(jugador, titulo, obtener, vacio) {
  const est = estadoDe(jugador);
  const lista = obtener();
  if (!lista.length) {
    await mensaje(jugador, titulo, `§7${vacio}`);
    return abrirMenu(jugador);
  }
  const f = new ActionFormData().title(`§l${titulo}`);
  for (const m of lista) {
    const e = estadoMision(jugador, est, m);
    const npc = npcDeMision(m);
    const donde = pideNpc(m) ? `§8· ${npc.nombre}` : "§8· desde aquí";
    f.button(`§l${m.titulo}§r\n${e.texto} ${donde}`, m.icono || undefined);
  }
  f.button("§lVolver");
  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection === lista.length) return abrirMenu(jugador);
  await detalle(jugador, lista[r.selection], () => menuLista(jugador, titulo, obtener, vacio));
}

async function detalle(jugador, m, volver) {
  const est = estadoDe(jugador);
  const e = estadoMision(jugador, est, m);
  const npc = npcDeMision(m);
  const conNpc = pideNpc(m);
  const puede = !conNpc || estaCercaDe(jugador, npc.id);

  const f = new ActionFormData().title(`§l${m.titulo}`);
  let cuerpo = cuerpoMision(jugador, est, m, e);
  const acciones = [];

  if (e.clave === "disponible") {
    if (puede) { f.button("§l§2Aceptar misión"); acciones.push("aceptar"); }
    else cuerpo += `\n\n§eVe con ${dondeEsta(jugador, npc)}§e y tócalo para aceptarla.`;
  }
  if (e.clave === "lista") {
    if (puede) { f.button("§l§2Entregar misión"); acciones.push("entregar"); }
    else cuerpo += `\n\n§eVe con ${dondeEsta(jugador, npc)}§e y tócalo para entregarla.`;
  }
  if (e.clave === "en_curso" || e.clave === "lista") { f.button("§cAbandonar"); acciones.push("abandonar"); }
  f.button("Volver"); acciones.push("volver");
  f.body(cuerpo);

  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  const accion = acciones[r.selection];
  if (accion === "volver") return volver();

  if ((accion === "aceptar" || accion === "entregar") && conNpc && !estaCercaDe(jugador, npc.id)) {
    jugador.sendMessage(`${PREFIJO}§cTe alejaste de ${npc.nombre}. Acércate e inténtalo de nuevo.`);
    return;
  }

  if (accion === "aceptar") {
    const res = await aceptar(jugador, m.id);
    if (res.ok) {
      jugador.sendMessage(`${PREFIJO}§aAceptaste §e${m.titulo}§a. ¡Buena suerte!`);
      try { jugador.playSound("random.orb"); } catch {}
    } else {
      await mensaje(jugador, m.titulo, `§c${res.motivo}`);
    }
    return detalle(jugador, m, volver);
  }

  if (accion === "entregar") {
    const res = await entregar(jugador, m);
    if (res.ok) {
      jugador.sendMessage(`${PREFIJO}§a¡Misión §e${m.titulo}§a completada!${m.recompensa_texto ? ` §7Recompensa: §f${m.recompensa_texto}` : ""}`);
      try { jugador.playSound("random.levelup"); } catch {}
      return volver();
    }
    await mensaje(jugador, m.titulo, `§c${res.motivo}`);
    return detalle(jugador, m, volver);
  }

  if (accion === "abandonar") {
    const c = new MessageFormData()
      .title("Abandonar misión")
      .body(`¿Seguro que quieres abandonar §e${m.titulo}§r?\nPerderás el avance que llevas.`)
      .button1("No, seguir")
      .button2("§cSí, abandonar");
    const rc = await mostrar(c, jugador);
    if (rc.selection === 1) {
      await abandonar(jugador, m.id);
      jugador.sendMessage(`${PREFIJO}§7Abandonaste §e${m.titulo}§7.`);
      return volver();
    }
    return detalle(jugador, m, volver);
  }
}

async function vincular(jugador) {
  let r;
  try { r = await rpc("_generar_codigo", { p_jugador: jugador.id }); }
  catch (e) { console.warn("[Misiones] " + e); }
  if (!r || !r.ok) return mensaje(jugador, "Vincular con la página", "§cNo se pudo crear tu código. Inténtalo en unos segundos.");

  await mensaje(jugador, "Vincular con la página",
    `Tu código es:\n\n§l§e${r.codigo}§r\n\n` +
    `1. Entra a §b${URL_PAGINA}\n§r2. Abre §fMi aventura\n§r3. Escribe el código\n\n` +
    `§7Vence en ${r.minutos} minutos. Ahí podrás ver tus misiones, tu progreso y las crónicas de la historia.`);
  return abrirMenu(jugador);
}
