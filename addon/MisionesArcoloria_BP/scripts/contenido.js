// Misiones, capítulos, NPCs y configuración descargados de la base.
// Se guarda una copia en el mundo para seguir funcionando si la base no responde.

import { world } from "@minecraft/server";
import { leer } from "./api.js";

const CLAVE_CACHE = "misiones:cache";
const TAM_TROZO = 8000; // caracteres por trozo (el límite real es en bytes y las tildes ocupan más)

export const contenido = {
  version: 0,
  config: { max_misiones_activas: 5, max_completadas_diarias: 10, hora_reinicio: 20, zona_horaria: "America/La_Paz" },
  npcs: new Map(),
  capitulos: new Map(),
  misiones: new Map(),
};

function aplicar(datos) {
  contenido.version = datos.version;
  if (datos.config) contenido.config = datos.config;
  contenido.npcs = new Map(datos.npcs.map((n) => [n.id, n]));
  contenido.capitulos = new Map(datos.capitulos.map((c) => [c.id, c]));
  contenido.misiones = new Map(
    datos.misiones.map((m) => {
      m.objetivos = (m.objetivos || []).sort((a, b) => a.orden - b.orden).map((o) => ({ ...o, id: String(o.id) }));
      return [m.id, m];
    })
  );
}

/* ---------- copia local en el mundo ---------- */
function guardarCache(datos) {
  try {
    const texto = JSON.stringify(datos);
    const n = Math.ceil(texto.length / TAM_TROZO);
    for (let i = 0; i < n; i++) world.setDynamicProperty(`${CLAVE_CACHE}:${i}`, texto.slice(i * TAM_TROZO, (i + 1) * TAM_TROZO));
    const anterior = Number(world.getDynamicProperty(`${CLAVE_CACHE}:n`) || 0);
    for (let i = n; i < anterior; i++) world.setDynamicProperty(`${CLAVE_CACHE}:${i}`, undefined);
    world.setDynamicProperty(`${CLAVE_CACHE}:n`, n);
  } catch (e) {
    console.warn("[Misiones] No se pudo guardar la copia local: " + e);
  }
}

export function cargarCache() {
  try {
    const n = Number(world.getDynamicProperty(`${CLAVE_CACHE}:n`) || 0);
    if (!n) return false;
    let texto = "";
    for (let i = 0; i < n; i++) texto += world.getDynamicProperty(`${CLAVE_CACHE}:${i}`) || "";
    aplicar(JSON.parse(texto));
    return true;
  } catch (e) {
    console.warn("[Misiones] Copia local dañada, se ignorará: " + e);
    return false;
  }
}

/* ---------- sincronización ---------- */
let sincronizando = false;

/** Revisa la versión en la base y descarga todo solo si cambió. Devuelve true si hubo cambios. */
export async function sincronizar(forzar = false) {
  if (sincronizando) return false;
  sincronizando = true;
  try {
    const v = await leer("sincronizacion?select=version_contenido&id=eq.1");
    const version = v && v[0] ? Number(v[0].version_contenido) : 0;
    if (!forzar && version === contenido.version) return false;

    const [config, npcs, capitulos, misiones] = await Promise.all([
      leer("configuracion?select=max_misiones_activas,max_completadas_diarias,hora_reinicio,zona_horaria&id=eq.1"),
      leer("npcs?select=id,nombre,es_principal"),
      leer("capitulos?select=id,orden,titulo,npc_id,capitulo_previo,activo&order=orden"),
      leer("misiones?select=id,titulo,descripcion,icono,categoria,capitulo_id,orden,npc_id,mision_previa,repeticion,repeticion_veces,repeticion_horas,tiempo_limite_seg,recompensa_texto,activa,objetivos(id,orden,tipo,objetivo,cantidad,condiciones,descripcion)"),
    ]);
    const datos = { version, config: config && config[0], npcs: npcs || [], capitulos: capitulos || [], misiones: misiones || [] };
    aplicar(datos);
    guardarCache(datos);
    console.warn(`[Misiones] Contenido actualizado (versión ${version}): ${contenido.misiones.size} misiones, ${contenido.npcs.size} NPCs.`);
    return true;
  } finally {
    sincronizando = false;
  }
}

/* ---------- consultas ---------- */

/** NPC que entrega una misión: el de la misión, el de su capítulo o el principal. */
export function npcDeMision(m) {
  let id = m.npc_id;
  if (!id && m.categoria === "historia") {
    const cap = contenido.capitulos.get(m.capitulo_id);
    if (cap) id = cap.npc_id;
  }
  if (id && contenido.npcs.has(id)) return contenido.npcs.get(id);
  for (const n of contenido.npcs.values()) if (n.es_principal) return n;
  return null;
}

/** Misiones visibles que entrega un NPC, en orden: historia por capítulo y luego independientes. */
export function misionesDeNpc(npcId) {
  const lista = [];
  for (const m of contenido.misiones.values()) {
    if (!m.activa) continue;
    const npc = npcDeMision(m);
    if (npc && npc.id === npcId) lista.push(m);
  }
  const ordenCap = (m) => (m.categoria === "historia" ? contenido.capitulos.get(m.capitulo_id)?.orden ?? 9999 : 99999);
  return lista.sort((a, b) => ordenCap(a) - ordenCap(b) || a.orden - b.orden || a.titulo.localeCompare(b.titulo));
}
