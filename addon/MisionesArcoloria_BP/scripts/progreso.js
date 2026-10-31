// Estado de cada jugador conectado y conteo del avance de sus misiones.

import { world, system, EquipmentSlot } from "@minecraft/server";
import { rpc } from "./api.js";
import { contenido, npcDeMision } from "./contenido.js";
import { cumple, pocionDe, normalizarPocion, RANURAS_ARMADURA } from "./condiciones.js";
import { coincide, sinPrefijo, dimensionCorta, distanciaPlana, redondear, diaDelJuego } from "./util.js";
import { ejecutarRecompensas } from "./recompensas.js";
import { PREFIJO, SEG_GUARDAR, SEG_REVISION } from "./config.js";

/** id del jugador -> estado */
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
      lugares: r.lugares || {},
      sucios: new Set(),
      // lo que vive solo en memoria se conserva entre recargas
      avisados: anterior ? anterior.avisados : new Set(),
      banderas: anterior ? anterior.banderas : new Map(),
      restos: anterior ? anterior.restos : new Map(),
      efectos: anterior ? anterior.efectos : new Map(),
      ultimaPos: anterior ? anterior.ultimaPos : null,
      ultimoDanoAviso: 0,
      recuentoPendiente: false,
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

function avisoBarra(jugador, texto) {
  try { jugador.onScreenDisplay.setActionBar(texto); } catch { /* jugador desconectado */ }
}

/** ¿Este objeto sirve para el objetivo? (id + poción + encantamiento) */
function sirveObjeto(o, stack) {
  if (!stack || !coincide(o.objetivo, stack.typeId)) return false;
  const c = o.condiciones || {};
  if (c.pocion && pocionDe(stack) !== normalizarPocion(c.pocion)) return false;
  if (c.encantamiento) {
    const enc = stack.getComponent("minecraft:enchantable")?.getEnchantment(sinPrefijo(c.encantamiento.id));
    if (!enc || enc.level < (Number(c.encantamiento.nivel) || 1)) return false;
  }
  return true;
}
/** Condiciones del lugar o del jugador, sin las que miran el objeto (esas las revisa sirveObjeto). */
function condicionesSinObjeto(c) {
  if (!c || (!c.pocion && !c.encantamiento)) return c;
  const copia = { ...c };
  delete copia.pocion;
  delete copia.encantamiento;
  return copia;
}

function contenedor(jugador) {
  return jugador.getComponent("minecraft:inventory")?.container;
}

export function cantidadEnInventario(jugador, o) {
  const inv = contenedor(jugador);
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (sirveObjeto(o, it)) n += it.amount;
  }
  return n;
}

/** Quita objetos del inventario (para entregar misiones de "obtener"). */
export function quitarDelInventario(jugador, o, cantidad) {
  const inv = contenedor(jugador);
  if (!inv) return 0;
  let falta = cantidad;
  for (let i = 0; i < inv.size && falta > 0; i++) {
    const it = inv.getItem(i);
    if (!sirveObjeto(o, it)) continue;
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

/** Objetivos de "obtener" que se cuentan en vivo (los de fijar quedan cumplidos al lograrse). */
function enVivo(o) {
  return o.tipo === "obtener" && !(o.condiciones && o.condiciones.fijar);
}

export function valorObjetivo(jugador, o, p) {
  if (enVivo(o)) return Math.min(o.cantidad, cantidadEnInventario(jugador, o));
  return Math.min(o.cantidad, Number(p?.avance?.[o.id] || 0));
}

/** ¿Todos los objetivos están cumplidos? */
export function objetivosCompletos(jugador, m, p) {
  return m.objetivos.every((o) => valorObjetivo(jugador, o, p) >= o.cantidad);
}

/* =================== lugares del jugador =================== */

function guardarLugar(jugador, est, nombre, loc) {
  const clave = String(nombre).toLowerCase().replace(/\s+/g, "_");
  if (!/^[a-z0-9_]+$/.test(clave)) return;
  const r = redondear(loc);
  const lugar = { ...r, dimension: dimensionCorta(jugador.dimension.id) };
  const previo = est.lugares[clave];
  if (previo && previo.x === lugar.x && previo.y === lugar.y && previo.z === lugar.z && previo.dimension === lugar.dimension) return;
  est.lugares[clave] = lugar;
  rpc("_guardar_lugar", { p_jugador: jugador.id, p_nombre: clave, p_x: r.x, p_y: r.y, p_z: r.z, p_dimension: lugar.dimension })
    .catch((e) => console.warn("[Misiones] No se pudo guardar el lugar: " + e));
}

/* =================== sumar avance =================== */

/**
 * Suma avance a un objetivo respetando sus opciones:
 * distintas (no repetir la misma criatura), dias_distintos / dias_seguidos, marca_lugar.
 */
function sumar(jugador, est, m, p, o, ctx, n = 1) {
  const c = o.condiciones || {};
  const actual = Number(p.avance[o.id] || 0);
  if (actual >= o.cantidad || n <= 0) return false;

  let base = actual;
  let dia;
  if (c.dias_distintos || c.dias_seguidos) {
    dia = diaDelJuego(world);
    const ultimo = p.avance["_d" + o.id];
    if (ultimo === dia) return false;
    if (c.dias_seguidos && ultimo !== undefined && ultimo !== dia - 1) base = 0;
    n = 1;
  }
  if (c.distintas && ctx.entidadId !== undefined) {
    const lista = p.avance["_i" + o.id] || [];
    if (lista.includes(ctx.entidadId)) return false;
    lista.push(ctx.entidadId);
    if (lista.length > 64) lista.shift();
    p.avance["_i" + o.id] = lista;
  }
  if (dia !== undefined) p.avance["_d" + o.id] = dia;

  p.avance[o.id] = Math.min(o.cantidad, base + n);
  if (!p.avance._inicio) p.avance._inicio = Date.now(); // el tiempo límite empieza con el primer avance
  if (c.marca_lugar) guardarLugar(jugador, est, c.marca_lugar, ctx.ubicacion || jugador.location);
  marcar(est, m.id);
  avisoBarra(jugador, `§e${m.titulo}§r: ${p.avance[o.id]}/${o.cantidad}`);
  revisarLista(jugador, est, m, p);
  return true;
}

/** Fija el valor de un objetivo que se mide (construir, guardar, vestir). Al cumplirse queda cumplido. */
function fijarValor(jugador, est, m, p, o, valor, ctx = {}) {
  const actual = Number(p.avance[o.id] || 0);
  if (actual >= o.cantidad) return;
  const nuevo = Math.min(o.cantidad, Math.max(0, valor));
  if (nuevo === actual) return;
  p.avance[o.id] = nuevo;
  if (!p.avance._inicio && nuevo > 0) p.avance._inicio = Date.now();
  const c = o.condiciones || {};
  if (c.marca_lugar && nuevo > 0) guardarLugar(jugador, est, c.marca_lugar, ctx.ubicacion || jugador.location);
  marcar(est, m.id);
  if (nuevo > actual) avisoBarra(jugador, `§e${m.titulo}§r: ${nuevo}/${o.cantidad}`);
  revisarLista(jugador, est, m, p);
}

/**
 * Acción puntual del jugador (matar, romper, colocar, usar, interactuar, consumir, criar, viajar, apagar).
 * evento: { tipo, id, causa, objeto, ubicacion, nombre, npc, desde, entidadId }
 */
export function registrarAccion(jugador, evento) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;
  const ctx = { ...evento, est };
  for (const { m, p } of misionesEnCurso(est)) {
    for (const o of m.objetivos) {
      if (o.tipo !== evento.tipo) continue;
      if (!coincide(o.objetivo, evento.id)) continue;
      if (Number(p.avance[o.id] || 0) >= o.cantidad) continue;
      if (!cumple(jugador, o.condiciones, ctx)) continue;
      sumar(jugador, est, m, p, o, ctx);
    }
  }
  // Los objetivos de construir se recuentan cuando se coloca o rompe uno de sus bloques
  if (evento.tipo === "colocar" || evento.tipo === "romper") pedirRecuento(jugador, evento.id);
}

/** Objetos guardados en un cofre u otro contenedor. */
export function registrarContenedor(jugador, bloque) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;
  const inv = bloque.getComponent("minecraft:inventory")?.container;
  if (!inv) return;
  const ctx = { ubicacion: bloque.location, est };
  for (const { m, p } of misionesEnCurso(est)) {
    for (const o of m.objetivos) {
      if (o.tipo !== "guardar") continue;
      let n = 0;
      for (let i = 0; i < inv.size; i++) {
        const it = inv.getItem(i);
        if (sirveObjeto(o, it)) n += it.amount;
      }
      if (n === 0) continue;
      if (!cumple(jugador, condicionesSinObjeto(o.condiciones), ctx)) continue;
      fijarValor(jugador, est, m, p, o, n, ctx);
    }
  }
}

/** Si recibe daño, los objetivos "sin recibir daño" vuelven a cero. */
export function registrarDano(jugador) {
  reiniciarPor(jugador, "sin_dano", "recibiste daño");
}
/** Si pisa una placa de presión, los objetivos "sin pisar placas" vuelven a cero. */
export function registrarPlaca(jugador) {
  reiniciarPor(jugador, "sin_placa", "pisaste una placa de presión");
}
function reiniciarPor(jugador, opcion, motivo) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;
  for (const { m, p } of misionesEnCurso(est)) {
    let reinicio = false;
    for (const o of m.objetivos) {
      if (!o.condiciones || !o.condiciones[opcion]) continue;
      const v = Number(p.avance[o.id] || 0);
      if (v > 0 && v < o.cantidad) {
        p.avance[o.id] = 0;
        reinicio = true;
      }
    }
    if (reinicio) {
      marcar(est, m.id);
      if (Date.now() - est.ultimoDanoAviso > 5000) {
        est.ultimoDanoAviso = Date.now();
        avisoBarra(jugador, `§c${m.titulo}: ${motivo}, el avance volvió a 0`);
      }
    }
  }
}

function revisarLista(jugador, est, m, p) {
  if (est.avisados.has(m.id) || !objetivosCompletos(jugador, m, p)) return;
  est.avisados.add(m.id);
  const npc = npcDeMision(m);
  const donde = m.requiere_npc === false || !npc
    ? "Usa §f/misiones§7 para entregarla."
    : `Vuelve con §f${npc.nombre}§7 para entregarla.`;
  jugador.sendMessage(`${PREFIJO}§a¡Completaste los objetivos de §e${m.titulo}§a! §7${donde}`);
  try { jugador.playSound("random.orb"); } catch {}
}

/* =================== construir: contar bloques alrededor =================== */

function centroConstruccion(jugador, est, o) {
  const c = o.condiciones || {};
  if (c.cerca_lugar && c.cerca_lugar.lugar) {
    const l = est.lugares[String(c.cerca_lugar.lugar).toLowerCase()];
    if (!l || l.dimension !== dimensionCorta(jugador.dimension.id)) return null;
    return { centro: l, radio: Number(c.cerca_lugar.radio) || Number(c.radio) || 5 };
  }
  return { centro: jugador.location, radio: Number(c.radio) || 5 };
}

function contarBloques(jugador, centro, radio, patron) {
  const r = Math.max(1, Math.min(8, Math.round(radio)));
  const cx = Math.floor(centro.x), cy = Math.floor(centro.y), cz = Math.floor(centro.z);
  let n = 0;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        try {
          const b = jugador.dimension.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
          if (b && coincide(patron, b.typeId)) n++;
        } catch { /* sin cargar */ }
      }
  return n;
}

/** Recuenta los objetivos de construir (todos, o solo los de un tipo de bloque). */
export function recontarConstruccion(jugador, bloqueId) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;
  for (const { m, p } of misionesEnCurso(est)) {
    for (const o of m.objetivos) {
      if (o.tipo !== "construir" || Number(p.avance[o.id] || 0) >= o.cantidad) continue;
      if (bloqueId && !coincide(o.objetivo, bloqueId)) continue;
      const zona = centroConstruccion(jugador, est, o);
      if (!zona) continue;
      if (!cumple(jugador, o.condiciones, { ubicacion: zona.centro, est })) continue;
      fijarValor(jugador, est, m, p, o, contarBloques(jugador, zona.centro, zona.radio, o.objetivo), { ubicacion: zona.centro });
    }
  }
}

function pedirRecuento(jugador, bloqueId) {
  const est = estadoDe(jugador);
  if (!est || est.recuentoPendiente) return;
  const hay = misionesEnCurso(est).some(({ m }) => m.objetivos.some((o) => o.tipo === "construir" && coincide(o.objetivo, bloqueId)));
  if (!hay) return;
  est.recuentoPendiente = true;
  system.runTimeout(() => {
    est.recuentoPendiente = false;
    try { recontarConstruccion(jugador); } catch (e) { console.warn("[Misiones] " + e); }
  }, 20);
}

/* =================== revisión periódica =================== */

function vistiendo(jugador, o) {
  const c = o.condiciones || {};
  const eq = jugador.getComponent("minecraft:equippable");
  if (!eq) return false;
  const RANURAS = { helmet: EquipmentSlot.Head, chestplate: EquipmentSlot.Chest, leggings: EquipmentSlot.Legs, boots: EquipmentSlot.Feet, offhand: EquipmentSlot.Offhand };
  const ranuras = c.ranura && RANURAS[c.ranura] ? [RANURAS[c.ranura]] : [...RANURAS_ARMADURA, EquipmentSlot.Offhand];
  return ranuras.some((r) => {
    const it = eq.getEquipment(r);
    if (!it || !coincide(o.objetivo, it.typeId)) return false;
    if (c.tenido) {
      const color = it.getComponent("minecraft:dyeable")?.color;
      if (!color) return false;
    }
    return true;
  });
}

function vehiculo(jugador) {
  return jugador.getComponent("minecraft:riding")?.entityRidingOn;
}

/** "Al entrar" en una situación: solo cuenta cuando pasa de no cumplirse a cumplirse. */
function flanco(est, clave, ahora) {
  const antes = est.banderas.get(clave) || false;
  est.banderas.set(clave, ahora);
  return ahora && !antes;
}

async function revisarJugador(jugador) {
  const est = estadoDe(jugador);
  if (!est || !est.cargado) return;

  // Pasó la hora de reinicio diario: recargar contadores del día
  if (Date.now() >= est.inicioDia + 24 * 3600e3) {
    await guardarJugador(jugador.id);
    await cargarJugador(jugador);
    return;
  }

  // Efectos recientes (para "efecto reciente", por ejemplo veneno antes de beber leche)
  try { for (const ef of jugador.getEffects()) est.efectos.set(sinPrefijo(ef.typeId), Date.now()); } catch {}

  // Distancia recorrida desde la última revisión
  const ahora = { x: jugador.location.x, y: jugador.location.y, z: jugador.location.z, dim: jugador.dimension.id };
  let recorrido = 0;
  if (est.ultimaPos && est.ultimaPos.dim === ahora.dim) {
    const d = distanciaPlana(est.ultimaPos, ahora);
    if (d < 150) recorrido = d; // más que eso es un teletransporte
  }
  est.ultimaPos = ahora;
  const montura = vehiculo(jugador);

  for (const { m, p } of misionesEnCurso(est)) {
    for (const o of m.objetivos) {
      const c = o.condiciones || {};
      const completo = Number(p.avance[o.id] || 0) >= o.cantidad;
      const clave = m.id + "|" + o.id;
      const ctx = { est };

      switch (o.tipo) {
        case "obtener": {
          if (!cumple(jugador, condicionesSinObjeto(c), ctx)) break;
          const n = Math.min(o.cantidad, cantidadEnInventario(jugador, o));
          if (c.fijar) {
            if (!completo && n > Number(p.avance[o.id] || 0)) fijarValor(jugador, est, m, p, o, n);
          } else if (n !== Number(p.avance[o.id] || 0)) {
            p.avance[o.id] = n;
            marcar(est, m.id);
            if (n >= o.cantidad) revisarLista(jugador, est, m, p);
          }
          break;
        }
        case "vestir":
          if (!completo && vistiendo(jugador, o) && cumple(jugador, c, ctx)) fijarValor(jugador, est, m, p, o, o.cantidad);
          break;
        case "visitar": {
          if (completo) break;
          let ok = true;
          if (o.objetivo && o.objetivo.trim() !== "*") {
            const b = jugador.dimension.getBiome(jugador.location);
            ok = !!b && coincide(o.objetivo, b.id);
          }
          ok = ok && cumple(jugador, c, ctx);
          if (flanco(est, clave, ok)) sumar(jugador, est, m, p, o, ctx);
          break;
        }
        case "dormir": {
          if (completo) break;
          const ok = jugador.isSleeping && cumple(jugador, c, ctx);
          if (flanco(est, clave, ok)) sumar(jugador, est, m, p, o, ctx);
          break;
        }
        case "escoltar": {
          if (completo) break;
          const radio = Number(c.radio) || 6;
          let encontrada;
          for (const e of jugador.dimension.getEntities({ location: jugador.location, maxDistance: radio })) {
            if (e.id === jugador.id || !coincide(o.objetivo, e.typeId)) continue;
            if (cumple(jugador, c, { est, ubicacion: e.location, nombre: e.nameTag })) { encontrada = e; break; }
          }
          if (flanco(est, clave, !!encontrada)) sumar(jugador, est, m, p, o, { est, ubicacion: encontrada.location, entidadId: encontrada.id });
          break;
        }
        case "recorrer": {
          if (completo || recorrido <= 0) break;
          const meta = String(o.objetivo || "*").trim();
          let ok;
          if (meta === "a_pie") ok = !montura && !jugador.isFlying;
          else if (meta === "*") ok = true;
          else ok = !!montura && coincide(meta, montura.typeId);
          if (!ok || !cumple(jugador, c, ctx)) break;
          const acumulado = (est.restos.get(clave) || 0) + recorrido;
          const enteros = Math.floor(acumulado);
          est.restos.set(clave, acumulado - enteros);
          if (enteros > 0) sumar(jugador, est, m, p, o, ctx, enteros);
          break;
        }
      }
    }

    // Tiempo límite
    if (m.tiempo_limite_seg && p.avance._inicio && Date.now() - p.avance._inicio > m.tiempo_limite_seg * 1000
        && !objetivosCompletos(jugador, m, p)) {
      jugador.sendMessage(`${PREFIJO}§cSe acabó el tiempo de §e${m.titulo}§c. Puedes volver a aceptarla.`);
      await abandonar(jugador, m.id);
      return;
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
  let r;
  try { r = await rpc("_aceptar_mision", { p_jugador: jugador.id, p_mision: misionId, p_origen: "juego" }); }
  catch (e) { console.warn("[Misiones] " + e); }
  if (r && r.ok) {
    const est = estadoDe(jugador);
    if (est) {
      est.avisados.delete(misionId);
      for (const k of [...est.banderas.keys()]) if (k.startsWith(misionId + "|")) est.banderas.delete(k);
    }
    await cargarJugador(jugador);
    recontarConstruccion(jugador);
  }
  return r || { ok: false, motivo: "No se pudo conectar con el libro de misiones." };
}

export async function abandonar(jugador, misionId) {
  let r;
  try { r = await rpc("_abandonar_mision", { p_jugador: jugador.id, p_mision: misionId }); }
  catch (e) { console.warn("[Misiones] " + e); }
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
  recontarConstruccion(jugador);
  if (!objetivosCompletos(jugador, m, p)) return { ok: false, motivo: "Todavía te faltan objetivos por cumplir." };

  const avance = {};
  for (const o of m.objetivos) avance[o.id] = valorObjetivo(jugador, o, p);

  let r;
  try { r = await rpc("_completar_mision", { p_jugador: jugador.id, p_mision: m.id, p_avance: avance }); }
  catch (e) { console.warn("[Misiones] " + e); }
  if (!r || !r.ok) return r || { ok: false, motivo: "No se pudo conectar con el libro de misiones." };

  for (const o of m.objetivos) {
    const c = o.condiciones || {};
    if (o.tipo === "obtener" && !c.fijar && !c.no_quitar) quitarDelInventario(jugador, o, o.cantidad);
  }
  est.sucios.delete(m.id);
  est.avisados.delete(m.id);

  await ejecutarRecompensas(jugador, r.comandos || []);
  if (r.capitulo) {
    const cap = r.capitulo;
    try { jugador.onScreenDisplay.setTitle(`§6Parte ${cap.orden} completada`, { subtitle: `§f${cap.titulo}`, fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20 }); } catch {}
    jugador.sendMessage(`${PREFIJO}§6¡Completaste «${cap.titulo}»!${cap.recompensa_texto ? ` §7Recompensa extra: §f${cap.recompensa_texto}` : ""}`);
    try { jugador.playSound("random.toast"); } catch {}
    await ejecutarRecompensas(jugador, cap.comandos || []);
  }
  await cargarJugador(jugador);
  return { ok: true, capitulo: r.capitulo || null };
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
