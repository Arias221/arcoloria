-- =====================================================================
-- 06 · Crónicas por constelaciones y estrellas
-- ---------------------------------------------------------------------
-- Cada capítulo (constelación) se divide en estrellas. Cada estrella
-- tiene su trozo del cuento y, más adelante, una misión.
--   · La primera estrella de una constelación abierta se puede leer.
--   · Al completar la misión de una estrella se abre la siguiente.
--   · La constelación siguiente se abre al completar la anterior y al
--     llegar su fecha.
-- Los textos cerrados nunca salen de la base: solo la función
-- cronicas() los entrega, y solo los que ese jugador tiene abiertos.
--
-- También crea un CÓDIGO DE REVISIÓN: escrito en la página, en el
-- lugar del código de vinculación, abre todo el cuento en ese navegador.
--
-- Se puede ejecutar más de una vez. Selecciona todo (Ctrl+A) y Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------
create table if not exists estrellas (
  servidor     text not null references servidores(id) on delete cascade,
  id           text not null check (id ~ '^[a-z0-9_]+$'),
  capitulo_id  text not null,
  orden        int  not null default 1,
  titulo       text not null,
  texto        text not null default '',
  mision_id    text,
  actualizado  timestamptz not null default now(),
  primary key (servidor, id),
  unique (servidor, capitulo_id, orden),
  foreign key (servidor, capitulo_id) references capitulos(servidor, id) on update cascade on delete cascade,
  foreign key (servidor, mision_id) references misiones(servidor, id) on update cascade on delete set null (mision_id)
);

create table if not exists codigos_revision (
  codigo  text primary key check (codigo ~ '^[A-Z0-9]{10}$'),
  nota    text not null default '',
  creado  timestamptz not null default now()
);

create table if not exists revisores (
  auth_uid  uuid primary key,
  desde     timestamptz not null default now()
);

alter table estrellas enable row level security;
alter table codigos_revision enable row level security;
alter table revisores enable row level security;

-- Los textos no se leen directo: solo administradores. Los jugadores usan cronicas().
drop policy if exists p_admin on estrellas;
create policy p_admin on estrellas for all to authenticated using (es_admin()) with check (es_admin());
drop policy if exists p_admin on codigos_revision;
create policy p_admin on codigos_revision for all to authenticated using (es_admin()) with check (es_admin());
drop policy if exists p_admin on revisores;
create policy p_admin on revisores for all to authenticated using (es_admin()) with check (es_admin());

drop trigger if exists trg_actualizado on estrellas;
create trigger trg_actualizado before update on estrellas for each row execute function tocar_actualizado();

grant select, insert, update, delete on estrellas, codigos_revision, revisores to authenticated;
grant all on estrellas, codigos_revision, revisores to service_role;


-- ---------------------------------------------------------------------
-- 2. Código de revisión
-- ---------------------------------------------------------------------
create or replace function _codigo_aleatorio(p_largo int)
returns text language sql volatile as $$
  -- Sin O, 0, I ni 1, para que no se confundan al escribirlos
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    from generate_series(1, p_largo);
$$;

-- Crea un código nuevo y borra los anteriores. Quien ya lo usó sigue en modo revisión.
create or replace function nuevo_codigo_revision()
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if auth.uid() is not null and not es_admin() then
    raise exception 'Solo un administrador puede crear el código de revisión.';
  end if;
  delete from codigos_revision where true;
  v := _codigo_aleatorio(10);
  insert into codigos_revision (codigo, nota) values (v, 'Revisión del cuento');
  return v;
end $$;

-- Quitar el modo revisión a todos (por ejemplo, al terminar de revisar)
create or replace function cerrar_revisiones()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is not null and not es_admin() then
    raise exception 'Solo un administrador puede cerrar las revisiones.';
  end if;
  delete from revisores where true;
  get diagnostics n = row_count;
  return n;
end $$;

-- El jugador sale del modo revisión en su navegador
create or replace function salir_revision()
returns jsonb language sql security definer set search_path = public as $$
  delete from revisores where auth_uid = auth.uid();
  select jsonb_build_object('ok', true);
$$;

-- Vincular: además del código del juego (6 caracteres) acepta el de revisión (10)
create or replace function vincular_cuenta(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  j   jugadores;
  uid uuid := auth.uid();
  c   text := upper(trim(coalesce(p_codigo, '')));
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'No se pudo iniciar tu sesión. Recarga la página e inténtalo de nuevo.');
  end if;

  if length(c) = 10 then
    if exists (select 1 from codigos_revision where codigo = c) then
      insert into revisores (auth_uid) values (uid) on conflict (auth_uid) do nothing;
      return jsonb_build_object('ok', true, 'revision', true);
    end if;
    return jsonb_build_object('ok', false, 'motivo', 'Ese código de revisión no es válido.');
  end if;

  select * into j from jugadores
   where codigo_vinculacion = c and codigo_expira > now()
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


-- ---------------------------------------------------------------------
-- 3. Crónicas de un jugador
-- ---------------------------------------------------------------------
-- Devuelve las constelaciones con sus estrellas. Para cada estrella:
--   estado = 'encendida' (misión completada), 'abierta' (se puede leer) o 'apagada'.
--   texto  = solo si está encendida o abierta.
create or replace function cronicas(p_servidor text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  v_jug      text;
  v_revision boolean;
  v_hechas   text[];
  v_caps     jsonb := '[]'::jsonb;
  v_completa jsonb := '{}'::jsonb;   -- capitulo -> todas sus estrellas encendidas
  v_primera  boolean := true;        -- la primera estrella del cuento se puede leer sin vincular
  c          record;
  e          record;
  v_abierta  boolean;
  v_previa   text;
  v_estado   text;
  v_estrellas jsonb;
  v_enc      int;
  v_total    int;
begin
  if not servidor_valido(p_servidor) then return _servidor_desconocido(p_servidor); end if;

  v_revision := uid is not null and (exists (select 1 from revisores where auth_uid = uid) or es_admin());
  if uid is not null then
    select id into v_jug from jugadores where servidor = p_servidor and auth_uid = uid;
  end if;
  select coalesce(array_agg(mision_id), '{}') into v_hechas
    from progreso where servidor = p_servidor and jugador_id = v_jug and veces_completada > 0;

  for c in
    select * from capitulos k
     where k.servidor = p_servidor and k.activo
       and exists (select 1 from estrellas s where s.servidor = k.servidor and s.capitulo_id = k.id)
     order by k.orden
  loop
    -- La constelación se abre en su fecha y cuando la anterior está completa
    v_abierta := (c.disponible_desde is null or c.disponible_desde <= now())
             and (c.capitulo_previo is null
                  or coalesce((v_completa ->> c.capitulo_previo)::boolean, true));
    v_estrellas := '[]'::jsonb;
    v_previa := null;
    v_enc := 0; v_total := 0;

    for e in
      select * from estrellas s where s.servidor = p_servidor and s.capitulo_id = c.id order by s.orden
    loop
      v_total := v_total + 1;
      if e.mision_id is not null and e.mision_id = any(v_hechas) then
        v_estado := 'encendida';
      elsif v_revision then
        v_estado := 'abierta';
      elsif v_abierta and (v_previa = 'encendida' or (v_total = 1 and (v_jug is not null or v_primera))) then
        v_estado := 'abierta';
      else
        v_estado := 'apagada';
      end if;
      if v_estado = 'encendida' then v_enc := v_enc + 1; end if;
      v_primera := false;
      v_previa := v_estado;

      v_estrellas := v_estrellas || jsonb_build_object(
        'id', e.id, 'orden', e.orden, 'titulo', e.titulo, 'estado', v_estado, 'mision_id', e.mision_id,
        'texto', case when v_estado = 'apagada' then null else e.texto end);
    end loop;

    v_completa := v_completa || jsonb_build_object(c.id, v_enc = v_total);
    v_caps := v_caps || jsonb_build_object(
      'id', c.id, 'orden', c.orden, 'titulo', c.titulo, 'resumen', c.resumen,
      'disponible_desde', c.disponible_desde, 'recompensa_texto', c.recompensa_texto,
      'abierta', v_abierta or v_revision, 'completa', v_enc = v_total,
      'encendidas', v_enc, 'total', v_total, 'estrellas', v_estrellas);
  end loop;

  return jsonb_build_object('ok', true, 'revision', v_revision, 'vinculado', v_jug is not null,
                            'ahora', now(), 'constelaciones', v_caps);
end $$;


-- ---------------------------------------------------------------------
-- 4. Permisos
-- ---------------------------------------------------------------------
revoke execute on function _codigo_aleatorio(int), nuevo_codigo_revision(), cerrar_revisiones() from public, anon;
grant execute on function nuevo_codigo_revision(), cerrar_revisiones() to authenticated;
grant execute on function cronicas(text) to anon, authenticated;
grant execute on function salir_revision() to authenticated;
grant execute on function vincular_cuenta(text) to authenticated;

notify pgrst, 'reload schema';

-- Crea el primer código de revisión si todavía no hay uno, y lo muestra
do $$ begin
  if not exists (select 1 from codigos_revision) then perform nuevo_codigo_revision(); end if;
end $$;
select 'Listo: crónicas por estrellas activadas. Código de revisión: ' || codigo as resultado from codigos_revision;
