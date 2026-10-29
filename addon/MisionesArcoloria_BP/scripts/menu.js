// Menú /misiones: misiones de los NPC cercanos, misiones en curso y vinculación con la página.

import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { contenido, npcDeMision, misionesDeNpc } from "./contenido.js";
import { estadoDe, cargarJugador, misionesEnCurso, objetivosCompletos, aceptar, abandonar, entregar } from "./progreso.js";
import { rpc } from "./api.js";
import { textoObjetivo, frasesCondiciones, textoRepeticion, textoDuracion } from "./textos.js";
import { PREFIJO, RADIO_NPC, ETIQUETA_NPC } from "./config.js";

const URL_PAGINA = "arcoloria.netlify.app/misiones";

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
  const f = new ActionFormData().title(titulo).body(cuerpo).button("Volver");
  await mostrar(f, jugador);
}

/* =================== NPC cercanos =================== */

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
function horaTexto(est, ms) {
  const ini = new Date(est.inicioDia);
  let dif = ini.getUTCHours() * 60 + ini.getUTCMinutes() - Number(contenido.config.hora_reinicio || 0) * 60;
  dif = ((dif % 1440) + 1440) % 1440;
  if (dif > 720) dif -= 1440;
  const d = new Date(ms - dif * 60000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
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
    if (cap.capitulo_previo && !capituloCompleto(est, cap.capitulo_previo)) {
      const prev = contenido.capitulos.get(cap.capitulo_previo);
      return { clave: "bloqueada", texto: "§8Bloqueada", detalle: `Primero completa el capítulo «${prev ? prev.titulo : cap.capitulo_previo}».` };
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

/* =================== textos del detalle =================== */

function cuerpoMision(jugador, est, m, e) {
  const p = est.progreso.get(m.id);
  const enCurso = p && p.estado === "aceptada";
  const lineas = [];
  const npc = npcDeMision(m);
  if (m.categoria === "historia") {
    const cap = contenido.capitulos.get(m.capitulo_id);
    if (cap) lineas.push(`§5Capítulo ${cap.orden}: ${cap.titulo}`);
  }
  if (npc) lineas.push(`§7Te la da: §f${npc.nombre}`);
  lineas.push(`§7Estado: ${e.texto}`, "");
  if (m.descripcion) lineas.push(`§f${m.descripcion}`, "");

  lineas.push("§6§lObjetivos§r");
  for (const o of m.objetivos) {
    let linea = `§f• ${textoObjetivo(o)}`;
    if (enCurso) {
      const n = o.tipo === "obtener"
        ? Math.min(o.cantidad, Number(p.avance[o.id] || 0))
        : Number(p.avance[o.id] || 0);
      linea += ` ${n >= o.cantidad ? "§a" : "§e"}(${n}/${o.cantidad})`;
    }
    lineas.push(linea);
    const fr = frasesCondiciones(o.condiciones);
    if (fr.length) lineas.push(`  §7${fr.join(", ")}`);
    if (o.tipo === "obtener") lineas.push("  §8Se entregan al completar la misión");
  }
  lineas.push("");
  if (m.recompensa_texto) lineas.push(`§6Recompensa: §f${m.recompensa_texto}`);
  lineas.push(`§7${textoRepeticion(m)}`);
  if (m.tiempo_limite_seg) lineas.push(`§7Tiempo límite: ${textoDuracion(m.tiempo_limite_seg)} (empieza con tu primer avance)`);
  if (e.detalle) lineas.push("", `§c${e.detalle}`);
  return lineas.join("\n");
}

/* =================== pantallas =================== */

export async function abrirMenu(jugador) {
  let est = estadoDe(jugador);
  if (!est || !est.cargado) est = await cargarJugador(jugador);
  if (!est) {
    jugador.sendMessage(`${PREFIJO}§cNo se pudo conectar con el libro de misiones. Inténtalo en unos segundos.`);
    return;
  }
  if (!contenido.misiones.size) {
    jugador.sendMessage(`${PREFIJO}§7Todavía no hay misiones disponibles.`);
    return;
  }

  const cerca = npcsCercanos(jugador);
  const enCurso = misionesEnCurso(est);
  const f = new ActionFormData().title("§l§6Libro de Misiones");
  f.body(cerca.length
    ? `Estás junto a: §e${cerca.map((n) => n.nombre).join(", ")}`
    : "§7No hay ningún NPC de misiones cerca.\nAcércate a uno para aceptar o entregar misiones.");

  const acciones = [];
  for (const npc of cerca) {
    f.button(`§lMisiones de ${npc.nombre}`, "textures/items/book_writable");
    acciones.push(() => menuNpc(jugador, npc));
  }
  f.button(`§lMis misiones en curso §r§8(${enCurso.length})`, "textures/items/clock_item");
  acciones.push(() => menuEnCurso(jugador));
  f.button("§lVincular con la página", "textures/items/name_tag");
  acciones.push(() => vincular(jugador));

  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  await acciones[r.selection]();
}

async function menuNpc(jugador, npc) {
  const est = estadoDe(jugador);
  const lista = misionesDeNpc(npc.id);
  if (!lista.length) return mensaje(jugador, npc.nombre, "§7Por ahora no tengo misiones para ti.");

  const f = new ActionFormData().title(`§l${npc.nombre}`).body("§7Elige una misión:");
  for (const m of lista) {
    const e = estadoMision(jugador, est, m);
    f.button(`§l${m.titulo}§r\n${e.texto}`, m.icono || undefined);
  }
  f.button("§lVolver");
  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection === lista.length) return abrirMenu(jugador);
  await detalle(jugador, lista[r.selection], () => menuNpc(jugador, npc));
}

async function menuEnCurso(jugador) {
  const est = estadoDe(jugador);
  const lista = misionesEnCurso(est).map(({ m }) => m);
  if (!lista.length) {
    await mensaje(jugador, "Mis misiones en curso", "§7No tienes misiones en curso.\nAcércate a un NPC y usa §f/misiones§7 para aceptar una.");
    return abrirMenu(jugador);
  }
  const f = new ActionFormData().title("§lMis misiones en curso");
  for (const m of lista) {
    const e = estadoMision(jugador, est, m);
    const npc = npcDeMision(m);
    f.button(`§l${m.titulo}§r\n${e.texto}${npc ? ` §8· ${npc.nombre}` : ""}`, m.icono || undefined);
  }
  f.button("§lVolver");
  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection === lista.length) return abrirMenu(jugador);
  await detalle(jugador, lista[r.selection], () => menuEnCurso(jugador));
}

async function detalle(jugador, m, volver) {
  const est = estadoDe(jugador);
  const e = estadoMision(jugador, est, m);
  const npc = npcDeMision(m);
  const cerca = npc ? estaCercaDe(jugador, npc.id) : false;

  const f = new ActionFormData().title(`§l${m.titulo}`);
  let cuerpo = cuerpoMision(jugador, est, m, e);
  const acciones = [];

  if (e.clave === "disponible") {
    if (cerca) { f.button("§l§2Aceptar misión"); acciones.push("aceptar"); }
    else cuerpo += `\n\n§eVe con ${npc ? npc.nombre : "el NPC"} para aceptarla.`;
  }
  if (e.clave === "lista") {
    if (cerca) { f.button("§l§2Entregar misión"); acciones.push("entregar"); }
    else cuerpo += `\n\n§eVe con ${npc ? npc.nombre : "el NPC"} para entregarla.`;
  }
  if (e.clave === "en_curso" || e.clave === "lista") { f.button("§cAbandonar"); acciones.push("abandonar"); }
  f.button("Volver"); acciones.push("volver");
  f.body(cuerpo);

  const r = await mostrar(f, jugador);
  if (r.canceled || r.selection === undefined) return;
  const accion = acciones[r.selection];

  if (accion === "volver") return volver();

  if (accion === "aceptar" || accion === "entregar") {
    if (!npc || !estaCercaDe(jugador, npc.id)) {
      jugador.sendMessage(`${PREFIJO}§cTe alejaste de ${npc ? npc.nombre : "el NPC"}. Acércate e inténtalo de nuevo.`);
      return;
    }
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
