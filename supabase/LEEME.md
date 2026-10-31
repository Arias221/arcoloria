# Base de datos del sistema de misiones

**Instalación actual (varios servidores): `04_multiservidor.sql`.** Es un script completo: en una base nueva basta con ejecutarlo solo.

- Cada dato pertenece a un servidor (`nubelia`, `solune`). Para agregar otro servidor:
  ```sql
  insert into servidores (id, nombre, orden) values ('nuevo', 'Nuevo', 3);
  ```
  Su configuración y su contador de sincronización se crean solos.
- Si se corta a mitad de camino, basta con ejecutarlo otra vez. Cuando ya hay misiones, capítulos o jugadores, se niega a ejecutarse para no borrarlos.

**Después: `05_misiones_avanzadas.sql`.** Agrega los nuevos tipos de objetivo, misiones que no piden NPC, fecha de apertura y premio por capítulo, ubicación de los NPC y lugares de cada jugador. Se puede ejecutar más de una vez sin problema.

La carpeta `anteriores/` guarda los scripts de la primera versión (un solo servidor). Ya no se usan; quedan como historial.
