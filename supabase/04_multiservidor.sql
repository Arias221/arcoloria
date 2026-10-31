-- =====================================================================
--  SISTEMA DE MISIONES — VARIOS SERVIDORES (Nubelia y Solune)
--  Supabase > SQL Editor > New query > pegar todo > Run
--
--  QUÉ HACE:
--    - Reconstruye todas las tablas para que cada dato pertenezca a un servidor.
--    - CONSERVA: los administradores y los NPCs registrados (pasan a Nubelia).
--    - BORRA: misiones, capítulos, jugadores, progreso y códigos de prueba.
--
--  Si se corta a mitad de camino, basta con ejecutarlo otra vez: retoma
--  y recupera los admins. Cuando ya existan misiones, capítulos o jugadores
--  del nuevo sistema, se niega a ejecutarse para no borrarlos.
-- =====================================================================


begin;

-- ---------------------------------------------------------------------
-- 0. Seguridad: no borrar contenido real del nuevo sistema
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.servidores') is not null then
    if exists (select 1 from public.misiones) or exists (select 1 from public.capitulos) or exists (select 1 from public.jugadores) then
      raise exception 'La base ya tiene misiones, capítulos o jugadores en el sistema de varios servidores. Este script no se debe ejecutar otra vez (los borraría).';
    end if;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 1. Respaldo de admins y NPCs (tablas normales: sobreviven si el script se corta)
-- ---------------------------------------------------------------------
create table if not exists public._respaldo_admins (user_id uuid primary key, nombre text);
create table if not exists public._respaldo_npcs (servidor text, id text, nombre text, descripcion text, es_principal boolean, primary key (servidor, id));
do $$
begin
  if to_regclass('public.admins') is not null then
    insert into public._respaldo_admins select user_id, nombre from public.admins on conflict do nothing;
  end if;
  if to_regclass('public.npcs') is not null then
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'npcs' and column_name = 'servidor') then
      execute 'insert into public._respaldo_npcs select servidor, id, nombre, descripcion, es_principal from public.npcs on conflict do nothing';
    else
      execute 'insert into public._respaldo_npcs select ''nubelia'', id, nombre, descripcion, es_principal from public.npcs on conflict do nothing';
    end if;
  end if;
  -- Si no quedó ningún admin (una ejecución anterior se cortó), se recuperan
  -- las cuentas creadas en el panel de Supabase (las de jugadores son anónimas)
  if not exists (select 1 from public._respaldo_admins) then
    if exists (select 1 from information_schema.columns
                where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') then
      execute 'insert into public._respaldo_admins select id, coalesce(email, '''') from auth.users where not coalesce(is_anonymous, false) on conflict do nothing';
    end if;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2. Quitar la estructura anterior
-- ---------------------------------------------------------------------
drop table if exists historial_completadas, progreso, jugadores, objetivos, misiones_comandos,
  misiones, capitulos_historia, capitulos, npcs, configuracion, sincronizacion, admins, servidores cascade;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = any (array[
         'tocar_actualizado','subir_version_contenido','es_admin','mi_jugador','capitulo_completado',
         'inicio_dia_actual','_aceptar_mision','aceptar_mision','vincular_cuenta','desvincular_cuenta',
         '_sin_sesion_admin','admin_guardar_mision','admin_guardar_capitulo','admin_guardar_npc',
         'admin_eliminar_npc','admin_eliminar_capitulo','admin_copiar_mision','admin_copiar_capitulo',
         '_registrar_jugador','_estado_jugador','_generar_codigo','_guardar_avance',
         '_completar_mision','_abandonar_mision','servidor_valido','_servidor_desconocido','crear_datos_servidor'])
  loop
    execute 'drop function if exists ' || f.firma || ' cascade';
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 3. Tablas
-- ---------------------------------------------------------------------
create function tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

create table servidores (
  id      text primary key check (id ~ '^[a-z0-9_]+$'),
  nombre  text not null,
  orden   int  not null default 0
);
insert into servidores (id, nombre, orden) values ('nubelia', 'Nubelia', 1), ('solune', 'Solune', 2);

create table configuracion (
  servidor                 text primary key references servidores(id) on delete cascade,
  max_misiones_activas     int  not null default 5  check (max_misiones_activas >= 0),
  max_completadas_diarias  int  not null default 10 check (max_completadas_diarias >= 0),
  hora_reinicio            int  not null default 20 check (hora_reinicio between 0 and 23),
  zona_horaria             text not null default 'America/La_Paz',
  actualizado              timestamptz not null default now()
);

create table sincronizacion (
  servidor           text primary key references servidores(id) on delete cascade,
  version_contenido  bigint not null default 1,
  actualizado        timestamptz not null default now()
);

create table npcs (
  servidor      text not null references servidores(id) on delete cascade,
  id            text not null check (id ~ '^[a-z0-9_]+$'),
  nombre        text not null,
  descripcion   text,
  es_principal  boolean not null default false,
  actualizado   timestamptz not null default now(),
  primary key (servidor, id)
);
create unique index npcs_un_principal_por_servidor on npcs (servidor) where es_principal;

create table capitulos (
  servidor         text not null references servidores(id) on delete cascade,
  id               text not null check (id ~ '^[a-z0-9_]+$'),
  orden            int  not null,
  titulo           text not null,
  resumen          text not null default '',
  npc_id           text,
  capitulo_previo  text,
  activo           boolean not null default true,
  actualizado      timestamptz not null default now(),
  primary key (servidor, id),
  unique (servidor, orden),
  foreign key (servidor, npc_id) references npcs(servidor, id)
    on update cascade on delete set null (npc_id),
  foreign key (servidor, capitulo_previo) references capitulos(servidor, id)
    on update cascade on delete set null (capitulo_previo)
);

create table capitulos_historia (
  servidor     text not null,
  capitulo_id  text not null,
  texto        text not null default '',
  imagen_url   text,
  actualizado  timestamptz not null default now(),
  primary key (servidor, capitulo_id),
  foreign key (servidor, capitulo_id) references capitulos(servidor, id) on update cascade on delete cascade
);

create table misiones (
  servidor           text not null references servidores(id) on delete cascade,
  id                 text not null check (id ~ '^[a-z0-9_]+$'),
  titulo             text not null,
  descripcion        text not null default '',
  icono              text not null default 'textures/items/book_normal',
  categoria          text not null check (categoria in ('historia', 'independiente')),
  capitulo_id        text,
  orden              int  not null default 0,
  npc_id             text,
  mision_previa      text,
  repeticion         text not null default 'una_vez' check (repeticion in ('una_vez', 'por_dia', 'cada_horas')),
  repeticion_veces   int  not null default 1 check (repeticion_veces >= 1),
  repeticion_horas   int  check (repeticion_horas >= 1),
  tiempo_limite_seg  int  check (tiempo_limite_seg > 0),
  recompensa_texto   text not null default '',
  activa             boolean not null default true,
  creado             timestamptz not null default now(),
  actualizado        timestamptz not null default now(),
  primary key (servidor, id),
  foreign key (servidor, capitulo_id) references capitulos(servidor, id)
    on update cascade on delete set null (capitulo_id),
  foreign key (servidor, npc_id) references npcs(servidor, id)
    on update cascade on delete set null (npc_id),
  foreign key (servidor, mision_previa) references misiones(servidor, id)
    on update cascade on delete set null (mision_previa),
  constraint historia_con_capitulo check (categoria <> 'historia' or capitulo_id is not null),
  constraint historia_sin_repeticion check (categoria <> 'historia' or repeticion = 'una_vez'),
  constraint horas_si_cada_horas check (repeticion <> 'cada_horas' or repeticion_horas is not null)
);

create table misiones_comandos (
  servidor     text not null,
  mision_id    text not null,
  comandos     text[] not null default '{}',
  actualizado  timestamptz not null default now(),
  primary key (servidor, mision_id),
  foreign key (servidor, mision_id) references misiones(servidor, id) on update cascade on delete cascade
);

create table objetivos (
  id           bigint generated always as identity primary key,
  servidor     text not null,
  mision_id    text not null,
  orden        int  not null default 0,
  tipo         text not null check (tipo in ('matar', 'romper', 'colocar', 'usar', 'interactuar', 'consumir', 'obtener')),
  objetivo     text not null,
  cantidad     int  not null check (cantidad > 0),
  condiciones  jsonb not null default '{}'::jsonb,
  descripcion  text not null default '',
  actualizado  timestamptz not null default now(),
  foreign key (servidor, mision_id) references misiones(servidor, id) on update cascade on delete cascade
);
create index objetivos_por_mision on objetivos (servidor, mision_id, orden);

-- El ID del juego solo es único dentro de cada mundo: el jugador es "servidor + id"
create table jugadores (
  servidor            text not null references servidores(id) on delete cascade,
  id                  text not null,
  gamertag            text not null,
  auth_uid            uuid references auth.users(id) on delete set null,
  codigo_vinculacion  text unique,
  codigo_expira       timestamptz,
  primera_vez         timestamptz not null default now(),
  ultima_vez          timestamptz not null default now(),
  primary key (servidor, id),
  unique (servidor, auth_uid)
);
create index jugadores_auth on jugadores (auth_uid);

create table progreso (
  servidor          text not null,
  jugador_id        text not null,
  mision_id         text not null,
  estado            text not null check (estado in ('aceptada', 'completada', 'cancelada')),
  avance            jsonb not null default '{}'::jsonb,
  veces_completada  int  not null default 0,
  aceptada_en       timestamptz,
  completada_en     timestamptz,
  origen            text not null default 'juego' check (origen in ('juego', 'web')),
  actualizado       timestamptz not null default now(),
  primary key (servidor, jugador_id, mision_id),
  foreign key (servidor, jugador_id) references jugadores(servidor, id) on update cascade on delete cascade,
  foreign key (servidor, mision_id) references misiones(servidor, id) on update cascade on delete cascade
);

create table historial_completadas (
  id             bigint generated always as identity primary key,
  servidor       text not null,
  jugador_id     text not null,
  mision_id      text not null,
  completada_en  timestamptz not null default now(),
  foreign key (servidor, jugador_id) references jugadores(servidor, id) on update cascade on delete cascade,
  foreign key (servidor, mision_id) references misiones(servidor, id) on update cascade on delete cascade
);
create index historial_jugador_fecha on historial_completadas (servidor, jugador_id, completada_en desc);

create table admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  nombre   text not null default ''
);


-- ---------------------------------------------------------------------
-- 4. Triggers: fecha de cambio y versión de contenido por servidor
-- ---------------------------------------------------------------------
create function subir_version_contenido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'INSERT' then
    update sincronizacion set version_contenido = version_contenido + 1, actualizado = now() where servidor = old.servidor;
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.servidor is distinct from old.servidor) then
    update sincronizacion set version_contenido = version_contenido + 1, actualizado = now() where servidor = new.servidor;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['configuracion','npcs','capitulos','capitulos_historia',
                           'misiones','misiones_comandos','objetivos','progreso']
  loop
    execute format('create trigger trg_actualizado before update on %I
                    for each row execute function tocar_actualizado()', t);
  end loop;
  foreach t in array array['configuracion','npcs','capitulos','misiones','misiones_comandos','objetivos']
  loop
    execute format('create trigger trg_version after insert or update or delete on %I
                    for each row execute function subir_version_contenido()', t);
  end loop;
end $$;

-- Cada servidor nuevo recibe su configuración y su contador
create function crear_datos_servidor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into configuracion (servidor) values (new.id) on conflict do nothing;
  insert into sincronizacion (servidor) values (new.id) on conflict do nothing;
  return null;
end $$;
create trigger trg_nuevo_servidor after insert on servidores for each row execute function crear_datos_servidor();
insert into configuracion (servidor) select id from servidores on conflict do nothing;
insert into sincronizacion (servidor) select id from servidores on conflict do nothing;


-- ---------------------------------------------------------------------
-- 5. Funciones de ayuda
-- ---------------------------------------------------------------------
create function es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create function servidor_valido(p_servidor text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from servidores where id = p_servidor);
$$;

-- Jugador vinculado a la sesión web en un servidor
create function mi_jugador(p_servidor text)
returns text language sql stable security definer set search_path = public as $$
  select id from jugadores where servidor = p_servidor and auth_uid = auth.uid();
$$;

create function capitulo_completado(p_servidor text, p_capitulo text, p_jugador text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_jugador is not null
     and exists (select 1 from misiones m where m.servidor = p_servidor and m.capitulo_id = p_capitulo and m.activa)
     and not exists (
       select 1 from misiones m
        where m.servidor = p_servidor and m.capitulo_id = p_capitulo and m.activa
          and not exists (
            select 1 from progreso p
             where p.servidor = p_servidor and p.jugador_id = p_jugador and p.mision_id = m.id
               and p.veces_completada > 0));
$$;

create function inicio_dia_actual(p_servidor text)
returns timestamptz language sql stable security definer set search_path = public as $$
  select (date_trunc('day', (now() at time zone c.zona_horaria) - make_interval(hours => c.hora_reinicio))
          + make_interval(hours => c.hora_reinicio)) at time zone c.zona_horaria
    from configuracion c where c.servidor = p_servidor;
$$;

create function _sin_sesion_admin()
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', false, 'motivo', 'Tu sesión de administrador terminó. Vuelve a iniciar sesión.');
$$;
create function _servidor_desconocido(p_servidor text)
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', false, 'motivo', 'Servidor desconocido: «' || coalesce(p_servidor, '') || '».');
$$;


-- ---------------------------------------------------------------------
-- 6. Seguridad (RLS)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['servidores','configuracion','sincronizacion','npcs','capitulos','capitulos_historia',
                           'misiones','misiones_comandos','objetivos','jugadores','progreso',
                           'historial_completadas','admins']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy p_admin on %I for all to authenticated using (es_admin()) with check (es_admin())', t);
  end loop;
end $$;

create policy p_leer on servidores     for select to anon, authenticated using (true);
create policy p_leer on configuracion  for select to anon, authenticated using (true);
create policy p_leer on sincronizacion for select to anon, authenticated using (true);
create policy p_leer on npcs           for select to anon, authenticated using (true);
create policy p_leer on capitulos      for select to anon, authenticated using (activo);
create policy p_leer on misiones       for select to anon, authenticated using (activa);
create policy p_leer on objetivos      for select to anon, authenticated
  using (exists (select 1 from misiones m where m.servidor = objetivos.servidor and m.id = objetivos.mision_id and m.activa));

create policy p_leer on capitulos_historia for select to authenticated
  using (capitulo_completado(servidor, capitulo_id, mi_jugador(servidor)));

create policy p_leer on jugadores for select to authenticated using (auth_uid = auth.uid());
create policy p_leer on progreso for select to authenticated
  using (exists (select 1 from jugadores j where j.servidor = progreso.servidor and j.id = progreso.jugador_id and j.auth_uid = auth.uid()));
create policy p_leer on historial_completadas for select to authenticated
  using (exists (select 1 from jugadores j where j.servidor = historial_completadas.servidor and j.id = historial_completadas.jugador_id and j.auth_uid = auth.uid()));
create policy p_leer on admins for select to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 7. Funciones de la PÁGINA
-- ---------------------------------------------------------------------

-- Vincular: el código ya indica de qué servidor es el jugador
create function vincular_cuenta(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  j   jugadores;
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'No se pudo iniciar tu sesión. Recarga la página e inténtalo de nuevo.');
  end if;
  select * into j from jugadores
   where codigo_vinculacion = upper(trim(p_codigo)) and codigo_expira > now()
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Ese código no existe o ya venció. Pide uno nuevo con /misiones en el juego.');
  end if;

  update jugadores set auth_uid = null where servidor = j.servidor and auth_uid = uid and id <> j.id;
  update jugadores set auth_uid = uid, codigo_vinculacion = null, codigo_expira = null
   where servidor = j.servidor and id = j.id;

  return jsonb_build_object('ok', true,
    'jugador', jsonb_build_object('id', j.id, 'gamertag', j.gamertag, 'servidor', j.servidor));
end $$;

-- Desvincular un servidor, o todos si no se indica
create function desvincular_cuenta(p_servidor text default null)
returns jsonb language sql security definer set search_path = public as $$
  update jugadores set auth_uid = null
   where auth_uid = auth.uid() and (p_servidor is null or servidor = p_servidor);
  select jsonb_build_object('ok', true);
$$;

create function admin_guardar_mision(p_servidor text, p_mision jsonb, p_objetivos jsonb, p_comandos text[], p_id_original text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id    text := p_mision->>'id';
  v_orig  text := nullif(p_id_original, '');
  v_cat   text := coalesce(p_mision->>'categoria', 'independiente');
  v_rep   text := coalesce(nullif(p_mision->>'repeticion', ''), 'una_vez');
  o       jsonb;
  i       int;
  v_oid   bigint;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;

  if v_orig is null and exists (select 1 from misiones where servidor = p_servidor and id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe una misión con ese id en este servidor.');
  end if;
  if v_orig is not null and v_orig <> v_id then
    if exists (select 1 from misiones where servidor = p_servidor and id = v_id) then
      return jsonb_build_object('ok', false, 'motivo', 'Ya existe una misión con ese id en este servidor.');
    end if;
    update misiones set id = v_id where servidor = p_servidor and id = v_orig;
  end if;

  if v_cat = 'historia' then v_rep := 'una_vez'; end if;

  insert into misiones (servidor, id, titulo, descripcion, icono, categoria, capitulo_id, orden, npc_id, mision_previa,
                        repeticion, repeticion_veces, repeticion_horas, tiempo_limite_seg, recompensa_texto, activa)
  values (
    p_servidor, v_id,
    coalesce(p_mision->>'titulo', ''),
    coalesce(p_mision->>'descripcion', ''),
    coalesce(nullif(p_mision->>'icono', ''), 'textures/items/book_normal'),
    v_cat,
    case when v_cat = 'historia' then nullif(p_mision->>'capitulo_id', '') end,
    coalesce(nullif(p_mision->>'orden', '')::int, 0),
    nullif(p_mision->>'npc_id', ''),
    nullif(nullif(p_mision->>'mision_previa', ''), v_id),
    v_rep,
    greatest(coalesce(nullif(p_mision->>'repeticion_veces', '')::int, 1), 1),
    case when v_rep = 'cada_horas' then nullif(nullif(p_mision->>'repeticion_horas', '')::int, 0) end,
    nullif(nullif(p_mision->>'tiempo_limite_seg', '')::int, 0),
    coalesce(p_mision->>'recompensa_texto', ''),
    coalesce((p_mision->>'activa')::boolean, true)
  )
  on conflict (servidor, id) do update set
    titulo = excluded.titulo, descripcion = excluded.descripcion, icono = excluded.icono,
    categoria = excluded.categoria, capitulo_id = excluded.capitulo_id, orden = excluded.orden,
    npc_id = excluded.npc_id, mision_previa = excluded.mision_previa, repeticion = excluded.repeticion,
    repeticion_veces = excluded.repeticion_veces, repeticion_horas = excluded.repeticion_horas,
    tiempo_limite_seg = excluded.tiempo_limite_seg, recompensa_texto = excluded.recompensa_texto,
    activa = excluded.activa;

  -- Objetivos: se conservan los que ya existían (y el avance de los jugadores)
  delete from objetivos
   where servidor = p_servidor and mision_id = v_id
     and id not in (select (x->>'id')::bigint from jsonb_array_elements(coalesce(p_objetivos, '[]'::jsonb)) x
                     where x->>'id' ~ '^[0-9]+$');
  i := 0;
  for o in select value from jsonb_array_elements(coalesce(p_objetivos, '[]'::jsonb)) loop
    i := i + 1;
    v_oid := case when o->>'id' ~ '^[0-9]+$' then (o->>'id')::bigint end;
    if v_oid is not null and exists (select 1 from objetivos where id = v_oid and servidor = p_servidor and mision_id = v_id) then
      update objetivos set
        orden = i, tipo = o->>'tipo', objetivo = o->>'objetivo', cantidad = (o->>'cantidad')::int,
        condiciones = coalesce(o->'condiciones', '{}'::jsonb), descripcion = coalesce(o->>'descripcion', '')
      where id = v_oid;
    else
      insert into objetivos (servidor, mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
      values (p_servidor, v_id, i, o->>'tipo', o->>'objetivo', (o->>'cantidad')::int,
              coalesce(o->'condiciones', '{}'::jsonb), coalesce(o->>'descripcion', ''));
    end if;
  end loop;

  insert into misiones_comandos (servidor, mision_id, comandos)
  values (p_servidor, v_id, coalesce(p_comandos, '{}'))
  on conflict (servidor, mision_id) do update set comandos = excluded.comandos;

  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Algún dato no es válido (revisa el id, la categoría, la repetición y que las cantidades sean mayores a 0).');
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El capítulo, NPC o misión previa elegidos no existen en este servidor. Recarga la página.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe una misión con ese id en este servidor.');
end $$;

create function admin_guardar_capitulo(p_servidor text, p_capitulo jsonb, p_historia jsonb, p_id_original text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id    text := p_capitulo->>'id';
  v_orig  text := nullif(p_id_original, '');
  v_orden int  := nullif(p_capitulo->>'orden', '')::int;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;
  if v_orden is null or v_orden <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'El orden debe ser un número mayor a 0.');
  end if;
  if nullif(p_capitulo->>'capitulo_previo', '') = v_id then
    return jsonb_build_object('ok', false, 'motivo', 'Un capítulo no puede depender de sí mismo.');
  end if;
  if (v_orig is null or v_orig <> v_id) and exists (select 1 from capitulos where servidor = p_servidor and id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un capítulo con ese id en este servidor.');
  end if;
  if exists (select 1 from capitulos where servidor = p_servidor and orden = v_orden and id <> coalesce(v_orig, v_id)) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya hay otro capítulo con ese orden.');
  end if;

  if v_orig is not null and v_orig <> v_id then
    update capitulos set id = v_id where servidor = p_servidor and id = v_orig;
  end if;

  insert into capitulos (servidor, id, orden, titulo, resumen, npc_id, capitulo_previo, activo)
  values (p_servidor, v_id, v_orden, coalesce(p_capitulo->>'titulo', ''), coalesce(p_capitulo->>'resumen', ''),
          nullif(p_capitulo->>'npc_id', ''), nullif(p_capitulo->>'capitulo_previo', ''),
          coalesce((p_capitulo->>'activo')::boolean, true))
  on conflict (servidor, id) do update set
    orden = excluded.orden, titulo = excluded.titulo, resumen = excluded.resumen,
    npc_id = excluded.npc_id, capitulo_previo = excluded.capitulo_previo, activo = excluded.activo;

  insert into capitulos_historia (servidor, capitulo_id, texto, imagen_url)
  values (p_servidor, v_id, coalesce(p_historia->>'texto', ''), nullif(p_historia->>'imagen_url', ''))
  on conflict (servidor, capitulo_id) do update set texto = excluded.texto, imagen_url = excluded.imagen_url;

  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El id solo puede tener minúsculas, números y guion bajo.');
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El NPC o el capítulo previo elegidos no existen en este servidor. Recarga la página.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un capítulo con ese id u orden.');
end $$;

create function admin_guardar_npc(p_servidor text, p_npc jsonb, p_id_original text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id   text := p_npc->>'id';
  v_orig text := nullif(p_id_original, '');
  v_prin boolean := coalesce((p_npc->>'es_principal')::boolean, false);
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;
  if (v_orig is null or v_orig <> v_id) and exists (select 1 from npcs where servidor = p_servidor and id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un NPC con ese id en este servidor.');
  end if;

  if v_orig is not null and v_orig <> v_id then
    update npcs set id = v_id where servidor = p_servidor and id = v_orig;
  end if;
  if v_prin then
    update npcs set es_principal = false where servidor = p_servidor and id <> v_id and es_principal;
  end if;

  insert into npcs (servidor, id, nombre, descripcion, es_principal)
  values (p_servidor, v_id, coalesce(p_npc->>'nombre', ''), nullif(p_npc->>'descripcion', ''), v_prin)
  on conflict (servidor, id) do update set
    nombre = excluded.nombre, descripcion = excluded.descripcion, es_principal = excluded.es_principal;

  if not exists (select 1 from npcs where servidor = p_servidor and es_principal) then
    update npcs set es_principal = true where servidor = p_servidor and id = v_id;
  end if;
  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El id solo puede tener minúsculas, números y guion bajo.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un NPC con ese id en este servidor.');
end $$;

create function admin_eliminar_npc(p_servidor text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  delete from npcs where servidor = p_servidor and id = p_id;
  if not exists (select 1 from npcs where servidor = p_servidor and es_principal) then
    update npcs set es_principal = true
     where servidor = p_servidor and id = (select id from npcs where servidor = p_servidor order by nombre limit 1);
  end if;
  return jsonb_build_object('ok', true);
end $$;

create function admin_eliminar_capitulo(p_servidor text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if exists (select 1 from misiones where servidor = p_servidor and capitulo_id = p_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Este capítulo todavía tiene misiones. Muévelas o elimínalas primero.');
  end if;
  delete from capitulos where servidor = p_servidor and id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Copiar una misión a otro servidor (llega inactiva para revisarla antes)
create function admin_copiar_mision(p_origen text, p_destino text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m        misiones;
  v_nuevo  text;
  n        int := 2;
  v_cap    text;
  v_dest   text;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_destino) then return _servidor_desconocido(p_destino); end if;
  if p_origen = p_destino then return jsonb_build_object('ok', false, 'motivo', 'Elige un servidor distinto.'); end if;
  select * into m from misiones where servidor = p_origen and id = p_id;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'La misión ya no existe.'); end if;
  select nombre into v_dest from servidores where id = p_destino;

  if m.categoria = 'historia' then
    if not exists (select 1 from capitulos where servidor = p_destino and id = m.capitulo_id) then
      select titulo into v_cap from capitulos where servidor = p_origen and id = m.capitulo_id;
      return jsonb_build_object('ok', false, 'motivo',
        'Primero copia el capítulo «' || coalesce(v_cap, m.capitulo_id) || '» a ' || v_dest || '.');
    end if;
  end if;

  v_nuevo := m.id;
  while exists (select 1 from misiones where servidor = p_destino and id = v_nuevo) loop
    v_nuevo := m.id || '_' || n; n := n + 1;
  end loop;

  insert into misiones (servidor, id, titulo, descripcion, icono, categoria, capitulo_id, orden, npc_id, mision_previa,
                        repeticion, repeticion_veces, repeticion_horas, tiempo_limite_seg, recompensa_texto, activa)
  values (p_destino, v_nuevo, m.titulo, m.descripcion, m.icono, m.categoria, m.capitulo_id, m.orden,
          (select id from npcs where servidor = p_destino and id = m.npc_id),
          (select id from misiones where servidor = p_destino and id = m.mision_previa),
          m.repeticion, m.repeticion_veces, m.repeticion_horas, m.tiempo_limite_seg, m.recompensa_texto, false);

  insert into objetivos (servidor, mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
  select p_destino, v_nuevo, orden, tipo, objetivo, cantidad, condiciones, descripcion
    from objetivos where servidor = p_origen and mision_id = m.id order by orden;

  insert into misiones_comandos (servidor, mision_id, comandos)
  select p_destino, v_nuevo, comandos from misiones_comandos where servidor = p_origen and mision_id = m.id;

  return jsonb_build_object('ok', true, 'id', v_nuevo, 'servidor', p_destino);
end $$;

-- Copiar un capítulo (con su historia) a otro servidor; llega inactivo
create function admin_copiar_capitulo(p_origen text, p_destino text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c        capitulos;
  v_nuevo  text;
  n        int := 2;
  v_orden  int;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_destino) then return _servidor_desconocido(p_destino); end if;
  if p_origen = p_destino then return jsonb_build_object('ok', false, 'motivo', 'Elige un servidor distinto.'); end if;
  select * into c from capitulos where servidor = p_origen and id = p_id;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'El capítulo ya no existe.'); end if;

  v_nuevo := c.id;
  while exists (select 1 from capitulos where servidor = p_destino and id = v_nuevo) loop
    v_nuevo := c.id || '_' || n; n := n + 1;
  end loop;
  v_orden := c.orden;
  if exists (select 1 from capitulos where servidor = p_destino and orden = v_orden) then
    select coalesce(max(orden), 0) + 1 into v_orden from capitulos where servidor = p_destino;
  end if;

  insert into capitulos (servidor, id, orden, titulo, resumen, npc_id, capitulo_previo, activo)
  values (p_destino, v_nuevo, v_orden, c.titulo, c.resumen,
          (select id from npcs where servidor = p_destino and id = c.npc_id),
          (select id from capitulos where servidor = p_destino and id = c.capitulo_previo),
          false);

  insert into capitulos_historia (servidor, capitulo_id, texto, imagen_url)
  select p_destino, v_nuevo, texto, imagen_url from capitulos_historia where servidor = p_origen and capitulo_id = c.id;

  return jsonb_build_object('ok', true, 'id', v_nuevo, 'servidor', p_destino);
end $$;


-- ---------------------------------------------------------------------
-- 8. Funciones del ADDON (solo con la clave secreta)
-- ---------------------------------------------------------------------
create function _registrar_jugador(p_servidor text, p_jugador text, p_gamertag text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;
  insert into jugadores (servidor, id, gamertag) values (p_servidor, p_jugador, p_gamertag)
  on conflict (servidor, id) do update set gamertag = excluded.gamertag, ultima_vez = now();
  return jsonb_build_object('ok', true);
end $$;

create function _estado_jugador(p_servidor text, p_jugador text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_inicio timestamptz := inicio_dia_actual(p_servidor);
begin
  return jsonb_build_object(
    'ok', true,
    'inicio_dia', v_inicio,
    'progreso', coalesce((
      select jsonb_agg(jsonb_build_object(
               'mision_id', mision_id, 'estado', estado, 'avance', avance,
               'veces_completada', veces_completada, 'aceptada_en', aceptada_en, 'completada_en', completada_en))
        from progreso where servidor = p_servidor and jugador_id = p_jugador), '[]'::jsonb),
    'hoy', coalesce((
      select jsonb_object_agg(mision_id, n)
        from (select mision_id, count(*) n from historial_completadas
               where servidor = p_servidor and jugador_id = p_jugador and completada_en >= v_inicio
               group by mision_id) t), '{}'::jsonb)
  );
end $$;

create function _generar_codigo(p_servidor text, p_jugador text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  letras   text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  i        int;
begin
  if not exists (select 1 from jugadores where servidor = p_servidor and id = p_jugador) then
    return jsonb_build_object('ok', false, 'motivo', 'Jugador no registrado.');
  end if;
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from jugadores where codigo_vinculacion = v_codigo);
  end loop;
  update jugadores set codigo_vinculacion = v_codigo, codigo_expira = now() + interval '10 minutes'
   where servidor = p_servidor and id = p_jugador;
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'minutos', 10);
end $$;

create function _aceptar_mision(p_servidor text, p_jugador text, p_mision text, p_origen text default 'juego')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m        misiones;
  cap      capitulos;
  cfg      configuracion;
  p        progreso;
  v_existe boolean;
  v_inicio timestamptz;
  v_n      int;
  v_avance jsonb;
  v_titulo text;
begin
  if p_jugador is null or not exists (select 1 from jugadores where servidor = p_servidor and id = p_jugador) then
    return jsonb_build_object('ok', false, 'motivo', 'Jugador no registrado.');
  end if;
  select * into m from misiones where servidor = p_servidor and id = p_mision;
  if not found or not m.activa then
    return jsonb_build_object('ok', false, 'motivo', 'Esta misión no está disponible ahora.');
  end if;

  if m.categoria = 'historia' then
    select * into cap from capitulos where servidor = p_servidor and id = m.capitulo_id;
    if not found or not cap.activo then
      return jsonb_build_object('ok', false, 'motivo', 'Este capítulo todavía no está disponible.');
    end if;
    if cap.capitulo_previo is not null and not capitulo_completado(p_servidor, cap.capitulo_previo, p_jugador) then
      return jsonb_build_object('ok', false, 'motivo', 'Primero completa el capítulo anterior.');
    end if;
  end if;

  if m.mision_previa is not null and not exists (
       select 1 from progreso where servidor = p_servidor and jugador_id = p_jugador
          and mision_id = m.mision_previa and veces_completada > 0) then
    select titulo into v_titulo from misiones where servidor = p_servidor and id = m.mision_previa;
    return jsonb_build_object('ok', false, 'motivo', 'Primero completa la misión «' || coalesce(v_titulo, m.mision_previa) || '».');
  end if;

  select * into p from progreso where servidor = p_servidor and jugador_id = p_jugador and mision_id = p_mision for update;
  v_existe := found;
  if v_existe and p.estado = 'aceptada' then
    return jsonb_build_object('ok', false, 'motivo', 'Ya tienes esta misión en curso.');
  end if;

  select * into cfg from configuracion where servidor = p_servidor;
  v_inicio := inicio_dia_actual(p_servidor);

  if v_existe and p.veces_completada > 0 then
    if m.repeticion = 'una_vez' then
      return jsonb_build_object('ok', false, 'motivo', 'Ya completaste esta misión.');
    elsif m.repeticion = 'por_dia' then
      select count(*) into v_n from historial_completadas
       where servidor = p_servidor and jugador_id = p_jugador and mision_id = p_mision and completada_en >= v_inicio;
      if v_n >= m.repeticion_veces then
        return jsonb_build_object('ok', false, 'motivo', 'Ya la completaste las veces permitidas hoy. Vuelve después del reinicio diario.');
      end if;
    elsif m.repeticion = 'cada_horas' then
      if p.completada_en is not null and p.completada_en + make_interval(hours => m.repeticion_horas) > now() then
        return jsonb_build_object('ok', false, 'motivo', 'Todavía no puedes repetirla. Vuelve más tarde.');
      end if;
    end if;
  end if;

  if m.categoria = 'independiente' then
    select count(*) into v_n
      from historial_completadas h join misiones x on x.servidor = h.servidor and x.id = h.mision_id
     where h.servidor = p_servidor and h.jugador_id = p_jugador and x.categoria = 'independiente' and h.completada_en >= v_inicio;
    if cfg.max_completadas_diarias > 0 and v_n >= cfg.max_completadas_diarias then
      return jsonb_build_object('ok', false, 'motivo', 'Ya alcanzaste el límite de misiones independientes de hoy. Podrás hacer más después del reinicio diario.');
    end if;
    select count(*) into v_n
      from progreso pr join misiones x on x.servidor = pr.servidor and x.id = pr.mision_id
     where pr.servidor = p_servidor and pr.jugador_id = p_jugador and pr.estado = 'aceptada' and x.categoria = 'independiente';
    if cfg.max_misiones_activas > 0 and v_n >= cfg.max_misiones_activas then
      return jsonb_build_object('ok', false, 'motivo', 'Ya tienes el máximo de misiones independientes en curso. Termina alguna antes de aceptar otra.');
    end if;
  end if;

  select coalesce(jsonb_object_agg(id::text, 0), '{}'::jsonb) into v_avance
    from objetivos where servidor = p_servidor and mision_id = p_mision;

  insert into progreso (servidor, jugador_id, mision_id, estado, avance, veces_completada, aceptada_en, origen)
  values (p_servidor, p_jugador, p_mision, 'aceptada', v_avance, 0, now(), p_origen)
  on conflict (servidor, jugador_id, mision_id) do update
     set estado = 'aceptada', avance = excluded.avance, aceptada_en = now(), origen = excluded.origen;
  return jsonb_build_object('ok', true);
end $$;

create function _guardar_avance(p_servidor text, p_jugador text, p_mision text, p_avance jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update progreso set avance = coalesce(p_avance, '{}'::jsonb)
   where servidor = p_servidor and jugador_id = p_jugador and mision_id = p_mision and estado = 'aceptada';
  return jsonb_build_object('ok', found);
end $$;

create function _completar_mision(p_servidor text, p_jugador text, p_mision text, p_avance jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p      progreso;
  v_cmds text[];
begin
  select * into p from progreso where servidor = p_servidor and jugador_id = p_jugador and mision_id = p_mision for update;
  if not found or p.estado <> 'aceptada' then
    return jsonb_build_object('ok', false, 'motivo', 'Esta misión no está en curso.');
  end if;
  update progreso
     set estado = 'completada', avance = coalesce(p_avance, avance),
         veces_completada = veces_completada + 1, completada_en = now()
   where servidor = p_servidor and jugador_id = p_jugador and mision_id = p_mision;
  insert into historial_completadas (servidor, jugador_id, mision_id) values (p_servidor, p_jugador, p_mision);
  select comandos into v_cmds from misiones_comandos where servidor = p_servidor and mision_id = p_mision;
  return jsonb_build_object('ok', true, 'comandos', to_jsonb(coalesce(v_cmds, '{}'::text[])));
end $$;

create function _abandonar_mision(p_servidor text, p_jugador text, p_mision text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update progreso set estado = 'cancelada', avance = '{}'::jsonb
   where servidor = p_servidor and jugador_id = p_jugador and mision_id = p_mision and estado = 'aceptada';
  return jsonb_build_object('ok', found);
end $$;


-- ---------------------------------------------------------------------
-- 9. Permisos
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;  -- filtrado por RLS
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke execute on all functions in schema public from public, anon;
-- Ayudas usadas por las reglas de seguridad
grant execute on function es_admin(), servidor_valido(text), mi_jugador(text),
  capitulo_completado(text, text, text), inicio_dia_actual(text)
  to anon, authenticated, service_role;
-- Página
grant execute on function vincular_cuenta(text), desvincular_cuenta(text),
  admin_guardar_mision(text, jsonb, jsonb, text[], text), admin_guardar_capitulo(text, jsonb, jsonb, text),
  admin_guardar_npc(text, jsonb, text), admin_eliminar_npc(text, text), admin_eliminar_capitulo(text, text),
  admin_copiar_mision(text, text, text), admin_copiar_capitulo(text, text, text)
  to authenticated;
-- Servidores del juego
grant execute on function _registrar_jugador(text, text, text), _estado_jugador(text, text),
  _generar_codigo(text, text), _aceptar_mision(text, text, text, text), _guardar_avance(text, text, text, jsonb),
  _completar_mision(text, text, text, jsonb), _abandonar_mision(text, text, text)
  to service_role;


-- ---------------------------------------------------------------------
-- 10. Devolver admins y NPCs (los NPCs pasan a Nubelia)
-- ---------------------------------------------------------------------
insert into admins (user_id, nombre)
select user_id, coalesce(nombre, '') from public._respaldo_admins where user_id in (select id from auth.users)
on conflict do nothing;

insert into npcs (servidor, id, nombre, descripcion, es_principal)
select r.servidor, r.id, r.nombre, r.descripcion, r.es_principal
  from public._respaldo_npcs r
 where r.servidor in (select id from servidores)
   and (not r.es_principal or not exists (select 1 from public._respaldo_npcs x
                                           where x.servidor = r.servidor and x.es_principal and x.id < r.id))
on conflict do nothing;

drop table public._respaldo_admins, public._respaldo_npcs;

notify pgrst, 'reload schema';

commit;

select 'Listo: misiones para Nubelia y Solune. Admins: ' || (select count(*) from admins)
       || ', NPCs: ' || (select count(*) from npcs) as resultado;
