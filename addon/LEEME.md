# Misiones Arcoloria (addon del servidor)

Addon para Bedrock Dedicated Server (BDS) conectado a la misma base de datos que la página de misiones.

## Cómo se juega

- `/misiones` abre el libro de misiones (nombre completo: `/arcoloria:misiones`).
- Junto a un NPC registrado (a menos de 8 bloques) aparecen sus misiones: aceptar y entregar solo se puede ahí.
- Lejos de un NPC se pueden ver las misiones en curso, abandonarlas y vincular la cuenta con la página.
- El avance se cuenta solo mientras juegas. Los objetivos de **obtener** se miran en el inventario y esos objetos se entregan al completar la misión.
- El tiempo límite empieza con el primer avance.
- Si un objetivo pide **sin recibir daño**, recibir daño devuelve ese objetivo a 0.

## NPCs

Los NPCs se registran en la página (o en la tabla `npcs`) y en el juego se marcan con una etiqueta:

```
/tag @e[type=!player,c=1] add npc:<id>
```

## Instalación

1. Ejecutar en Supabase, en orden, los scripts de `../supabase/` (`01`, `02` y `03`).
2. Subir `MisionesArcoloria_BP` (o el `.mcpack`) a la carpeta `addons` del servidor.
3. En `config/default/permissions.json`, `allowed_modules` debe incluir `@minecraft/server-net` y `@minecraft/server-admin`.
4. En `config/default/variables.json`: `"supabase_url": "https://<proyecto>.supabase.co"`.
5. En `config/default/secrets.json`: `"supabase_secret": "sb_secret_..."` (la clave secreta **nunca** va en el código ni en la página).
6. Reiniciar el servidor.

## Archivos

| Archivo | Qué hace |
|---|---|
| `main.js` | Arranque, comando `/misiones`, entrada y salida de jugadores |
| `api.js` | Peticiones a Supabase con la clave secreta |
| `contenido.js` | Descarga misiones/NPCs/capítulos cuando cambian en la web y guarda una copia en el mundo |
| `progreso.js` | Estado de cada jugador, avance, aceptar, entregar, abandonar |
| `eventos.js` | Convierte acciones del juego (matar, romper, colocar, usar, interactuar, consumir) en avance |
| `condiciones.js` | Revisa las condiciones de cada objetivo |
| `menu.js` | Formularios del libro de misiones |
| `textos.js` | Textos en lenguaje natural (los mismos que usa la página) |
| `config.js` | Distancias e intervalos ajustables |
