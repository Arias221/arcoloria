// Recompensas: comandos normales y recompensas especiales que un comando no puede dar.
//
// Cada línea es un comando del juego (give, effect, xp...) con @s como el jugador,
// o una recompensa especial que empieza con @:
//   @libro_encantado <encantamiento> [nivel]               @libro_encantado mending
//   @encantado <ítem> [cantidad] <encant.> <nivel> ...     @encantado golden_helmet unbreaking 2
//   @libro_firmado <título> | <autor> | <página> | ...     @libro_firmado Amigo del Principito | El Principito | Gracias...
//   @pocion <efecto> [cantidad] [arrojadiza|persistente]   @pocion night_vision 1
//   @elegir <texto>=<comando> ; <texto>=<comando> ...      @elegir Cama roja=give @s red_bed ; Cama azul=give @s blue_bed
//   @titulo <título> | <subtítulo>                         @titulo ¡Bien hecho! | El zorro te recuerda
//   @sonido <sonido>                                       @sonido random.levelup

import { ItemStack, Potions, EnchantmentTypes } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { system } from "@minecraft/server";
import { sinPrefijo } from "./util.js";
import { normalizarPocion } from "./condiciones.js";

function avisarAdmin(jugador, texto) {
  console.warn("[Misiones] Recompensa: " + texto);
  try { jugador.sendMessage("§c[Misiones] Una parte de tu recompensa no se pudo entregar. Avisa a un administrador."); } catch {}
}

/** Pone el objeto en el inventario; lo que no cabe cae al suelo junto al jugador. */
export function darObjeto(jugador, stack) {
  const inv = jugador.getComponent("minecraft:inventory")?.container;
  const sobra = inv ? inv.addItem(stack) : stack;
  if (sobra) jugador.dimension.spawnItem(sobra, jugador.location);
}

function idItem(id) {
  const s = String(id || "").trim().toLowerCase();
  return s.includes(":") ? s : "minecraft:" + s;
}

function encantar(stack, pares) {
  const comp = stack.getComponent("minecraft:enchantable");
  if (!comp) throw new Error(`«${stack.typeId}» no se puede encantar`);
  for (const [enc, nivel] of pares) {
    const tipo = EnchantmentTypes.get(sinPrefijo(enc));
    if (!tipo) throw new Error(`encantamiento desconocido «${enc}»`);
    comp.addEnchantment({ type: tipo, level: Math.max(1, Math.min(tipo.maxLevel, Number(nivel) || 1)) });
  }
  return stack;
}

function pocion(efecto, entrega) {
  const buscado = normalizarPocion(efecto);
  const todos = Potions.getAllEffectTypes();
  const exacto = (t) => sinPrefijo(t.id).replace(/[^a-z]/g, "") === sinPrefijo(efecto).replace(/[^a-z]/g, "");
  const tipo = todos.find(exacto) || todos.find((t) => normalizarPocion(t.id) === buscado);
  if (!tipo) {
    throw new Error(`poción desconocida «${efecto}». Disponibles: ` + Potions.getAllEffectTypes().map((t) => sinPrefijo(t.id)).join(", "));
  }
  const palabra = entrega === "arrojadiza" ? "splash" : entrega === "persistente" ? "linger" : "consume";
  const tipos = Potions.getAllDeliveryTypes();
  const via = tipos.find((d) => d.id.toLowerCase().includes(palabra)) || tipos[0];
  return Potions.resolve(tipo, via);
}

async function elegir(jugador, opciones) {
  const f = new ActionFormData().title("§lElige tu recompensa").body("Escoge una:");
  for (const o of opciones) f.button(o.texto);
  for (let i = 0; i < 40; i++) {
    const r = await f.show(jugador);
    if (r.cancelationReason === FormCancelationReason.UserBusy) {
      await new Promise((ok) => system.runTimeout(ok, 5));
      continue;
    }
    // Si cierra el menú se le da la primera opción, para que no pierda la recompensa
    return opciones[r.canceled || r.selection === undefined ? 0 : r.selection];
  }
  return opciones[0];
}

async function especial(jugador, linea) {
  const espacio = linea.indexOf(" ");
  const nombre = (espacio < 0 ? linea : linea.slice(0, espacio)).slice(1).toLowerCase();
  const resto = espacio < 0 ? "" : linea.slice(espacio + 1).trim();
  const partes = resto.split(/\s+/).filter(Boolean);

  switch (nombre) {
    case "libro_encantado": {
      darObjeto(jugador, encantar(new ItemStack("minecraft:enchanted_book", 1), [[partes[0], partes[1]]]));
      break;
    }
    case "encantado": {
      const item = idItem(partes.shift());
      const cantidad = /^\d+$/.test(partes[0] || "") ? Number(partes.shift()) : 1;
      const pares = [];
      for (let i = 0; i < partes.length; i += 2) pares.push([partes[i], partes[i + 1]]);
      darObjeto(jugador, encantar(new ItemStack(item, cantidad), pares));
      break;
    }
    case "libro_firmado": {
      const [titulo, autor, ...paginas] = resto.split("|").map((s) => s.trim());
      const libro = new ItemStack("minecraft:written_book", 1);
      const comp = libro.getComponent("minecraft:book");
      if (!comp) throw new Error("el libro firmado no se pudo crear en esta versión");
      comp.setContents(paginas.length ? paginas : [""]);
      comp.signBook(titulo || "Libro", autor || "Arcoloria");
      darObjeto(jugador, libro);
      break;
    }
    case "pocion": {
      const cantidad = /^\d+$/.test(partes[1] || "") ? Number(partes[1]) : 1;
      const entrega = partes.find((p) => p === "arrojadiza" || p === "persistente");
      for (let i = 0; i < cantidad; i++) darObjeto(jugador, pocion(partes[0], entrega));
      break;
    }
    case "elegir": {
      const opciones = resto.split(";").map((s) => s.trim()).filter(Boolean).map((s) => {
        const i = s.indexOf("=");
        return i < 0 ? { texto: s, comando: s } : { texto: s.slice(0, i).trim(), comando: s.slice(i + 1).trim() };
      });
      if (!opciones.length) break;
      const elegida = await elegir(jugador, opciones);
      await ejecutarUna(jugador, elegida.comando);
      break;
    }
    case "titulo": {
      const [titulo, subtitulo] = resto.split("|").map((s) => s.trim());
      jugador.onScreenDisplay.setTitle(titulo || "", { subtitle: subtitulo || "", fadeInDuration: 10, stayDuration: 60, fadeOutDuration: 20 });
      break;
    }
    case "sonido":
      jugador.playSound(partes[0] || "random.levelup");
      break;
    default:
      throw new Error(`recompensa especial desconocida «@${nombre}»`);
  }
}

async function ejecutarUna(jugador, linea) {
  const cmd = String(linea || "").trim().replace(/^\//, "");
  if (!cmd) return;
  try {
    if (/^@[a-z_]{3,}/i.test(cmd)) await especial(jugador, cmd);
    else jugador.runCommand(cmd);
  } catch (e) {
    avisarAdmin(jugador, `«${cmd}» falló: ${e}`);
  }
}

export async function ejecutarRecompensas(jugador, comandos) {
  for (const c of comandos || []) await ejecutarUna(jugador, c);
}
