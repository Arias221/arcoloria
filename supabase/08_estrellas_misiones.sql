-- =====================================================================
-- 08 · Misiones en las estrellas del cuento
-- ---------------------------------------------------------------------
-- · Cada estrella puede tener una misión (y cada misión, una sola estrella).
--   Al enlazarlas, la misión pasa a ser de historia en ese capítulo y
--   queda encadenada: se desbloquea al completar la de la estrella anterior.
-- · El panel de admin puede crear, editar, ordenar y borrar estrellas.
-- · Copiar un capítulo a otro servidor copia también sus estrellas.
-- · Las misiones que no piden NPC se pueden aceptar desde la página.
-- Requiere 06. Se puede ejecutar más de una vez. Ctrl+A y Run.
-- =====================================================================

create unique index if not exists estrellas_una_por_mision on estrellas (servidor, mision_id) where mision_id is not null;

-- ---------------------------------------------------------------------
-- 1. Encadenar las misiones de las estrellas de un capítulo
-- ---------------------------------------------------------------------
create or replace function _encadenar_estrellas(p_servidor text, p_capitulo text)
returns void language plpgsql security definer set search_path = public as $$
declare
  e        record;
  v_previa text := null;
begin
  for e in select * from estrellas where servidor = p_servidor and capitulo_id = p_capitulo order by orden loop
    if e.mision_id is not null then
      update misiones set categoria = 'historia', capitulo_id = p_capitulo, orden = e.orden,
                          repeticion = 'una_vez', mision_previa = v_previa
       where servidor = p_servidor and id = e.mision_id;
      v_previa := e.mision_id;
    end if;
  end loop;
  update sincronizacion set version_contenido = version_contenido + 1 where servidor = p_servidor;
end $$;

-- ---------------------------------------------------------------------
-- 2. Panel de admin: estrellas
-- ---------------------------------------------------------------------
create or replace function admin_guardar_estrella(p_servidor text, p_estrella jsonb, p_id_original text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id     text := lower(trim(coalesce(p_estrella->>'id', '')));
  v_orig   text := nullif(p_id_original, '');
  v_cap    text := p_estrella->>'capitulo_id';
  v_titulo text := trim(coalesce(p_estrella->>'titulo', ''));
  v_mision text := nullif(trim(coalesce(p_estrella->>'mision_id', '')), '');
  v_orden  int;
  v_ant    estrellas;
  v_otra   text;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;
  if v_id !~ '^[a-z0-9_]+$' then return jsonb_build_object('ok', false, 'motivo', 'El id solo puede tener minúsculas, números y guion bajo.'); end if;
  if v_titulo = '' then return jsonb_build_object('ok', false, 'motivo', 'La estrella necesita un título.'); end if;
  if not exists (select 1 from capitulos where servidor = p_servidor and id = v_cap) then
    return jsonb_build_object('ok', false, 'motivo', 'Ese capítulo no existe.');
  end if;
  if v_mision is not null then
    if not exists (select 1 from misiones where servidor = p_servidor and id = v_mision) then
      return jsonb_build_object('ok', false, 'motivo', 'Esa misión no existe.');
    end if;
    select titulo into v_otra from estrellas where servidor = p_servidor and mision_id = v_mision and id <> coalesce(v_orig, v_id);
    if v_otra is not null then
      return jsonb_build_object('ok', false, 'motivo', 'Esa misión ya está en la estrella «' || v_otra || '».');
    end if;
  end if;
  if (v_orig is null or v_orig <> v_id) and exists (select 1 from estrellas where servidor = p_servidor and id = v_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Ya existe una estrella con ese id.');
  end if;

  select * into v_ant from estrellas where servidor = p_servidor and id = coalesce(v_orig, v_id);
  v_orden := coalesce(nullif(p_estrella->>'orden', '')::int,
                      v_ant.orden,
                      (select coalesce(max(orden), 0) + 1 from estrellas where servidor = p_servidor and capitulo_id = v_cap));
  if v_orden < 1 then v_orden := 1; end if;

  -- Mover dentro del capítulo corre las estrellas que quedan entre medio;
  -- una estrella que llega al capítulo se mete en su lugar y corre las siguientes
  if v_ant.id is not null and v_ant.capitulo_id = v_cap then
    v_orden := least(v_orden, (select max(orden) from estrellas where servidor = p_servidor and capitulo_id = v_cap));
    if v_orden <> v_ant.orden then
      update estrellas set orden = -1 where servidor = p_servidor and id = v_ant.id;
      if v_orden > v_ant.orden then
        update estrellas set orden = orden + 100000 where servidor = p_servidor and capitulo_id = v_cap and orden > v_ant.orden and orden <= v_orden;
        update estrellas set orden = orden - 100000 - 1 where servidor = p_servidor and capitulo_id = v_cap and orden >= 100000;
      else
        update estrellas set orden = orden + 100000 where servidor = p_servidor and capitulo_id = v_cap and orden >= v_orden and orden < v_ant.orden;
        update estrellas set orden = orden - 100000 + 1 where servidor = p_servidor and capitulo_id = v_cap and orden >= 100000;
      end if;
    end if;
  else
    v_orden := least(v_orden, (select coalesce(max(orden), 0) + 1 from estrellas where servidor = p_servidor and capitulo_id = v_cap));
    update estrellas set orden = orden + 100000 where servidor = p_servidor and capitulo_id = v_cap and orden >= v_orden;
    update estrellas set orden = orden - 100000 + 1 where servidor = p_servidor and capitulo_id = v_cap and orden >= 100000;
  end if;

  if v_ant.id is not null then
    update estrellas set id = v_id, capitulo_id = v_cap, orden = v_orden, titulo = v_titulo,
                         texto = coalesce(p_estrella->>'texto', ''), mision_id = v_mision
     where servidor = p_servidor and id = v_ant.id;
  else
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto, mision_id)
    values (p_servidor, v_id, v_cap, v_orden, v_titulo, coalesce(p_estrella->>'texto', ''), v_mision);
  end if;

  perform _encadenar_estrellas(p_servidor, v_cap);
  if v_ant.id is not null and v_ant.capitulo_id <> v_cap then perform _encadenar_estrellas(p_servidor, v_ant.capitulo_id); end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function admin_eliminar_estrella(p_servidor text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cap text;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  delete from estrellas where servidor = p_servidor and id = p_id returning capitulo_id into v_cap;
  if v_cap is null then return jsonb_build_object('ok', false, 'motivo', 'La estrella ya no existe.'); end if;
  perform _encadenar_estrellas(p_servidor, v_cap);
  return jsonb_build_object('ok', true);
end $$;

-- Desde el formulario de la misión: en qué estrella va (o en ninguna)
create or replace function admin_enlazar_estrella(p_servidor text, p_mision text, p_estrella text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ant  estrellas;
  v_nue  estrellas;
  v_otra text;
begin
  if not es_admin() then return _sin_sesion_admin(); end if;
  select * into v_ant from estrellas where servidor = p_servidor and mision_id = p_mision;
  if nullif(p_estrella, '') is not null then
    select * into v_nue from estrellas where servidor = p_servidor and id = p_estrella;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'Esa estrella ya no existe.'); end if;
    if v_nue.mision_id is not null and v_nue.mision_id <> p_mision then
      select titulo into v_otra from misiones where servidor = p_servidor and id = v_nue.mision_id;
      return jsonb_build_object('ok', false, 'motivo', 'La estrella «' || v_nue.titulo || '» ya tiene la misión «' || coalesce(v_otra, v_nue.mision_id) || '».');
    end if;
  end if;
  if v_ant.id is not null and v_ant.id is distinct from nullif(p_estrella, '') then
    update estrellas set mision_id = null where servidor = p_servidor and id = v_ant.id;
    update misiones set mision_previa = null where servidor = p_servidor and id = p_mision;
    perform _encadenar_estrellas(p_servidor, v_ant.capitulo_id);
  end if;
  if v_nue.id is not null then
    update estrellas set mision_id = p_mision where servidor = p_servidor and id = v_nue.id;
    perform _encadenar_estrellas(p_servidor, v_nue.capitulo_id);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- 3. Copiar un capítulo a otro servidor, con sus misiones y estrellas
-- ---------------------------------------------------------------------
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
  es       estrellas;
  v_eid    text;
  v_est    int := 0;
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

  -- estrellas del cuento, enlazadas a las misiones copiadas
  for es in select * from estrellas where servidor = p_origen and capitulo_id = c.id order by orden loop
    v_eid := es.id; n := 2;
    while exists (select 1 from estrellas where servidor = p_destino and id = v_eid) loop
      v_eid := es.id || '_' || n; n := n + 1;
    end loop;
    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto, mision_id)
    values (p_destino, v_eid, v_nuevo, es.orden, es.titulo, es.texto,
            case when es.mision_id is null then null else v_mapa->>es.mision_id end);
    v_est := v_est + 1;
  end loop;

  return jsonb_build_object('ok', true, 'id', v_nuevo, 'servidor', p_destino, 'misiones', v_total, 'estrellas', v_est);
end $$;

-- ---------------------------------------------------------------------
-- 4. Aceptar desde la página (solo misiones que no piden NPC)
-- ---------------------------------------------------------------------
create or replace function aceptar_mision_web(p_servidor text, p_mision text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_jug text := mi_jugador(p_servidor);
  m     misiones;
begin
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;
  if v_jug is null then
    return jsonb_build_object('ok', false, 'motivo', 'Vincula tu cuenta para aceptar misiones desde la página.');
  end if;
  select * into m from misiones where servidor = p_servidor and id = p_mision;
  if not found or not m.activa then
    return jsonb_build_object('ok', false, 'motivo', 'Esta misión no está disponible ahora.');
  end if;
  if m.requiere_npc then
    return jsonb_build_object('ok', false, 'motivo', 'Esta misión se acepta en el juego, tocando a su NPC. Escribe /misiones para ver dónde está.');
  end if;
  return _aceptar_mision(p_servidor, v_jug, p_mision, 'web');
end $$;

-- El servidor del juego pregunta qué jugadores aceptaron misiones en la página
create or replace function _aceptadas_web(p_servidor text, p_desde timestamptz default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ahora', now(), 'aceptadas', coalesce(jsonb_agg(jsonb_build_object('jugador', p.jugador_id, 'mision', p.mision_id, 'titulo', m.titulo)), '[]'::jsonb))
    from progreso p join misiones m on m.servidor = p.servidor and m.id = p.mision_id
   where p.servidor = p_servidor and p.origen = 'web' and p.estado = 'aceptada'
     and p.aceptada_en > coalesce(p_desde, now() - interval '2 minutes');
$$;

-- ---------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------
revoke execute on function _encadenar_estrellas(text, text), _aceptadas_web(text, timestamptz) from public, anon, authenticated;
grant execute on function _aceptadas_web(text, timestamptz) to service_role;
revoke execute on function admin_guardar_estrella(text, jsonb, text), admin_eliminar_estrella(text, text),
  admin_enlazar_estrella(text, text, text), aceptar_mision_web(text, text) from public, anon;
grant execute on function admin_guardar_estrella(text, jsonb, text), admin_eliminar_estrella(text, text),
  admin_enlazar_estrella(text, text, text), admin_copiar_capitulo(text, text, text, boolean), aceptar_mision_web(text, text)
  to authenticated;

notify pgrst, 'reload schema';
select 'Listo: misiones en las estrellas activadas' as resultado;
