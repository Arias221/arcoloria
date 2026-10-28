-- =====================================================================
--  SISTEMA DE MISIONES — FASE 1: ESTRUCTURA DE LA BASE DE DATOS
--  Pegar completo en Supabase > SQL Editor > New query > Run
--  Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Utilidades
-- ---------------------------------------------------------------------

-- Pone la fecha de actualización automáticamente en cada cambio
create or replace function tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;


-- ---------------------------------------------------------------------
-- 1. Configuración general (una sola fila)
-- ---------------------------------------------------------------------
create table if not exists configuracion (
  id                         int primary key default 1 check (id = 1),
  max_misiones_activas       int  not null default 5  check (max_misiones_activas > 0),
  max_completadas_diarias    int  not null default 10 check (max_completadas_diarias > 0),
  hora_reinicio              int  not null default 20 check (hora_reinicio between 0 and 23),
  zona_horaria               text not null default 'America/La_Paz',
  actualizado                timestamptz not null default now()
);
insert into configuracion (id) values (1) on conflict (id) do nothing;

comment on column configuracion.max_misiones_activas    is 'Misiones independientes que un jugador puede tener aceptadas a la vez';
comment on column configuracion.max_completadas_diarias is 'Misiones independientes que un jugador puede completar por día (la historia no cuenta)';
comment on column configuracion.hora_reinicio           is 'Hora local en que se reinician los límites diarios';


-- ---------------------------------------------------------------------
-- 2. NPCs registrados (los que ya existen en tu mundo)
-- ---------------------------------------------------------------------
create table if not exists npcs (
  id            text primary key check (id ~ '^[a-z0-9_]+$'),
  nombre        text not null,
  descripcion   text,
  es_principal  boolean not null default false,
  actualizado   timestamptz not null default now()
);
-- Solo puede haber un NPC principal
create unique index if not exists npcs_un_solo_principal on npcs (es_principal) where es_principal;

comment on column npcs.id is 'Clave corta en minúsculas, ej: herrero. En el juego se marcará al NPC con la etiqueta npc:herrero';


-- ---------------------------------------------------------------------
-- 3. Capítulos de la historia
-- ---------------------------------------------------------------------
create table if not exists capitulos (
  id                text primary key check (id ~ '^[a-z0-9_]+$'),
  orden             int  not null unique,
  titulo            text not null,
  resumen           text not null default '',   -- público, sin spoilers
  npc_id            text references npcs(id) on delete set null,  -- vacío = NPC principal
  capitulo_previo   text references capitulos(id) on delete set null,
  activo            boolean not null default true,
  actualizado       timestamptz not null default now()
);

-- El texto de la historia va aparte porque solo lo ve quien completó el capítulo
create table if not exists capitulos_historia (
  capitulo_id   text primary key references capitulos(id) on delete cascade,
  texto         text not null default '',
  imagen_url    text,
  actualizado   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. Misiones
-- ---------------------------------------------------------------------
create table if not exists misiones (
  id                 text primary key check (id ~ '^[a-z0-9_]+$'),
  titulo             text not null,
  descripcion        text not null default '',
  icono              text not null default 'textures/items/book_normal',
  categoria          text not null check (categoria in ('historia', 'independiente')),
  capitulo_id        text references capitulos(id) on delete set null,
  orden              int  not null default 0,          -- orden dentro del capítulo
  npc_id             text references npcs(id) on delete set null,  -- vacío = NPC del capítulo o principal
  mision_previa      text references misiones(id) on delete set null,
  repeticion         text not null default 'una_vez'
                       check (repeticion in ('una_vez', 'por_dia', 'cada_horas')),
  repeticion_veces   int  not null default 1 check (repeticion_veces >= 1),  -- usado con por_dia
  repeticion_horas   int  check (repeticion_horas >= 1),                     -- usado con cada_horas
  tiempo_limite_seg  int  check (tiempo_limite_seg > 0),                     -- vacío = sin límite
  recompensa_texto   text not null default '',   -- lo que ve el jugador, ej: "10 lágrimas de ghast"
  activa             boolean not null default true,
  creado             timestamptz not null default now(),
  actualizado        timestamptz not null default now(),

  -- Las misiones de historia pertenecen a un capítulo y no se repiten
  constraint historia_con_capitulo check (categoria <> 'historia' or capitulo_id is not null),
  constraint historia_sin_repeticion check (categoria <> 'historia' or repeticion = 'una_vez'),
  constraint horas_si_cada_horas check (repeticion <> 'cada_horas' or repeticion_horas is not null)
);

-- Los comandos de recompensa van aparte: solo los ven los admins y el servidor
create table if not exists misiones_comandos (
  mision_id    text primary key references misiones(id) on delete cascade,
  comandos     text[] not null default '{}',    -- uno por elemento, sin problemas con comas
  actualizado  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. Objetivos (varios por misión)
-- ---------------------------------------------------------------------
create table if not exists objetivos (
  id            bigint generated always as identity primary key,
  mision_id     text not null references misiones(id) on delete cascade,
  orden         int  not null default 0,
  tipo          text not null check (tipo in
                  ('matar', 'romper', 'colocar', 'usar', 'interactuar', 'consumir', 'obtener')),
  objetivo      text not null,                 -- ej: minecraft:ghast
  cantidad      int  not null check (cantidad > 0),
  condiciones   jsonb not null default '{}'::jsonb,
  descripcion   text not null default '',      -- texto visible, ej: "Derrota 5 ghasts con arco"
  actualizado   timestamptz not null default now()
);
create index if not exists objetivos_por_mision on objetivos (mision_id, orden);

comment on column objetivos.condiciones is
  'Ej: {"herramienta":"bow","metodo":"projectile","dimension":"nether"}';


-- ---------------------------------------------------------------------
-- 6. Jugadores y progreso
-- ---------------------------------------------------------------------
create table if not exists jugadores (
  id                   text primary key,       -- ID del jugador en el mundo
  gamertag             text not null,
  auth_uid             uuid unique references auth.users(id) on delete set null,  -- cuenta web vinculada
  codigo_vinculacion   text unique,
  codigo_expira        timestamptz,
  primera_vez          timestamptz not null default now(),
  ultima_vez           timestamptz not null default now()
);
create index if not exists jugadores_gamertag on jugadores (lower(gamertag));

create table if not exists progreso (
  jugador_id         text not null references jugadores(id) on delete cascade,
  mision_id          text not null references misiones(id) on delete cascade,
  estado             text not null check (estado in ('aceptada', 'completada', 'cancelada')),
  avance             jsonb not null default '{}'::jsonb,   -- {"<id objetivo>": cantidad}
  veces_completada   int  not null default 0,
  aceptada_en        timestamptz,
  completada_en      timestamptz,                          -- la última vez
  origen             text not null default 'juego' check (origen in ('juego', 'web')),
  actualizado        timestamptz not null default now(),
  primary key (jugador_id, mision_id)
);
create index if not exists progreso_por_estado on progreso (estado);

-- Registro de cada vez que se completa algo (para límites diarios y repeticiones)
create table if not exists historial_completadas (
  id             bigint generated always as identity primary key,
  jugador_id     text not null references jugadores(id) on delete cascade,
  mision_id      text not null references misiones(id) on delete cascade,
  completada_en  timestamptz not null default now()
);
create index if not exists historial_jugador_fecha on historial_completadas (jugador_id, completada_en desc);


-- ---------------------------------------------------------------------
-- 7. Administradores de la página
-- ---------------------------------------------------------------------
create table if not exists admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  nombre   text not null default ''
);


-- ---------------------------------------------------------------------
-- 8. Sincronización: número que sube cada vez que cambia el contenido.
--    El addon solo consulta este número y descarga todo si cambió.
-- ---------------------------------------------------------------------
create table if not exists sincronizacion (
  id                 int primary key default 1 check (id = 1),
  version_contenido  bigint not null default 1,
  actualizado        timestamptz not null default now()
);
insert into sincronizacion (id) values (1) on conflict (id) do nothing;

create or replace function subir_version_contenido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update sincronizacion
     set version_contenido = version_contenido + 1, actualizado = now()
   where id = 1;
  return null;
end $$;


-- ---------------------------------------------------------------------
-- 9. Triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  -- fecha de actualización
  foreach t in array array['configuracion','npcs','capitulos','capitulos_historia',
                           'misiones','misiones_comandos','objetivos','progreso']
  loop
    execute format('drop trigger if exists trg_actualizado on %I', t);
    execute format('create trigger trg_actualizado before update on %I
                    for each row execute function tocar_actualizado()', t);
  end loop;

  -- versión de contenido (lo que el addon necesita descargar)
  foreach t in array array['configuracion','npcs','capitulos',
                           'misiones','misiones_comandos','objetivos']
  loop
    execute format('drop trigger if exists trg_version on %I', t);
    execute format('create trigger trg_version after insert or update or delete on %I
                    for each statement execute function subir_version_contenido()', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 10. Funciones de ayuda para los permisos
-- ---------------------------------------------------------------------
create or replace function es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ID del jugador vinculado a la sesión web actual
create or replace function mi_jugador()
returns text language sql stable security definer set search_path = public as $$
  select id from jugadores where auth_uid = auth.uid();
$$;

-- Un capítulo está completado cuando el jugador terminó todas sus misiones activas
create or replace function capitulo_completado(p_capitulo text, p_jugador text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_jugador is not null
     and exists (select 1 from misiones m where m.capitulo_id = p_capitulo and m.activa)
     and not exists (
       select 1 from misiones m
        where m.capitulo_id = p_capitulo and m.activa
          and not exists (
            select 1 from progreso p
             where p.jugador_id = p_jugador and p.mision_id = m.id
               and p.veces_completada > 0));
$$;


-- ---------------------------------------------------------------------
-- 11. Seguridad (RLS)
--     - El addon usa la clave secreta y no pasa por estas reglas.
--     - Visitantes: ven misiones, capítulos (sin historia) y NPCs.
--     - Jugadores vinculados: además ven su progreso y la historia que completaron.
--     - Admins: ven y editan todo.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['configuracion','npcs','capitulos','capitulos_historia','misiones',
                           'misiones_comandos','objetivos','jugadores','progreso',
                           'historial_completadas','admins','sincronizacion']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists p_leer on %I', t);
    execute format('drop policy if exists p_admin on %I', t);
    -- Los admins pueden hacer todo
    execute format('create policy p_admin on %I for all to authenticated
                    using (es_admin()) with check (es_admin())', t);
  end loop;
end $$;

-- Lectura pública
create policy p_leer on configuracion   for select to anon, authenticated using (true);
create policy p_leer on sincronizacion  for select to anon, authenticated using (true);
create policy p_leer on npcs            for select to anon, authenticated using (true);
create policy p_leer on capitulos       for select to anon, authenticated using (activo);
create policy p_leer on misiones        for select to anon, authenticated using (activa);
create policy p_leer on objetivos       for select to anon, authenticated
  using (exists (select 1 from misiones m where m.id = mision_id and m.activa));

-- Historia: solo los capítulos que el jugador ya completó
create policy p_leer on capitulos_historia for select to authenticated
  using (capitulo_completado(capitulo_id, mi_jugador()));

-- Datos propios del jugador vinculado
create policy p_leer on jugadores             for select to authenticated using (auth_uid = auth.uid());
create policy p_leer on progreso              for select to authenticated using (jugador_id = mi_jugador());
create policy p_leer on historial_completadas for select to authenticated using (jugador_id = mi_jugador());
create policy p_leer on admins                for select to authenticated using (user_id = auth.uid());
-- misiones_comandos: sin lectura pública (solo admins y servidor)


-- ---------------------------------------------------------------------
-- 12. Permisos de acceso a las tablas
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;  -- filtrado por RLS
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on function es_admin(), mi_jugador(), capitulo_completado(text, text)
  to anon, authenticated, service_role;


-- ---------------------------------------------------------------------
-- 13. Datos de ejemplo (puedes borrarlos después desde el Table Editor)
-- ---------------------------------------------------------------------
insert into misiones (id, titulo, descripcion, icono, categoria, repeticion, repeticion_veces, recompensa_texto)
values ('cazador_ghast', 'Cazador de Ghasts',
        'Derriba 5 ghasts en el Nether usando solo tu arco',
        'textures/items/ghast_tear', 'independiente', 'por_dia', 1, '10 lágrimas de ghast')
on conflict (id) do nothing;

insert into misiones_comandos (mision_id, comandos)
values ('cazador_ghast', array['give @s ghast_tear 10', 'title @s actionbar §a¡Misión completada!'])
on conflict (mision_id) do nothing;

insert into objetivos (mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
select 'cazador_ghast', 0, 'matar', 'minecraft:ghast', 5,
       '{"herramienta":"bow","metodo":"projectile","dimension":"nether"}',
       'Derrota 5 ghasts con arco en el Nether'
where not exists (select 1 from objetivos where mision_id = 'cazador_ghast');

-- Listo
select 'Estructura de misiones creada correctamente' as resultado;
