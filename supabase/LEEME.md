# Base de datos del sistema de misiones

**Instalación actual (varios servidores): `04_multiservidor.sql`.** Es un script completo: en una base nueva basta con ejecutarlo solo.

- Cada dato pertenece a un servidor (`nubelia`, `solune`). Para agregar otro servidor:
  ```sql
  insert into servidores (id, nombre, orden) values ('nuevo', 'Nuevo', 3);
  ```
  Su configuración y su contador de sincronización se crean solos.
- Si se corta a mitad de camino, basta con ejecutarlo otra vez. Cuando ya hay misiones, capítulos o jugadores, se niega a ejecutarse para no borrarlos.

La carpeta `anteriores/` guarda los scripts de la primera versión (un solo servidor). Ya no se usan; quedan como historial.
