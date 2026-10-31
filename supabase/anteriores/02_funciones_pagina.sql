-- =====================================================================
--  SISTEMA DE MISIONES — FASE 2: FUNCIONES PARA LA PÁGINA
--  Ejecutar DESPUÉS de 01_estructura_misiones.sql
--  Supabase > SQL Editor > New query > pegar todo > Run
--  Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Renombrar ids sin romper nada: las referencias se actualizan solas
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select * from (values
      ('capitulos',             'npc_id',          'npcs',      'set null'),
      ('capitulos',             'capitulo_previo', 'capitulos', 'set null'),
      ('capitulos_historia',    'capitulo_id',     'capitulos', 'cascade'),
      ('misiones',              'capitulo_id',     'capitulos', 'set null'),
      ('misiones',              'npc_id',          'npcs',      'set null'),
      ('misiones',              'mision_previa',   'misiones',  'set null'),
      ('misiones_comandos',     'mision_id',       'misiones',  'cascade'),
      ('objetivos',             'mision_id',       'misiones',  'cascade'),
      ('progreso',              'mision_id',       'misiones',  'cascade'),
      ('historial_completadas', 'mision_id',       'misiones',  'cascade')
    ) as t(tabla, columna, ref, al_borrar)
  loop
    execute format('alter table %I drop constraint if exists %I', r.tabla, r.tabla || '_' || r.columna || '_fkey');
    execute format('alter table %I add constraint %I foreign key (%I) references %I(id)
                    on update cascade on delete %s',
                   r.tabla, r.tabla || '_' || r.columna || '_fkey', r.columna, r.ref, r.al_borrar);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 1b. Límites diarios: 0 significa "sin límite"
-- ---------------------------------------------------------------------
alter table configuracion drop constraint if exists configuracion_max_misiones_activas_check;
alter table configuracion drop constraint if exists configuracion_max_completadas_diarias_check;
alter table configuracion add constraint configuracion_max_misiones_activas_check check (max_misiones_activas >= 0);
alter table configuracion add constraint configuracion_max_completadas_diarias_check check (max_completadas_diarias >= 0);


-- ---------------------------------------------------------------------
-- 2. Momento del último reinicio diario (según hora y zona configuradas)
-- ---------------------------------------------------------------------
create or replace function inicio_dia_actual()
returns timestamptz language sql stable security definer set search_path = public as $$
  select (date_trunc('day', (now() at time zone c.zona_horaria) - make_interval(hours => c.hora_reinicio))
          + make_interval(hours => c.hora_reinicio)) at time zone c.zona_horaria
    from configuracion c where c.id = 1;
$$;


-- ---------------------------------------------------------------------
-- 3. Aceptar misión (regla única para la página y para el addon)
-- ---------------------------------------------------------------------
create or replace function _aceptar_mision(p_jugador text, p_mision text, p_origen text default 'juego')
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
  if p_jugador is null or not exists (select 1 from jugadores where id = p_jugador) then
    return jsonb_build_object('ok', false, 'motivo', 'Primero vincula tu cuenta.');
  end if;

  select * into m from misiones where id = p_mision;
  if not found or not m.activa then
    return jsonb_build_object('ok', false, 'motivo', 'Esta misión no está disponible ahora.');
  end if;

  -- Capítulo y requisitos de la historia
  if m.categoria = 'historia' then
    select * into cap from capitulos where id = m.capitulo_id;
    if not found or not cap.activo then
      return jsonb_build_object('ok', false, 'motivo', 'Este capítulo todavía no está disponible.');
    end if;
    if cap.capitulo_previo is not null and not capitulo_completado(cap.capitulo_previo, p_jugador) then
      return jsonb_build_object('ok', false, 'motivo', 'Primero completa el capítulo anterior.');
    end if;
  end if;

  if m.mision_previa is not null and not exists (
       select 1 from progreso where jugador_id = p_jugador and mision_id = m.mision_previa and veces_completada > 0) then
    select titulo into v_titulo from misiones where id = m.mision_previa;
    return jsonb_build_object('ok', false, 'motivo', 'Primero completa la misión «' || coalesce(v_titulo, m.mision_previa) || '».');
  end if;

  -- Estado actual del jugador en esta misión
  select * into p from progreso where jugador_id = p_jugador and mision_id = p_mision for update;
  v_existe := found;
  if v_existe and p.estado = 'aceptada' then
    return jsonb_build_object('ok', false, 'motivo', 'Ya tienes esta misión en curso.');
  end if;

  select * into cfg from configuracion where id = 1;
  v_inicio := inicio_dia_actual();

  -- Repetición
  if v_existe and p.veces_completada > 0 then
    if m.repeticion = 'una_vez' then
      return jsonb_build_object('ok', false, 'motivo', 'Ya completaste esta misión.');
    elsif m.repeticion = 'por_dia' then
      select count(*) into v_n from historial_completadas
       where jugador_id = p_jugador and mision_id = p_mision and completada_en >= v_inicio;
      if v_n >= m.repeticion_veces then
        return jsonb_build_object('ok', false, 'motivo', 'Ya la completaste las veces permitidas hoy. Vuelve después del reinicio diario.');
      end if;
    elsif m.repeticion = 'cada_horas' then
      if p.completada_en is not null and p.completada_en + make_interval(hours => m.repeticion_horas) > now() then
        return jsonb_build_object('ok', false, 'motivo', 'Todavía no puedes repetirla. Vuelve más tarde.');
      end if;
    end if;
  end if;

  -- Límites diarios (solo misiones independientes)
  if m.categoria = 'independiente' then
    select count(*) into v_n
      from historial_completadas h join misiones x on x.id = h.mision_id
     where h.jugador_id = p_jugador and x.categoria = 'independiente' and h.completada_en >= v_inicio;
    if cfg.max_completadas_diarias > 0 and v_n >= cfg.max_completadas_diarias then
      return jsonb_build_object('ok', false, 'motivo', 'Ya alcanzaste el límite de misiones independientes de hoy. Podrás hacer más después del reinicio diario.');
    end if;

    select count(*) into v_n
      from progreso pr join misiones x on x.id = pr.mision_id
     where pr.jugador_id = p_jugador and pr.estado = 'aceptada' and x.categoria = 'independiente';
    if cfg.max_misiones_activas > 0 and v_n >= cfg.max_misiones_activas then
      return jsonb_build_object('ok', false, 'motivo', 'Ya tienes el máximo de misiones independientes en curso. Termina alguna antes de aceptar otra.');
    end if;
  end if;

  -- Aceptar con el avance en cero
  select coalesce(jsonb_object_agg(id::text, 0), '{}'::jsonb) into v_avance from objetivos where mision_id = p_mision;

  insert into progreso (jugador_id, mision_id, estado, avance, veces_completada, aceptada_en, origen)
  values (p_jugador, p_mision, 'aceptada', v_avance, 0, now(), p_origen)
  on conflict (jugador_id, mision_id) do update
     set estado = 'aceptada', avance = excluded.avance, aceptada_en = now(), origen = excluded.origen;

  return jsonb_build_object('ok', true);
end $$;

-- Versión para la página: acepta para el jugador vinculado a la sesión
create or replace function aceptar_mision(p_mision text)
returns jsonb language sql security definer set search_path = public as $$
  select _aceptar_mision(mi_jugador(), p_mision, 'web');
$$;


-- ---------------------------------------------------------------------
-- 4. Vincular y desvincular la cuenta web del jugador
-- ---------------------------------------------------------------------
create or replace function vincular_cuenta(p_codigo text)
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
    return jsonb_build_object('ok', false, 'motivo', 'Ese código no existe o ya venció. Pide uno nuevo al NPC de misiones.');
  end if;

  update jugadores set auth_uid = null where auth_uid = uid and id <> j.id;
  update jugadores
     set auth_uid = uid, codigo_vinculacion = null, codigo_expira = null
   where id = j.id;

  return jsonb_build_object('ok', true, 'jugador', jsonb_build_object('id', j.id, 'gamertag', j.gamertag));
end $$;

create or replace function desvincular_cuenta()
returns jsonb language sql security definer set search_path = public as $$
  update jugadores set auth_uid = null where auth_uid = auth.uid();
  select jsonb_build_object('ok', true);
$$;


-- ---------------------------------------------------------------------
-- 5. Administración: guardar con renombrado y sin perder progreso
-- ---------------------------------------------------------------------
create or replace function _sin_sesion_admin()
returns jsonb language sql immutable as $$
  select jsonb_build_object('ok', false, 'motivo', 'Tu sesión de administrador terminó. Vuelve a iniciar sesión.');
$$;

-- Misión + objetivos + comandos, todo de una vez
create or replace function admin_guardar_mision(p_mision jsonb, p_objetivos jsonb, p_comandos text[], p_id_original text default null)
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

  if v_orig is null and exists (select 1 from misiones where id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe una misión con ese id.');
  end if;
  if v_orig is not null and v_orig <> v_id then
    if exists (select 1 from misiones where id = v_id) then
      return jsonb_build_object('ok', false, 'motivo', 'Ya existe una misión con ese id.');
    end if;
    update misiones set id = v_id where id = v_orig;
  end if;

  if v_cat = 'historia' then v_rep := 'una_vez'; end if;

  insert into misiones as t (id, titulo, descripcion, icono, categoria, capitulo_id, orden, npc_id, mision_previa,
                             repeticion, repeticion_veces, repeticion_horas, tiempo_limite_seg, recompensa_texto, activa)
  values (
    v_id,
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
  on conflict (id) do update set
    titulo = excluded.titulo, descripcion = excluded.descripcion, icono = excluded.icono,
    categoria = excluded.categoria, capitulo_id = excluded.capitulo_id, orden = excluded.orden,
    npc_id = excluded.npc_id, mision_previa = excluded.mision_previa, repeticion = excluded.repeticion,
    repeticion_veces = excluded.repeticion_veces, repeticion_horas = excluded.repeticion_horas,
    tiempo_limite_seg = excluded.tiempo_limite_seg, recompensa_texto = excluded.recompensa_texto,
    activa = excluded.activa;

  -- Objetivos: se actualizan los existentes (conservan su id y el avance de los jugadores),
  -- se agregan los nuevos y se borran los que se quitaron.
  delete from objetivos
   where mision_id = v_id
     and id not in (select (x->>'id')::bigint from jsonb_array_elements(coalesce(p_objetivos, '[]'::jsonb)) x
                     where x->>'id' ~ '^[0-9]+$');

  i := 0;
  for o in select value from jsonb_array_elements(coalesce(p_objetivos, '[]'::jsonb)) loop
    i := i + 1;
    v_oid := case when o->>'id' ~ '^[0-9]+$' then (o->>'id')::bigint end;
    if v_oid is not null and exists (select 1 from objetivos where id = v_oid and mision_id = v_id) then
      update objetivos set
        orden = i, tipo = o->>'tipo', objetivo = o->>'objetivo', cantidad = (o->>'cantidad')::int,
        condiciones = coalesce(o->'condiciones', '{}'::jsonb), descripcion = coalesce(o->>'descripcion', '')
      where id = v_oid;
    else
      insert into objetivos (mision_id, orden, tipo, objetivo, cantidad, condiciones, descripcion)
      values (v_id, i, o->>'tipo', o->>'objetivo', (o->>'cantidad')::int,
              coalesce(o->'condiciones', '{}'::jsonb), coalesce(o->>'descripcion', ''));
    end if;
  end loop;

  insert into misiones_comandos (mision_id, comandos)
  values (v_id, coalesce(p_comandos, '{}'))
  on conflict (mision_id) do update set comandos = excluded.comandos;

  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Algún dato no es válido (revisa el id, la categoría, la repetición y que las cantidades sean mayores a 0).');
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El capítulo, NPC o misión previa elegidos ya no existen. Recarga la página.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe una misión con ese id.');
end $$;

-- Capítulo + texto de historia
create or replace function admin_guardar_capitulo(p_capitulo jsonb, p_historia jsonb, p_id_original text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id    text := p_capitulo->>'id';
  v_orig  text := nullif(p_id_original, '');
  v_orden int  := nullif(p_capitulo->>'orden', '')::int;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if v_orden is null or v_orden <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'El orden debe ser un número mayor a 0.');
  end if;
  if nullif(p_capitulo->>'capitulo_previo', '') = v_id then
    return jsonb_build_object('ok', false, 'motivo', 'Un capítulo no puede depender de sí mismo.');
  end if;
  if (v_orig is null or v_orig <> v_id) and exists (select 1 from capitulos where id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un capítulo con ese id.');
  end if;
  if exists (select 1 from capitulos where orden = v_orden and id <> coalesce(v_orig, v_id)) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya hay otro capítulo con ese orden.');
  end if;

  if v_orig is not null and v_orig <> v_id then
    update capitulos set id = v_id where id = v_orig;
  end if;

  insert into capitulos (id, orden, titulo, resumen, npc_id, capitulo_previo, activo)
  values (v_id, v_orden, coalesce(p_capitulo->>'titulo', ''), coalesce(p_capitulo->>'resumen', ''),
          nullif(p_capitulo->>'npc_id', ''), nullif(p_capitulo->>'capitulo_previo', ''),
          coalesce((p_capitulo->>'activo')::boolean, true))
  on conflict (id) do update set
    orden = excluded.orden, titulo = excluded.titulo, resumen = excluded.resumen,
    npc_id = excluded.npc_id, capitulo_previo = excluded.capitulo_previo, activo = excluded.activo;

  insert into capitulos_historia (capitulo_id, texto, imagen_url)
  values (v_id, coalesce(p_historia->>'texto', ''), nullif(p_historia->>'imagen_url', ''))
  on conflict (capitulo_id) do update set texto = excluded.texto, imagen_url = excluded.imagen_url;

  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El id solo puede tener minúsculas, números y guion bajo.');
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El NPC o el capítulo previo elegidos ya no existen. Recarga la página.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un capítulo con ese id u orden.');
end $$;

-- NPC (con un solo principal)
create or replace function admin_guardar_npc(p_npc jsonb, p_id_original text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id   text := p_npc->>'id';
  v_orig text := nullif(p_id_original, '');
  v_prin boolean := coalesce((p_npc->>'es_principal')::boolean, false);
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if (v_orig is null or v_orig <> v_id) and exists (select 1 from npcs where id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un NPC con ese id.');
  end if;

  if v_orig is not null and v_orig <> v_id then
    update npcs set id = v_id where id = v_orig;
  end if;
  if v_prin then
    update npcs set es_principal = false where id <> v_id and es_principal;
  end if;

  insert into npcs (id, nombre, descripcion, es_principal)
  values (v_id, coalesce(p_npc->>'nombre', ''), nullif(p_npc->>'descripcion', ''), v_prin)
  on conflict (id) do update set
    nombre = excluded.nombre, descripcion = excluded.descripcion, es_principal = excluded.es_principal;

  -- Siempre debe haber un NPC principal
  if not exists (select 1 from npcs where es_principal) then
    update npcs set es_principal = true where id = v_id;
  end if;

  return jsonb_build_object('ok', true);
exception
  when check_violation then
    return jsonb_build_object('ok', false, 'motivo', 'El id solo puede tener minúsculas, números y guion bajo.');
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe un NPC con ese id.');
end $$;

create or replace function admin_eliminar_npc(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  delete from npcs where id = p_id;
  if not exists (select 1 from npcs where es_principal) then
    update npcs set es_principal = true
     where id = (select id from npcs order by nombre limit 1);
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_eliminar_capitulo(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if exists (select 1 from misiones where capitulo_id = p_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Este capítulo todavía tiene misiones. Muévelas o elimínalas primero.');
  end if;
  delete from capitulos where id = p_id;
  return jsonb_build_object('ok', true);
end $$;


-- ---------------------------------------------------------------------
-- 6. Quién puede usar cada función
-- ---------------------------------------------------------------------
revoke execute on function
  _aceptar_mision(text, text, text), aceptar_mision(text), vincular_cuenta(text), desvincular_cuenta(),
  admin_guardar_mision(jsonb, jsonb, text[], text), admin_guardar_capitulo(jsonb, jsonb, text),
  admin_guardar_npc(jsonb, text), admin_eliminar_npc(text), admin_eliminar_capitulo(text),
  inicio_dia_actual(), _sin_sesion_admin()
  from public, anon;

-- Página (jugadores con sesión y admins; cada función revisa quién llama)
grant execute on function
  aceptar_mision(text), vincular_cuenta(text), desvincular_cuenta(),
  admin_guardar_mision(jsonb, jsonb, text[], text), admin_guardar_capitulo(jsonb, jsonb, text),
  admin_guardar_npc(jsonb, text), admin_eliminar_npc(text), admin_eliminar_capitulo(text),
  inicio_dia_actual()
  to authenticated;

-- Servidor del juego (clave secreta)
grant execute on function _aceptar_mision(text, text, text), inicio_dia_actual() to service_role;

select 'Funciones de la página creadas correctamente' as resultado;
