// Misiones Arcoloria — addon del servidor conectado a la página de misiones.
// Para jugadores: /misiones (nombre completo: /arcoloria:misiones) o tocar un NPC de misiones.

import { world, system, Player, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import { iniciarApi } from "./api.js";
import { contenido, cargarCache, sincronizar, vigilarNpcs } from "./contenido.js";
import { cargarJugador, quitarJugador, guardarJugador, iniciarCiclos } from "./progreso.js";
import { escucharEventos } from "./eventos.js";
import { abrirMenu, menuNpc, disponibles } from "./menu.js";
import { NOMBRE_COMANDO, PREFIJO, SEG_SINCRONIZAR, SEG_NPCS } from "./config.js";

/* ---------- comando /misiones ---------- */
system.beforeEvents.startup.subscribe((inicio) => {
  inicio.customCommandRegistry.registerCommand(
    {
      name: NOMBRE_COMANDO,
      description: "Abre el libro de misiones",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    (origen) => {
      const jugador = origen.sourceEntity;
      if (!(jugador instanceof Player)) {
        return { status: CustomCommandStatus.Failure, message: "Solo un jugador puede abrir el libro de misiones." };
      }
      system.run(() => abrirMenu(jugador).catch((e) => console.warn("[Misiones] " + e)));
      return { status: CustomCommandStatus.Success };
    }
  );
});

/* ---------- acciones de los jugadores y NPC ---------- */
escucharEventos({
  alTocarNpc(jugador, npcId) {
    const npc = contenido.npcs.get(npcId);
    if (npc) menuNpc(jugador, npc).catch((e) => console.warn("[Misiones] " + e));
  },
});

/* ---------- entrada y salida de jugadores ---------- */
world.afterEvents.playerSpawn.subscribe((e) => {
  if (!e.initialSpawn) return;
  const jugador = e.player;
  cargarJugador(jugador).then((est) => {
    if (!est) return;
    // Aviso de bienvenida unos segundos después de entrar
    system.runTimeout(() => {
      try {
        const n = disponibles(jugador, est).length;
        if (n) jugador.sendMessage(`${PREFIJO}§aTienes ${n} ${n === 1 ? "misión disponible" : "misiones disponibles"}. §7Escribe §f/misiones§7 para verlas.`);
      } catch { /* se desconectó */ }
    }, 100);
  });
});

world.beforeEvents.playerLeave.subscribe((e) => {
  const id = e.player.id;
  system.run(async () => {
    try { await guardarJugador(id); } finally { quitarJugador(id); }
  });
});

/* ---------- arranque ---------- */
world.afterEvents.worldLoad.subscribe(() => {
  const listo = iniciarApi();
  if (cargarCache()) console.warn("[Misiones] Usando copia local mientras se conecta con la base.");
  if (!listo) return;

  const sync = () => sincronizar().catch((e) => console.warn("[Misiones] Sin conexión con la base: " + e));
  system.runTimeout(async () => {
    try { await sincronizar(true); } catch (e) { console.warn("[Misiones] Sin conexión con la base: " + e); }
    for (const j of world.getAllPlayers()) cargarJugador(j);
  }, 40);
  system.runInterval(sync, SEG_SINCRONIZAR * 20);
  system.runInterval(() => {
    try { vigilarNpcs(); } catch (e) { console.warn("[Misiones] " + e); }
  }, SEG_NPCS * 20);

  iniciarCiclos();
});
