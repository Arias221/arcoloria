// Escucha lo que hacen los jugadores y lo convierte en avance de misiones.

import { world, system, Player } from "@minecraft/server";
import { registrarAccion, registrarContenedor, registrarDano, registrarPlaca } from "./progreso.js";
import { contenido } from "./contenido.js";
import { dimensionCorta, distancia, coincide } from "./util.js";
import { ETIQUETA_NPC } from "./config.js";

/** ¿La entidad es un NPC registrado? Devuelve su id. */
export function npcDeEntidad(entidad) {
  try {
    for (const t of entidad.getTags()) {
      if (t.startsWith(ETIQUETA_NPC)) {
        const id = t.slice(ETIQUETA_NPC.length);
        if (contenido.npcs.has(id)) return id;
      }
    }
  } catch { /* entidad ya no existe */ }
  return null;
}

function seguro(fn) {
  return (e) => {
    try { fn(e); } catch (err) { console.warn("[Misiones] " + err); }
  };
}

/* ---------- apagar lava con agua ---------- */
const LAVA = "minecraft:lava, minecraft:flowing_lava";
const APAGADA = "minecraft:obsidian, minecraft:cobblestone, minecraft:stone";
function contarAlrededor(dimension, centro, patron, r) {
  let n = 0;
  const cx = Math.floor(centro.x), cy = Math.floor(centro.y), cz = Math.floor(centro.z);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        try {
          const b = dimension.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
          if (b && coincide(patron, b.typeId)) n++;
        } catch { /* sin cargar */ }
      }
  return n;
}
const revisandoAgua = new Set();
function alUsarAgua(jugador, lugar) {
  if (revisandoAgua.has(jugador.id)) return;
  const centro = lugar || jugador.location;
  const lava0 = contarAlrededor(jugador.dimension, centro, LAVA, 3);
  if (!lava0) return;
  const piedra0 = contarAlrededor(jugador.dimension, centro, APAGADA, 3);
  revisandoAgua.add(jugador.id);
  system.runTimeout(() => {
    revisandoAgua.delete(jugador.id);
    try {
      const lava1 = contarAlrededor(jugador.dimension, centro, LAVA, 3);
      const piedra1 = contarAlrededor(jugador.dimension, centro, APAGADA, 3);
      if (piedra1 > piedra0 || lava1 < lava0) {
        // Cada poza es una casilla de 8x8: apagar dos veces la misma no cuenta como otra
        const celda = `${Math.floor(centro.x / 8)},${Math.floor(centro.y / 8)},${Math.floor(centro.z / 8)}`;
        registrarAccion(jugador, { tipo: "apagar", id: "minecraft:lava", ubicacion: centro, entidadId: celda });
      }
    } catch (e) { console.warn("[Misiones] " + e); }
  }, 30);
}

export function escucharEventos({ alTocarNpc }) {
  // Matar
  world.afterEvents.entityDie.subscribe(seguro((e) => {
    const src = e.damageSource;
    const jugador = src?.damagingEntity;
    if (!(jugador instanceof Player)) return;
    registrarAccion(jugador, {
      tipo: "matar", id: e.deadEntity.typeId, causa: src.cause,
      ubicacion: e.deadEntity.location, entidadId: e.deadEntity.id,
    });
  }));

  // Romper bloques (la herramienta es la que tenía antes de romper)
  world.afterEvents.playerBreakBlock.subscribe(seguro((e) => {
    registrarAccion(e.player, {
      tipo: "romper", id: e.brokenBlockPermutation.type.id,
      objeto: e.itemStackBeforeBreak ?? null, ubicacion: e.block.location,
    });
  }));

  // Colocar bloques
  world.afterEvents.playerPlaceBlock.subscribe(seguro((e) => {
    registrarAccion(e.player, { tipo: "colocar", id: e.block.typeId, ubicacion: e.block.location });
  }));

  // Tocar un NPC registrado abre su panel de misiones (y cuenta como "interactuar")
  world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    const npc = npcDeEntidad(e.target);
    if (!npc) return;
    e.cancel = true;
    const jugador = e.player, objetivo = e.target, objeto = e.itemStack;
    system.run(() => {
      try {
        registrarAccion(jugador, {
          tipo: "interactuar", id: objetivo.typeId, ubicacion: objetivo.location,
          nombre: objetivo.nameTag, npc, objeto: objeto ?? null, entidadId: objetivo.id,
        });
      } catch (err) { console.warn("[Misiones] " + err); }
      alTocarNpc(jugador, npc);
    });
  });

  // Interactuar con criaturas (alimentar zorros, dar oro a piglins...)
  world.afterEvents.playerInteractWithEntity.subscribe(seguro((e) => {
    registrarAccion(e.player, {
      tipo: "interactuar", id: e.target.typeId, ubicacion: e.target.location,
      nombre: e.target.nameTag, objeto: e.beforeItemStack ?? null, entidadId: e.target.id,
    });
  }));

  // Interactuar con bloques (campanas, atril, mesa de cartografía, portal del End...)
  world.afterEvents.playerInteractWithBlock.subscribe(seguro((e) => {
    if (e.isFirstEvent === false) return; // mantener presionado no cuenta varias veces
    const objeto = e.beforeItemStack ?? null;
    registrarAccion(e.player, { tipo: "interactuar", id: e.block.typeId, ubicacion: e.block.location, objeto });
    if (objeto && objeto.typeId === "minecraft:water_bucket") alUsarAgua(e.player, e.block.location);
  }));

  // Usar objetos (cuerno de cabra, ojos de ender, balde de agua...)
  world.afterEvents.itemUse.subscribe(seguro((e) => {
    registrarAccion(e.source, { tipo: "usar", id: e.itemStack.typeId, objeto: e.itemStack });
    if (e.itemStack.typeId === "minecraft:water_bucket") alUsarAgua(e.source);
  }));

  // Comer o beber
  world.afterEvents.itemCompleteUse.subscribe(seguro((e) => {
    registrarAccion(e.source, { tipo: "consumir", id: e.itemStack.typeId, objeto: e.itemStack });
  }));

  // Nacimientos cerca del jugador (criar)
  world.afterEvents.entitySpawn.subscribe(seguro((e) => {
    if (String(e.cause) !== "Born") return;
    const bebe = e.entity;
    for (const j of world.getAllPlayers()) {
      if (j.dimension.id !== bebe.dimension.id || distancia(j.location, bebe.location) > 16) continue;
      registrarAccion(j, { tipo: "criar", id: bebe.typeId, ubicacion: bebe.location, entidadId: bebe.id });
    }
  }));

  // Viajar entre dimensiones
  world.afterEvents.playerDimensionChange.subscribe(seguro((e) => {
    registrarAccion(e.player, {
      tipo: "viajar", id: dimensionCorta(e.toDimension.id), desde: dimensionCorta(e.fromDimension.id),
      ubicacion: e.toLocation,
    });
  }));

  // Guardar objetos en cofres, barriles...
  world.afterEvents.blockContainerClosed.subscribe(seguro((e) => {
    const j = e.closeSource?.entity;
    if (j instanceof Player) registrarContenedor(j, e.block);
  }));

  // Pisar placas de presión (para "sin pisar placas")
  world.afterEvents.pressurePlatePush.subscribe(seguro((e) => {
    if (e.source instanceof Player) registrarPlaca(e.source);
  }));

  // Recibir daño (para "sin recibir daño")
  world.afterEvents.entityHurt.subscribe(
    seguro((e) => {
      if (e.hurtEntity instanceof Player && e.damage > 0) registrarDano(e.hurtEntity);
    }),
    { entityTypes: ["minecraft:player"] }
  );
}
