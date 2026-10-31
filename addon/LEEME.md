# Misiones Arcoloria (addon del servidor)

El mismo addon sirve para Nubelia y Solune: cada servidor solo lee y escribe sus propios datos.

Addon para Bedrock Dedicated Server (BDS) conectado a la misma base de datos que la página de misiones.

## Cómo se juega

- `/misiones` abre el libro de misiones (nombre completo: `/arcoloria:misiones`): misiones disponibles, en curso y vincular con la página.
- **Tocar un NPC registrado** abre su panel (el toque no hace nada más). Ahí se aceptan y entregan sus misiones.
- Si una misión pide NPC y estás lejos, el libro dice a quién ir y en qué coordenadas está.
- Las misiones marcadas «no pide NPC» se aceptan y entregan desde `/misiones`, estés donde estés.
- Un capítulo con fecha de apertura se ve como «Próximamente» hasta esa fecha.
- Al entregar la última misión de un capítulo llega su premio (una sola vez por jugador).
- El avance se cuenta solo mientras juegas. Los objetivos de **obtener** se miran en el inventario y esos objetos se entregan al completar la misión (salvo «queda cumplido al lograrlo» o «no quitar objetos»).
- El tiempo límite empieza con el primer avance.

## Tipos de objetivo

matar, romper, colocar, usar, interactuar, comer/beber, tener en el inventario, ponerse armadura, visitar un bioma o lugar, dormir, llevar una criatura, criar, viajar a una dimensión, recorrer distancia (a pie, en bote, vagoneta, caballo...), guardar en un cofre, construir (cuenta bloques alrededor de un lugar) y apagar lava con agua.

En «Qué» se pueden poner varios ids separados por coma o comodines: `*_sapling`, `*`.

## Recompensas especiales

Además de comandos normales (`give @s ...`), cada línea puede ser:

| Línea | Qué da |
|---|---|
| `@libro_encantado mending` | Libro encantado |
| `@encantado golden_helmet unbreaking 2` | Objeto encantado (se pueden poner varios encantamientos) |
| `@pocion night_vision 1` | Poción (agrega `arrojadiza` o `persistente` si hace falta) |
| `@libro_firmado Título \| Autor \| Página 1 \| Página 2` | Libro escrito y firmado |
| `@elegir Cama roja=give @s red_bed ; Cama azul=give @s blue_bed` | El jugador elige una opción |
| `@titulo Texto \| Subtítulo` | Título en pantalla |
| `@sonido random.levelup` | Sonido |

## NPCs

Los NPCs se registran en la página y en el juego se marcan con una etiqueta. El addon detecta solo dónde están (cuando hay alguien cerca) y lo muestra a los jugadores; en la página se puede corregir o fijar.

```
/tag @e[type=!player,c=1] add npc:<id>
```

## Instalación

1. Ejecutar en Supabase `../supabase/04_multiservidor.sql` y después `05_misiones_avanzadas.sql` (una vez cada uno, en ese orden).
2. Subir `MisionesArcoloria_BP` (o el `.mcpack`) a la carpeta `addons` del servidor.
3. En `config/default/permissions.json`, `allowed_modules` debe incluir `@minecraft/server-net` y `@minecraft/server-admin`.
4. En `config/default/variables.json`:
   ```json
   { "supabase_url": "https://<proyecto>.supabase.co", "servidor": "nubelia" }
   ```
   `servidor` es `nubelia` o `solune` según el mundo. Sin esta línea el addon no arranca, para no mezclar datos.
5. En `config/default/secrets.json`: `"supabase_secret": "sb_secret_..."` (la clave secreta **nunca** va en el código ni en la página).
6. Reiniciar el servidor.

## Archivos

| Archivo | Qué hace |
|---|---|
| `main.js` | Arranque, comando `/misiones`, entrada y salida de jugadores |
| `api.js` | Peticiones a Supabase con la clave secreta |
| `contenido.js` | Descarga misiones/NPCs/capítulos cuando cambian en la web y guarda una copia en el mundo |
| `progreso.js` | Estado de cada jugador, avance, aceptar, entregar, abandonar |
| `eventos.js` | Convierte acciones del juego en avance y abre el panel al tocar un NPC |
| `recompensas.js` | Comandos de recompensa y recompensas especiales (`@...`) |
| `util.js` | Comparar ids (comas y `*`), dimensiones y distancias |
| `condiciones.js` | Revisa las condiciones de cada objetivo |
| `menu.js` | Formularios del libro de misiones |
| `textos.js` | Textos en lenguaje natural (los mismos que usa la página) |
| `config.js` | Distancias e intervalos ajustables |
