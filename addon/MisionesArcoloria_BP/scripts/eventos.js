// Escucha lo que hacen los jugadores y lo convierte en avance de misiones.

import { world, Player } from "@minecraft/server";
import { registrarAccion, registrarDano } from "./progreso.js";

export function escucharEventos() {
  // Matar
  world.afterEvents.entityDie.subscribe((e) => {
    const src = e.damageSource;
    const jugador = src?.damagingEntity;
    if (!(jugador instanceof Player)) return;
    registrarAccion(jugador, {
      tipo: "matar",
      id: e.deadEntity.typeId,
      causa: src.cause,
      ubicacion: e.deadEntity.location,
    });
  });

  // Romper bloques (la herramienta es la que tenía antes de romper)
  world.afterEvents.playerBreakBlock.subscribe((e) => {
    registrarAccion(e.player, {
      tipo: "romper",
      id: e.brokenBlockPermutation.type.id,
      objeto: e.itemStackBeforeBreak ?? null,
      ubicacion: e.block.location,
    });
  });

  // Colocar bloques
  world.afterEvents.playerPlaceBlock.subscribe((e) => {
    registrarAccion(e.player, { tipo: "colocar", id: e.block.typeId, ubicacion: e.block.location });
  });

  // Interactuar con criaturas o NPCs
  world.afterEvents.playerInteractWithEntity.subscribe((e) => {
    registrarAccion(e.player, { tipo: "interactuar", id: e.target.typeId, ubicacion: e.target.location });
  });

  // Interactuar con bloques (palancas, cofres, altares...)
  world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    if (e.isFirstEvent === false) return; // mantener presionado no cuenta varias veces
    registrarAccion(e.player, { tipo: "interactuar", id: e.block.typeId, ubicacion: e.block.location });
  });

  // Usar objetos
  world.afterEvents.itemUse.subscribe((e) => {
    registrarAccion(e.source, { tipo: "usar", id: e.itemStack.typeId, objeto: e.itemStack });
  });

  // Comer o beber
  world.afterEvents.itemCompleteUse.subscribe((e) => {
    registrarAccion(e.source, { tipo: "consumir", id: e.itemStack.typeId, objeto: e.itemStack });
  });

  // Recibir daño (para objetivos "sin recibir daño")
  world.afterEvents.entityHurt.subscribe(
    (e) => {
      if (e.hurtEntity instanceof Player && e.damage > 0) registrarDano(e.hurtEntity);
    },
    { entityTypes: ["minecraft:player"] }
  );
}
