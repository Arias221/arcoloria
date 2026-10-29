// Revisa las condiciones de un objetivo en el momento en que el jugador hace la acción.

import { world, EquipmentSlot } from "@minecraft/server";

/* ---------- utilidades ---------- */
export function sinPrefijo(id) {
  return String(id || "").replace(/^minecraft:/, "");
}
export function mismoId(a, b) {
  return sinPrefijo(a) === sinPrefijo(b);
}

function equipable(jugador) {
  return jugador.getComponent("minecraft:equippable");
}
function objetoEnMano(jugador) {
  try { return equipable(jugador)?.getEquipment(EquipmentSlot.Mainhand); } catch { return undefined; }
}
function compara(tipo, actual, valor) {
  return tipo === "debajo" ? actual < Number(valor) : actual > Number(valor);
}

/* ---------- clima: el juego avisa cuando cambia ---------- */
const climaPorDimension = new Map();
world.afterEvents.weatherChange.subscribe((e) => {
  climaPorDimension.set(e.dimension, String(e.newWeather).toLowerCase());
});

/* ---------- daño reciente (para "sin recibir daño") lo maneja progreso.js ---------- */

const DIMENSIONES = { overworld: "minecraft:overworld", nether: "minecraft:nether", end: "minecraft:the_end" };
const LUNAS = ["fullmoon", "waningGibbous", "firstQuarter", "waningCrescent", "newMoon", "waxingCrescent", "lastQuarter", "waxingGibbous"];
const RANURAS = { helmet: EquipmentSlot.Head, chestplate: EquipmentSlot.Chest, leggings: EquipmentSlot.Legs, boots: EquipmentSlot.Feet, offhand: EquipmentSlot.Offhand };

// Horas del juego (0 = amanecer, 6000 = mediodía, 12000 = atardecer, 18000 = medianoche)
function enHora(clave, t) {
  switch (clave) {
    case "day": return t >= 0 && t < 12000;
    case "noon": return t >= 5000 && t <= 7000;
    case "sunset": return t >= 11500 && t < 13000;
    case "night": return t >= 13000 && t < 23000;
    case "midnight": return t >= 17000 && t <= 19000;
    case "sunrise": return t >= 22500 || t < 500;
    default: return true;
  }
}

const avisados = new Set();
function desconocida(clave) {
  if (avisados.has(clave)) return;
  avisados.add(clave);
  console.warn(`[Misiones] Condición desconocida «${clave}»: se ignora.`);
}

/**
 * ¿Se cumplen todas las condiciones?
 * ctx: { causa, objeto (ItemStack usado), ubicacion (del objetivo) }
 */
export function cumple(jugador, condiciones, ctx = {}) {
  if (!condiciones) return true;
  for (const [clave, valor] of Object.entries(condiciones)) {
    if (valor === undefined || valor === null || valor === "" || valor === false) continue;
    let ok = true;
    try {
      ok = revisar(jugador, clave, valor, ctx);
    } catch (e) {
      console.warn(`[Misiones] Error revisando «${clave}»: ${e}`);
      ok = false;
    }
    if (!ok) return false;
  }
  return true;
}

function revisar(j, clave, v, ctx) {
  const loc = j.location;
  switch (clave) {
    case "herramienta": {
      const obj = ctx.objeto !== undefined ? ctx.objeto : objetoEnMano(j);
      return !!obj && mismoId(obj.typeId, v);
    }
    case "metodo":
      return ctx.causa === undefined ? true : String(ctx.causa) === String(v);
    case "zona": {
      const [x1, x2] = [Math.min(v.x1, v.x2), Math.max(v.x1, v.x2)];
      const [y1, y2] = [Math.min(v.y1, v.y2), Math.max(v.y1, v.y2)];
      const [z1, z2] = [Math.min(v.z1, v.z2), Math.max(v.z1, v.z2)];
      return loc.x >= x1 && loc.x <= x2 + 1 && loc.y >= y1 && loc.y <= y2 + 1 && loc.z >= z1 && loc.z <= z2 + 1;
    }
    case "altura":
      return compara(v.tipo, loc.y, v.valor);
    case "ubicacion_objetivo": {
      const u = ctx.ubicacion;
      return !!u && Math.floor(u.x) === Number(v.x) && Math.floor(u.y) === Number(v.y) && Math.floor(u.z) === Number(v.z);
    }
    case "cerca_de":
      return j.dimension.getEntities({ type: v.entidad, location: loc, maxDistance: Number(v.radio) || 5 }).some((e) => e.id !== j.id);
    case "montado": {
      const montura = j.getComponent("minecraft:riding")?.entityRidingOn;
      return !!montura && mismoId(montura.typeId, v);
    }
    case "sin_dano":
      return true; // se controla aparte: si recibe daño, ese avance vuelve a 0
    case "encantamiento": {
      const obj = ctx.objeto !== undefined ? ctx.objeto : objetoEnMano(j);
      const enc = obj?.getComponent("minecraft:enchantable")?.getEnchantment(sinPrefijo(v.id));
      return !!enc && enc.level >= (Number(v.nivel) || 1);
    }
    case "vida": {
      const vida = j.getComponent("minecraft:health");
      return !!vida && compara(v.tipo, vida.currentValue, v.valor);
    }
    case "efecto": {
      const ef = j.getEffect(sinPrefijo(v.id));
      return !!ef && ef.amplifier + 1 >= (Number(v.nivel) || 1);
    }
    case "hambre": {
      const h = j.getComponent("minecraft:player.hunger");
      return !!h && compara(v.tipo, h.currentValue, v.valor);
    }
    case "nivel":
      return j.level >= Number(v);
    case "puntaje": {
      const obj = world.scoreboard.getObjective(v.objetivo);
      const p = obj?.getScore(j);
      return p !== undefined && p >= Number(v.valor);
    }
    case "bajo_agua": return j.isInWater;
    case "agachado": return j.isSneaking;
    case "en_llamas": return !!j.getComponent("minecraft:onfire");
    case "en_aire": return !j.isOnGround;
    case "sin_armadura": {
      const eq = equipable(j);
      return [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet].every((s) => !eq?.getEquipment(s));
    }
    case "plataforma":
      return String(j.clientSystemInfo?.platformType || "").toLowerCase() === String(v).toLowerCase();
    case "etiqueta":
      return j.hasTag(String(v));
    case "equipo": {
      const obj = equipable(j)?.getEquipment(RANURAS[v.ranura]);
      return !!obj && mismoId(obj.typeId, v.item);
    }
    case "fase_lunar":
      return LUNAS[world.getMoonPhase()] === v;
    case "dimension":
      return j.dimension.id === (DIMENSIONES[v] || v);
    case "clima": {
      const actual = climaPorDimension.get(j.dimension.id) || "clear";
      return actual === String(v).toLowerCase();
    }
    case "hora_del_dia":
      return enHora(v, world.getTimeOfDay());
    case "bioma": {
      const b = j.dimension.getBiome(loc);
      return !!b && mismoId(b.id, v);
    }
    case "sobre_bloque": {
      const b = j.dimension.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y) - 1, z: Math.floor(loc.z) });
      return !!b && mismoId(b.typeId, v);
    }
    default:
      desconocida(clave);
      return true;
  }
}
