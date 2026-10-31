// Utilidades compartidas: comparar ids, dimensiones, distancias.

export function sinPrefijo(id) {
  return String(id || "").trim().toLowerCase().replace(/^minecraft:/, "");
}

const cachePatrones = new Map();

/**
 * ¿El id coincide con el patrón?
 * El patrón puede tener varios ids separados por coma y comodines con *:
 *   "minecraft:oak_sapling, minecraft:birch_sapling"   "*_sapling"   "*"
 */
export function coincide(patron, id) {
  if (patron === undefined || patron === null || patron === "") return false;
  let reglas = cachePatrones.get(patron);
  if (!reglas) {
    reglas = String(patron).split(",").map((p) => sinPrefijo(p)).filter(Boolean).map((p) =>
      p.includes("*") ? new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$") : p
    );
    cachePatrones.set(patron, reglas);
  }
  const limpio = sinPrefijo(id);
  return reglas.some((r) => (typeof r === "string" ? r === limpio : r.test(limpio)));
}

const DIMENSIONES = { "minecraft:overworld": "overworld", "minecraft:nether": "nether", "minecraft:the_end": "end" };
export const ID_DIMENSION = { overworld: "minecraft:overworld", nether: "minecraft:nether", end: "minecraft:the_end" };

/** "minecraft:the_end" -> "end" */
export function dimensionCorta(id) {
  return DIMENSIONES[id] || sinPrefijo(id);
}

export const NOMBRE_DIMENSION = { overworld: "Mundo normal", nether: "Nether", end: "End" };

export function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
export function distanciaPlana(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
export function redondear(loc) {
  return { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
}

/** Día del juego (cada 20 minutos reales). */
export function diaDelJuego(world) {
  try { return world.getDay(); } catch { return Math.floor(world.getAbsoluteTime() / 24000); }
}
