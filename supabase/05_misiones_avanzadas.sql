-- =====================================================================
--  SISTEMA DE MISIONES — 05: MISIONES AVANZADAS (evento El Principito)
--  Ejecutar DESPUÉS de 04_multiservidor.sql
--  Supabase > SQL Editor > New query > pegar todo > Ctrl+A > Run
--
--  No borra nada. Se puede ejecutar varias veces sin problema.
--  Agrega:
--    - Nuevos tipos de objetivo (visitar, vestir, dormir, escoltar, criar,
--      viajar, recorrer, guardar, construir, apagar)
--    - Misiones que se aceptan con o sin NPC
--    - Ubicación de cada NPC (la detecta el addon o se escribe a mano)
--    - Lugares de cada jugador ("tu planeta", "tu isla"...)
--    - Capítulos con fecha de apertura y recompensa al completarlos
--    - Copiar un capítulo con todas sus misiones a otro servidor
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Columnas y tablas nuevas
-- ---------------------------------------------------------------------
alter table objetivos drop constraint if exists objetivos_tipo_check;
alter table objetivos add constraint objetivos_tipo_check check (tipo in (
  'matar', 'romper', 'colocar', 'usar', 'interactuar', 'consumir', 'obtener',
  'vestir', 'visitar', 'dormir', 'escoltar', 'criar', 'viajar', 'recorrer', 'guardar', 'construir', 'apagar'));

alter table misiones  add column if not exists requiere_npc boolean not null default true;

alter table capitulos add column if not exists disponible_desde timestamptz;
alter table capitulos add column if not exists recompensa_texto text not null default '';

alter table npcs add column if not exists x int;
alter table npcs add column if not exists y int;
alter table npcs add column if not exists z int;
alter table npcs add column if not exists dimension text not null default 'overworld';
alter table npcs add column if not exists ubicacion_fija boolean not null default false;
alter table npcs add column if not exists ubicacion_vista timestamptz;
alter table npcs drop constraint if exists npcs_dimension_check;
alter table npcs add constraint npcs_dimension_check check (dimension in ('overworld', 'nether', 'end'));

-- Comandos de recompensa al completar un capítulo (solo admins y servidor)
create table if not exists capitulos_comandos (
  servidor     text not null,
  capitulo_id  text not null,
  comandos     text[] not null default '{}',
  actualizado  timestamptz not null default now(),
  primary key (servidor, capitulo_id),
  foreign key (servidor, capitulo_id) references capitulos(servidor, id) on update cascade on delete cascade
);

-- Lugares que marca cada jugador al construir ("planeta", "isla", "trono"...)
create table if not exists jugador_lugares (
  servidor     text not null,
  jugador_id   text not null,
  nombre       text not null check (nombre ~ '^[a-z0-9_]+$'),
  x            int  not null,
  y            int  not null,
  z            int  not null,
  dimension    text not null default 'overworld',
  actualizado  timestamptz not null default now(),
  primary key (servidor, jugador_id, nombre),
  foreign key (servidor, jugador_id) references jugadores(servidor, id) on update cascade on delete cascade
);

-- Recompensas de capítulo ya entregadas (para no darlas dos veces)
create table if not exists capitulos_recompensados (
  servidor     text not null,
  jugador_id   text not null,
  capitulo_id  text not null,
  entregada    timestamptz not null default now(),
  primary key (servidor, jugador_id, capitulo_id),
  foreign key (servidor, jugador_id) references jugadores(servidor, id) on update cascade on delete cascade,
  foreign key (servidor, capitulo_id) references capitulos(servidor, id) on update cascade on delete cascade
);

do $$
declare t text;
begin
  foreach t in array array['capitulos_comandos', 'jugador_lugares', 'capitulos_recompensados'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists p_admin on %I', t);
    execute format('create policy p_admin on %I for all to authenticated using (es_admin()) with check (es_admin())', t);
  end loop;
end $$;
drop policy if exists p_leer on jugador_lugares;
create policy p_leer on jugador_lugares for select to authenticated
  using (exists (select 1 from jugadores j where j.servidor = jugador_lugares.servidor and j.id = jugador_lugares.jugador_id and j.auth_uid = auth.uid()));

drop trigger if exists trg_actualizado on capitulos_comandos;
create trigger trg_actualizado before update on capitulos_comandos for each row execute function tocar_actualizado();

grant select on capitulos_comandos, jugador_lugares, capitulos_recompensados to anon, authenticated;
grant insert, update, delete on capitulos_comandos, jugador_lugares, capitulos_recompensados to authenticated;
grant all on capitulos_comandos, jugador_lugares, capitulos_recompensados to service_role;


-- ---------------------------------------------------------------------
-- 2. Funciones de la página
-- ---------------------------------------------------------------------
create or replace function admin_guardar_mision(p_servidor text, p_mision jsonb, p_objetivos jsonb, p_comandos text[], p_id_original text default null)
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
                        repeticion, repeticion_veces, repeticion_horas, tiempo_limite_seg, recompensa_texto, activa, requiere_npc)
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
    coalesce((p_mision->>'activa')::boolean, true),
    coalesce((p_mision->>'requiere_npc')::boolean, true)
  )
  on conflict (servidor, id) do update set
    titulo = excluded.titulo, descripcion = excluded.descripcion, icono = excluded.icono,
    categoria = excluded.categoria, capitulo_id = excluded.capitulo_id, orden = excluded.orden,
    npc_id = excluded.npc_id, mision_previa = excluded.mision_previa, repeticion = excluded.repeticion,
    repeticion_veces = excluded.repeticion_veces, repeticion_horas = excluded.repeticion_horas,
    tiempo_limite_seg = excluded.tiempo_limite_seg, recompensa_texto = excluded.recompensa_texto,
    activa = excluded.activa, requiere_npc = excluded.requiere_npc;

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
        orden = i, tipo = o->>'tipo', objetivo = trim(o->>'objetivo'), cantidad = (o->>'cantidad')::int,
        condiciones = coalesce(o->'condiciones', '{}'::jsonb), descripcion = coalesce(o->>'descripcion', '')
      where id = v_oid;
    else
      insert into objetivos (servidor, mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
      values (p_servidor, v_id, i, o->>'tipo', trim(o->>'objetivo'), (o->>'cantidad')::int,
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

create or replace function admin_guardar_npc(p_servidor text, p_npc jsonb, p_id_original text default null)
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

  insert into npcs (servidor, id, nombre, descripcion, es_principal, x, y, z, dimension, ubicacion_fija)
  values (p_servidor, v_id, coalesce(p_npc->>'nombre', ''), nullif(p_npc->>'descripcion', ''), v_prin,
          nullif(p_npc->>'x', '')::int, nullif(p_npc->>'y', '')::int, nullif(p_npc->>'z', '')::int,
          coalesce(nullif(p_npc->>'dimension', ''), 'overworld'),
          coalesce((p_npc->>'ubicacion_fija')::boolean, false))
  on conflict (servidor, id) do update set
    nombre = excluded.nombre, descripcion = excluded.descripcion, es_principal = excluded.es_principal,
    x = excluded.x, y = excluded.y, z = excluded.z, dimension = excluded.dimension,
    ubicacion_fija = excluded.ubicacion_fija;

  if not exists (select 1 from npcs where servidor = p_servidor and es_principal) then
    update npcs set es_principal = true where servidor = p_servidor and id = v_id;
  end if;
  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Revisa el id (minúsculas, números y guion bajo) y la dimensión.');
  when invalid_text_representation then
    return jsonb_build_object('ok', false, 'motivo', 'Las coordenadas deben ser números enteros.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un NPC con ese id en este servidor.');
end $$;

create or replace function admin_copiar_mision(p_origen text, p_destino text, p_id text)
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
                        repeticion, repeticion_veces, repeticion_horas, tiempo_limite_seg, recompensa_texto, activa, requiere_npc)
  values (p_destino, v_nuevo, m.titulo, m.descripcion, m.icono, m.categoria, m.capitulo_id, m.orden,
          (select id from npcs where servidor = p_destino and id = m.npc_id),
          (select id from misiones where servidor = p_destino and id = m.mision_previa),
          m.repeticion, m.repeticion_veces, m.repeticion_horas, m.tiempo_limite_seg, m.recompensa_texto, false, m.requiere_npc);

  insert into objetivos (servidor, mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
  select p_destino, v_nuevo, orden, tipo, objetivo, cantidad, condiciones, descripcion
    from objetivos where servidor = p_origen and mision_id = m.id order by orden;

  insert into misiones_comandos (servidor, mision_id, comandos)
  select p_destino, v_nuevo, comandos from misiones_comandos where servidor = p_origen and mision_id = m.id;

  return jsonb_build_object('ok', true, 'id', v_nuevo, 'servidor', p_destino);
end $$;

-- Capítulo con historia, fecha de apertura y recompensa
drop function if exists admin_guardar_capitulo(text, jsonb, jsonb, text);
create or replace function admin_guardar_capitulo(p_servidor text, p_capitulo jsonb, p_historia jsonb,
                                                  p_comandos text[] default '{}', p_id_original text default null)
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

  insert into capitulos (servidor, id, orden, titulo, resumen, npc_id, capitulo_previo, activo, disponible_desde, recompensa_texto)
  values (p_servidor, v_id, v_orden, coalesce(p_capitulo->>'titulo', ''), coalesce(p_capitulo->>'resumen', ''),
          nullif(p_capitulo->>'npc_id', ''), nullif(p_capitulo->>'capitulo_previo', ''),
          coalesce((p_capitulo->>'activo')::boolean, true),
          nullif(p_capitulo->>'disponible_desde', '')::timestamptz,
          coalesce(p_capitulo->>'recompensa_texto', ''))
  on conflict (servidor, id) do update set
    orden = excluded.orden, titulo = excluded.titulo, resumen = excluded.resumen,
    npc_id = excluded.npc_id, capitulo_previo = excluded.capitulo_previo, activo = excluded.activo,
    disponible_desde = excluded.disponible_desde, recompensa_texto = excluded.recompensa_texto;

  insert into capitulos_historia (servidor, capitulo_id, texto, imagen_url)
  values (p_servidor, v_id, coalesce(p_historia->>'texto', ''), nullif(p_historia->>'imagen_url', ''))
  on conflict (servidor, capitulo_id) do update set texto = excluded.texto, imagen_url = excluded.imagen_url;

  insert into capitulos_comandos (servidor, capitulo_id, comandos)
  values (p_servidor, v_id, coalesce(p_comandos, '{}'))
  on conflict (servidor, capitulo_id) do update set comandos = excluded.comandos;

  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El id solo puede tener minúsculas, números y guion bajo.');
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El NPC o el capítulo previo elegidos no existen en este servidor. Recarga la página.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un capítulo con ese id u orden.');
  when invalid_datetime_format or datetime_field_overflow then
    return jsonb_build_object('ok', false, 'motivo', 'La fecha de apertura no es válida.');
end $$;

-- Copiar un capítulo (con su historia, recompensa y, si se pide, sus misiones)
drop function if exists admin_copiar_capitulo(text, text, text);
create or replace function admin_copiar_capitulo(p_origen text, p_destino text, p_id text, p_con_misiones boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c        capitulos;
  m        misiones;
  v_nuevo  text;
  v_mid    text;
  n        int;
  v_orden  int;
  v_total  int := 0;
  v_mapa   jsonb := '{}'::jsonb;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_destino) then return _servidor_desconocido(p_destino); end if;
  if p_origen = p_destino then return jsonb_build_object('ok', false, 'motivo', 'Elige un servidor distinto.'); end if;
  select * into c from capitulos where servidor = p_origen and id = p_id;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'El capítulo ya no existe.'); end if;

  v_nuevo := c.id; n := 2;
  while exists (select 1 from capitulos where servidor = p_destino and id = v_nuevo) loop
    v_nuevo := c.id || '_' || n; n := n + 1;
  end loop;
  v_orden := c.orden;
  if exists (select 1 from capitulos where servidor = p_destino and orden = v_orden) then
    select coalesce(max(orden), 0) + 1 into v_orden from capitulos where servidor = p_destino;
  end if;

  insert into capitulos (servidor, id, orden, titulo, resumen, npc_id, capitulo_previo, activo, disponible_desde, recompensa_texto)
  values (p_destino, v_nuevo, v_orden, c.titulo, c.resumen,
          (select id from npcs where servidor = p_destino and id = c.npc_id),
          (select id from capitulos where servidor = p_destino and id = c.capitulo_previo),
          false, c.disponible_desde, c.recompensa_texto);

  insert into capitulos_historia (servidor, capitulo_id, texto, imagen_url)
  select p_destino, v_nuevo, texto, imagen_url from capitulos_historia where servidor = p_origen and capitulo_id = c.id;
  insert into capitulos_comandos (servidor, capitulo_id, comandos)
  select p_destino, v_nuevo, comandos from capitulos_comandos where servidor = p_origen and capitulo_id = c.id;

  if p_con_misiones then
    -- primero se reservan los ids nuevos, para poder enlazar "misión previa" entre ellas
    for m in select * from misiones where servidor = p_origen and capitulo_id = c.id order by orden loop
      v_mid := m.id; n := 2;
      while exists (select 1 from misiones where servidor = p_destino and id = v_mid)
            or exists (select 1 from jsonb_each_text(v_mapa) e where e.value = v_mid) loop
        v_mid := m.id || '_' || n; n := n + 1;
      end loop;
      v_mapa := v_mapa || jsonb_build_object(m.id, v_mid);
    end loop;

    for m in select * from misiones where servidor = p_origen and capitulo_id = c.id order by orden loop
      insert into misiones (servidor, id, titulo, descripcion, icono, categoria, capitulo_id, orden, npc_id, mision_previa,
                            repeticion, repeticion_veces, repeticion_horas, tiempo_limite_seg, recompensa_texto, activa, requiere_npc)
      values (p_destino, v_mapa->>m.id, m.titulo, m.descripcion, m.icono, m.categoria, v_nuevo, m.orden,
              (select id from npcs where servidor = p_destino and id = m.npc_id), null,
              m.repeticion, m.repeticion_veces, m.repeticion_horas, m.tiempo_limite_seg, m.recompensa_texto, m.activa, m.requiere_npc);
      insert into objetivos (servidor, mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
      select p_destino, v_mapa->>m.id, orden, tipo, objetivo, cantidad, condiciones, descripcion
        from objetivos where servidor = p_origen and mision_id = m.id order by orden;
      insert into misiones_comandos (servidor, mision_id, comandos)
      select p_destino, v_mapa->>m.id, comandos from misiones_comandos where servidor = p_origen and mision_id = m.id;
      v_total := v_total + 1;
    end loop;

    -- enlazar "misión previa": dentro del capítulo copiado, o a una misión que ya exista en el destino
    for m in select * from misiones where servidor = p_origen and capitulo_id = c.id and mision_previa is not null loop
      update misiones set mision_previa = coalesce(v_mapa->>m.mision_previa,
               (select id from misiones where servidor = p_destino and id = m.mision_previa))
       where servidor = p_destino and id = v_mapa->>m.id;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'id', v_nuevo, 'servidor', p_destino, 'misiones', v_total);
end $$;


-- ---------------------------------------------------------------------
-- 3. Funciones del addon
-- ---------------------------------------------------------------------
create or replace function _estado_jugador(p_servidor text, p_jugador text)
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
               group by mision_id) t), '{}'::jsonb),
    'lugares', coalesce((
      select jsonb_object_agg(nombre, jsonb_build_object('x', x, 'y', y, 'z', z, 'dimension', dimension))
        from jugador_lugares where servidor = p_servidor and jugador_id = p_jugador), '{}'::jsonb)
  );
end $$;

create or replace function _aceptar_mision(p_servidor text, p_jugador text, p_mision text, p_origen text default 'juego')
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
    if cap.disponible_desde is not null and cap.disponible_desde > now() then
      return jsonb_build_object('ok', false, 'motivo', 'Esta parte de la historia se abre el '
        || to_char(cap.disponible_desde at time zone (select zona_horaria from configuracion where servidor = p_servidor), 'DD/MM "a las" HH24:MI') || '.');
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

-- Completar: devuelve los comandos de la misión y, si con ella se completa
-- el capítulo, también la recompensa del capítulo (una sola vez)
create or replace function _completar_mision(p_servidor text, p_jugador text, p_mision text, p_avance jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p      progreso;
  m      misiones;
  v_cmds text[];
  v_cap  jsonb;
  c      capitulos;
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

  select * into m from misiones where servidor = p_servidor and id = p_mision;
  if m.categoria = 'historia' and m.capitulo_id is not null
     and capitulo_completado(p_servidor, m.capitulo_id, p_jugador)
     and not exists (select 1 from capitulos_recompensados
                      where servidor = p_servidor and jugador_id = p_jugador and capitulo_id = m.capitulo_id) then
    insert into capitulos_recompensados (servidor, jugador_id, capitulo_id) values (p_servidor, p_jugador, m.capitulo_id);
    select * into c from capitulos where servidor = p_servidor and id = m.capitulo_id;
    v_cap := jsonb_build_object(
      'id', c.id, 'orden', c.orden, 'titulo', c.titulo, 'recompensa_texto', c.recompensa_texto,
      'comandos', to_jsonb(coalesce((select comandos from capitulos_comandos
                                      where servidor = p_servidor and capitulo_id = c.id), '{}'::text[])));
  end if;

  return jsonb_build_object('ok', true, 'comandos', to_jsonb(coalesce(v_cmds, '{}'::text[])), 'capitulo', v_cap);
end $$;

-- Guardar un lugar del jugador ("planeta", "isla"...)
create or replace function _guardar_lugar(p_servidor text, p_jugador text, p_nombre text, p_x int, p_y int, p_z int, p_dimension text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into jugador_lugares (servidor, jugador_id, nombre, x, y, z, dimension)
  values (p_servidor, p_jugador, lower(p_nombre), p_x, p_y, p_z, coalesce(p_dimension, 'overworld'))
  on conflict (servidor, jugador_id, nombre) do update
     set x = excluded.x, y = excluded.y, z = excluded.z, dimension = excluded.dimension, actualizado = now();
  return jsonb_build_object('ok', true);
end $$;

-- El addon informa dónde vio a un NPC (si el admin no fijó la ubicación a mano)
create or replace function _ubicar_npc(p_servidor text, p_npc text, p_x int, p_y int, p_z int, p_dimension text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update npcs set x = p_x, y = p_y, z = p_z, dimension = p_dimension, ubicacion_vista = now()
   where servidor = p_servidor and id = p_npc and not ubicacion_fija;
  return jsonb_build_object('ok', found);
end $$;


-- ---------------------------------------------------------------------
-- 4. Permisos
-- ---------------------------------------------------------------------
revoke execute on function admin_guardar_capitulo(text, jsonb, jsonb, text[], text),
  admin_copiar_capitulo(text, text, text, boolean), _completar_mision(text, text, text, jsonb),
  _guardar_lugar(text, text, text, int, int, int, text), _ubicar_npc(text, text, int, int, int, text),
  _estado_jugador(text, text), _aceptar_mision(text, text, text, text),
  admin_guardar_mision(text, jsonb, jsonb, text[], text), admin_guardar_npc(text, jsonb, text),
  admin_copiar_mision(text, text, text)
  from public, anon;
grant execute on function admin_guardar_capitulo(text, jsonb, jsonb, text[], text),
  admin_copiar_capitulo(text, text, text, boolean), admin_guardar_mision(text, jsonb, jsonb, text[], text),
  admin_guardar_npc(text, jsonb, text), admin_copiar_mision(text, text, text)
  to authenticated;
grant execute on function _completar_mision(text, text, text, jsonb), _guardar_lugar(text, text, text, int, int, int, text),
  _ubicar_npc(text, text, int, int, int, text), _estado_jugador(text, text), _aceptar_mision(text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';

select 'Listo: misiones avanzadas activadas' as resultado;
