// Genera 07_cuento_principito.sql a partir de contenido.js (títulos) y relatos.js (textos).
// Uso: node generar_cuento.cjs > ../07_cuento_principito.sql
const PARTES = require('./contenido.cjs');
const RELATOS = require('./relatos.cjs');
const q = (s) => '$t$' + String(s).replace(/\$t\$/g, '') + '$t$';

let sql = `-- =====================================================================
-- 07 · Cuento de El Principito (12 constelaciones, ${PARTES.reduce((n, p) => n + p.subs.length, 0)} estrellas)
-- ---------------------------------------------------------------------
-- Carga el cuento en TODOS los servidores. Requiere 06_cronicas_estrellas.sql.
-- Si se ejecuta otra vez, actualiza títulos y textos sin duplicar nada.
-- Las misiones se enlazan después, cuando se creen.
-- Generado con supabase/herramientas/generar_cuento.cjs
-- =====================================================================
do $do$
declare
  s     record;
  v_ord int;
  v_ant text;
  v_cap text;
begin
  for s in select id from servidores loop
    v_ant := null;
`;
for (const p of PARTES) {
  const cap = 'principito_' + String(p.n).padStart(2, '0');
  sql += `
    -- ${p.n}. ${p.titulo}
    v_cap := '${cap}';
    if exists (select 1 from capitulos where servidor = s.id and id = v_cap) then
      update capitulos set titulo = ${q(p.titulo)}, resumen = ${q(p.intro)}, capitulo_previo = v_ant
       where servidor = s.id and id = v_cap;
    else
      select coalesce(max(orden), 0) + 1 into v_ord from capitulos where servidor = s.id;
      insert into capitulos (servidor, id, orden, titulo, resumen, capitulo_previo, activo)
      values (s.id, v_cap, v_ord, ${q(p.titulo)}, ${q(p.intro)}, v_ant, true);
    end if;
`;
  p.subs.forEach((e, i) => {
    const id = `${cap}_${i + 1}`;
    const texto = (RELATOS[`${p.n}.${i + 1}`] || []).join('\n\n');
    sql += `    insert into estrellas (servidor, id, capitulo_id, orden, titulo, texto) values (s.id, '${id}', v_cap, ${i + 1}, ${q(e.t)}, ${q(texto)})
      on conflict (servidor, id) do update set capitulo_id = excluded.capitulo_id, orden = excluded.orden, titulo = excluded.titulo, texto = excluded.texto;
`;
  });
  sql += `    v_ant := v_cap;\n`;
}
sql += `  end loop;
  update sincronizacion set version_contenido = version_contenido + 1;
end $do$;

select servidor, count(*) as estrellas from estrellas where capitulo_id like 'principito_%' group by servidor order by servidor;
`;
process.stdout.write(sql);
