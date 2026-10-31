// Revisa las condiciones de un objetivo en el momento en que el jugador hace la acción.
//
// ctx (todo opcional):
//   ubicacion   lugar donde ocurrió (bloque colocado, criatura muerta...). Si falta, se usa el jugador.
//   objeto      ItemStack usado (herramienta, poción...)
//   causa       forma de muerte
//   nombre      nombre visible de la criatura objetivo
//   npc         id del NPC tocado
//   desde       dimensión de origen (viajar)
//   est         estado del jugador (lugares, efectos recientes)

import { world, EquipmentSlot } from "@minecraft/server";
import { coincide, sinPrefijo, dimensionCorta, distancia, distanciaPlana } from "./util.js";

function equipable(jugador) {
  return jugador.getComponent("minecraft:equippable");
}
export function objetoEnMano(jugador) {
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

const LUNAS = ["fullmoon", "waningGibbous", "firstQuarter", "waningCrescent", "newMoon", "waxingCrescent", "lastQuarter", "waxingGibbous"];
const RANURAS = { helmet: EquipmentSlot.Head, chestplate: EquipmentSlot.Chest, leggings: EquipmentSlot.Legs, boots: EquipmentSlot.Feet, offhand: EquipmentSlot.Offhand };
export const RANURAS_ARMADURA = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];

// Horas del juego (0 = amanecer, 6000 = mediodía, 12000 = atardecer, 18000 = medianoche)
export function enHora(clave, t) {
  switch (clave) {
    case "day": return t >= 0 && t < 12000;
    case "noon": return t >= 5000 && t <= 7000;
    case "sunset": return t >= 11500 && t < 13500;
    case "night": return t >= 13000 && t < 23000;
    case "midnight": return t >= 17000 && t <= 19000;
    case "sunrise": return t >= 22500 || t < 1000;
    default: return true;
  }
}

/** Busca un bloque en un cubo alrededor de una posición. */
export function hayBloqueCerca(dimension, centro, patron, radio) {
  const r = Math.max(1, Math.min(6, Math.round(Number(radio) || 3)));
  const cx = Math.floor(centro.x), cy = Math.floor(centro.y), cz = Math.floor(centro.z);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        try {
          const b = dimension.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
          if (b && coincide(patron, b.typeId)) return true;
        } catch { /* fuera del mundo o sin cargar */ }
      }
  return false;
}

/** Nombre de la poción de un objeto, normalizado (night_vision, invisibility...). */
export function pocionDe(objeto) {
  try {
    const p = objeto?.getComponent("minecraft:potion");
    return p ? normalizarPocion(p.potionEffectType.id) : null;
  } catch { return null; }
}
export function normalizarPocion(id) {
  // "Long_Invisibility" y "Strong_Swiftness" cuentan como la poción base
  return sinPrefijo(id).replace(/^(long|strong)_?/, "").replace(/[^a-z]/g, "");
}

/** Condiciones que solo cambian cómo se cuenta (no se revisan aquí). */
const OPCIONES = new Set(["marca_lugar", "fijar", "no_quitar", "distintas", "dias_distintos", "dias_seguidos",
  "radio", "tenido", "ranura", "sin_dano", "sin_placa"]);

const avisados = new Set();
function desconocida(clave) {
  if (avisados.has(clave)) return;
  avisados.add(clave);
  console.warn(`[Misiones] Condición desconocida «${clave}»: se ignora.`);
}

/** ¿Se cumplen todas las condiciones? */
export function cumple(jugador, condiciones, ctx = {}) {
  if (!condiciones) return true;
  for (const [clave, valor] of Object.entries(condiciones)) {
    if (valor === undefined || valor === null || valor === "" || valor === false) continue;
    if (OPCIONES.has(clave)) continue;
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
  const pos = ctx.ubicacion || j.location;
  switch (clave) {
    case "herramienta": {
      const obj = ctx.objeto !== undefined ? ctx.objeto : objetoEnMano(j);
      return !!obj && coincide(v, obj.typeId);
    }
    case "metodo":
      return ctx.causa === undefined ? true : String(ctx.causa) === String(v);
    case "zona": {
      const [x1, x2] = [Math.min(v.x1, v.x2), Math.max(v.x1, v.x2)];
      const [y1, y2] = [Math.min(v.y1, v.y2), Math.max(v.y1, v.y2)];
      const [z1, z2] = [Math.min(v.z1, v.z2), Math.max(v.z1, v.z2)];
      return pos.x >= x1 && pos.x <= x2 + 1 && pos.y >= y1 && pos.y <= y2 + 1 && pos.z >= z1 && pos.z <= z2 + 1;
    }
    case "altura":
      return compara(v.tipo, pos.y, v.valor);
    case "ubicacion_objetivo": {
      const u = ctx.ubicacion;
      return !!u && Math.floor(u.x) === Number(v.x) && Math.floor(u.y) === Number(v.y) && Math.floor(u.z) === Number(v.z);
    }
    case "cerca_de":
      return j.dimension.getEntities({ location: pos, maxDistance: Number(v.radio) || 5 })
        .some((e) => e.id !== j.id && coincide(v.entidad, e.typeId));
    case "cerca_bloque":
      return hayBloqueCerca(j.dimension, pos, v.bloque, v.radio);
    case "cerca_lugar": {
      const l = ctx.est?.lugares?.[String(v.lugar || "").toLowerCase()];
      if (!l || dimensionCorta(j.dimension.id) !== l.dimension) return false;
      return distancia(pos, l) <= (Number(v.radio) || 10);
    }
    case "lejos_origen":
      return compara(v.tipo || "encima", distanciaPlana(pos, { x: 0, z: 0 }), v.valor);
    case "montado": {
      const montura = j.getComponent("minecraft:riding")?.entityRidingOn;
      return !!montura && coincide(v, montura.typeId);
    }
    case "sin_vehiculo":
      return !j.getComponent("minecraft:riding");
    case "encantamiento": {
      const obj = ctx.objeto !== undefined ? ctx.objeto : objetoEnMano(j);
      const enc = obj?.getComponent("minecraft:enchantable")?.getEnchantment(sinPrefijo(v.id));
      return !!enc && enc.level >= (Number(v.nivel) || 1);
    }
    case "pocion": {
      const obj = ctx.objeto !== undefined ? ctx.objeto : objetoEnMano(j);
      const p = pocionDe(obj);
      return !!p && p === normalizarPocion(v);
    }
    case "vida": {
      const vida = j.getComponent("minecraft:health");
      return !!vida && compara(v.tipo, vida.currentValue, v.valor);
    }
    case "efecto": {
      const ef = j.getEffect(sinPrefijo(v.id));
      return !!ef && ef.amplifier + 1 >= (Number(v.nivel) || 1);
    }
    case "efecto_reciente": {
      const visto = ctx.est?.efectos?.get(sinPrefijo(v.id));
      return !!visto && Date.now() - visto <= (Number(v.segundos) || 30) * 1000;
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
      return RANURAS_ARMADURA.every((s) => !eq?.getEquipment(s));
    }
    case "cielo_abierto": {
      const top = j.dimension.getTopmostBlock({ x: Math.floor(pos.x), z: Math.floor(pos.z) });
      return !top || top.location.y < Math.floor(pos.y) + 1;
    }
    case "plataforma":
      return String(j.clientSystemInfo?.platformType || "").toLowerCase() === String(v).toLowerCase();
    case "etiqueta":
      return j.hasTag(String(v));
    case "equipo": {
      const obj = equipable(j)?.getEquipment(RANURAS[v.ranura]);
      return !!obj && coincide(v.item, obj.typeId);
    }
    case "nombre":
      return String(ctx.nombre || "").trim().toLowerCase() === String(v).trim().toLowerCase();
    case "npc":
      return ctx.npc === v;
    case "desde_dimension":
      return ctx.desde === undefined ? true : ctx.desde === v;
    case "fase_lunar":
      return LUNAS[world.getMoonPhase()] === v;
    case "dimension":
      return dimensionCorta(j.dimension.id) === v;
    case "clima": {
      const actual = climaPorDimension.get(j.dimension.id) || "clear";
      return actual === String(v).toLowerCase();
    }
    case "hora_del_dia":
      return enHora(v, world.getTimeOfDay());
    case "bioma": {
      const b = j.dimension.getBiome(pos);
      return !!b && coincide(v, b.id);
    }
    case "sobre_bloque": {
      const b = j.dimension.getBlock({ x: Math.floor(j.location.x), y: Math.floor(j.location.y) - 1, z: Math.floor(j.location.z) });
      return !!b && coincide(v, b.typeId);
    }
    case "encima_de": {
      const b = j.dimension.getBlock({ x: Math.floor(pos.x), y: Math.floor(pos.y) - 1, z: Math.floor(pos.z) });
      return !!b && coincide(v, b.typeId);
    }
    default:
      desconocida(clave);
      return true;
  }
}
