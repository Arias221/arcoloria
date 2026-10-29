-- =====================================================================
--  SISTEMA DE MISIONES — FASE 3: FUNCIONES PARA EL ADDON DEL SERVIDOR
--  Ejecutar DESPUÉS de 01 y 02.
--  Supabase > SQL Editor > New query > pegar todo > Run
--  Se puede ejecutar más de una vez sin romper nada.
--
--  Estas funciones solo las puede usar el servidor del juego
--  (con la clave secreta). La página no tiene acceso a ellas.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Registrar o actualizar al jugador al entrar al servidor
-- ---------------------------------------------------------------------
create or replace function _registrar_jugador(p_jugador text, p_gamertag text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into jugadores (id, gamertag) values (p_jugador, p_gamertag)
  on conflict (id) do update set gamertag = excluded.gamertag, ultima_vez = now();
  return jsonb_build_object('ok', true);
end $$;


-- ---------------------------------------------------------------------
-- 2. Estado completo de un jugador (progreso + lo hecho hoy)
-- ---------------------------------------------------------------------
create or replace function _estado_jugador(p_jugador text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_inicio timestamptz := inicio_dia_actual();
begin
  return jsonb_build_object(
    'ok', true,
    'inicio_dia', v_inicio,
    'progreso', coalesce((
      select jsonb_agg(jsonb_build_object(
               'mision_id', mision_id, 'estado', estado, 'avance', avance,
               'veces_completada', veces_completada, 'aceptada_en', aceptada_en, 'completada_en', completada_en))
        from progreso where jugador_id = p_jugador), '[]'::jsonb),
    'hoy', coalesce((
      select jsonb_object_agg(mision_id, n)
        from (select mision_id, count(*) n from historial_completadas
               where jugador_id = p_jugador and completada_en >= v_inicio group by mision_id) t), '{}'::jsonb)
  );
end $$;


-- ---------------------------------------------------------------------
-- 3. Código de vinculación con la página (6 caracteres, 10 minutos)
-- ---------------------------------------------------------------------
create or replace function _generar_codigo(p_jugador text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- sin 0/O ni 1/I para evitar confusiones
  v_codigo text;
  i int;
begin
  if not exists (select 1 from jugadores where id = p_jugador) then
    return jsonb_build_object('ok', false, 'motivo', 'Jugador no registrado.');
  end if;
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from jugadores where codigo_vinculacion = v_codigo and codigo_expira > now());
  end loop;

  update jugadores set codigo_vinculacion = v_codigo, codigo_expira = now() + interval '10 minutes'
   where id = p_jugador;
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'minutos', 10);
end $$;


-- ---------------------------------------------------------------------
-- 4. Guardar avance, completar y abandonar
-- ---------------------------------------------------------------------
create or replace function _guardar_avance(p_jugador text, p_mision text, p_avance jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update progreso set avance = coalesce(p_avance, '{}'::jsonb)
   where jugador_id = p_jugador and mision_id = p_mision and estado = 'aceptada';
  return jsonb_build_object('ok', found);
end $$;

-- Devuelve los comandos de recompensa para que el servidor los ejecute
create or replace function _completar_mision(p_jugador text, p_mision text, p_avance jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p progreso;
  v_cmds text[];
begin
  select * into p from progreso where jugador_id = p_jugador and mision_id = p_mision for update;
  if not found or p.estado <> 'aceptada' then
    return jsonb_build_object('ok', false, 'motivo', 'Esta misión no está en curso.');
  end if;

  update progreso
     set estado = 'completada', avance = coalesce(p_avance, avance),
         veces_completada = veces_completada + 1, completada_en = now()
   where jugador_id = p_jugador and mision_id = p_mision;

  insert into historial_completadas (jugador_id, mision_id) values (p_jugador, p_mision);

  select comandos into v_cmds from misiones_comandos where mision_id = p_mision;
  return jsonb_build_object('ok', true, 'comandos', to_jsonb(coalesce(v_cmds, '{}'::text[])));
end $$;

create or replace function _abandonar_mision(p_jugador text, p_mision text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update progreso set estado = 'cancelada', avance = '{}'::jsonb
   where jugador_id = p_jugador and mision_id = p_mision and estado = 'aceptada';
  return jsonb_build_object('ok', found);
end $$;


-- ---------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------
revoke execute on function
  _registrar_jugador(text, text), _estado_jugador(text), _generar_codigo(text),
  _guardar_avance(text, text, jsonb), _completar_mision(text, text, jsonb), _abandonar_mision(text, text)
  from public, anon, authenticated;

grant execute on function
  _registrar_jugador(text, text), _estado_jugador(text), _generar_codigo(text),
  _guardar_avance(text, text, jsonb), _completar_mision(text, text, jsonb), _abandonar_mision(text, text),
  _aceptar_mision(text, text, text), inicio_dia_actual()
  to service_role;

-- Las misiones se aceptan solo en el juego, junto al NPC: la página ya no puede aceptarlas
revoke execute on function aceptar_mision(text) from authenticated;

select 'Funciones del addon creadas correctamente' as resultado;
