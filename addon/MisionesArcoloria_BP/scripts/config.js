// Ajustes del addon. La URL y la clave secreta NO van aquí:
// se leen de config/default/variables.json y secrets.json del servidor.

export const PREFIJO = "§6[Misiones]§r ";
export const NOMBRE_COMANDO = "arcoloria:misiones";

export const RADIO_NPC = 8;                 // bloques: distancia para aceptar/entregar junto a un NPC
export const ETIQUETA_NPC = "npc:";          // los NPC se marcan con /tag ... add npc:<id>

export const SEG_SINCRONIZAR = 30;          // cada cuánto revisa si cambiaron las misiones en la web
export const SEG_GUARDAR = 10;              // cada cuánto guarda el avance de los jugadores
export const SEG_REVISION = 2;              // inventario (obtener), tiempo límite y avisos

export const MAX_PETICIONES = 3;            // peticiones a la base al mismo tiempo
export const TIEMPO_PETICION = 10;          // segundos de espera por respuesta
