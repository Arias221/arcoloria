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

## Datos simulados (para probar)

`js/datos.js` trae datos de ejemplo y un pequeño retraso artificial. Los cambios se guardan **solo en el navegador donde pruebas** (localStorage), para que lo que edites en `admin.html` se vea en `index.html`.

- **Jugador de prueba:** en «Mi aventura» escribe el código `ABC123`.
- **Administrador de prueba:** cualquier correo con la contraseña `admin`.
- **Volver a los datos de ejemplo:** abre la consola del navegador y escribe `Datos.reiniciarDatosSimulados()`, luego recarga.

## Conectar con Supabase

Solo hay que reemplazar `js/datos.js`. Las demás partes llaman únicamente a las funciones de `window.Datos`, con los mismos nombres y formas que pide el documento:

- Públicas: `obtenerConfiguracion`, `listarNpcs`, `listarCapitulos`, `listarMisiones`, `obtenerMision`
- Jugador: `estadoSesionJugador`, `vincularCuenta`, `cerrarSesionJugador`, `miProgreso`, `miHistoria`, `aceptarMision`
- Admin: `iniciarSesionAdmin`, `cerrarSesionAdmin`, `esAdmin`, `guardarMision`, `eliminarMision`, `obtenerComandos`, `guardarCapitulo`, `obtenerHistoriaAdmin`, `eliminarCapitulo`, `guardarNpc`, `eliminarNpc`, `guardarConfiguracion`

Detalles que la versión real debe respetar:

- Las funciones de guardar y eliminar devuelven `{ ok: true }` o `{ ok: false, motivo }`. Si el motivo contiene la palabra «sesión», el panel vuelve a pedir el inicio de sesión.
- Al **renombrar** el id de una misión, capítulo o NPC, el panel envía el id anterior en el campo `_id_original` para que la base sepa qué registro actualizar.
- Los comandos de recompensa y la historia de los capítulos **nunca** deben enviarse a jugadores. En Supabase, protégelos con políticas de seguridad (RLS) y no solo ocultándolos en la página.
- `miHistoria()` debe devolver solo los capítulos que el jugador completó.

## Íconos de ítems

El campo `icono` usa rutas como `textures/items/ghast_tear`. La página busca `textures/items/ghast_tear.png` y, si no existe, muestra un destello mágico de respaldo. Cuando tengas las texturas, colócalas en una carpeta `textures/items/` junto a `index.html`.

## Netlify

Sube la carpeta completa. Si va dentro del sitio de Arcoloria, ponla en una subcarpeta (por ejemplo `site/misiones/`) y quedará en `/misiones/`. Como `fondo.jpg` va incluido dentro de esta carpeta, funciona igual en cualquier ubicación.
