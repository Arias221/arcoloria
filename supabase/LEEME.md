# Base de datos del sistema de misiones

**Instalación actual (varios servidores): `04_multiservidor.sql`.** Es un script completo: en una base nueva basta con ejecutarlo solo.

- Cada dato pertenece a un servidor (`nubelia`, `solune`). Para agregar otro servidor:
  ```sql
  insert into servidores (id, nombre, orden) values ('nuevo', 'Nuevo', 3);
  ```
  Su configuración y su contador de sincronización se crean solos.
- Si se corta a mitad de camino, basta con ejecutarlo otra vez. Cuando ya hay misiones, capítulos o jugadores, se niega a ejecutarse para no borrarlos.

**Después: `05_misiones_avanzadas.sql`.** Agrega los nuevos tipos de objetivo, misiones que no piden NPC, fecha de apertura y premio por capítulo, ubicación de los NPC y lugares de cada jugador. Se puede ejecutar más de una vez sin problema.

**Crónicas por estrellas: `06_cronicas_estrellas.sql` y luego `07_cuento_principito.sql`.**
- `06` crea las estrellas (cada capítulo se divide en estrellas con su texto y, más adelante, su misión), la función `cronicas()` que la página usa para mostrar solo lo que cada jugador tiene abierto, y el **código de revisión**. Al terminar muestra el código.
- `07` carga el cuento de El Principito (12 constelaciones, 51 estrellas) en todos los servidores. Se genera con `herramientas/generar_cuento.cjs`.
- Código de revisión (10 caracteres): se escribe en la página donde va el código de vinculación y abre todo el cuento en ese navegador.
  - Ver el código: `select codigo from codigos_revision;`
  - Cambiarlo por uno nuevo: `select nuevo_codigo_revision();`
  - Quitar el modo revisión a todos: `select cerrar_revisiones();`

**Misiones en las estrellas: `08_estrellas_misiones.sql`.** Permite poner una misión en cada estrella desde el panel (la misión queda encadenada a la de la estrella anterior), editar las estrellas desde Capítulos, copiar un capítulo con sus estrellas y aceptar desde la página las misiones que no piden NPC.

La carpeta `anteriores/` guarda los scripts de la primera versión (un solo servidor). Ya no se usan; quedan como historial.
