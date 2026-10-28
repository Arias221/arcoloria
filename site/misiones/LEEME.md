# Libro de Misiones

Página del sistema de misiones: una parte pública para jugadores y otra privada para administradores. Es HTML, CSS y JavaScript puro, sin compilar, lista para subir a Netlify.

## Estructura

```
misiones/
├── index.html        → sección de jugadores (Inicio, Misiones, Crónicas, Mi aventura)
├── admin.html        → sección de administración
├── css/
│   └── estilos.css   → estética de pergaminos mágicos (jugadores y admin)
├── js/
│   ├── datos.js      → CAPA DE DATOS: el único archivo que lee y guarda datos
│   ├── comun.js      → textos para jugadores, condiciones en lenguaje natural, estados, íconos
│   ├── jugador.js    → lógica de index.html
│   └── admin.js      → lógica de admin.html
├── img/
│   ├── fondo.jpg       → mismo fondo de la página principal
│   └── fondo-blur.jpg  → versión borrosa (se ve al bajar)
└── LEEME.md
```

## Base de datos (Supabase)

`js/datos.js` ya está conectado a Supabase. La página carga la librería desde
`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` antes de `datos.js`.

- **Clave:** en `datos.js` solo va la clave publicable (`sb_publishable_...`). La clave secreta **nunca** va en la página.
- **Seguridad:** lo que cada visitante ve o cambia lo deciden las reglas (RLS) y funciones de la base. Los comandos de recompensa y la historia de capítulos no completados nunca llegan al jugador.
- **Jugadores:** al escribir su código de vinculación se crea una sesión anónima (sin cuenta ni contraseña). Requiere tener activado *Anonymous sign-ins* en Supabase.
- **Administradores:** inician sesión con su correo y contraseña de Supabase y deben estar en la tabla `admins`.
- **Sesiones separadas:** `index.html` y `admin.html` guardan su sesión con claves distintas, así un admin puede probar como jugador en el mismo navegador.
- Las funciones de `window.Datos` mantienen los mismos nombres y formas de respuesta (`{ ok }` o `{ ok: false, motivo }`), y `_id_original` sigue sirviendo para renombrar ids.

Los scripts SQL están en la carpeta `supabase/` del repositorio (ejecutar en orden: `01_...`, `02_...`).

## Íconos de ítems

El campo `icono` usa rutas como `textures/items/ghast_tear`. La página busca `textures/items/ghast_tear.png` y, si no existe, muestra un destello mágico de respaldo. Cuando tengas las texturas, colócalas en una carpeta `textures/items/` junto a `index.html`.

## Netlify

Sube la carpeta completa. Si va dentro del sitio de Arcoloria, ponla en una subcarpeta (por ejemplo `site/misiones/`) y quedará en `/misiones/`. Como `fondo.jpg` va incluido dentro de esta carpeta, funciona igual en cualquier ubicación.
